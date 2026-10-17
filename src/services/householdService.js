// Online layer for the shared household.
// Everything here talks to Firestore directly and uses real-time listeners
// (onSnapshot), so changes made by one family member appear on every phone.
import {
  arrayUnion,
  collection,
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

export async function declineInvite(invite) {
  await updateDoc(doc(invites, invite.id), { status: "declined" });
}

// ---------- Requests ("Pubudu asked Mum: buy milk") ----------

// Real-time: latest 50 requests. onChange(list, newlyAdded)
export function listenToRequests(hid, onChange, onError) {
  const q = query(requestsOf(hid), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(
    q,
    { includeMetadataChanges: true }, // also tells us when "Sending..." finishes
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

// Writes are NOT awaited by the screens: when offline, Firestore keeps the
// write in a queue, shows it immediately (pending) and sends it when online.
export function sendRequest(hid, user, { text, toUid, toName }) {
  return setDoc(doc(requestsOf(hid)), {
    text: text.trim(),
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
    purchaseDate: item.purchaseDate,
    expiryDate: item.expiryDate,
    status: "active",
    addedByUid: user.uid,
    addedByName: displayName(user.email),
    createdAt: serverTimestamp(),
  });
}

export function finishShelfItem(hid, itemId, user, status, finishedDate) {
  return updateDoc(doc(shelfOf(hid), itemId), {
    status, // 'eaten' or 'wasted'
    finishedDate,
    finishedByName: displayName(user.email),
  });
}
