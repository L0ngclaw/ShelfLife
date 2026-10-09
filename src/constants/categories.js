// Food categories used across the app (icons are MaterialCommunityIcons names)
export const CATEGORIES = [
  { key: "dairy", label: "Dairy", icon: "cheese", defaultWeightKg: 1 },
  { key: "meat", label: "Meat", icon: "food-steak", defaultWeightKg: 0.5 },
  { key: "fish", label: "Fish", icon: "fish", defaultWeightKg: 0.5 },
  {
    key: "vegetables",
    label: "Vegetables",
    icon: "carrot",
    defaultWeightKg: 0.5,
  },
  { key: "fruit", label: "Fruit", icon: "food-apple", defaultWeightKg: 0.5 },
  { key: "bakery", label: "Bakery", icon: "baguette", defaultWeightKg: 0.4 },
  { key: "grains", label: "Rice & Grains", icon: "rice", defaultWeightKg: 1 },
  { key: "other", label: "Other", icon: "food", defaultWeightKg: 0.5 },
];

// Find a category by key; fall back to "Other" if it is unknown
export const getCategory = (key) =>
  CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
