// Food categories used across the app (icons are MaterialCommunityIcons names)
// CO2 factors: kg CO2-equivalent per kg of food, from Our World in Data
// (Poore & Nemecek, 2018). Each category uses a typical product.
export const DEFAULT_CO2_PER_KG = 2.5; // estimate for "Other" and custom categories

export const CATEGORIES = [
  {
    key: "dairy",
    label: "Dairy",
    icon: "cheese",
    defaultWeightKg: 1,
    co2PerKg: 3.2,
  }, // milk
  {
    key: "meat",
    label: "Meat",
    icon: "food-steak",
    defaultWeightKg: 0.5,
    co2PerKg: 12.3,
  }, // pig meat
  {
    key: "fish",
    label: "Fish",
    icon: "fish",
    defaultWeightKg: 0.5,
    co2PerKg: 13.6,
  }, // farmed fish
  {
    key: "vegetables",
    label: "Vegetables",
    icon: "carrot",
    defaultWeightKg: 0.5,
    co2PerKg: 0.5,
  },
  {
    key: "fruit",
    label: "Fruit",
    icon: "food-apple",
    defaultWeightKg: 0.5,
    co2PerKg: 1.1,
  },
  {
    key: "bakery",
    label: "Bakery",
    icon: "baguette",
    defaultWeightKg: 0.4,
    co2PerKg: 1.6,
  }, // wheat & rye bread
  {
    key: "grains",
    label: "Rice & Grains",
    icon: "rice",
    defaultWeightKg: 1,
    co2PerKg: 4.5,
  }, // rice
  {
    key: "frozen",
    label: "Frozen",
    icon: "snowflake",
    defaultWeightKg: 0.5,
    co2PerKg: DEFAULT_CO2_PER_KG,
  },
  {
    key: "other",
    label: "Other",
    icon: "food",
    defaultWeightKg: 0.5,
    co2PerKg: DEFAULT_CO2_PER_KG,
  },
];

// Find a category by key; fall back to "Other" if it is unknown
export const getCategory = (key) =>
  CATEGORIES.find((c) => c.key === key) ??
  CATEGORIES.find((c) => c.key === "other");
