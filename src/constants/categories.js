// Food categories used across the app (icons are MaterialCommunityIcons names)
// CO2 factors: kg CO2-equivalent per kg of food, from Our World in Data
// (Poore & Nemecek, 2018). Each category uses a typical product.
export const DEFAULT_CO2_PER_KG = 2.5; // estimate for "Other" and custom categories
// Rough weight of ONE piece, used to estimate kg when an item is counted (e.g. 6 pcs)
export const DEFAULT_PIECE_KG = 0.2;

export const CATEGORIES = [
  {
    key: "dairy",
    pieceKg: 0.25,
    label: "Dairy",
    icon: "cheese",
    defaultWeightKg: 1,
    co2PerKg: 3.2,
  }, // milk
  {
    key: "meat",
    pieceKg: 0.25,
    label: "Meat",
    icon: "food-steak",
    defaultWeightKg: 0.5,
    co2PerKg: 12.3,
  }, // pig meat
  {
    key: "fish",
    pieceKg: 0.2,
    label: "Fish",
    icon: "fish",
    defaultWeightKg: 0.5,
    co2PerKg: 13.6,
  }, // farmed fish
  {
    key: "vegetables",
    pieceKg: 0.15,
    label: "Vegetables",
    icon: "carrot",
    defaultWeightKg: 0.5,
    co2PerKg: 0.5,
  },
  {
    key: "fruit",
    pieceKg: 0.15,
    label: "Fruit",
    icon: "food-apple",
    defaultWeightKg: 0.5,
    co2PerKg: 1.1,
  },
  {
    key: "bakery",
    pieceKg: 0.4,
    label: "Bakery",
    icon: "baguette",
    defaultWeightKg: 0.4,
    co2PerKg: 1.6,
  }, // wheat & rye bread
  {
    key: "grains",
    pieceKg: 0.5,
    label: "Rice & Grains",
    icon: "rice",
    defaultWeightKg: 1,
    co2PerKg: 4.5,
  }, // rice
  {
    key: "frozen",
    pieceKg: 0.4,
    label: "Frozen",
    icon: "snowflake",
    defaultWeightKg: 0.5,
    co2PerKg: DEFAULT_CO2_PER_KG,
  },
  {
    key: "other",
    pieceKg: 0.2,
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

// Icons the user can choose from when creating their own category
export const CUSTOM_CATEGORY_ICONS = [
  "tag-outline", "cupcake", "cookie", "pizza", "noodles", "bottle-soda-outline",
  "coffee", "egg-outline", "food-drumstick-outline", "fruit-cherries", "leaf",
  "ice-cream", "pot-steam-outline", "baby-bottle-outline", "candy-outline", "glass-wine",
];
