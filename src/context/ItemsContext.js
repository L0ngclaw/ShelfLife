// State layer: holds the pantry items and shares them with every screen
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { loadItems, saveItems, createId } from "../services/itemStorage";

const ItemsContext = createContext(null);

export function ItemsProvider({ children }) {
  const { user } = useAuth();
  // Remember WHICH user the loaded items belong to
  const [data, setData] = useState({ uid: null, items: [] });

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
    // If the user changes before loading finishes, ignore the old result
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Worked out on every render instead of being stored as extra state
  const items = user && data.uid === user.uid ? data.items : [];
  const loading = !!user && data.uid !== user.uid;

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
    await persist([...items, item]);
    return item;
  };

  const updateItem = async (id, changes) => {
    const now = new Date().toISOString();
    await persist(
      items.map((i) =>
        i.id === id
          ? { ...i, ...changes, updatedAt: now, syncStatus: "pending" }
          : i,
      ),
    );
  };

  return (
    <ItemsContext.Provider value={{ items, loading, addItem, updateItem }}>
      {children}
    </ItemsContext.Provider>
  );
}

export const useItems = () => useContext(ItemsContext);
