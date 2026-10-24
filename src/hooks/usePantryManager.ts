import { useState, useEffect, useMemo, useCallback } from "react";
import {
  type PantryItem,
  type GroceryItem,
  defaultPantry,
  defaultGroceries,
  deduplicatePantry,
  getMhdStatus,
  isItemExpiringSoonOrCritical,
  getItemNutrientSpecs,
  applyCookingDeduction,
  processReceiptImport,
  parseGroceryQuantity,
} from "../utils/pantryHelpers";
import { findMatchingPantryItem } from "../utils/pantryMatching";
import { getFoodTone } from "../components/FoodIcons";
import { decomposeCompositeIngredients } from "../utils/recipeHelpers";
import { STORAGE_KEYS, wipeAllAppData } from "../constants/storage";
import type { CatalogRecipe } from "../data/recipeCatalog";

interface UsePantryManagerProps {
  allRecipes: CatalogRecipe[];
  notify: (msg: string) => void;
}

export function usePantryManager({ allRecipes, notify }: UsePantryManagerProps) {
  // 1. Pantry State
  const [pantry, setPantry] = useState<PantryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PANTRY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          return [];
        }
        const enhanced = parsed.map((item: any) => {
          const specs = getItemNutrientSpecs(item);
          return {
            ...item,
            isUnlimited: Boolean(item.isUnlimited || item.name?.toLowerCase().includes("wasser") || item.amount >= 99999),
            caloriesPer100g: (item.caloriesPer100g !== undefined && item.caloriesPer100g !== 180) ? item.caloriesPer100g : specs.caloriesPer100g,
            proteinPer100g: (item.proteinPer100g !== undefined && item.caloriesPer100g !== 180) ? item.proteinPer100g : specs.proteinPer100g,
            carbsPer100g: (item.carbsPer100g !== undefined && item.caloriesPer100g !== 180) ? item.carbsPer100g : specs.carbsPer100g,
            fatPer100g: (item.fatPer100g !== undefined && item.caloriesPer100g !== 180) ? item.fatPer100g : specs.fatPer100g,
          };
        });
        return deduplicatePantry(enhanced);
      }
    } catch {
      // LocalStorage error fallback
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(pantry));
    } catch {
      // Storage quota fallback
    }
  }, [pantry]);

  // 2. Groceries State
  const [groceries, setGroceries] = useState<GroceryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GROCERIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return decomposeCompositeIngredients(parsed);
        }
      }
    } catch {
      // LocalStorage error fallback
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(groceries));
    } catch {
      // Storage quota fallback
    }
  }, [groceries]);

  // 3. Food Waste Saved Counter
  const [foodWasteSaved, setFoodWasteSaved] = useState<{ count: number; money: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FOOD_WASTE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.count === "number" && typeof parsed.money === "number") {
          return parsed;
        }
      }
    } catch {
      // LocalStorage error fallback
    }
    return { count: 0, money: 0 };
  });

  // Derived: Expiring items count
  const expiringPantryCount = useMemo(
    () => pantry.filter((item) => isItemExpiringSoonOrCritical(item)).length,
    [pantry]
  );

  // Pantry Mutators
  const updateAmount = useCallback((id: number | string, delta: number) => {
    setPantry((items) =>
      items.map((item) => {
        if (String(item.id) === String(id)) {
          if (item.isUnlimited || item.name.toLowerCase().includes("wasser")) return item;
          const next = Math.max(0, Math.min(item.total, item.amount + delta));
          return { ...item, amount: next };
        }
        return item;
      })
    );
  }, []);

  const updateCategory = useCallback((id: number | string, newCategory: string) => {
    setPantry((items) =>
      items.map((item) => {
        if (String(item.id) === String(id)) {
          return { ...item, category: newCategory };
        }
        return item;
      })
    );
    notify("Lagerort aktualisiert");
  }, [notify]);

  const handleUpdatePantryItem = useCallback((updated: PantryItem) => {
    setPantry((prev) => prev.map((item) => (String(item.id) === String(updated.id) ? updated : item)));
    notify(`«${updated.name}» aktualisiert`);
  }, [notify]);

  const handleDeletePantryItem = useCallback((id: number | string) => {
    const itemToDelete = pantry.find((p) => String(p.id) === String(id));
    setPantry((prev) => prev.filter((item) => String(item.id) !== String(id)));
    notify(itemToDelete ? `«${itemToDelete.name}» gelöscht` : "Produkt gelöscht");
  }, [pantry, notify]);

  const handleAddProduct = useCallback((item: Omit<PantryItem, "id">) => {
    if (!item || !item.name) return;
    const cleanName = String(item.name).trim();
    if (!cleanName) return;
    const normName = cleanName.toLowerCase();
    setPantry((prev) => {
      const existingIdx = prev.findIndex((p) => String(p.name || "").trim().toLowerCase() === normName);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const existing = updated[existingIdx];
        const newAmount = (Number(existing.amount) || 0) + (Number(item.amount) || 0);
        updated[existingIdx] = {
          ...existing,
          amount: newAmount,
          total: Math.max(Number(existing.total) || 0, newAmount),
          unit: item.unit || existing.unit,
          mhd: item.mhd || existing.mhd,
        };
        return updated;
      }
      const uniqueId = Date.now() + Math.floor(Math.random() * 1000000);
      return [...prev, { ...item, name: cleanName, id: uniqueId }];
    });
    notify(`«${cleanName}» im Vorrat erfasst`);
  }, [notify]);

  const handleBarcodeScanned = useCallback((scanned: Partial<PantryItem>) => {
    setPantry((prev) => {
      const existing = prev.find((p) => p.name.toLowerCase().includes(scanned.name?.toLowerCase() || ""));
      if (existing) {
        return prev.map((p) =>
          p.id === existing.id
            ? { ...p, amount: Math.min(p.total, p.amount + (scanned.amount || 200)) }
            : p
        );
      }
      const newItem: PantryItem = {
        id: Date.now(),
        name: scanned.name || "Neuer Artikel",
        category: scanned.category || "Trocken",
        amount: scanned.amount || 500,
        total: scanned.total || 500,
        unit: scanned.unit || "g",
        tone: scanned.tone || getFoodTone(scanned.name || "", scanned.category),
        caloriesPer100g: scanned.caloriesPer100g,
        proteinPer100g: scanned.proteinPer100g,
        carbsPer100g: scanned.carbsPer100g,
        fatPer100g: scanned.fatPer100g,
      };
      return [...prev, newItem];
    });
    notify(`Barcode erfasst: +${scanned.name}`);
  }, [notify]);

  const handleReceiptImported = useCallback((importedItems?: Array<Omit<PantryItem, "id"> & { price?: number }>) => {
    if (!importedItems || !Array.isArray(importedItems) || importedItems.length === 0) {
      notify("Keine Kassenbon-Positionen ausgewählt");
      return;
    }

    const result = processReceiptImport(importedItems, pantry, groceries);
    setPantry(result.updatedPantry);
    setGroceries(result.updatedGroceries);

    if (result.totalSpent > 0) {
      try {
        const prevSpent = parseFloat(localStorage.getItem(STORAGE_KEYS.RECEIPT_EXPENSES) || "0") || 0;
        localStorage.setItem(STORAGE_KEYS.RECEIPT_EXPENSES, (prevSpent + result.totalSpent).toFixed(2));
      } catch {
        // LocalStorage fallback
      }
    }

    notify(result.toastMessage);
  }, [pantry, groceries, notify]);

  // Shopping List Mutators
  const completeShopping = useCallback((checkedIds: number[]) => {
    const itemsToRestock = groceries.filter((g) => checkedIds.includes(g.id));
    if (itemsToRestock.length === 0) return;

    const restockedSummary: string[] = [];

    setPantry((prevPantry) => {
      const updatedPantry = [...prevPantry];

      itemsToRestock.forEach((grocery) => {
        const parsed = parseGroceryQuantity(grocery.quantity, grocery.name);
        const matchRes = findMatchingPantryItem(grocery.name, updatedPantry);
        const match = matchRes ? (matchRes.pantryItem as PantryItem) : undefined;

        if (match) {
          const matchIdx = updatedPantry.findIndex((p) => String(p.id) === String(match.id));
          if (matchIdx >= 0) {
            const existing = updatedPantry[matchIdx];
            const newAmount = existing.amount + parsed.amount;
            const newTotal = Math.max(existing.total, newAmount);

            let newMhd = existing.mhd;
            if (!newMhd || getMhdStatus(newMhd) === "expired" || getMhdStatus(newMhd) === "soon" || getMhdStatus(newMhd) === "missing") {
              const freshDate = new Date();
              freshDate.setDate(freshDate.getDate() + 14);
              newMhd = freshDate.toISOString().split("T")[0];
            }

            updatedPantry[matchIdx] = {
              ...existing,
              amount: newAmount,
              total: newTotal,
              mhd: newMhd,
            };
            restockedSummary.push(`${existing.name} (+${parsed.amount} ${existing.unit})`);
          }
        } else {
          const freshDate = new Date();
          freshDate.setDate(freshDate.getDate() + 14);
          const newMhd = freshDate.toISOString().split("T")[0];

          let mappedCategory = "Trocken";
          if (grocery.category.includes("Kühl") || grocery.category.includes("Tiefkühl")) mappedCategory = "Kühl";
          else if (grocery.category.includes("Obst") || grocery.category.includes("Gemüse")) mappedCategory = "Kühl";
          else if (grocery.category.includes("Sauc") || grocery.category.includes("Gewürz")) mappedCategory = "Saucen";

          const specs = getItemNutrientSpecs({ name: grocery.name, category: mappedCategory });

          const newItem: PantryItem = {
            id: Date.now() + Math.floor(Math.random() * 10000),
            name: grocery.name,
            category: mappedCategory,
            amount: parsed.amount,
            total: Math.max(parsed.total, parsed.amount),
            unit: parsed.unit,
            tone: getFoodTone(grocery.name, mappedCategory),
            mhd: newMhd,
            minAmount: Math.round(parsed.amount * 0.3),
            caloriesPer100g: specs.caloriesPer100g,
            proteinPer100g: specs.proteinPer100g,
            carbsPer100g: specs.carbsPer100g,
            fatPer100g: specs.fatPer100g,
          };
          updatedPantry.push(newItem);
          restockedSummary.push(`${newItem.name} (neu: ${parsed.amount} ${parsed.unit})`);
        }
      });

      return updatedPantry;
    });

    setGroceries((prev) => prev.filter((g) => !checkedIds.includes(g.id)));

    const summary = restockedSummary.slice(0, 2).join(", ");
    const more = restockedSummary.length > 2 ? ` (+${restockedSummary.length - 2} weitere)` : "";
    notify(`${itemsToRestock.length} Artikel eingekauft · ${summary}${more} in Vorrat verbucht`);
  }, [groceries, notify]);

  const handleClearGroceries = useCallback(() => {
    setGroceries([]);
    try {
      localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify([]));
    } catch {
      // LocalStorage fallback
    }
    notify("Einkaufsliste geleert");
  }, [notify]);

  const handleAddMissingToGroceries = useCallback((items: Array<{ name: string; amount?: string }>) => {
    const decomposed = decomposeCompositeIngredients(items);
    setGroceries((prev) => {
      const next = [...prev];
      let addedCount = 0;
      for (const it of decomposed) {
        const itNameLower = it.name.toLowerCase().trim();
        const exists = next.some(
          (g) =>
            g.name.toLowerCase().includes(itNameLower) ||
            itNameLower.includes(g.name.toLowerCase().trim())
        );
        if (!exists) {
          next.push({
            id: Date.now() + Math.floor(Math.random() * 10000) + addedCount,
            name: it.name,
            quantity: it.amount || "1 Stk.",
            price: "1,99 €",
            category: "Zutaten",
            reason: "Für Rezept benötigt",
          });
          addedCount++;
        }
      }
      return next;
    });
    notify(`${decomposed.length} ${decomposed.length === 1 ? "fehlende Zutat" : "fehlende Zutaten"} zur Einkaufsliste hinzugefügt!`);
  }, [notify]);

  // Cooking Execution
  const cookRecipe = useCallback((recipeTitle: string, servings: number) => {
    const result = applyCookingDeduction(recipeTitle, servings, pantry, allRecipes);
    setPantry(result.updatedPantry);

    if (result.savedUrgentCount > 0) {
      setFoodWasteSaved((prev) => {
        const next = {
          count: prev.count + result.savedUrgentCount,
          money: Number((prev.money + result.savedUrgentCount * 2.5).toFixed(2)),
        };
        try {
          localStorage.setItem(STORAGE_KEYS.FOOD_WASTE, JSON.stringify(next));
        } catch {
          // LocalStorage fallback
        }
        return next;
      });
    }

    if (result.lowStockAlerts.length > 0) {
      setGroceries((prev) => {
        const copy = [...prev];
        result.lowStockAlerts.forEach((name) => {
          if (!copy.some((g) => g.name.toLowerCase().includes(name.toLowerCase()))) {
            copy.push({
              id: Date.now() + Math.random(),
              name: name,
              quantity: name.includes("Eier") ? "10 Stück" : name.includes("Reis") ? "1 kg" : "1 Packung",
              price: name.includes("Hähnchen") ? "4,99 €" : "2,49 €",
              category: name.includes("Kühl") || name.includes("Eier") || name.includes("Hähnchen") ? "Kühl & Tiefkühl" : "Trockenvorrat",
              reason: `Aufgebraucht beim Kochen von «${recipeTitle}»`,
            });
          }
        });
        return copy;
      });
    }

    notify(
      `«${recipeTitle}» gekocht! Vorrat für ${servings} Pers. aktualisiert${result.deductedItems.length > 0 ? ` (${result.deductedItems.slice(0, 2).join(", ")})` : ""}`
    );
  }, [allRecipes, pantry, notify]);

  // Maintenance & Resets
  const handleResetDemo = useCallback(() => {
    setPantry(defaultPantry);
    setGroceries(defaultGroceries);
    try {
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(defaultPantry));
      localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(defaultGroceries));
    } catch {
      // LocalStorage fallback
    }
    notify("Standard-Demo Vorrat & Einkaufsliste wiederhergestellt!");
  }, [notify]);

  const handleClearPantry = useCallback(() => {
    setPantry([]);
    try {
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify([]));
    } catch {
      // LocalStorage fallback
    }
    notify("Vorrat komplett geleert (0 Produkte)");
  }, [notify]);

  const handleDeduplicatePantry = useCallback(() => {
    setPantry((prev) => {
      const cleaned = deduplicatePantry(prev);
      try {
        localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(cleaned));
      } catch {
        // LocalStorage fallback
      }
      return cleaned;
    });
    notify("Duplikate erfolgreich zusammengeführt & bereinigt!");
  }, [notify]);

  const handleFullReset = useCallback(() => {
    setPantry([]);
    setGroceries([]);
    setFoodWasteSaved({ count: 0, money: 0 });
    try {
      wipeAllAppData();
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify([]));
    } catch {
      // LocalStorage fallback
    }
    notify("Gesamter Vorrat & Einkaufsliste komplett geleert!");
  }, [notify]);

  const handleWipeEverything = useCallback(() => {
    setPantry([]);
    setGroceries([]);
    setFoodWasteSaved({ count: 0, money: 0 });
    wipeAllAppData();
    notify("Account komplett geleert: Vorrat, Rezepte, Einkauf & Wochenplan auf 0!");
  }, [notify]);

  return {
    pantry,
    setPantry,
    groceries,
    setGroceries,
    foodWasteSaved,
    setFoodWasteSaved,
    expiringPantryCount,
    updateAmount,
    updateCategory,
    handleUpdatePantryItem,
    handleDeletePantryItem,
    handleAddProduct,
    handleBarcodeScanned,
    handleReceiptImported,
    completeShopping,
    handleClearGroceries,
    handleAddMissingToGroceries,
    cookRecipe,
    handleResetDemo,
    handleClearPantry,
    handleDeduplicatePantry,
    handleFullReset,
    handleWipeEverything,
  };
}
