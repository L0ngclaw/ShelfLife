import { useState } from "react";
import { ScrollView, View, StyleSheet, Image, Platform } from "react-native";
import {
  TextInput,
  Button,
  Chip,
  HelperText,
  Text,
  Portal,
  Dialog,
  Switch,
  SegmentedButtons,
  Icon,
  IconButton,
} from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { takePhoto } from "../services/photoService";
import { toISODate, parseISODate, describeExpiry } from "../utils/dates";
import { useItems } from "../context/ItemsContext";
import { useCategories } from "../context/CategoriesContext";
import { useFeedback } from "../context/FeedbackContext";
import { useHousehold } from "../context/HouseholdContext";
import { usePermission } from "../hooks/usePermission";
import PermissionDialog from "../components/PermissionDialog";
import { CUSTOM_CATEGORY_ICONS } from "../constants/categories";
import { theme } from "../theme";

export default function AddItemScreen({ navigation, route }) {
  const { items, addItem, updateItem } = useItems();
  const { categories, addCategory, getCategory } = useCategories();
  const { household, shelf, addToShelf, updateShelfItem } = useHousehold();
  const { showMessage } = useFeedback();
  const { askPermission, dialogProps } = usePermission();

  // Edit mode: the same screen edits a personal item (from Item details)
  // or a family-shelf item (from the Family tab), filled in with its values
  const editId = route.params?.editItemId ?? route.params?.editShelfItemId;
  const isShelfEdit = !!route.params?.editShelfItemId;
  const editing = editId ? (isShelfEdit ? shelf : items).find((i) => i.id === editId) : null;

  // A bought request can open this screen with the name already filled in
  const [name, setName] = useState(editing?.name ?? route.params?.presetName ?? "");
  const [category, setCategory] = useState(editing?.category ?? "dairy");
  const [unit, setUnit] = useState(editing?.unit ?? "kg"); // "kg" = by weight, "pcs" = by count
  const [weight, setWeight] = useState(String(editing?.weightKg ?? 1));
  const [quantity, setQuantity] = useState(String(editing?.quantity ?? 1));
  const [weightEach, setWeightEach] = useState(String(editing?.weightPerItemKg ?? 0.1)); // kg per piece
  const [expiry, setExpiry] = useState(() => {
    if (editing) return parseISODate(editing.expiryDate);
    const d = new Date();
    d.setDate(d.getDate() + 7); // default: one week from today
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [photoUri, setPhotoUri] = useState(editing?.photoUri ?? null);
  const [toFamilyShelf, setToFamilyShelf] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // "New category" dialog
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState(CUSTOM_CATEGORY_ICONS[0]);
  const [categoryError, setCategoryError] = useState("");

  // Picking a category also fills in a typical weight for it
  const selectCategory = (c) => {
    setCategory(c.key);
    if (!editing) setWeight(String(c.defaultWeightKg)); // keep the real weight when editing
  };

  const openDialog = () => {
    setNewCategory("");
    setNewCategoryIcon(CUSTOM_CATEGORY_ICONS[0]);
    setCategoryError("");
    setDialogVisible(true);
  };

  const handleAddCategory = async () => {
    try {
      const created = await addCategory(newCategory, newCategoryIcon);
      selectCategory(created); // select the new category straight away
      setDialogVisible(false);
    } catch (e) {
      setCategoryError(e.message);
    }
  };

  // Android: the native date dialog closes itself after picking
  const onAndroidDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (event.type === "set" && selectedDate) setExpiry(selectedDate);
  };

  const handleTakePhoto = async () => {
    // Explain why we need the camera, then show the system popup
    if (!(await askPermission("camera"))) return;
    try {
      const uri = await takePhoto();
      if (uri) setPhotoUri(uri); // null = user cancelled
    } catch (e) {
      setError(
        e.message === "PERMISSION_DENIED"
          ? "Camera permission is needed to take a photo."
          : "Could not take the photo. Please try again.",
      );
    }
  };

  const handleSave = async () => {
    // Validate on the device before saving
    const trimmedName = name.trim();
    const cat = getCategory(category);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!trimmedName) return setError("Please enter a name.");

    let weightKg = null;
    let count = null;
    let perItemKg = null;
    if (unit === "kg") {
      weightKg = parseFloat(weight.replace(",", "."));
      if (isNaN(weightKg) || weightKg <= 0 || weightKg > 50)
        return setError("Weight must be between 0 and 50 kg.");
    } else {
      count = Number(quantity);
      if (!Number.isInteger(count) || count < 1 || count > 99)
        return setError("Count must be a whole number from 1 to 99.");
      // Weight of one item is required, so we always know the total weight
      perItemKg = parseFloat(weightEach.replace(",", "."));
      if (isNaN(perItemKg) || perItemKg <= 0 || perItemKg > 20)
        return setError("Weight each must be between 0 and 20 kg.");
      weightKg = Math.round(count * perItemKg * 100) / 100;
    }

    // When editing, an item that has already expired may keep its date
    const unchangedDate = editing && toISODate(expiry) === editing.expiryDate;
    if (expiry < today && !unchangedDate) return setError("Expiry date cannot be in the past.");
    setError("");

    const itemData = {
      name: trimmedName,
      category,
      weightKg,
      unit,
      quantity: count,
      weightPerItemKg: perItemKg,
      purchaseDate: toISODate(new Date()),
      expiryDate: toISODate(expiry),
    };

    // Edit mode: save the changes (the purchase date stays the same)
    if (editing) {
      const changes = { ...itemData };
      delete changes.purchaseDate;
      if (isShelfEdit) {
        // Keep the stored label/icon unless the category was changed
        const sameCategory = category === editing.category;
        updateShelfItem(editing, {
          ...changes,
          categoryLabel: sameCategory ? editing.categoryLabel : cat.label,
          categoryIcon: sameCategory ? editing.categoryIcon : cat.icon,
        }).catch(() => showMessage("Could not save the change. Please try again."));
      } else {
        await updateItem(editing.id, { ...changes, photoUri });
      }
      showMessage(`${trimmedName} updated`);
      navigation.goBack();
      return;
    }

    // Family shelf: written straight to Firestore (shared, live). Not awaited,
    // so it also works offline - Firestore queues it and sends it later.
    if (household && toFamilyShelf) {
      addToShelf({ ...itemData, categoryLabel: cat.label, categoryIcon: cat.icon }).catch(() =>
        showMessage("Could not share the item. Please try again."),
      );
      showMessage(`${trimmedName} added to the family shelf`);
      navigation.goBack();
      return;
    }

    // Reminders need notifications: explain and ask once (skipped if already allowed)
    await askPermission("notifications");

    setSaving(true);
    try {
      await addItem({ ...itemData, photoUri });
      showMessage(`${trimmedName} added to your shelf`);
      navigation.goBack();
    } catch {
      setError("Could not save the item. Please try again.");
      setSaving(false);
    }
  };

  const expiryISO = toISODate(expiry);

  // Live total for "by count", e.g. "Total: 6 pcs × 0.2 kg = 1.2 kg"
  const countValue = Number(quantity);
  const eachValue = parseFloat(weightEach.replace(",", "."));
  const totalText =
    Number.isInteger(countValue) && countValue > 0 && eachValue > 0
      ? `Total: ${countValue} pcs × ${eachValue} kg = ${Math.round(countValue * eachValue * 100) / 100} kg`
      : "Enter how many and the weight of one item.";

  return (
    // This screen is shown as a modal; Portal.Host makes its dialogs appear
    // ON TOP of this screen instead of behind it.
    <Portal.Host>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} accessibilityLabel="Item photo" />
        ) : null}
        {/* Family-shelf items have no photo (photos stay on the phone that took them) */}
        {!isShelfEdit ? (
          <Button mode="outlined" icon="camera" onPress={handleTakePhoto} style={styles.photoButton}>
            {photoUri ? "Retake photo" : "Take photo"}
          </Button>
        ) : null}

        <TextInput
          label="Item name"
          mode="outlined"
          value={name}
          onChangeText={setName}
          maxLength={40}
          style={styles.input}
        />

        <Text variant="titleSmall" style={styles.label}>
          Category
        </Text>
        <View style={styles.chips}>
          {categories.map((c) => {
            const selected = category === c.key;
            return (
              <Chip
                key={c.key}
                icon={
                  selected
                    ? ({ size }) => (
                        <Icon source={c.icon} size={size} color={theme.colors.onPrimary} />
                      )
                    : c.icon
                }
                selected={selected}
                showSelectedCheck={false}
                selectedColor={selected ? theme.colors.onPrimary : undefined}
                onPress={() => selectCategory(c)}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityState={{ selected }}
              >
                {c.label}
              </Chip>
            );
          })}
          <Chip icon="plus" mode="outlined" onPress={openDialog} style={styles.chip}>
            New category
          </Chip>
        </View>

        <Text variant="titleSmall" style={styles.label}>
          Amount
        </Text>
        <SegmentedButtons
          value={unit}
          onValueChange={setUnit}
          style={styles.input}
          buttons={[
            { value: "kg", label: "By weight", icon: "scale" },
            { value: "pcs", label: "By count", icon: "counter" },
          ]}
        />
        {unit === "kg" ? (
          <TextInput
            label="Weight"
            mode="outlined"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            right={<TextInput.Affix text="kg" />}
            style={styles.input}
          />
        ) : (
          <>
            <View style={styles.row}>
              <TextInput
                label="How many?"
                mode="outlined"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                right={<TextInput.Affix text="pcs" />}
                style={[styles.input, styles.half]}
              />
              <TextInput
                label="Weight each"
                mode="outlined"
                value={weightEach}
                onChangeText={setWeightEach}
                keyboardType="decimal-pad"
                right={<TextInput.Affix text="kg" />}
                style={[styles.input, styles.half]}
              />
            </View>
            <HelperText type="info" visible style={styles.total}>
              {totalText}
            </HelperText>
          </>
        )}

        <Text variant="titleSmall" style={styles.label}>
          Expiry date
        </Text>
        <Button mode="outlined" icon="calendar" onPress={() => setShowPicker(true)}>
          {expiryISO} · {describeExpiry(expiryISO)}
        </Button>
        {Platform.OS === "android" && showPicker && (
          <DateTimePicker
            value={expiry}
            mode="date"
            minimumDate={new Date()}
            onChange={onAndroidDateChange}
          />
        )}

        {household && !editing ? (
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text variant="titleSmall">Family shelf</Text>
              <Text variant="bodySmall">
                Share with {household.name} instead of your personal shelf
              </Text>
            </View>
            <Switch value={toFamilyShelf} onValueChange={setToFamilyShelf} />
          </View>
        ) : null}

        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>

        <Button
          mode="contained"
          icon="content-save"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
        >
          {editing ? "Save changes" : "Save item"}
        </Button>
      </ScrollView>

      <Portal>
        {/* iOS: show the calendar straight away in a dialog (no extra "pill" tap) */}
        {Platform.OS === "ios" && (
          <Dialog visible={showPicker} onDismiss={() => setShowPicker(false)}>
            <Dialog.Title>Expiry date</Dialog.Title>
            <Dialog.Content style={styles.calendar}>
              <DateTimePicker
                value={expiry}
                mode="date"
                display="inline"
                themeVariant="light"
                accentColor={theme.colors.primary}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setExpiry(selectedDate);
                }}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button mode="contained" onPress={() => setShowPicker(false)}>
                Done
              </Button>
            </Dialog.Actions>
          </Dialog>
        )}

        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>New category</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Category name"
              mode="outlined"
              value={newCategory}
              onChangeText={setNewCategory}
              maxLength={20}
              autoFocus
            />
            <Text variant="labelLarge" style={styles.iconTitle}>
              Pick an icon
            </Text>
            <View style={styles.iconGrid}>
              {CUSTOM_CATEGORY_ICONS.map((iconName) => {
                const picked = newCategoryIcon === iconName;
                return (
                  <IconButton
                    key={iconName}
                    icon={iconName}
                    mode={picked ? "contained" : "outlined"}
                    selected={picked}
                    containerColor={picked ? theme.colors.primary : undefined}
                    iconColor={picked ? theme.colors.onPrimary : undefined}
                    size={22}
                    onPress={() => setNewCategoryIcon(iconName)}
                    accessibilityLabel={`Icon ${iconName}`}
                  />
                );
              })}
            </View>
            <HelperText type="error" visible={!!categoryError}>
              {categoryError}
            </HelperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddCategory}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <PermissionDialog {...dialogProps} />
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  input: { marginBottom: 12 },
  label: { marginTop: 4, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: { marginRight: 8, marginBottom: 8 },
  chipSelected: { backgroundColor: theme.colors.primary },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 8,
  },
  photoButton: { marginBottom: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", marginTop: 16 },
  switchText: { flex: 1, marginRight: 12 },
  calendar: { alignItems: "center", paddingHorizontal: 8 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1, marginBottom: 0 },
  total: { marginBottom: 8 },
  iconTitle: { marginTop: 16, marginBottom: 4 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
});
