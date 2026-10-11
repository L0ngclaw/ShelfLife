// Sync layer: moves data between the phone and Firestore
import {
  collection,
  doc,
  getDocsFromServer,
  getDocFromServer,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { withTimeout } from "../utils/retry";

// Firestore structure: users/{uid}/items/{itemId}
const itemsCollection = (uid) => collection(db, "users", uid, "items");

// Only these fields go to the cloud (photos and the local sync flag stay on the phone)
const CLOUD_FIELDS = [
  "id",
  "name",
  "category",
  "weightKg",
  "purchaseDate",
  "expiryDate",
  "status",
  "finishedDate",
  "createdAt",
  "updatedAt",
];

function toCloudItem(item) {
  const cloudItem = {};
  for (const field of CLOUD_FIELDS) {
    if (item[field] !== undefined) cloudItem[field] = item[field]; // Firestore rejects undefined
  }
  return cloudItem;
}

// 1. PUSH: upload every pending item in ONE batch (fewer network calls, less battery)
export async function pushPendingItems(uid, items) {
  const pending = items.filter((i) => i.syncStatus === "pending");
  const pushed = new Map(); // id -> updatedAt of the version we uploaded
  if (pending.length === 0) return pushed;

  const batch = writeBatch(db);
  for (const item of pending) {
    batch.set(doc(itemsCollection(uid), item.id), toCloudItem(item));
    pushed.set(item.id, item.updatedAt);
  }
  await withTimeout(batch.commit());
  return pushed;
}

// 2. PULL: download all of this user's items from the server
export async function pullRemoteItems(uid) {
  const snapshot = await withTimeout(getDocsFromServer(itemsCollection(uid)));
  return snapshot.docs.map((d) => d.data());
}

// 3. MERGE: last-write-wins, the version with the newest updatedAt is kept
export function mergeItems(localItems, remoteItems, pushed) {
  const merged = new Map();
  for (const remote of remoteItems) {
    merged.set(remote.id, { ...remote, photoUri: null, syncStatus: "synced" });
  }
  for (const local of localItems) {
    const remote = merged.get(local.id);
    if (!remote) {
      // Only on this phone: synced if we just uploaded this exact version
      const uploaded = pushed.get(local.id) === local.updatedAt;
      merged.set(
        local.id,
        uploaded ? { ...local, syncStatus: "synced" } : local,
      );
    } else if (local.updatedAt > remote.updatedAt) {
      merged.set(local.id, local); // phone has a newer change, it stays pending
    } else {
      // Cloud version is the same or newer; keep this phone's photo and reminder
      merged.set(local.id, {
        ...remote,
        photoUri: local.photoUri ?? null,
        reminderId: local.reminderId ?? null,
      });
    }
  }
  return [...merged.values()];
}

// Custom categories: users/{uid}/meta/categories  { list: [...] }
const categoriesDoc = (uid) => doc(db, "users", uid, "meta", "categories");

export async function syncCategories(uid, localList) {
  const snapshot = await withTimeout(getDocFromServer(categoriesDoc(uid)));
  const remoteList = snapshot.exists() ? (snapshot.data().list ?? []) : [];
  // Categories are only ever added, so merging = union by key
  const byKey = new Map([...remoteList, ...localList].map((c) => [c.key, c]));
  const merged = [...byKey.values()];
  if (merged.length !== remoteList.length) {
    await withTimeout(setDoc(categoriesDoc(uid), { list: merged }));
  }
  return merged;
}
