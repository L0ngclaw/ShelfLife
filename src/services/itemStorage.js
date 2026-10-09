// Data layer: reads/writes the user's items on the phone (works offline)
import AsyncStorage from "@react-native-async-storage/async-storage";

// Each user gets their own key, so two accounts on one phone never mix data
const keyFor = (userId) => `shelflife:items:${userId}`;

export async function loadItems(userId) {
  const json = await AsyncStorage.getItem(keyFor(userId));
  return json ? JSON.parse(json) : [];
}

export async function saveItems(userId, items) {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(items));
}

// Simple unique id: time + random part (no extra library needed)
export function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
