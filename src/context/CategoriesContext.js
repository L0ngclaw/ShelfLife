// State layer: built-in categories + the user's own categories
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { CATEGORIES } from "../constants/categories";
import {
  loadCustomCategories,
  saveCustomCategories,
} from "../services/categoryStorage";
import { createId } from "../services/itemStorage";

const CategoriesContext = createContext(null);
const OTHER = CATEGORIES.find((c) => c.key === "other");

export function CategoriesProvider({ children }) {
  const { user } = useAuth();
  // Remember WHICH user the custom categories belong to
  const [data, setData] = useState({ uid: null, list: [] });

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

  const customCategories = user && data.uid === user.uid ? data.list : [];
  const categories = [...CATEGORIES, ...customCategories];

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
