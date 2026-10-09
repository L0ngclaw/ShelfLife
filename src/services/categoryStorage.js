// Data layer: the user's own categories, saved on the phone
import AsyncStorage from "@react-native-async-storage/async-storage";

const keyFor = (userId) => `shelflife:categories:${userId}`;

export async function loadCustomCategories(userId) {
  const json = await AsyncStorage.getItem(keyFor(userId));
  return json ? JSON.parse(json) : [];
}

export async function saveCustomCategories(userId, categories) {
  await AsyncStorage.setItem(keyFor(userId), JSON.stringify(categories));
}
