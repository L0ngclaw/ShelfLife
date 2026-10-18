// Online layer for the shared household.
// Everything here talks to Firestore directly and uses real-time listeners
// (onSnapshot), so changes made by one family member appear on every phone.
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { displayName } from "../utils/names";

const households = collection(db, "households");
const invites = collection(db, "invites");
const requestsOf = (hid) => collection(db, "households", hid, "requests");
const shelfOf = (hid) => collection(db, "households", hid, "shelf");
const normalise = (email) => email.trim().toLowerCase();

// Converts a Firestore document into a plain object for the UI.
// `pending` = written on this phone but not yet confirmed by the server (offline).
function toPlain(snapshotDoc) {
  const data = snapshotDoc.data({ serverTimestamps: "estimate" });
  return {
    id: snapshotDoc.id,
    ...data,
    createdAtMs: data.createdAt?.toMillis?.() ?? Date.now(),
    lastActionAtMs: data.lastAction?.at?.toMillis?.() ?? 0,
    pending: snapshotDoc.metadata.hasPendingWrites,
  };
}

// ---------- Household and invites ----------

// Real-time: the household this user belongs to (or null)
export function listenToMyHousehold(uid, onChange, onError) {
  const q = query(households, where("members", "array-contains", uid));
  return onSnapshot(
    q,
    (snap) => {
      const first = snap.docs[0];
      onChange(first ? { id: first.id, ...first.data() } : null);
    },
    onError,
  );
}

export async function createHousehold(user, name) {
  await setDoc(doc(households), {
    name: name.trim(),
    createdBy: user.uid,
    members: [user.uid],
    memberEmails: { [user.uid]: normalise(user.email) },
    createdAt: serverTimestamp(),
  });
}

// One invite per household + email, so inviting twice just refreshes it
export async function inviteMember(user, household, email) {
  const toEmail = normalise(email);
  await setDoc(doc(invites, `${household.id}_${toEmail}`), {
    householdId: household.id,
    householdName: household.name,
    toEmail,
    fromUid: user.uid,
    fromEmail: normalise(user.email),
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

// Real-time: pending invites sent to this user's account email
export function listenToMyInvites(email, onChange, onError) {
  const q = query(
    invites,
    where("toEmail", "==", normalise(email)),
    where("status", "==", "pending"),
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError,
  );
}

// Join the household and mark the invite accepted in ONE atomic batch
export async function acceptInvite(user, invite) {
  const batch = writeBatch(db);
  batch.update(doc(households, invite.householdId), {
    members: arrayUnion(user.uid),
    [`memberEmails.${user.uid}`]: normalise(user.email),
  });
  batch.update(doc(invites, invite.id), { status: "accepted" });
  await batch.commit();
}

// Leave the household: remove myself from the member list (my personal shelf is not touched)
export async function leaveHousehold(user, householdId) {
  await updateDoc(doc(households, householdId), {
    members: arrayRemove(user.uid),
    [`memberEmails.${user.uid}`]: deleteField(),
  });
}

export async function declineInvite(invite) {
  await updateDoc(doc(invites, invite.id), { status: "declined" });
}

// ---------- Requests ("Pubudu asked Mum: buy milk") ----------

// Real-time: latest 50 requests. onChange(list, newlyAdded, changed)
export function listenToRequests(hid, onChange, onError) {
  const q = query(requestsOf(hid), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(
    q,
    { includeMetadataChanges: true }, // also tells us when "Sending..." finishes
    (snap) => {
      const changes = snap.docChanges();
      const added = changes.filter((c) => c.type === "added").map((c) => toPlain(c.doc));
      const changed = changes.filter((c) => c.type === "modified").map((c) => toPlain(c.doc));
      onChange(snap.docs.map(toPlain), added, changed);
    },
    onError,
  );
}

// Who did what last (bought / declined / forwarded) - used for notifications
const actionBy = (user, type) => ({
  type,
  byUid: user.uid,
  byName: displayName(user.email),
  at: serverTimestamp(),
});

// Writes are NOT awaited by the screens: when offline, Firestore keeps the
// write in a queue, shows it immediately (pending) and sends it when online.
export function sendRequest(hid, user, { text, note, toUid, toName }) {
  return setDoc(doc(requestsOf(hid)), {
    text: text.trim(),
    note: note?.trim() || null, // optional message, e.g. "the low-fat one please"
    fromUid: user.uid,
    fromName: displayName(user.email),
    toUid: toUid ?? null, // null = anyone in the family
    toName: toName ?? null,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

export function completeRequest(hid, requestId, user) {
  return updateDoc(doc(requestsOf(hid), requestId), {
    status: "done",
    doneByUid: user.uid,
    doneByName: displayName(user.email),
    doneAt: serverTimestamp(),
    lastAction: actionBy(user, "bought"),
  });
}

// The person a request was sent to can say no
export function declineRequest(hid, requestId, user) {
  return updateDoc(doc(requestsOf(hid), requestId), {
    status: "declined",
    declinedByName: displayName(user.email),
    lastAction: actionBy(user, "declined"),
  });
}

// ...or pass it on to another member
export function forwardRequest(hid, requestId, user, toUid, toName) {
  return updateDoc(doc(requestsOf(hid), requestId), {
    toUid,
    toName,
    forwardedByName: displayName(user.email),
    lastAction: actionBy(user, "forwarded"),
  });
}

// ---------- Family shelf (shared food items) ----------

// Real-time: every item on the family shelf. onChange(list, newlyAdded)
export function listenToShelf(hid, onChange, onError) {
  return onSnapshot(
    shelfOf(hid),
    { includeMetadataChanges: true },
    (snap) => {
      const added = snap
        .docChanges()
        .filter((c) => c.type === "added")
        .map((c) => toPlain(c.doc));
      onChange(snap.docs.map(toPlain), added);
    },
    onError,
  );
}

// item: { name, category, categoryLabel, categoryIcon, weightKg, unit, quantity, purchaseDate, expiryDate }
export function addToShelf(hid, user, item) {
  return setDoc(doc(shelfOf(hid)), {
    name: item.name,
    category: item.category,
    categoryLabel: item.categoryLabel, // stored so every member sees the label,
    categoryIcon: item.categoryIcon, //   even for someone's custom category
    weightKg: item.weightKg,
    unit: item.unit ?? "kg",
    quantity: item.quantity ?? null,
    weightPerItemKg: item.weightPerItemKg ?? null,
    purchaseDate: item.purchaseDate,
    expiryDate: item.expiryDate,
    status: "active",
    addedByUid: user.uid,
    addedByName: displayName(user.email),
    createdAt: serverTimestamp(),
  });
}

// Edit a shared item or use part of it; every member sees the change live
export function updateShelfItem(hid, itemId, user, changes) {
  return updateDoc(doc(shelfOf(hid), itemId), {
    ...changes,
    updatedByName: displayName(user.email),
  });
}

// "Use some" on a shared item: lower its amount and save the used part as its
// own eaten record (for the household's Impact). One batch, so both happen together.
export function recordShelfPartialUse(hid, item, user, changes, usedPart, finishedDate) {
  const batch = writeBatch(db);
  batch.update(doc(shelfOf(hid), item.id), {
    ...changes,
    updatedByName: displayName(user.email),
  });
  batch.set(doc(shelfOf(hid)), {
    name: item.name,
    category: item.category,
    categoryLabel: item.categoryLabel,
    categoryIcon: item.categoryIcon,
    purchaseDate: item.purchaseDate,
    expiryDate: item.expiryDate,
    weightPerItemKg: item.weightPerItemKg ?? null,
    ...usedPart,
    status: "eaten",
    finishedDate,
    finishedByName: displayName(user.email),
    addedByUid: item.addedByUid,
    addedByName: item.addedByName,
    createdAt: serverTimestamp(),
  });
  return batch.commit();
}

export function finishShelfItem(hid, itemId, user, status, finishedDate) {
  return updateDoc(doc(shelfOf(hid), itemId), {
    status, // 'eaten' or 'wasted'
    finishedDate,
    finishedByName: displayName(user.email),
  });
}
