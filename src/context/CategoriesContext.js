// State layer: built-in categories + the user's own categories (synced to the cloud)
import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { CATEGORIES } from "../constants/categories";
import {
  loadCustomCategories,
  saveCustomCategories,
} from "../services/categoryStorage";
import { createId } from "../services/itemStorage";
import { syncCategories } from "../services/syncService";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

const CategoriesContext = createContext(null);
const OTHER = CATEGORIES.find((c) => c.key === "other");

export function CategoriesProvider({ children }) {
  const { user } = useAuth();
  const isOnline = useNetworkStatus();
  // Remember WHICH user the custom categories belong to
  const [data, setData] = useState({ uid: null, list: [] });

  // Load this user's categories from the phone
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadCustomCategories(user.uid)
      .then((list) => {
        if (!cancelled) setData({ uid: user.uid, list });
      })
      .catch(() => {
        if (!cancelled) setData({ uid: user.uid, list: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const loaded = !!user && data.uid === user.uid;
  const customCategories = loaded ? data.list : [];
  const categories = [...CATEGORIES, ...customCategories];

  // Merge this phone's categories with the cloud copy and save the result on the phone.
  // It only RETURNS the merged list; the effect below puts it into state.
  const syncCategoriesNow = useEffectEvent(async () => {
    const uid = user.uid;
    const merged = await syncCategories(uid, customCategories);
    await saveCustomCategories(uid, merged);
    return { uid, merged };
  });

  // Sync when loaded, when back online, and when a category is added
  useEffect(() => {
    if (!loaded || isOnline !== true) return;
    let cancelled = false;
    syncCategoriesNow()
      .then(({ uid, merged }) => {
        if (!cancelled) setData({ uid, list: merged }); // setState in a callback = allowed
      })
      .catch(() => {
        // Offline or failed: categories stay on the phone and sync next time
      });
    return () => {
      cancelled = true; // ignore a late result if things changed meanwhile
    };
  }, [loaded, isOnline, customCategories.length]);

  const getCategory = (key) => categories.find((c) => c.key === key) ?? OTHER;

  const addCategory = async (label) => {
    const name = label.trim();
    if (name.length < 2 || name.length > 20) {
      throw new Error("Category name must be 2–20 characters.");
    }
    if (categories.some((c) => c.label.toLowerCase() === name.toLowerCase())) {
      throw new Error("That category already exists.");
    }
    const category = {
      key: `custom-${createId()}`,
      label: name,
      icon: "tag-outline",
      defaultWeightKg: 0.5,
      custom: true,
    };
    const next = [...customCategories, category];
    setData({ uid: user.uid, list: next });
    await saveCustomCategories(user.uid, next);
    return category;
  };

  return (
    <CategoriesContext.Provider
      value={{ categories, getCategory, addCategory }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export const useCategories = () => useContext(CategoriesContext);
