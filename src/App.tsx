import { useMemo, useState, useEffect, useRef, lazy, Suspense } from "react";
import { motion } from "motion/react";
import { ProductMark, getFoodTone } from "./components/FoodIcons";
import { FULL_RECIPE_CATALOG, type CatalogRecipe } from "./data/recipeCatalog";
import { getStoredCustomRecipes, rehydrateCustomRecipe, resolveRecipeFoodImage } from "./utils/geminiRecipes";
import { getSafeIngredientsList, getSafeAvailable, getCurrentMealTimeSlot, decomposeCompositeIngredients, isEggIngredientName, getRecipeCategory, type RecipeCategory } from "./utils/recipeHelpers";
import {
  getRecipePantryBreakdown,
  findMatchingPantryItem,
  getAmbiguousIngredientTag,
  isSpiceOrKitchenBasic,
  deductIngredientFromPantryAmount,
  parseIngredientAmountAndUnit,
} from "./utils/pantryMatching";
import { EditPantryItemModal } from "./components/EditPantryItemModal";
import { SavedMealsScreen } from "./components/SavedMealsScreen";
import { findFoodNutrition } from "./data/foodNutritionDatabase";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import {
  WeeklyMealPlannerScreen,
  type PlannedMeal,
  type WeekdayId,
  WEEKDAYS,
} from "./components/WeeklyMealPlannerScreen";
import { STORAGE_KEYS, wipeAllAppData } from "./constants/storage";

import { UnifiedAddModal } from "./components/UnifiedAddModal";
import { deleteStoredCustomRecipe, markRecipeAsDeleted } from "./utils/geminiRecipes";
import { PantryScreen, PANTRY_CATEGORY_GROUPS, getCategoryGroupKey } from "./screens/PantryScreen";
import { GroceriesScreen, ShoppingScreen } from "./screens/GroceriesScreen";
import { CookScreen, type CookScreenProps } from "./screens/CookScreen";
import { useCloudSync } from "./hooks/useCloudSync";
import { Icon, Button, type IconName, type ButtonProps } from "./components/UiIcons";

export { PantryScreen, PANTRY_CATEGORY_GROUPS, getCategoryGroupKey };
export { GroceriesScreen, ShoppingScreen };
export { CookScreen, type CookScreenProps };
export { Icon, Button, type IconName, type ButtonProps };

// Code-splitting heavy modals for faster initial page load
const HouseholdSyncModal = lazy(() =>
  import("./components/HouseholdSyncModal").then((m) => ({ default: m.HouseholdSyncModal }))
);
const RecipeImportModal = lazy(() =>
  import("./components/RecipeImportModal").then((m) => ({ default: m.RecipeImportModal }))
);
const AccountResetModal = lazy(() =>
  import("./components/AccountResetModal").then((m) => ({ default: m.AccountResetModal }))
);

export {
  findMatchingPantryItem,
  isSpiceOrKitchenBasic,
  deductIngredientFromPantryAmount,
  parseIngredientAmountAndUnit,
} from "./utils/pantryMatching";

type Tab = "pantry" | "discover" | "planner" | "cook" | "shop";

export interface PantryItem {
  id: number | string;
  name: string;
  category: string;
  amount: number;
  total: number;
  unit: string;
  tone: string;
  mhd?: string;
  minAmount?: number;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  isUnlimited?: boolean;
}

export function deduplicatePantry(items: PantryItem[]): PantryItem[] {
  const map = new Map<string, PantryItem>();
  for (const item of items) {
    if (!item || !item.name) continue;
    const key = item.name.trim().toLowerCase();
    if (map.has(key)) {
      const existing = map.get(key)!;
      const isUnlimited = Boolean(
        existing.isUnlimited ||
        item.isUnlimited ||
        key.includes("wasser") ||
        existing.amount >= 99999 ||
        item.amount >= 99999
      );
      const newAmount = isUnlimited ? 999999 : (Number(existing.amount) || 0) + (Number(item.amount) || 0);
      const newTotal = isUnlimited ? 999999 : Math.max(Number(existing.total) || 1, newAmount);
      const mhd = existing.mhd || item.mhd;
      map.set(key, {
        ...existing,
        amount: newAmount,
        total: newTotal,
        isUnlimited,
        mhd,
      });
    } else {
      map.set(key, {
        ...item,
        id: item.id !== undefined ? item.id : Date.now() + Math.floor(Math.random() * 1000000),
      });
    }
  }
  return Array.from(map.values()).map((item, idx) => ({
    ...item,
    id: item.id !== undefined ? item.id : idx + 1000,
  }));
}

export function formatMhdDisplay(mhd?: string): string {
  if (!mhd || !mhd.trim()) return "MHD: fehlt";
  const trimmed = mhd.trim();
  if (trimmed.toLowerCase().includes("unbegrenzt") || trimmed.toLowerCase().includes("frisch")) {
    return trimmed;
  }
  if (trimmed.includes(".")) {
    return `MHD: ${trimmed}`;
  }
  const parts = trimmed.split("-");
  if (parts.length === 3) {
    return `MHD: ${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return `MHD: ${trimmed}`;
}

/**
 * Deducts ingredients for a cooked recipe from pantry inventory with full unit-safety.
 * Uses deductIngredientFromPantryAmount to guarantee unit conversion (kg <-> g, l <-> ml, EL/TL -> ml/g)
 * and prevent package wipes (e.g. 1 kg Reis minus 150 g yields 0.85 kg).
 */
export function applyCookingDeduction(
  recipeTitle: string,
  servings: number,
  pantryItems: PantryItem[],
  recipes: CatalogRecipe[] = []
): {
  updatedPantry: PantryItem[];
  deductedItems: string[];
  lowStockAlerts: string[];
  savedUrgentCount: number;
} {
  const recipe = recipes.find(
    (r) => r.title.toLowerCase() === recipeTitle.toLowerCase()
  );

  const deductedItems: string[] = [];
  const lowStockAlerts: string[] = [];
  let savedUrgentCount = 0;

  const updatedPantry = pantryItems.map((item) => {
    if (
      item.isUnlimited ||
      item.name.toLowerCase().includes("wasser") ||
      isSpiceOrKitchenBasic(item.name, item.category)
    ) {
      return item;
    }

    let newAmount = item.amount;
    let didDeduct = false;
    let deductNote = "";
    const itemNameLower = item.name.toLowerCase();

    if (recipe) {
      const breakdown = getRecipePantryBreakdown(recipe, pantryItems, servings);
      const matchingInStock = breakdown.inStock.filter(
        (ing) =>
          ing.matchedPantryItemName?.toLowerCase().trim() === itemNameLower ||
          (item.id && (ing as any).matchedPantryItemId === item.id)
      );

      if (matchingInStock.length > 0) {
        for (const matchIng of matchingInStock) {
          const { amount: ingAmount, unit: ingUnit } = parseIngredientAmountAndUnit(matchIng.amount);
          if (ingAmount > 0) {
            const updated = deductIngredientFromPantryAmount(newAmount, item.unit, ingAmount, ingUnit);
            if (updated < newAmount) {
              didDeduct = true;
              const diff = Number((newAmount - updated).toFixed(3));
              deductNote = `-${diff}${item.unit}`;
              newAmount = updated;
            }
          }
        }
      }
    }

    // Fallback default deductions if not dynamically matched
    if (!didDeduct && !isSpiceOrKitchenBasic(item.name, item.category)) {
      let fallbackAmt = 0;
      let fallbackUnit = item.unit;
      if (itemNameLower.includes("reis") && (recipeTitle.toLowerCase().includes("reis") || recipeTitle.toLowerCase().includes("fried") || recipeTitle.toLowerCase().includes("rice"))) {
        fallbackAmt = 90 * servings;
        fallbackUnit = "g";
      } else if (isEggIngredientName(itemNameLower) && (isEggIngredientName(recipeTitle) || recipeTitle.toLowerCase().includes("egg") || recipeTitle.toLowerCase().includes("omelett") || recipeTitle.toLowerCase().includes("rührei") || recipeTitle.toLowerCase().includes("shakshuka"))) {
        fallbackAmt = servings;
        fallbackUnit = "Stk.";
      } else if (itemNameLower.includes("soja") && (recipeTitle.toLowerCase().includes("soja") || recipeTitle.toLowerCase().includes("fried") || recipeTitle.toLowerCase().includes("teriyaki") || recipeTitle.toLowerCase().includes("bowl"))) {
        fallbackAmt = 12 * servings;
        fallbackUnit = "ml";
      } else if (itemNameLower.includes("erbsen") && (recipeTitle.toLowerCase().includes("erbsen") || recipeTitle.toLowerCase().includes("spar"))) {
        fallbackAmt = 60 * servings;
        fallbackUnit = "g";
      } else if (itemNameLower.includes("hähnchen") && (recipeTitle.toLowerCase().includes("hähnchen") || recipeTitle.toLowerCase().includes("teriyaki"))) {
        fallbackAmt = 110 * servings;
        fallbackUnit = "g";
      } else if (itemNameLower.includes("zwiebel") && (recipeTitle.toLowerCase().includes("zwiebel") || recipeTitle.toLowerCase().includes("spar"))) {
        fallbackAmt = Math.max(1, Math.round(servings * 0.5));
        fallbackUnit = "Stk.";
      }

      if (fallbackAmt > 0) {
        const updated = deductIngredientFromPantryAmount(newAmount, item.unit, fallbackAmt, fallbackUnit);
        if (updated < newAmount) {
          didDeduct = true;
          const diff = Number((newAmount - updated).toFixed(3));
          deductNote = `-${diff}${item.unit}`;
          newAmount = updated;
        }
      }
    }

    if (didDeduct) {
      deductedItems.push(`${item.name} (${deductNote})`);
      const mhdStatus = getMhdStatus(item.mhd);
      if (mhdStatus === "soon" || mhdStatus === "expired") {
        savedUrgentCount++;
      }
      if (newAmount <= (item.minAmount || 0.25 * item.total)) {
        lowStockAlerts.push(item.name);
      }
      return {
        ...item,
        amount: newAmount,
      };
    }

    return item;
  });

  return { updatedPantry, deductedItems, lowStockAlerts, savedUrgentCount };
}

/**
 * Unit-safe cooking completion handler.
 */
export function confirmCookingCompletion(
  recipeTitle: string,
  servings: number,
  pantryItems: PantryItem[],
  recipes: CatalogRecipe[] = []
) {
  return applyCookingDeduction(recipeTitle, servings, pantryItems, recipes);
}

/**
 * Processes receipt items: adds them to pantry, checks off matching open groceries, and calculates spent sum.
 */
export function processReceiptImport<T extends { name: string; category?: string; checked?: boolean }>(
  importedItems: Array<Omit<PantryItem, "id"> & { price?: number }>,
  currentPantry: PantryItem[],
  currentGroceries: T[]
): {
  updatedPantry: PantryItem[];
  updatedGroceries: T[];
  checkedGroceriesCount: number;
  totalSpent: number;
  toastMessage: string;
} {
  let updatedPantry = [...currentPantry];

  importedItems.forEach((item) => {
    if (!item || !item.name) return;
    const cleanName = String(item.name).trim();
    if (!cleanName) return;
    const normName = cleanName.toLowerCase();

    const existingIdx = updatedPantry.findIndex(
      (p) => String(p.name || "").trim().toLowerCase() === normName
    );
    if (existingIdx >= 0) {
      const existing = updatedPantry[existingIdx];
      const newAmount = (Number(existing.amount) || 0) + (Number(item.amount) || 0);
      updatedPantry[existingIdx] = {
        ...existing,
        amount: newAmount,
        total: Math.max(Number(existing.total) || 0, newAmount),
        unit: item.unit || existing.unit,
        mhd: item.mhd || existing.mhd,
      };
    } else {
      updatedPantry.push({
        id: `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName,
        category: item.category,
        amount: Number(item.amount) || 1,
        total: Math.max(Number(item.total) || 0, Number(item.amount) || 1),
        unit: item.unit || "Stk.",
        tone: item.tone || getFoodTone(cleanName, item.category),
        minAmount: item.minAmount || Math.round((Number(item.amount) || 1) * 0.25),
        caloriesPer100g: item.caloriesPer100g,
        proteinPer100g: item.proteinPer100g,
        carbsPer100g: item.carbsPer100g,
        fatPer100g: item.fatPer100g,
        mhd: item.mhd,
      });
    }
  });

  let checkedGroceriesCount = 0;
  const updatedGroceries = currentGroceries.filter((grocery) => {
    if (grocery.checked) return true;
    const isMatched = importedItems.some((imported) => {
      const match = findMatchingPantryItem(grocery.name, [
        { name: imported.name, category: imported.category },
      ]);
      return Boolean(match);
    });
    if (isMatched) {
      checkedGroceriesCount++;
      return false; // Checked off without calling toggleGroceryItem
    }
    return true;
  });

  const totalSpent = importedItems.reduce((acc, cur) => acc + (Number(cur.price) || 0), 0);
  const priceText = totalSpent > 0 ? ` (~${totalSpent.toFixed(2).replace(".", ",")} € erfasst)` : "";
  const toastMessage = `${importedItems.length} Artikel in den Vorrat gebucht & ${checkedGroceriesCount} von deiner Einkaufsliste erledigt!${priceText}`;

  return {
    updatedPantry,
    updatedGroceries,
    checkedGroceriesCount,
    totalSpent,
    toastMessage,
  };
}

export function getMhdStatus(mhd?: string): "ok" | "soon" | "expired" | "missing" {
  if (!mhd || !mhd.trim()) return "missing";
  if (mhd.toLowerCase().includes("unbegrenzt") || mhd.toLowerCase().includes("frisch")) return "ok";
  try {
    let date: Date;
    if (mhd.includes(".")) {
      const [d, m, y] = mhd.split(".").map(Number);
      date = new Date(y, m - 1, d);
    } else {
      date = new Date(mhd);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "expired";
    if (diffDays <= 3) return "soon";
    return "ok";
  } catch {
    return "ok";
  }
}

export function isItemExpiringSoonOrCritical(item: PantryItem): boolean {
  if (!item || !item.name) return false;
  if (item.isUnlimited || item.name.toLowerCase().includes("wasser") || (item.amount ?? 0) >= 99999) {
    return false;
  }
  const cat = (item.category || "").toLowerCase();
  if (
    cat.includes("gewürz") ||
    cat.includes("gewuerz") ||
    cat.includes("saucen") ||
    cat === "gewürze" ||
    isSpiceOrKitchenBasic(item.name, item.category)
  ) {
    return false;
  }
  if ((item.amount ?? 0) <= 0) return false;

  // Check explicit daysLeft property if present (<= 3 days)
  if (typeof (item as any).daysLeft === "number") {
    return (item as any).daysLeft <= 3;
  }

  // Check MHD status ("soon" <= 3 days or "expired" < 0 days)
  const mhdStatus = getMhdStatus(item.mhd);
  return mhdStatus === "soon" || mhdStatus === "expired";
}

export const defaultPantry: PantryItem[] = [
  {
    id: 1,
    name: "Basmati Reis",
    category: "Trocken",
    amount: 800,
    total: 1000,
    unit: "g",
    tone: "rice",
    minAmount: 300,
    caloriesPer100g: 350,
    proteinPer100g: 8.5,
    carbsPer100g: 78.0,
    fatPer100g: 1.0,
  },
  {
    id: 2,
    name: "Bio Eier",
    category: "Kühl",
    amount: 6,
    total: 10,
    unit: "Stk.",
    tone: "egg",
    mhd: "2026-10-18",
    minAmount: 4,
    caloriesPer100g: 140,
    proteinPer100g: 12.5,
    carbsPer100g: 0.8,
    fatPer100g: 9.8,
  },
  {
    id: 3,
    name: "Sojasoße",
    category: "Saucen",
    amount: 40,
    total: 250,
    unit: "ml",
    tone: "sauce",
    mhd: "2027-04-01",
    minAmount: 50,
    caloriesPer100g: 65,
    proteinPer100g: 10.5,
    carbsPer100g: 5.5,
    fatPer100g: 0.1,
  },
  {
    id: 4,
    name: "TK-Erbsen",
    category: "Kühl",
    amount: 0,
    total: 450,
    unit: "g",
    tone: "peas",
    minAmount: 200,
    caloriesPer100g: 82,
    proteinPer100g: 6.2,
    carbsPer100g: 12.5,
    fatPer100g: 0.5,
  },
  {
    id: 5,
    name: "Frühlingszwiebeln",
    category: "Kühl",
    amount: 2,
    total: 5,
    unit: "Stk.",
    tone: "onion",
    mhd: "2026-10-15",
    minAmount: 2,
    caloriesPer100g: 34,
    proteinPer100g: 1.9,
    carbsPer100g: 4.8,
    fatPer100g: 0.3,
  },
  {
    id: 6,
    name: "Hähnchenbrustfilet",
    category: "Kühl",
    amount: 400,
    total: 400,
    unit: "g",
    tone: "chicken",
    mhd: "2026-10-14",
    minAmount: 200,
    caloriesPer100g: 110,
    proteinPer100g: 24.0,
    carbsPer100g: 0.0,
    fatPer100g: 1.5,
  },
  {
    id: 7,
    name: "Wasser (Leitung)",
    category: "Getränke",
    amount: 999999,
    total: 999999,
    unit: "ml",
    tone: "water",
    mhd: "Unbegrenzt",
    minAmount: 0,
    caloriesPer100g: 0,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
    isUnlimited: true,
  },
];

export interface NutrientSpecs {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export function getItemNutrientSpecs(item: Partial<PantryItem> & { name: string; category?: string }): NutrientSpecs {
  if (typeof item.caloriesPer100g === "number" && item.caloriesPer100g > 0 && item.caloriesPer100g !== 180) {
    return {
      caloriesPer100g: item.caloriesPer100g,
      proteinPer100g: item.proteinPer100g || 0,
      carbsPer100g: item.carbsPer100g || 0,
      fatPer100g: item.fatPer100g || 0,
    };
  }

  const nutrition = findFoodNutrition(item.name || "", item.category);
  return {
    caloriesPer100g: nutrition.calories,
    proteinPer100g: nutrition.protein,
    carbsPer100g: nutrition.carbs,
    fatPer100g: nutrition.fat,
  };
}

export function calculateItemTotalNutrients(item: PantryItem) {
  if (!item.amount || item.amount <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const specs = getItemNutrientSpecs(item);
  let factor = 0;
  const unit = (item.unit || "").toLowerCase();

  if (unit === "g" || unit === "ml") {
    factor = item.amount / 100;
  } else if (unit === "kg" || unit === "l") {
    factor = (item.amount * 1000) / 100;
  } else if (unit === "bund") {
    // 1 Bund (Frühlingszwiebeln, Kräuter) ist typischerweise ~100g
    factor = (item.amount * 100) / 100;
  } else if (unit.includes("stk") || unit.includes("stück")) {
    const lower = item.name.toLowerCase();
    const weightPerPiece = isEggIngredientName(lower)
      ? 55
      : lower.includes("frühlingszwiebel") || lower.includes("lauchzwiebel")
        ? 20
        : lower.includes("zwiebel") || lower.includes("lauch")
          ? 100
          : lower.includes("limette") || lower.includes("zitrone")
            ? 60
            : lower.includes("apfel")
              ? 180
              : lower.includes("banane")
                ? 120
                : lower.includes("paprika")
                  ? 160
                  : lower.includes("gurke")
                    ? 350
                    : lower.includes("karotte") || lower.includes("möhre")
                      ? 100
                      : lower.includes("knoblauch")
                        ? 5
                        : 60;
    factor = (item.amount * weightPerPiece) / 100;
  } else if (unit === "dose") {
    factor = (item.amount * 400) / 100;
  } else if (unit === "packung" || unit === "pkg." || unit === "pkg") {
    factor = (item.amount * 500) / 100;
  } else if (unit === "flasche") {
    factor = (item.amount * 750) / 100;
  } else if (unit === "glas") {
    factor = (item.amount * 350) / 100;
  } else {
    factor = item.amount / 100;
  }

  return {
    calories: Math.round(specs.caloriesPer100g * factor),
    protein: Math.round(specs.proteinPer100g * factor * 10) / 10,
    carbs: Math.round(specs.carbsPer100g * factor * 10) / 10,
    fat: Math.round(specs.fatPer100g * factor * 10) / 10,
  };
}

export interface GroceryItem {
  id: number;
  name: string;
  quantity: string;
  price: string;
  category: string;
  reason: string;
}

const defaultGroceries: GroceryItem[] = [
  { id: 1, name: "TK-Erbsen", quantity: "1 × 450g", price: "2,19 €", category: "Kühl & Tiefkühl", reason: "Aktuell leer" },
  { id: 2, name: "Sojasoße", quantity: "1 × 250ml", price: "2,49 €", category: "Saucen & Gewürze", reason: "Mindestbestand unterschritten" },
  { id: 3, name: "Bio Eier", quantity: "10 Stück", price: "3,29 €", category: "Kühl & Tiefkühl", reason: "Für geplante Rezepte" },
  { id: 4, name: "Frühlingszwiebeln", quantity: "1 Bund", price: "1,19 €", category: "Obst & Gemüse", reason: "Bald aufgebraucht" },
  { id: 5, name: "Limetten", quantity: "2 Stück", price: "0,98 €", category: "Obst & Gemüse", reason: "Für geplante Rezepte" },
];

function AppHeader({
  onOpenHousehold,
  syncStatus = "idle",
  hasCloudUser = false,
}: {
  onOpenHousehold: () => void;
  syncStatus?: "idle" | "saving" | "saved" | "error";
  hasCloudUser?: boolean;
}) {
  let label = "Lokal";
  let title = "Haushalt & Cloud-Sync einrichten";
  let statusClass = "";

  if (hasCloudUser) {
    if (syncStatus === "saving") {
      label = "Speichert…";
      title = "Speichere Daten in der Supabase Cloud…";
      statusClass = "syncing";
    } else if (syncStatus === "error") {
      label = "Sync-Fehler";
      title = "Cloud-Synchronisation fehlgeschlagen. Bitte Internetverbindung prüfen.";
      statusClass = "sync-error";
    } else {
      label = "Gespeichert";
      title = "Live Cloud-Sync aktiv (Supabase)";
      statusClass = "cloud-live";
    }
  }

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark"><Icon name="leaf" size={17} /></div>
        <span>Vorrat</span>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className={`sync-state ${statusClass}`}
          onClick={onOpenHousehold}
          title={title}
        >
          <span className="sync-dot" />
          <span className="sync-label">{label}</span>
        </button>
      </div>
    </header>
  );
}

// PANTRY_CATEGORY_GROUPS and getCategoryGroupKey are imported from ./screens/PantryScreen.tsx

// CookScreen extracted to ./screens/CookScreen.tsx

export function parseGroceryQuantity(
  quantityStr: string,
  itemName: string
): { amount: number; unit: string; total: number } {
  const q = (quantityStr || "").toLowerCase().trim();
  const name = (itemName || "").toLowerCase();

  // 1. Check for kg
  const kgMatch = q.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kgMatch) {
    const mult = kgMatch[1] ? parseInt(kgMatch[1], 10) : 1;
    const val = parseFloat(kgMatch[2].replace(",", "."));
    const grams = Math.round(mult * val * 1000);
    return { amount: grams, unit: "g", total: grams };
  }

  // 2. Check for grams (g), e.g. "1 × 450g", "450 g", "500g"
  const gMatch = q.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*g\b/);
  if (gMatch) {
    const mult = gMatch[1] ? parseInt(gMatch[1], 10) : 1;
    const val = parseFloat(gMatch[2].replace(",", "."));
    const grams = Math.round(mult * val);
    return { amount: grams, unit: "g", total: grams };
  }

  // 3. Check for liter (l / liter)
  const lMatch = q.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(?:l\b|liter)/);
  if (lMatch) {
    const mult = lMatch[1] ? parseInt(lMatch[1], 10) : 1;
    const val = parseFloat(lMatch[2].replace(",", "."));
    const ml = Math.round(mult * val * 1000);
    return { amount: ml, unit: "ml", total: ml };
  }

  // 4. Check for ml, e.g. "1 × 250ml", "250 ml"
  const mlMatch = q.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (mlMatch) {
    const mult = mlMatch[1] ? parseInt(mlMatch[1], 10) : 1;
    const val = parseFloat(mlMatch[2].replace(",", "."));
    const ml = Math.round(mult * val);
    return { amount: ml, unit: "ml", total: ml };
  }

  // 5. Check for Stück / Stk. / Stückzahl
  const stkMatch = q.match(/(?:(\d+)\s*[x×]\s*)?(\d+)\s*(?:stück|stk)/);
  if (stkMatch) {
    const mult = stkMatch[1] ? parseInt(stkMatch[1], 10) : 1;
    const count = parseInt(stkMatch[2], 10) * mult;
    return { amount: count, unit: "Stk.", total: count };
  }

  // 6. Check for Bund
  const bundMatch = q.match(/(\d+)\s*bund/);
  if (bundMatch) {
    const count = parseInt(bundMatch[1], 10) * 5;
    return { amount: count, unit: "Stk.", total: count };
  }

  // 7. Check for leading number without explicit unit
  const numMatch = q.match(/^(\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    const val = Math.round(parseFloat(numMatch[1].replace(",", ".")));
    if (
      isEggIngredientName(name) ||
      name.includes("zwiebel") ||
      name.includes("limette") ||
      name.includes("zitrone") ||
      name.includes("avocado") ||
      name.includes("apfel")
    ) {
      return { amount: val, unit: "Stk.", total: val };
    }
    return { amount: val, unit: "g", total: val };
  }

  // Fallbacks by food type
  if (name.includes("soja") || name.includes("öl") || name.includes("sauce") || name.includes("milch")) {
    return { amount: 250, unit: "ml", total: 250 };
  }
  if (isEggIngredientName(name)) {
    return { amount: 10, unit: "Stk.", total: 10 };
  }
  if (name.includes("zwiebel")) {
    return { amount: 5, unit: "Stk.", total: 5 };
  }
  if (name.includes("limette") || name.includes("zitrone")) {
    return { amount: 2, unit: "Stk.", total: 2 };
  }

  return { amount: 500, unit: "g", total: 500 };
}

// ShoppingScreen extracted to ./screens/GroceriesScreen.tsx

function BottomNav({
  active,
  pantryBadge = 0,
  shoppingCount = 0,
  onChange,
}: {
  active: Tab;
  pantryBadge?: number;
  shoppingCount?: number;
  savedCount?: number;
  plannedCount?: number;
  onChange: (tab: Tab) => void;
}) {
  const items: { id: Tab; label: string; icon: IconName; count?: number; badgeStyle?: "warning" | "shop" }[] = [
    {
      id: "pantry",
      label: "Vorrat",
      icon: "archive",
      count: pantryBadge > 0 ? pantryBadge : undefined,
      badgeStyle: "warning",
    },
    { id: "discover", label: "Entdecken", icon: "sparkles" },
    { id: "planner", label: "Planer", icon: "calendar" },
    { id: "cook", label: "Kochbuch", icon: "book" },
    {
      id: "shop",
      label: "Einkauf",
      icon: "cart",
      count: shoppingCount > 0 ? shoppingCount : undefined,
      badgeStyle: "shop",
    },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${active === item.id ? "active" : ""}`}
          onClick={() => onChange(item.id)}
          type="button"
          aria-label={item.label}
        >
          <span className="nav-icon">
            <Icon name={item.icon} size={20} strokeWidth={active === item.id ? 2.2 : 1.8} />
            {item.count !== undefined && item.count > 0 && (
              <b className={item.badgeStyle === "shop" ? "badge-shop" : "badge-warning"}>
                {item.count}
              </b>
            )}
          </span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (saved) return JSON.parse(saved);
    } catch { }
    return ["r1", "r2"];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch { }
  }, [favorites]);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSurpriseModalOpen, setIsSurpriseModalOpen] = useState(false);

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
    } catch { }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(pantry));
    } catch { }
  }, [pantry]);

  const [customRecipes, setCustomRecipes] = useState<CatalogRecipe[]>(() => getStoredCustomRecipes());

  const allRecipes = useMemo(() => {
    const customIds = new Set(customRecipes.map((r) => r.id));
    return [...customRecipes, ...FULL_RECIPE_CATALOG.filter((r) => !customIds.has(r.id))];
  }, [customRecipes]);

  const handleAddCustomRecipe = (recipe: CatalogRecipe) => {
    const safeRecipe = rehydrateCustomRecipe(recipe);
    setCustomRecipes((prev) => [safeRecipe, ...prev.filter((r) => r.id !== safeRecipe.id)]);
  };

  const handleUpdateCustomRecipe = (recipe: CatalogRecipe) => {
    const safeRecipe = rehydrateCustomRecipe(recipe);
    setCustomRecipes((prev) => {
      const exists = prev.some((r) => r.id === safeRecipe.id);
      if (exists) {
        return prev.map((r) => (r.id === safeRecipe.id ? safeRecipe : r));
      }
      return [safeRecipe, ...prev];
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(customRecipes));
    } catch { }
  }, [customRecipes]);

  const [cookSelectedRecipeId, setCookSelectedRecipeId] = useState<string | null>(null);
  const [cookSelectedServings, setCookSelectedServings] = useState<number>(2);

  const handleStartCookingFromPlanner = (recipeId: string, servings: number) => {
    setFavorites((prev) => (prev.includes(recipeId) ? prev : [...prev, recipeId]));
    setCookSelectedRecipeId(recipeId);
    setCookSelectedServings(servings);
    setActiveTab("cook");
    const found = allRecipes.find((r) => r.id === recipeId);
    notify(`«${found ? found.title : "Rezept"}» im Koch-Tab geöffnet (${servings} ${servings === 1 ? "Portion" : "Portionen"})`);
  };

  const [editingPantryItem, setEditingPantryItem] = useState<PantryItem | null>(null);

  const handleUpdatePantryItem = (updated: PantryItem) => {
    setPantry((prev) => prev.map((item) => (String(item.id) === String(updated.id) ? updated : item)));
    notify(`«${updated.name}» aktualisiert`);
  };

  const handleDeletePantryItem = (id: number | string) => {
    const itemToDelete = pantry.find((p) => String(p.id) === String(id));
    setPantry((prev) => prev.filter((item) => String(item.id) !== String(id)));
    setEditingPantryItem(null);
    notify(itemToDelete ? `«${itemToDelete.name}» gelöscht` : "Produkt gelöscht");
  };

  const [groceries, setGroceries] = useState<GroceryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GROCERIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return decomposeCompositeIngredients(parsed);
        }
      }
    } catch { }
    return [];
  });

  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WEEKLY_PLAN);
      if (saved) return JSON.parse(saved);
    } catch { }
    return [
      { id: "p1", recipeId: "r1", recipeTitle: "Egg Fried Rice Deluxe", dayId: "mo", mealSlot: "dinner", servings: 2 },
      { id: "p2", recipeId: "r2", recipeTitle: "Grüne Reis-Bowl", dayId: "di", mealSlot: "lunch", servings: 2 },
      { id: "p3", recipeId: "r3", recipeTitle: "Zitronen-Hähnchen mit Basmatireis", dayId: "do", mealSlot: "dinner", servings: 2 },
      { id: "p4", recipeId: "r5", recipeTitle: "Schnelles Wok-Gemüse mit Ei", dayId: "sa", mealSlot: "dinner", servings: 2 },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WEEKLY_PLAN, JSON.stringify(plannedMeals));
    } catch { }
  }, [plannedMeals]);

  const addPlannedMeal = (meal: Omit<PlannedMeal, "id">) => {
    const newMeal: PlannedMeal = {
      ...meal,
      id: "plan-" + Date.now() + Math.random().toString(36).substring(2, 6),
    };
    setPlannedMeals((prev) => [...prev, newMeal]);
  };

  const removePlannedMeal = (id: string) => {
    setPlannedMeals((prev) => prev.filter((m) => m.id !== id));
    notify("Mahlzeit aus Wochenplan entfernt");
  };

  const updateMealServings = (id: string, servings: number) => {
    setPlannedMeals((prev) =>
      prev.map((m) => (m.id === id ? { ...m, servings } : m))
    );
  };

  const movePlannedMeal = (id: string, newDay: WeekdayId) => {
    setPlannedMeals((prev) =>
      prev.map((m) => (m.id === id ? { ...m, dayId: newDay } : m))
    );
    const dayName = WEEKDAYS.find((w) => w.id === newDay)?.name;
    notify(`Mahlzeit auf ${dayName} verschoben`);
  };

  const clearPlan = () => {
    setPlannedMeals([]);
    notify("Wochenplan geleert");
  };

  const autoPlanWeek = () => {
    const pool = favorites.length > 0
      ? allRecipes.filter((r) => favorites.includes(r.id))
      : allRecipes.slice(0, 5);

    const targetDays: WeekdayId[] = ["mo", "di", "mi", "do", "fr"];
    const generated: PlannedMeal[] = targetDays.map((dayId, idx) => {
      const rec = pool[idx % pool.length];
      return {
        id: "auto-" + dayId + "-" + Date.now() + "-" + idx,
        recipeId: rec.id,
        recipeTitle: rec.title,
        dayId,
        mealSlot: idx % 2 === 0 ? "dinner" : "lunch",
        servings: 2,
      };
    });

    setPlannedMeals(generated);
    notify("Gemerkte Mahlzeiten auf Wochentage verteilt");
  };

  const syncWeeklyShopping = (newItems: GroceryItem[]) => {
    setGroceries((prev) => {
      const updated = [...prev];
      newItems.forEach((item) => {
        const existingIdx = updated.findIndex(
          (g) => g.name.toLowerCase().includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(g.name.toLowerCase())
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: item.quantity,
            reason: item.reason,
          };
        } else {
          updated.push(item);
        }
      });
      return updated;
    });
  };

  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  // Supabase Auto-Sync Hook (Debounced save & status management)
  const { syncStatus, hasCloudUser, setHasCloudUser } = useCloudSync({
    pantry,
    setPantry,
    groceries,
    setGroceries,
    customRecipes,
    setCustomRecipes,
    plannedMeals,
    setPlannedMeals,
    favorites,
    setFavorites,
  });

  const [addModalMode, setAddModalMode] = useState<"menu" | "camera" | "receipt" | "manual">("menu");
  const handleOpenAddModal = (mode: "menu" | "camera" | "receipt" | "manual" = "menu") => {
    setAddModalMode(mode);
    setIsAddModalOpen(true);
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expiringSearchIngredients, setExpiringSearchIngredients] = useState<string[]>([]);

  const [foodWasteSaved, setFoodWasteSaved] = useState<{ count: number; money: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FOOD_WASTE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.count === "number" && typeof parsed.money === "number") {
          return parsed;
        }
      }
    } catch { }
    return { count: 0, money: 0 };
  });

  const handleCookFromExpiring = (urgentItemNames: string[]) => {
    setExpiringSearchIngredients(urgentItemNames);
    setActiveTab("discover");
    notify(
      `Reste-Modus aktiv: ${urgentItemNames.length} ablaufende ${urgentItemNames.length === 1 ? "Zutat" : "Zutaten"
      } priorisiert!`
    );
  };

  const handleClearExpiringFilter = () => {
    setExpiringSearchIngredients([]);
    notify("Reste-Filter zurückgesetzt");
  };

  const handleSaveImportedRecipe = (
    recipe: CatalogRecipe,
    addMissingToGroceries: boolean,
    missingItems: Array<{ name: string; amount?: string }>
  ) => {
    handleAddCustomRecipe(recipe);
    setFavorites((prev) => (prev.includes(recipe.id) ? prev : [recipe.id, ...prev]));
    if (addMissingToGroceries && missingItems.length > 0) {
      handleAddMissingToGroceries(missingItems);
    }
  };

  // Sync groceries to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(groceries));
    } catch { }
  }, [groceries]);

  const updateAmount = (id: number | string, delta: number) => {
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
  };

  const updateCategory = (id: number | string, newCategory: string) => {
    setPantry((items) =>
      items.map((item) => {
        if (String(item.id) === String(id)) {
          return { ...item, category: newCategory };
        }
        return item;
      })
    );
    notify("Lagerort aktualisiert");
  };

  const handleClearGroceries = () => {
    setGroceries([]);
    try {
      localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify([]));
    } catch { }
    notify("Einkaufsliste geleert");
  };

  const expiringPantryCount = useMemo(
    () => pantry.filter((item) => isItemExpiringSoonOrCritical(item)).length,
    [pantry]
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const cookRecipe = (recipeTitle: string, servings: number) => {
    const result = applyCookingDeduction(recipeTitle, servings, pantry, allRecipes);
    setPantry(result.updatedPantry);

    // Save food waste counter
    if (result.savedUrgentCount > 0) {
      setFoodWasteSaved((prev) => {
        const next = {
          count: prev.count + result.savedUrgentCount,
          money: Number((prev.money + result.savedUrgentCount * 2.5).toFixed(2)),
        };
        try {
          localStorage.setItem(STORAGE_KEYS.FOOD_WASTE, JSON.stringify(next));
        } catch { }
        return next;
      });
    }

    // Auto-check for low ingredients & add to groceries
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
      `«${recipeTitle}» gekocht! Vorrat für ${servings} Pers. aktualisiert${result.deductedItems.length > 0 ? ` (${result.deductedItems.slice(0, 2).join(", ")})` : ""
      }`
    );
  };

  const completeShopping = (checkedIds: number[]) => {
    const itemsToRestock = groceries.filter((g) => checkedIds.includes(g.id));
    if (itemsToRestock.length === 0) return;

    const restockedSummary: string[] = [];

    // 1. Update pantry items
    setPantry((prevPantry) => {
      let updatedPantry = [...prevPantry];

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

            // Set fresh MHD if missing, expired, or soon
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
          // Create new pantry item
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

    // 2. Remove checked items from groceries
    setGroceries((prev) => prev.filter((g) => !checkedIds.includes(g.id)));

    // 3. Toast notification
    const summary = restockedSummary.slice(0, 2).join(", ");
    const more = restockedSummary.length > 2 ? ` (+${restockedSummary.length - 2} weitere)` : "";
    notify(`${itemsToRestock.length} Artikel eingekauft · ${summary}${more} in Vorrat verbucht`);
  };

  const handleBarcodeScanned = (scanned: Partial<PantryItem>) => {
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
  };

  const handleReceiptImported = (importedItems?: Array<Omit<PantryItem, "id"> & { price?: number }>) => {
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
      } catch {}
    }

    notify(result.toastMessage);
  };

  const handleAddProduct = (item: Omit<PantryItem, "id">) => {
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
  };

  const handleResetDemo = () => {
    setPantry(defaultPantry);
    setGroceries(defaultGroceries);
    try {
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(defaultPantry));
      localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(defaultGroceries));
    } catch { }
    notify("Standard-Demo Vorrat & Einkaufsliste wiederhergestellt!");
  };

  const handleClearPantry = () => {
    setPantry([]);
    try {
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify([]));
    } catch { }
    notify("Vorrat komplett geleert (0 Produkte)");
  };

  const handleDeduplicatePantry = () => {
    setPantry((prev) => {
      const cleaned = deduplicatePantry(prev);
      try {
        localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(cleaned));
      } catch { }
      return cleaned;
    });
    notify("Duplikate erfolgreich zusammengeführt & bereinigt!");
  };

  const handleWipeEverything = () => {
    setPantry([]);
    setGroceries([]);
    setCustomRecipes([]);
    setFavorites([]);
    setPlannedMeals([]);
    setFoodWasteSaved({ count: 0, money: 0 });
    setExpiringSearchIngredients([]);
    wipeAllAppData();
    notify("Account komplett geleert: Vorrat, Rezepte, Einkauf & Wochenplan auf 0!");
  };

  const handleFullReset = () => {
    setPantry(defaultPantry);
    setGroceries(defaultGroceries);
    setFoodWasteSaved({ count: 0, money: 0 });
    setExpiringSearchIngredients([]);
    try {
      wipeAllAppData();
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(defaultPantry));
      localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(defaultGroceries));
    } catch { }
    notify("Gesamter App-Speicher zurückgesetzt!");
  };

  const toggleFavorite = (recipeId: string, recipeTitle: string) => {
    setFavorites((prev) => {
      const isFav = prev.includes(recipeId);
      let next: string[];
      if (isFav) {
        next = prev.filter((id) => id !== recipeId);
        notify(`«${recipeTitle}» aus gemerkten Meals entfernt`);
      } else {
        next = [...prev, recipeId];
        notify(`«${recipeTitle}» zu gemerkten Meals hinzugefügt`);
      }
      return next;
    });
  };

  const handleDeleteRecipe = (recipe: CatalogRecipe) => {
    deleteStoredCustomRecipe(recipe.id);
    markRecipeAsDeleted(recipe.id);
    setCustomRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    setFavorites((prev) => prev.filter((id) => id !== recipe.id));
    notify(`🗑️ «${recipe.title}» wurde gelöscht.`);
  };

  const bookmarkRecipe = (recipeId: string, recipeTitle: string) => {
    setFavorites((prev) => {
      if (prev.includes(recipeId)) {
        notify(`«${recipeTitle}» ist bereits gemerkt`);
        return prev;
      }
      const next = [...prev, recipeId];
      notify(`«${recipeTitle}» gemerkt! Zu gemerkten Mahlzeiten hinzugefügt.`);
      return next;
    });
  };

  const handleAddMissingToGroceries = (items: Array<{ name: string; amount?: string }>) => {
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
  };

  return (
    <div className="app-shell">
      <AppHeader
        onOpenHousehold={() => setIsHouseholdModalOpen(true)}
        syncStatus={syncStatus}
        hasCloudUser={hasCloudUser}
      />

      {activeTab === "pantry" && (
        <PantryScreen
          pantry={pantry}
          updateAmount={updateAmount}
          onUpdateCategory={updateCategory}
          onOpenAddModal={handleOpenAddModal}
          onLoadDemoPantry={() => setPantry(defaultPantry)}
          onEditItem={(item) => setEditingPantryItem(item)}
          onDeleteItem={handleDeletePantryItem}
          onOpenReset={() => setIsResetModalOpen(true)}
          onCookFromExpiring={handleCookFromExpiring}
          onResetDemo={handleResetDemo}
          savedWasteStats={foodWasteSaved}
          onAddToGroceries={(name, amount) => handleAddMissingToGroceries([{ name, amount: amount || "1 Glas" }])}
        />
      )}

      {activeTab === "discover" && (
        <CookScreen
          pantry={pantry}
          customRecipes={customRecipes}
          onAddCustomRecipe={handleAddCustomRecipe}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onBookmark={bookmarkRecipe}
          onCook={cookRecipe}
          onNavigateToCook={() => setActiveTab("cook")}
          onAddMissingToGroceries={handleAddMissingToGroceries}
          onOpenImportRecipe={() => setIsImportModalOpen(true)}
          isSurpriseModalOpen={isSurpriseModalOpen}
          onSetIsSurpriseModalOpen={setIsSurpriseModalOpen}
          expiringSearchIngredients={expiringSearchIngredients}
          onClearExpiringFilter={handleClearExpiringFilter}
          onDeleteRecipe={handleDeleteRecipe}
          onMicTrigger={() => {
            notify("Sprachnotiz: 'Reis & Eier schnell'");
          }}
          onNotify={notify}
        />
      )}

      {activeTab === "planner" && (
        <WeeklyMealPlannerScreen
          pantry={pantry}
          favorites={favorites}
          plannedMeals={plannedMeals}
          recipes={allRecipes}
          onAddPlannedMeal={addPlannedMeal}
          onRemovePlannedMeal={removePlannedMeal}
          onUpdateMealServings={updateMealServings}
          onMovePlannedMeal={movePlannedMeal}
          onClearPlan={clearPlan}
          onAutoPlanWeek={autoPlanWeek}
          onCookMeal={cookRecipe}
          onStartCookingMeal={handleStartCookingFromPlanner}
          onSyncWeeklyShopping={syncWeeklyShopping}
          onNavigateToShopping={() => setActiveTab("shop")}
          onNavigateToSavedMeals={() => setActiveTab("cook")}
          onNavigateToDiscover={() => setActiveTab("discover")}
          onNotify={notify}
        />
      )}

      {activeTab === "cook" && (
        <SavedMealsScreen
          pantry={pantry}
          favorites={favorites}
          recipes={allRecipes}
          initialRecipeId={cookSelectedRecipeId}
          initialServings={cookSelectedServings}
          onToggleFavorite={toggleFavorite}
          onCook={cookRecipe}
          onNavigateToDiscover={() => setActiveTab("discover")}
          onNavigateToPlanner={() => setActiveTab("planner")}
          onPlanMeal={(recipeId, recipeTitle, dayId, servings) =>
            addPlannedMeal({ recipeId, recipeTitle, dayId, servings })
          }
          onUpdateRecipe={handleUpdateCustomRecipe}
          onNotify={notify}
        />
      )}

      {activeTab === "shop" && (
        <GroceriesScreen
          groceries={groceries}
          onComplete={completeShopping}
          onToggleItem={() => { }}
          onDeleteGrocery={(id) => setGroceries((prev) => prev.filter((g) => g.id !== id))}
          onClearGroceries={handleClearGroceries}
          onNavigateToPlanner={() => setActiveTab("planner")}
          onNotify={notify}
        />
      )}

      <BottomNav
        active={activeTab}
        pantryBadge={expiringPantryCount}
        shoppingCount={groceries.length}
        savedCount={favorites.length}
        plannedCount={plannedMeals.length}
        onChange={setActiveTab}
      />

      {toast && (
        <div className="toast">
          <span><Icon name="check" size={15} /></span>
          {toast}
        </div>
      )}

      {/* Household Sync & Sharing Modal (WG / Familie Einladungslink & Supabase Cloud) */}
      {isHouseholdModalOpen && (
        <Suspense fallback={null}>
          <HouseholdSyncModal
            isOpen={isHouseholdModalOpen}
            onClose={() => setIsHouseholdModalOpen(false)}
            onNotify={notify}
            pantryCount={pantry.length}
            shoppingCount={groceries.length}
            pantryData={pantry}
            groceriesData={groceries}
            customRecipesData={customRecipes}
            mealPlanData={plannedMeals}
            onAuthChange={(isLoggedIn) => setHasCloudUser(isLoggedIn)}
            onRestoreData={(cloud) => {
              if (Array.isArray(cloud.pantry)) setPantry(cloud.pantry as PantryItem[]);
              if (Array.isArray(cloud.groceries)) setGroceries(cloud.groceries as GroceryItem[]);
              if (Array.isArray(cloud.customRecipes)) setCustomRecipes((cloud.customRecipes as any[]).map(rehydrateCustomRecipe));
              if (Array.isArray(cloud.mealPlan)) setPlannedMeals(cloud.mealPlan as PlannedMeal[]);
              if (Array.isArray(cloud.favorites)) setFavorites(cloud.favorites as string[]);
            }}
            onOpenReset={() => setIsResetModalOpen(true)}
          />
        </Suspense>
      )}

      {/* Account / Pantry Reset & Deduplication Modal */}
      {isResetModalOpen && (
        <Suspense fallback={null}>
          <AccountResetModal
            isOpen={isResetModalOpen}
            onClose={() => setIsResetModalOpen(false)}
            pantryCount={pantry.length}
            shoppingCount={groceries.length}
            recipesCount={customRecipes.length}
            plannedCount={plannedMeals.length}
            onResetDemo={handleResetDemo}
            onClearPantry={handleClearPantry}
            onDeduplicate={handleDeduplicatePantry}
            onFullReset={handleFullReset}
            onWipeEverything={handleWipeEverything}
            onNotify={notify}
          />
        </Suspense>
      )}

      {/* Unified Add Modal (Plus Button: Kamera, Bon, DB-Suche oder Manuell) */}
      {isAddModalOpen && (
        <UnifiedAddModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          groceries={groceries}
          onAddProduct={handleAddProduct}
          onImportReceipt={handleReceiptImported}
          onNotify={notify}
          initialMode={addModalMode}
        />
      )}

      {/* Edit Pantry Item Modal (MHD, Name, Bestand, Einheit) */}
      <EditPantryItemModal
        isOpen={Boolean(editingPantryItem)}
        item={editingPantryItem}
        onClose={() => setEditingPantryItem(null)}
        onSave={handleUpdatePantryItem}
        onDelete={handleDeletePantryItem}
      />

      {/* PWA Install Banner (iOS Safari & Android Offline Install) */}
      <PwaInstallBanner />

      {/* Recipe Import Modal (Web, Social Media, TikTok, Instagram) */}
      {isImportModalOpen && (
        <Suspense fallback={null}>
          <RecipeImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            pantryItems={pantry}
            onSaveRecipe={handleSaveImportedRecipe}
            onNotify={notify}
          />
        </Suspense>
      )}
    </div>
  );
}

