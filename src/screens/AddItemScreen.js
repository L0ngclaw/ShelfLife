import { useState } from "react";
import { ScrollView, View, StyleSheet, Image } from "react-native";
import { takePhoto } from "../services/photoService";
import {
  TextInput,
  Button,
  Chip,
  HelperText,
  Text,
  Portal,
  Dialog,
} from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { toISODate, describeExpiry } from "../utils/dates";
import { useItems } from "../context/ItemsContext";
import { useCategories } from "../context/CategoriesContext";

export default function AddItemScreen({ navigation }) {
  const { addItem } = useItems();
  const { categories, addCategory } = useCategories();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("dairy");
  const [weight, setWeight] = useState("1");
  const [expiry, setExpiry] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // default: one week from today
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // "New category" dialog
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [photoUri, setPhotoUri] = useState(null);

  // Picking a category also fills in a typical weight for it
  const selectCategory = (c) => {
    setCategory(c.key);
    setWeight(String(c.defaultWeightKg));
  };

  const openDialog = () => {
    setNewCategory("");
    setCategoryError("");
    setDialogVisible(true);
  };

  const handleAddCategory = async () => {
    try {
      const created = await addCategory(newCategory);
      selectCategory(created); // select the new category straight away
      setDialogVisible(false);
    } catch (e) {
      setCategoryError(e.message);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (event.type === "set" && selectedDate) setExpiry(selectedDate);
  };

  const handleTakePhoto = async () => {
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
    const weightKg = parseFloat(weight.replace(",", "."));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!trimmedName) return setError("Please enter a name.");
    if (isNaN(weightKg) || weightKg <= 0 || weightKg > 50)
      return setError("Weight must be between 0 and 50 kg.");
    if (expiry < today) return setError("Expiry date cannot be in the past.");

    setError("");
    setSaving(true);
    try {
      await addItem({
        name: trimmedName,
        category,
        weightKg,
        purchaseDate: toISODate(new Date()),
        expiryDate: toISODate(expiry),
        photoUri: photoUri,
      });
      navigation.goBack();
    } catch {
      setError("Could not save the item. Please try again.");
      setSaving(false);
    }
  };

  const expiryISO = toISODate(expiry);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={styles.photo}
          accessibilityLabel="Item photo"
        />
      ) : null}
      <Button
        mode="outlined"
        icon="camera"
        onPress={handleTakePhoto}
        style={styles.photoButton}
      >
        {photoUri ? "Retake photo" : "Take photo"}
      </Button>
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
        {categories.map((c) => (
          <Chip
            key={c.key}
            icon={c.icon}
            selected={category === c.key}
            showSelectedCheck={false}
            onPress={() => selectCategory(c)}
            style={styles.chip}
          >
            {c.label}
          </Chip>
        ))}
        <Chip
          icon="plus"
          mode="outlined"
          onPress={openDialog}
          style={styles.chip}
        >
          New category
        </Chip>
      </View>

      <TextInput
        label="Weight (kg)"
        mode="outlined"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
        style={styles.input}
      />

      <Text variant="titleSmall" style={styles.label}>
        Expiry date
      </Text>
      <Button
        mode="outlined"
        icon="calendar"
        onPress={() => setShowPicker(true)}
      >
        {expiryISO} · {describeExpiry(expiryISO)}
      </Button>
      {showPicker && (
        <DateTimePicker
          value={expiry}
          mode="date"
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}

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
        Save item
      </Button>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { marginBottom: 12 },
  label: { marginTop: 4, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: { marginRight: 8, marginBottom: 8 },
  photo: {
    width: 160,
    height: 160,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 8,
  },
  photoButton: { marginBottom: 12 },
});
