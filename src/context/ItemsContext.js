// State layer: holds the pantry items and shares them with every screen
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { loadItems, saveItems, createId } from "../services/itemStorage";

const ItemsContext = createContext(null);

export function ItemsProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load this user's items from the phone whenever the user changes
  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    loadItems(user.uid)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [user]);

  // Update the screen and save to the phone (offline-first)
  const persist = async (nextItems) => {
    setItems(nextItems);
    await saveItems(user.uid, nextItems);
  };

  const addItem = async (data) => {
    const now = new Date().toISOString();
    const item = {
      id: createId(),
      ...data,
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
