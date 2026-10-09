import { useState } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { TextInput, Button, Chip, HelperText, Text } from "react-native-paper";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CATEGORIES } from "../constants/categories";
import { toISODate, describeExpiry } from "../utils/dates";
import { useItems } from "../context/ItemsContext";

export default function AddItemScreen({ navigation }) {
  const { addItem } = useItems();
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

  // Picking a category also fills in a typical weight for it
  const selectCategory = (c) => {
    setCategory(c.key);
    setWeight(String(c.defaultWeightKg));
  };

  const onDateChange = (event, selectedDate) => {
    setShowPicker(false);
    if (event.type === "set" && selectedDate) setExpiry(selectedDate);
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
        photoUri: null,
      });
      navigation.goBack();
    } catch (e) {
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
        {CATEGORIES.map((c) => (
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  input: { marginBottom: 12 },
  label: { marginTop: 4, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12 },
  chip: { marginRight: 8, marginBottom: 8 },
});
