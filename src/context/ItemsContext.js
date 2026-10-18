// State layer: holds the pantry items, saves them on the phone (offline-first)
// and syncs them with Firestore when online
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { loadItems, saveItems, createId } from "../services/itemStorage";
import {
  pushPendingItems,
  pullRemoteItems,
  mergeItems,
} from "../services/syncService";
import { withRetry } from "../utils/retry";
import { toISODate } from "../utils/dates";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import {
  scheduleExpiryReminder,
  cancelReminder,
} from "../services/notificationService";

const ItemsContext = createContext(null);
const SYNC_DELAY_MS = 2000; // wait for more changes, then upload them together

export function ItemsProvider({ children }) {
  const { user } = useAuth();
  const isOnline = useNetworkStatus();
  const [data, setData] = useState({ uid: null, items: [] });
  const [sync, setSync] = useState({
    status: "idle",
    lastSyncedAt: null,
    error: null,
  });
  const syncing = useRef(false); // stops two syncs running at the same time

  // Load this user's items from the phone whenever the user changes
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadItems(user.uid)
      .then((items) => {
        if (!cancelled) setData({ uid: user.uid, items });
      })
      .catch(() => {
        if (!cancelled) setData({ uid: user.uid, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loaded = !!user && data.uid === user.uid;
  const items = loaded ? data.items : [];
  const loading = !!user && !loaded;
  const pendingCount = items.filter((i) => i.syncStatus === "pending").length;

  // Push pending changes, pull the cloud copy, merge, save on the phone
  const syncNow = async () => {
    if (!user || syncing.current) return;
    if (isOnline !== true) {
      setSync((s) => ({ ...s, status: "offline" }));
      return;
    }
    const uid = user.uid;
    syncing.current = true;
    setSync((s) => ({ ...s, status: "syncing", error: null }));
    try {
      await withRetry(async () => {
        const local = await loadItems(uid);
        const pushed = await pushPendingItems(uid, local);
        const remote = await pullRemoteItems(uid);
        const latestLocal = await loadItems(uid); // include changes made during the network calls
        const merged = mergeItems(latestLocal, remote, pushed);
        await saveItems(uid, merged);
        setData({ uid, items: merged });
      });
      setSync({
        status: "idle",
        lastSyncedAt: new Date().toISOString(),
        error: null,
      });
    } catch (e) {
      setSync((s) => ({ ...s, status: "error", error: e.message }));
    } finally {
      syncing.current = false;
    }
  };

  const runSync = useEffectEvent(() => {
    syncNow();
  });

  // Sync when the items are loaded and every time the phone comes back online
  useEffect(() => {
    if (loaded && isOnline === true) runSync();
  }, [loaded, isOnline]);

  // When there are pending changes, wait a moment (to batch them) and then sync
  useEffect(() => {
    if (!loaded || isOnline !== true || pendingCount === 0) return;
    const timer = setTimeout(() => runSync(), SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [loaded, isOnline, pendingCount]);

  // Update the screen and save to the phone (offline-first)
  const persist = async (nextItems) => {
    setData({ uid: user.uid, items: nextItems });
    await saveItems(user.uid, nextItems);
  };

  const addItem = async (itemData) => {
    const now = new Date().toISOString();
    const item = {
      id: createId(),
      ...itemData,
      status: "active",
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending", // not in the cloud yet
    };
    item.reminderId = await scheduleExpiryReminder(item); // local to this phone
    await persist([...items, item]);
    return item;
  };

  const updateItem = async (id, changes) => {
    const now = new Date().toISOString();
    const target = items.find((i) => i.id === id);
    let extra = {};
    // Item eaten or thrown away -> its reminder is no longer needed
    if (target?.reminderId && changes.status && changes.status !== "active") {
      await cancelReminder(target.reminderId);
      extra = { reminderId: null };
    } else if (
      target?.status === "active" &&
      changes.expiryDate &&
      changes.expiryDate !== target.expiryDate
    ) {
      // Expiry date edited -> move the reminder to the new date
      await cancelReminder(target.reminderId);
      extra = { reminderId: await scheduleExpiryReminder({ ...target, ...changes }) };
    }
    await persist(
      items.map((i) =>
        i.id === id
          ? {
              ...i,
              ...changes,
              ...extra,
              updatedAt: now,
              syncStatus: "pending",
            }
          : i,
      ),
    );
  };

  // "Use some": the used part is saved as its own eaten record, so the Impact
  // screen counts it, and the item keeps the rest. Saved together in one step.
  const recordPartialUse = async (id, changes, usedPart) => {
    const now = new Date().toISOString();
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const eatenPart = {
      ...target,
      ...usedPart,
      id: createId(),
      status: "eaten",
      finishedDate: toISODate(new Date()),
      reminderId: null, // the reminder stays with the item that is left
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    };
    await persist([
      ...items.map((i) =>
        i.id === id ? { ...i, ...changes, updatedAt: now, syncStatus: "pending" } : i,
      ),
      eatenPart,
    ]);
  };

  return (
    <ItemsContext.Provider
      value={{
        items,
        loading,
        addItem,
        updateItem,
        recordPartialUse,
        sync,
        syncNow,
        pendingCount,
        isOnline,
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
}

export const useItems = () => useContext(ItemsContext);
