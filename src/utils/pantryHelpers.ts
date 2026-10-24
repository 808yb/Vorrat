import {
  findMatchingPantryItem,
  isSpiceOrKitchenBasic,
  deductIngredientFromPantryAmount,
  parseIngredientAmountAndUnit,
  getRecipePantryBreakdown,
} from "./pantryMatching";
import { isEggIngredientName } from "./recipeHelpers";
import { findFoodNutrition } from "../data/foodNutritionDatabase";
import { getFoodTone } from "../components/FoodIcons";
import { type CatalogRecipe } from "../data/recipeCatalog";

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

export interface NutrientSpecs {
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface GroceryItem {
  id: number;
  name: string;
  quantity: string;
  price: string;
  category: string;
  reason: string;
  checked?: boolean;
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

export const defaultGroceries: GroceryItem[] = [
  { id: 1, name: "TK-Erbsen", quantity: "1 × 450g", price: "2,19 €", category: "Kühl & Tiefkühl", reason: "Aktuell leer" },
  { id: 2, name: "Sojasoße", quantity: "1 × 250ml", price: "2,49 €", category: "Saucen & Gewürze", reason: "Mindestbestand unterschritten" },
  { id: 3, name: "Bio Eier", quantity: "10 Stück", price: "3,29 €", category: "Kühl & Tiefkühl", reason: "Für geplante Rezepte" },
  { id: 4, name: "Frühlingszwiebeln", quantity: "1 Bund", price: "1,19 €", category: "Obst & Gemüse", reason: "Bald aufgebraucht" },
  { id: 5, name: "Limetten", quantity: "2 Stück", price: "0,98 €", category: "Obst & Gemüse", reason: "Für geplante Rezepte" },
];

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

  const itemWithDays = item as { daysLeft?: number };
  if (typeof itemWithDays.daysLeft === "number") {
    return itemWithDays.daysLeft <= 3;
  }

  const mhdStatus = getMhdStatus(item.mhd);
  return mhdStatus === "soon" || mhdStatus === "expired";
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

export function parseGroceryQuantity(
  quantityStr: string,
  itemName: string
): { amount: number; unit: string; total: number } {
  const q = (quantityStr || "").toLowerCase().trim();
  const name = (itemName || "").toLowerCase();

  const kgMatch = q.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kgMatch) {
    const mult = kgMatch[1] ? parseInt(kgMatch[1], 10) : 1;
    const val = parseFloat(kgMatch[2].replace(",", "."));
    const grams = Math.round(mult * val * 1000);
    return { amount: grams, unit: "g", total: grams };
  }

  const gMatch = q.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*g\b/);
  if (gMatch) {
    const mult = gMatch[1] ? parseInt(gMatch[1], 10) : 1;
    const val = parseFloat(gMatch[2].replace(",", "."));
    const grams = Math.round(mult * val);
    return { amount: grams, unit: "g", total: grams };
  }

  const lMatch = q.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(?:l\b|liter)/);
  if (lMatch) {
    const mult = lMatch[1] ? parseInt(lMatch[1], 10) : 1;
    const val = parseFloat(lMatch[2].replace(",", "."));
    const ml = Math.round(mult * val * 1000);
    return { amount: ml, unit: "ml", total: ml };
  }

  const mlMatch = q.match(/(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*ml\b/);
  if (mlMatch) {
    const mult = mlMatch[1] ? parseInt(mlMatch[1], 10) : 1;
    const val = parseFloat(mlMatch[2].replace(",", "."));
    const ml = Math.round(mult * val);
    return { amount: ml, unit: "ml", total: ml };
  }

  const stkMatch = q.match(/(?:(\d+)\s*[x×]\s*)?(\d+)\s*(?:stück|stk)/);
  if (stkMatch) {
    const mult = stkMatch[1] ? parseInt(stkMatch[1], 10) : 1;
    const count = parseInt(stkMatch[2], 10) * mult;
    return { amount: count, unit: "Stk.", total: count };
  }

  const bundMatch = q.match(/(\d+)\s*bund/);
  if (bundMatch) {
    const count = parseInt(bundMatch[1], 10) * 5;
    return { amount: count, unit: "Stk.", total: count };
  }

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

/**
 * Deducts ingredients for a cooked recipe from pantry inventory with full unit-safety.
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
        (ing) => ing.matchedPantryItemName?.toLowerCase().trim() === itemNameLower
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
  const updatedPantry = [...currentPantry];

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
      return false;
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
