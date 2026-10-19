import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { ProductMark, getFoodTone } from "./components/FoodIcons";
import { FULL_RECIPE_CATALOG, type CatalogRecipe } from "./data/recipeCatalog";
import { getStoredCustomRecipes, generateRecipeWithGemini, rehydrateCustomRecipe } from "./utils/geminiRecipes";
import { getSafeIngredientsList, getSafeAvailable, getCurrentMealTimeSlot, decomposeCompositeIngredients } from "./utils/recipeHelpers";
import { CookingModal } from "./components/CookingModal";
import { RecipeSwipeDeck } from "./components/RecipeSwipeDeck";
import { getRecipePantryBreakdown, findMatchingPantryItem } from "./utils/pantryMatching";
import { UnifiedAddModal } from "./components/UnifiedAddModal";
import { EditPantryItemModal } from "./components/EditPantryItemModal";
import { SavedMealsScreen } from "./components/SavedMealsScreen";
import { HouseholdSyncModal } from "./components/HouseholdSyncModal";
import { findFoodNutrition } from "./data/foodNutritionDatabase";
import {
  backupUserDataToSupabase,
  fetchUserDataFromSupabase,
  getCurrentUser,
} from "./utils/supabaseClient";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import { RecipeImportModal } from "./components/RecipeImportModal";
import { AccountResetModal } from "./components/AccountResetModal";
import { SurpriseMeModal, type SurpriseFilters } from "./components/SurpriseMeModal";
import {
  WeeklyMealPlannerScreen,
  type PlannedMeal,
  type WeekdayId,
  WEEKDAYS,
} from "./components/WeeklyMealPlannerScreen";
import { STORAGE_KEYS, wipeAllAppData } from "./constants/storage";

// Re-export consolidated pantry matching function for backward compatibility
export { findMatchingPantryItem } from "./utils/pantryMatching";

type Tab = "pantry" | "discover" | "planner" | "cook" | "shop";
type IconName =
  | "archive"
  | "barcode"
  | "book"
  | "bookmark"
  | "bookmarkFilled"
  | "calendar"
  | "camera"
  | "cart"
  | "chart"
  | "check"
  | "chef"
  | "chevron"
  | "clock"
  | "close"
  | "flashlight"
  | "flame"
  | "leaf"
  | "mic"
  | "minus"
  | "pencil"
  | "plus"
  | "receipt"
  | "search"
  | "shuffle"
  | "sparkles"
  | "star"
  | "sync"
  | "timer"
  | "user"
  | "wand"
  | "trash"
  | "alert"
  | "dice"
  | "moon"
  | "fridge"
  | "snowflake"
  | "can"
  | "bottle"
  | "package";

function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className = "",
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    archive: (
      <>
        <path d="M4 7.5h16v12H4z" />
        <path d="M3 4.5h18v3H3zM9 11h6" />
      </>
    ),
    barcode: (
      <>
        <path d="M4 5v14M7 5v14M11 5v14M13.5 5v14M17 5v14M20 5v14" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
        <path d="M6 6h10" />
        <path d="M6 10h10" />
      </>
    ),
    bookmark: (
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    ),
    bookmarkFilled: (
      <path fill="currentColor" d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    camera: (
      <>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    flashlight: (
      <>
        <path d="M18 6c0 2-2 4-2 7v5a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-5c0-3-2-5-2-7V2h12v4z" />
        <line x1="6" y1="6" x2="18" y2="6" />
        <line x1="12" y1="12" x2="12" y2="12.01" />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.3 10.5h10.9L21 7H6" />
        <circle cx="9" cy="19" r="1.2" />
        <circle cx="18" cy="19" r="1.2" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="M18 17V9" />
        <path d="M13 17V5" />
        <path d="M8 17v-3" />
      </>
    ),
    flame: (
      <>
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chef: (
      <>
        <path d="M7 11v8h10v-8" />
        <path d="M7.2 12A4 4 0 0 1 9 4.5 4 4 0 0 1 16.8 6 3.2 3.2 0 0 1 17 12H7.2ZM9 15h6" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6 6 18" />,
    leaf: (
      <>
        <path d="M19 4C11 4 6 8.5 6 14c0 3 2.4 5 5 5 6 0 8-7 8-15Z" />
        <path d="M5 20c2-5 5.5-8.5 10-11" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="4" width="6" height="11" rx="3" />
        <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3M9 20h6" />
      </>
    ),
    minus: <path d="M6 12h12" />,
    pencil: (
      <>
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </>
    ),
    plus: <path d="M12 6v12M6 12h12" />,
    receipt: (
      <>
        <path d="M6 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2-3-2Z" />
        <path d="M9 9h6M9 13h6" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 4 4" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z" />
        <path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />
      </>
    ),
    star: (
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    ),
    shuffle: (
      <>
        <path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5" />
      </>
    ),
    sync: (
      <>
        <path d="M20 7h-5V2" />
        <path d="M19 7a8 8 0 0 0-13.8-1.8L3 7.5M4 17h5v5" />
        <path d="M5 17a8 8 0 0 0 13.8 1.8l2.2-2.3" />
      </>
    ),
    timer: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2" />
        <path d="M10 2h4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.7-4 3.2-6 7-6s6.3 2 7 6" />
      </>
    ),
    wand: (
      <>
        <path d="m4 20 10.5-10.5M12.5 7.5l4 4" />
        <path d="m18 3 .7 2.3L21 6l-2.3.7L18 9l-.7-2.3L15 6l2.3-.7L18 3Z" />
      </>
    ),
        trash: (
      <>
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </>
    ),
    dice: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        <circle cx="16" cy="16" r="1.2" fill="currentColor" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        <circle cx="16" cy="8" r="1.2" fill="currentColor" />
        <circle cx="8" cy="16" r="1.2" fill="currentColor" />
      </>
    ),
    moon: (
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    ),
    fridge: (
      <>
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M5 10h14M9 5v2M9 14v3" />
      </>
    ),
    snowflake: (
      <>
        <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
      </>
    ),
    can: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
        <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      </>
    ),
    bottle: (
      <path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3V2Z" />
    ),
    package: (
      <>
        <path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      {paths[name]}
    </svg>
  );
}

type ButtonProps = {
  children?: ReactNode;
  className?: string;
  icon?: IconName;
  onClick?: () => void;
  title?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
};

function Button({ children, className = "", icon, onClick, title, style, disabled }: ButtonProps) {
  return (
    <button className={className} onClick={onClick} title={title} type="button" style={style} disabled={disabled}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}


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

const defaultPantry: PantryItem[] = [
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
    const weightPerPiece = lower.includes("ei")
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
  isCloudSyncing = false,
  hasCloudUser = false,
}: {
  onOpenHousehold: () => void;
  isCloudSyncing?: boolean;
  hasCloudUser?: boolean;
}) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark"><Icon name="leaf" size={17} /></div>
        <span>Vorrat</span>
      </div>
      <div className="header-actions">
        <div
          className={`sync-state ${hasCloudUser ? "cloud-live" : ""} ${isCloudSyncing ? "syncing" : ""}`}
          onClick={onOpenHousehold}
          title={
            hasCloudUser
              ? isCloudSyncing
                ? "Synchronisiere mit Supabase Cloud..."
                : "Live Cloud-Sync aktiv (Supabase)"
              : "Haushalt & Cloud-Sync einrichten"
          }
          style={{ cursor: "pointer" }}
        >
          <span />
          <Icon name="sync" size={14} className={isCloudSyncing ? "spin-sync" : ""} />
          {hasCloudUser ? (isCloudSyncing ? "Sync..." : "Live") : "Synced"}
        </div>
      </div>
    </header>
  );
}

const PANTRY_CATEGORY_GROUPS: Array<{ id: string; name: string; iconName: IconName; chip: string }> = [
  { id: "Kühl", name: "Kühlschrank", iconName: "fridge", chip: "Kühlschrank" },
  { id: "Tiefkühl", name: "Tiefkühl (TK)", iconName: "snowflake", chip: "Tiefkühl" },
  { id: "Trocken", name: "Trockenvorrat", iconName: "can", chip: "Trockenvorrat" },
  { id: "Saucen", name: "Gewürze & Saucen", iconName: "sparkles", chip: "Gewürze & Saucen" },
  { id: "Getränke", name: "Getränke", iconName: "bottle", chip: "Getränke" },
  { id: "Sonstiges", name: "Sonstiges", iconName: "package", chip: "" },
];

function getCategoryGroupKey(cat: string): string {
  const c = (cat || "").toLowerCase();
  if (c.includes("tief") || c.includes("tk") || c.includes("gefrier")) return "Tiefkühl";
  if (c.includes("kühl")) return "Kühl";
  if (c.includes("trocken") || c.includes("reis") || c.includes("nudel") || c.includes("mehl") || c.includes("hafer") || c.includes("grund")) return "Trocken";
  if (c.includes("sauc") || c.includes("gewürz") || c.includes("öl") || c.includes("essig") || c.includes("dressing")) return "Saucen";
  if (c.includes("getränk") || c.includes("saft") || c.includes("wasser") || c.includes("tee") || c.includes("kaffee")) return "Getränke";
  return "Sonstiges";
}

function PantryScreen({
  pantry,
  updateAmount,
  onUpdateCategory,
  onOpenAddModal,
  onEditItem,
  onDeleteItem,
  onOpenReset,
  onCookFromExpiring,
  onResetDemo,
  savedWasteStats,
}: {
  pantry: PantryItem[];
  updateAmount: (id: number | string, delta: number) => void;
  onUpdateCategory?: (id: number | string, newCategory: string) => void;
  onOpenAddModal: () => void;
  onEditItem: (item: PantryItem) => void;
  onDeleteItem: (id: number | string) => void;
  onOpenReset?: () => void;
  onCookFromExpiring?: (urgentItemNames: string[]) => void;
  onResetDemo?: () => void;
  savedWasteStats?: { count: number; money: number };
}) {
  const [filter, setFilter] = useState("Alle");
  const [search, setSearch] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const toggleCat = (catId: string) => {
    setCollapsedCats((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const urgentItems = useMemo(() => {
    return pantry.filter(
      (item) =>
        !item.isUnlimited &&
        item.amount > 0 &&
        (getMhdStatus(item.mhd) === "soon" || getMhdStatus(item.mhd) === "expired")
    );
  }, [pantry]);

  const wasteStats = savedWasteStats ?? { count: 0, money: 0 };

  const chips = [
    "Alle",
    ...(urgentItems.length > 0 ? [`Dringend (${urgentItems.length})`] : ["Dringend"]),
    "Kühlschrank",
    "Tiefkühl",
    "Trockenvorrat",
    "Gewürze & Saucen",
    "Getränke",
  ];

  const visible = pantry.filter((item) => {
    const isUrgent =
      !item.isUnlimited &&
      item.amount > 0 &&
      (getMhdStatus(item.mhd) === "soon" || getMhdStatus(item.mhd) === "expired");

    const catKey = getCategoryGroupKey(item.category);

    const categoryMatch =
      filter === "Alle" ||
      (filter.startsWith("Dringend") && isUrgent) ||
      (filter === "Kühlschrank" && catKey === "Kühl") ||
      (filter === "Tiefkühl" && catKey === "Tiefkühl") ||
      (filter === "Trockenvorrat" && catKey === "Trocken") ||
      (filter === "Gewürze & Saucen" && catKey === "Saucen") ||
      (filter === "Getränke" && catKey === "Getränke");
    return categoryMatch && item.name.toLowerCase().includes(search.toLowerCase());
  });

  const renderProductCard = (item: PantryItem) => {
    const isUnlimited = Boolean(item.isUnlimited || item.name.toLowerCase().includes("wasser") || item.amount >= 99999);
    const percent = isUnlimited ? 100 : Math.min(100, Math.round((item.amount / item.total) * 100));
    const status = isUnlimited ? "Vorhanden" : percent === 0 ? "Leer" : percent <= 25 ? "Niedrig" : "Vorhanden";
    const step = item.unit === "g" ? 50 : item.unit === "ml" ? 25 : 1;
    const catGroup = getCategoryGroupKey(item.category);

    return (
      <article
        className="product-card clickable"
        key={item.id}
        onClick={() => onEditItem(item)}
      >
        <ProductMark tone={item.tone} name={item.name} category={item.category} />
        <div className="product-content">
          <div className="product-heading">
            <div className="product-title-row">
              <h3>{item.name}</h3>
              <div className="product-action-icons">
                <button
                  type="button"
                  className="product-edit-icon-btn"
                  title="Vorrat bearbeiten"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditItem(item);
                  }}
                >
                  <Icon name="pencil" size={12} />
                </button>
                <button
                  type="button"
                  className="product-delete-icon-btn"
                  title="Aus Vorrat löschen"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id);
                  }}
                >
                  <Icon name="trash" size={12} />
                </button>
              </div>
            </div>
            <span className={`status ${status.toLowerCase()}`}>
              {isUnlimited ? "Unbegrenzt" : status}
            </span>
          </div>

          <div className="product-sub-row">
            <select
              className="product-cat-select"
              value={catGroup}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                if (onUpdateCategory) {
                  onUpdateCategory(item.id, e.target.value);
                }
              }}
              title="Lagerort / Kategorie direkt ändern"
            >
              <option value="Kühl">Kühlschrank</option>
              <option value="Tiefkühl">Tiefkühl</option>
              <option value="Trocken">Trocken</option>
              <option value="Saucen">Gewürze/Saucen</option>
              <option value="Getränke">Getränke</option>
              <option value="Sonstiges">Sonstiges</option>
            </select>
            <span className={`mhd-badge ${getMhdStatus(item.mhd)}`}>
              {formatMhdDisplay(item.mhd)}
            </span>
            {(() => {
              const specs = getItemNutrientSpecs(item);
              return (
                <span
                  className="product-macro-badge"
                  title={`Makros pro 100g: ${specs.caloriesPer100g} kcal · ${specs.proteinPer100g}g Protein · ${specs.carbsPer100g}g Carbs · ${specs.fatPer100g}g Fett`}
                >
                  <strong style={{ color: "#0f172a" }}>{specs.caloriesPer100g}</strong> kcal
                  <span style={{ color: "#cbd5e1" }}>·</span>
                  <strong style={{ color: "#059669" }}>{specs.proteinPer100g}g</strong> P
                </span>
              );
            })()}
          </div>
          <div className="stock-row">
            {isUnlimited ? (
              <span className="unlimited-stock-badge" style={{ color: "#2d5a3e", fontWeight: 700, fontSize: "12px" }}>
                ∞ Immer vorrätig
              </span>
            ) : (
              <span>
                {item.amount}{item.unit} <small>/ {item.total}{item.unit}</small>
              </span>
            )}
            {!isUnlimited && (
              <div className="stepper" onClick={(e) => e.stopPropagation()}>
                <Button
                  className="stepper-button"
                  onClick={() => updateAmount(item.id, -step)}
                >
                  <Icon name="minus" size={14} />
                </Button>
                <Button
                  className="stepper-button plus"
                  onClick={() => updateAmount(item.id, step)}
                >
                  <Icon name="plus" size={14} />
                </Button>
              </div>
            )}
          </div>
          <div className="progress-track">
            <motion.div
              className={`progress-bar-fill ${isUnlimited ? "vorhanden" : status.toLowerCase()}`}
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 24,
                mass: 0.6,
              }}
            />
          </div>
        </div>
      </article>
    );
  };

  return (
    <main className="screen pantry-screen">
      <section className="title-row">
        <div><p className="eyebrow">Deine Küche</p><h1>Vorrat</h1></div>
        <div className="summary-pill"><span>{pantry.length}</span> Produkte</div>
      </section>

      {/* Food Waste Retter Alert Banner */}
      {urgentItems.length > 0 && (
        <div className="food-waste-alert-banner">
          <div className="food-waste-header">
            <span className="waste-badge" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Icon name="alert" size={13} /> Food-Waste Alarm</span>
            <span className="waste-count">
              {urgentItems.length} {urgentItems.length === 1 ? "Zutat läuft bald ab" : "Zutaten laufen bald ab"}
            </span>
          </div>
          <p className="waste-names">
            {urgentItems.map((u) => u.name).slice(0, 4).join(" · ")}
          </p>
          <div className="waste-action-row">
            <button
              type="button"
              className="waste-cook-btn"
              onClick={() => {
                if (onCookFromExpiring) {
                  onCookFromExpiring(urgentItems.map((u) => u.name));
                }
              }}
            >
              <span>Aus Resten kochen</span>
              <Icon name="chevron" size={14} />
            </button>
            <div className="waste-saved-pill" title="Bereits gerettete Lebensmittel">
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Icon name="leaf" size={12} /> Bisher gerettet: {wasteStats.count} Zutaten (~{wasteStats.money.toFixed(0)} €)</span>
            </div>
          </div>
        </div>
      )}

      <label className="search-field">
        <Icon name="search" size={18} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Vorrat durchsuchen"
        />
        {search && (
          <Button className="clear-button" onClick={() => setSearch("")}>
            <Icon name="close" size={15} />
          </Button>
        )}
      </label>

      <div className="chip-row hide-scrollbar">
        {chips.map((chip) => (
          <Button
            key={chip}
            className={`chip ${filter === chip ? "active" : ""}`}
            onClick={() => setFilter(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>

      <div className="section-heading">
        <div><h2>Lebensmittel</h2><p>In Kategorien geordnet · Nach Füllstand sortiert</p></div>
      </div>

      {/* Product List Grouped into Dropdown Accordions */}
      {filter === "Alle" ? (
        <div className="pantry-category-sections">
          {PANTRY_CATEGORY_GROUPS.map((group) => {
            const itemsInGroup = visible.filter(
              (item) => getCategoryGroupKey(item.category) === group.id
            );
            if (itemsInGroup.length === 0) return null;
            const isCollapsed = Boolean(collapsedCats[group.id]);

            return (
              <div key={group.id} className="pantry-category-group">
                <button
                  type="button"
                  className="pantry-category-header"
                  onClick={() => toggleCat(group.id)}
                  aria-expanded={!isCollapsed}
                >
                  <div className="pantry-cat-title">
                    <span className="pantry-cat-icon" style={{ display: "inline-flex", alignItems: "center" }}><Icon name={group.iconName} size={15} /></span>
                    <h3>{group.name}</h3>
                    <span className="pantry-cat-count">{itemsInGroup.length}</span>
                  </div>
                  <span className={`pantry-cat-chevron ${isCollapsed ? "collapsed" : ""}`}>
                    <Icon name="chevron" size={14} />
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="inventory-list">
                    {itemsInGroup.map(renderProductCard)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="inventory-list">
          {visible.map(renderProductCard)}
        </div>
      )}

        {visible.length === 0 && (
          <div
            style={{
              padding: "36px 20px",
              textAlign: "center",
              background: "#ffffff",
              borderRadius: "18px",
              border: "1.5px dashed #cbd5e1",
              margin: "12px 0",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#f1f5f9",
                color: "#64748b",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 12px",
              }}
            >
              <Icon name="archive" size={24} />
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: "15px", color: "#0f172a", fontWeight: 750 }}>
              {pantry.length === 0 ? "Keine Lebensmittel im Vorrat" : "Keine Treffer gefunden"}
            </h3>
            <p style={{ margin: "0 auto 14px", fontSize: "12.5px", color: "#64748b", maxWidth: "280px" }}>
              {pantry.length === 0
                ? "Füge Vorräte über den grünen Plus-Button hinzu oder stelle die Standard-Demo wieder her."
                : `Keine Vorräte für den Filter «${filter}» vorhanden.`}
            </p>
            {pantry.length === 0 && onResetDemo && (
              <Button
                className="primary-button"
                onClick={onResetDemo}
                style={{ padding: "8px 18px", fontSize: "12.5px", margin: "0 auto", display: "inline-flex" }}
              >
                Standard-Demo laden
              </Button>
            )}
          </div>
        )}

      {/* Bottom Management & Reset Action */}
      {pantry.length > 0 && onOpenReset && (
        <div className="pantry-bottom-actions">
          <button
            type="button"
            className="pantry-bottom-reset-btn"
            onClick={onOpenReset}
            title="Vorrat verwalten / Duplikate fixen / Reset"
          >
            <Icon name="trash" size={13} />
            <span>Vorrat verwalten, Duplikate bereinigen & Reset</span>
          </button>
        </div>
      )}

      <Button className="fab" title="Produkt hinzufügen" onClick={onOpenAddModal}>
        <Icon name="plus" size={24} />
      </Button>
    </main>
  );
}

function CookScreen({
  pantry,
  customRecipes = [],
  onAddCustomRecipe,
  favorites,
  onToggleFavorite,
  onBookmark,
  onCook,
  onNavigateToCook,
  onMicTrigger,
  onNotify,
  onAddMissingToGroceries,
  onOpenImportRecipe,
  isSurpriseModalOpen: externalSurpriseOpen,
  onSetIsSurpriseModalOpen: setExternalSurpriseOpen,
  expiringSearchIngredients = [],
  onClearExpiringFilter,
}: {
  pantry: PantryItem[];
  customRecipes?: CatalogRecipe[];
  onAddCustomRecipe?: (recipe: CatalogRecipe) => void;
  favorites: string[];
  onToggleFavorite: (recipeId: string, recipeTitle: string) => void;
  onBookmark: (recipeId: string, recipeTitle: string) => void;
  onCook: (recipeTitle: string, servings: number) => void;
  onNavigateToCook: () => void;
  onMicTrigger: () => void;
  onNotify?: (message: string) => void;
  onAddMissingToGroceries?: (items: Array<{ name: string; amount?: string }>) => void;
  onOpenImportRecipe?: () => void;
  isSurpriseModalOpen?: boolean;
  onSetIsSurpriseModalOpen?: (open: boolean) => void;
  expiringSearchIngredients?: string[];
  onClearExpiringFilter?: () => void;
}) {
  const [servings, setServings] = useState(3);
  const [intent, setIntent] = useState("");
  const [generated, setGenerated] = useState(false);
  const [shuffleIndex, setShuffleIndex] = useState(() => Math.floor(Math.random() * 12));
  const [matchScore, setMatchScore] = useState(98);
  const [isRotating, setIsRotating] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [activeSearchedRecipe, setActiveSearchedRecipe] = useState<CatalogRecipe | null>(null);
  const [deckKey, setDeckKey] = useState(0);

  // Web Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const toggleSpeechInput = () => {
    if (!hasSpeechRecognition) return;

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();
      recognition.lang = "de-DE";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        if (onNotify) onNotify("Spracherkennung aktiv: Sprich jetzt...");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setIntent((prev) => (prev ? `${prev.trim()} ${transcript}` : transcript));
          if (onNotify) onNotify(`Erkannt: "${transcript}"`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech" && onNotify) {
          onNotify("Spracherkennung abgebrochen oder kein Mikrofon-Zugriff.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Speech recognition init error:", err);
      setIsListening(false);
    }
  };

  const [activeModalRecipe, setActiveModalRecipe] = useState<CatalogRecipe | null>(null);
  const [localSurpriseModalOpen, setLocalSurpriseModalOpen] = useState(false);
  const [surpriseFilters, setSurpriseFilters] = useState<SurpriseFilters | null>(null);

  const isSurpriseModalOpen = externalSurpriseOpen !== undefined ? externalSurpriseOpen : localSurpriseModalOpen;
  const setSurpriseModalOpen = (open: boolean) => {
    setLocalSurpriseModalOpen(open);
    if (setExternalSurpriseOpen) setExternalSurpriseOpen(open);
  };

  const currentMealSlot = useMemo(() => getCurrentMealTimeSlot(), []);

  // Dynamic curated recipes for Daily Discover:
  // Automatically rotates 3× daily (Morgens, Mittags, Abends) + shifts every day + prioritizes pantry matches
  const catalogShuffleList = useMemo(() => {
    // Strictly include only recipes from authentic cooking websites
    const custom = getStoredCustomRecipes();
    const combined = [...FULL_RECIPE_CATALOG, ...custom].filter((rec) => Boolean(rec.source));

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    // Time slot offset (0 = Morning, 1 = Midday, 2 = Evening) plus shuffleIndex for manual reshuffling
    const timeSlotBonusOffset = dayOfYear * 11 + currentMealSlot.slotId * 17 + shuffleIndex * 19;
    const isPantry100Requested = Boolean(surpriseFilters?.preferences?.includes("pantry100"));

    const scored = combined.map((rec, origIdx) => {
      const breakdown = getRecipePantryBreakdown(rec, pantry, servings);
      const total = breakdown.inStock.length + breakdown.missing.length;
      const matchPct = total > 0 ? breakdown.inStock.length / total : 0;

      // Slot suitability bonus
      const titleLower = rec.title.toLowerCase();
      let slotBonus = 0;
      if (currentMealSlot.slotId === 0) {
        // Morning / Fast lunch
        if (
          titleLower.includes("ei") ||
          titleLower.includes("omelett") ||
          titleLower.includes("shakshuka") ||
          titleLower.includes("bowl") ||
          titleLower.includes("toast") ||
          rec.mealType === "breakfast"
        ) {
          slotBonus = 0.22;
        }
      } else if (currentMealSlot.slotId === 1) {
        // Midday / Lunch
        if (
          titleLower.includes("pasta") ||
          titleLower.includes("penne") ||
          titleLower.includes("reis") ||
          titleLower.includes("wok") ||
          titleLower.includes("bolognese") ||
          titleLower.includes("alfredo") ||
          rec.mealType === "dinner"
        ) {
          slotBonus = 0.22;
        }
      } else {
        // Evening / Dinner
        if (
          titleLower.includes("hähnchen") ||
          titleLower.includes("rind") ||
          titleLower.includes("speck") ||
          titleLower.includes("teriyaki") ||
          titleLower.includes("arrabbiata") ||
          titleLower.includes("geschnetzeltes") ||
          rec.baseProt >= 20 ||
          rec.mealType === "dinner"
        ) {
          slotBonus = 0.22;
        }
      }

      // 70-80% Matching Priority Algorithm:
      // In default/standard mode, prioritize recipes matching 70-85% (needing 1-2 items) for variety and gourmet meals,
      // unless 100% Vorrat (pantry100) is explicitly chosen.
      let pantryScore = 0;
      if (isPantry100Requested) {
        if (breakdown.missing.length === 0 && breakdown.inStock.length > 0) {
          pantryScore = 20; // Maximum boost for 100% match
        } else {
          pantryScore = matchPct * 5 - 12;
        }
      } else {
        if (matchPct >= 0.68 && matchPct <= 0.85) {
          pantryScore = 12; // Top priority recommendation
        } else if (matchPct > 0.85) {
          pantryScore = 6;
        } else if (matchPct >= 0.50) {
          pantryScore = 3;
        } else {
          pantryScore = -2;
        }
      }

      // Bonus points for surpriseFilters
      let preferenceBonus = 0;
      if (surpriseFilters?.mealType && surpriseFilters.mealType !== "all") {
        if (rec.mealType === surpriseFilters.mealType) {
          preferenceBonus += 12;
        }
      }
      if (surpriseFilters?.preferences && surpriseFilters.preferences.length > 0) {
        const timeNum = parseInt(rec.time.replace(/\D/g, "") || "20", 10);
        for (const pref of surpriseFilters.preferences) {
          if (pref === "quick" && timeNum <= 15) preferenceBonus += 4;
          if (pref === "veggie" && !rec.title.toLowerCase().match(/hähnchen|rind|hack|speck|fleisch|wurst/)) preferenceBonus += 4;
          if (pref === "protein" && rec.baseProt >= 15) preferenceBonus += 4;
          if (pref === "lowcarb" && rec.baseCarb <= 18) preferenceBonus += 4;
          if (pref === "budget" && rec.baseCost <= 2.0) preferenceBonus += 4;
          if (pref === "spicy" && rec.title.toLowerCase().match(/chili|scharf|arrabbiata|teriyaki|wok/)) preferenceBonus += 4;
        }
      }
      if (surpriseFilters?.equipment && rec.equipment) {
        if (rec.equipment.some((eq) => surpriseFilters.equipment.includes(eq))) {
          preferenceBonus += 4;
        }
      }

      // Bonus for expiring ingredients: Prioritize recipes containing expiring items to the very top!
      let expiringBonus = 0;
      if (expiringSearchIngredients && expiringSearchIngredients.length > 0) {
        const titleLower = rec.title.toLowerCase();
        const subtitleLower = (rec.subtitle || "").toLowerCase();
        const ingList = typeof rec.ingredientsList === "function"
          ? rec.ingredientsList(servings)
          : getSafeIngredientsList(rec, servings);

        const hasExpiringMatch = expiringSearchIngredients.some((expItem) => {
          const normExp = expItem.toLowerCase().trim();
          if (normExp.length < 2) return false;
          if (titleLower.includes(normExp) || subtitleLower.includes(normExp)) return true;
          return ingList.some((ing) => {
            const ingLower = ing.name.toLowerCase();
            return ingLower.includes(normExp) || normExp.includes(ingLower);
          });
        });

        if (hasExpiringMatch) {
          expiringBonus = 150;
        }
      }

      // Rotational hash with time slot variance to cycle top recipes 3× a day
      const variance = ((origIdx * 23 + timeSlotBonusOffset) % 100) / 350;
      return { rec, score: expiringBonus + pantryScore + preferenceBonus + slotBonus + variance };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.rec);
  }, [shuffleIndex, pantry, servings, currentMealSlot, surpriseFilters, expiringSearchIngredients]);

  // Pre-calculated list of bookmarked favorite recipes (calories & macros remain constant per portion)
  const favoriteRecipes = useMemo(() => {
    const all = activeSearchedRecipe ? [activeSearchedRecipe, ...FULL_RECIPE_CATALOG] : FULL_RECIPE_CATALOG;
    return all.filter((item) => favorites.includes(item.id)).map((item) => {
      const costNum = typeof item.baseCost === "number" ? item.baseCost : parseFloat(String(item.baseCost || "1.5").replace(",", ".")) || 1.5;
      return {
        ...item,
        calories: `${Math.round(Number(item.baseCal) || 350)}`,
        protein: `${Math.round(Number(item.baseProt) || 15)}g`,
        carbs: `${Math.round(Number(item.baseCarb) || 40)}g`,
        cost: `${costNum.toFixed(2).replace(".", ",")} €`,
        availableFormatted: typeof item.available === "function" ? item.available(servings) : getSafeAvailable(item, servings),
      };
    });
  }, [activeSearchedRecipe, favorites, servings]);

  const [isSwipeExpanded, setIsSwipeExpanded] = useState(true);

  // All catalog recipes formatted for the Daily Discover Deck (calories & macros per portion)
  // When a recipe is searched, it becomes the CURRENT (first) card at index 0!
  const allCatalogRecipesFormatted = useMemo(() => {
    const deckList = activeSearchedRecipe
      ? [activeSearchedRecipe, ...catalogShuffleList.filter((r) => r.id !== activeSearchedRecipe.id)]
      : catalogShuffleList;

    return deckList.map((item) => {
      const breakdown = getRecipePantryBreakdown(item, pantry, servings);
      const costNum = typeof item.baseCost === "number" ? item.baseCost : parseFloat(String(item.baseCost || "1.5").replace(",", ".")) || 1.5;
      return {
        ...item,
        matchScore: breakdown.matchPercentage,
        missingCount: breakdown.missing.length,
        calories: `${Math.round(Number(item.baseCal) || 350)}`,
        protein: `${Math.round(Number(item.baseProt) || 15)}g`,
        carbs: `${Math.round(Number(item.baseCarb) || 40)}g`,
        cost: `${costNum.toFixed(2).replace(".", ",")} €`,
        availableFormatted: typeof item.available === "function" ? item.available(servings) : getSafeAvailable(item, servings),
      };
    });
  }, [activeSearchedRecipe, catalogShuffleList, servings, pantry]);

  const filteredDeckRecipes = useMemo(() => {
    if (surpriseFilters?.preferences?.includes("pantry100")) {
      const perfectOnly = allCatalogRecipesFormatted.filter((r) => r.missingCount === 0);
      return perfectOnly.length > 0 ? perfectOnly : allCatalogRecipesFormatted;
    }
    return allCatalogRecipesFormatted;
  }, [surpriseFilters, allCatalogRecipesFormatted]);

  // Überrasch mich Handler: Open interactive preference dialog
  const handleSurpriseMe = () => {
    setIsRotating(true);
    setSurpriseModalOpen(true);
    setTimeout(() => {
      setIsRotating(false);
    }, 350);
  };

  const handleShuffle = handleSurpriseMe;

  const handleGenerate = async () => {
    const query = intent.trim();
    if (query) {
      const queryLower = query.toLowerCase();
      // 1. Check if user searched for an existing recipe in FULL_RECIPE_CATALOG
      const catalogMatch = FULL_RECIPE_CATALOG.find(
        (r) =>
          r.title.toLowerCase().includes(queryLower) ||
          r.subtitle.toLowerCase().includes(queryLower)
      );
      if (catalogMatch) {
        setActiveSearchedRecipe(catalogMatch);
        setDeckKey((k) => k + 1);
        setIsSwipeExpanded(true);
        setGenerated(true);
        setIntent("");
        if (onNotify) onNotify(`«${catalogMatch.title}» als aktuelle Karte geöffnet`);
        return;
      }

      // 2. Otherwise generate with Gemini AI
      setIsAiGenerating(true);
      if (onNotify) onNotify(`AI sucht und kreiert Rezept für «${query}»...`);
      try {
        const newRecipe = await generateRecipeWithGemini(query, pantry, servings);
        if (onAddCustomRecipe) {
          onAddCustomRecipe(newRecipe);
        }
        // Set search result as current active card and reset deck index to 0
        setActiveSearchedRecipe(newRecipe);
        setDeckKey((k) => k + 1);
        setIsSwipeExpanded(true);
        setGenerated(true);
        setIntent("");
        if (onNotify) {
          onNotify(`«${newRecipe.title}» als aktuelle Karte geöffnet!`);
        }
      } catch (err: any) {
        console.error("AI Generation Error:", err);
        if (onNotify) {
          onNotify(`Fehler bei AI-Generierung: ${err?.message || "Bitte erneut versuchen"}`);
        }
      } finally {
        setIsAiGenerating(false);
      }
    } else {
      handleSurpriseMe();
    }
  };

  return (
    <main className="screen cook-screen">
      <section className="title-row cook-title">
        <div><p className="eyebrow">Smart & restefreundlich</p><h1>Was kochen wir?</h1></div>
      </section>

      <section className="generator-card">
        <div className="generator-label">
          <span>Für wie viele?</span><strong>{servings} Personen</strong>
        </div>
        <div className="segment-control">
          {[1, 2, 3, 4, 5].map((count) => (
            <Button
              key={count}
              className={servings === count ? "active" : ""}
              onClick={() => setServings(count)}
            >
              {count}
            </Button>
          ))}
        </div>
        <label className="intent-field">
          <textarea
            value={intent}
            onChange={(event) => setIntent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Z. B. Ramen mit Ei, Pasta Pesto, schnelles Curry..."
          />
          {hasSpeechRecognition && (
            <Button
              className={`mic-button ${isListening ? "listening" : ""}`}
              title={isListening ? "Aufnahme stoppen" : "Sprachnotiz aufnehmen"}
              onClick={toggleSpeechInput}
              style={
                isListening
                  ? {
                      color: "#dc2626",
                      background: "#fee2e2",
                      borderColor: "#fca5a5",
                      animation: "pulse 1.2s infinite",
                    }
                  : undefined
              }
            >
              <Icon name="mic" size={19} />
            </Button>
          )}
        </label>

        {/* Dual button bar: Generate + Überrasch mich */}
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            className={`primary-button generate-button ${isAiGenerating ? "loading" : ""}`}
            style={{ flex: 1.6 }}
            icon={isAiGenerating ? "sync" : "wand"}
            disabled={isAiGenerating}
            onClick={handleGenerate}
          >
            {isAiGenerating ? "AI kreiert Rezept..." : "Rezepte generieren"}
          </Button>

          <Button
            className="secondary-button"
            style={{
              flex: 1.4,
              height: "44px",
              background: "#ebf3ee",
              borderColor: "#c6dcce",
              color: "#2d5a3e",
              fontWeight: 750,
              gap: "5px",
              whiteSpace: "nowrap",
            }}
            title="Zufälliges Rezept mit Zutaten aus deinem Vorrat vorschlagen"
            disabled={isAiGenerating}
            onClick={handleSurpriseMe}
          >
            <span style={{ display: "inline-flex", alignItems: "center", transform: isRotating ? "rotate(180deg)" : "none", transition: "transform 350ms ease" }}><Icon name="dice" size={16} /></span>
            Überrasch mich
          </Button>
        </div>

        <p className="generator-hint">
          <Icon name="check" size={13} /> Nutzt bevorzugt, was bald verbraucht werden sollte
        </p>

        {onOpenImportRecipe && (
          <button
            type="button"
            className="recipe-import-trigger-btn"
            onClick={onOpenImportRecipe}
          >
            <Icon name="sparkles" size={15} />
            <span>Rezept importieren</span>
          </button>
        )}
      </section>

      {/* Quick link to dedicated Saved Meals & Cooking screen */}
      {favorites.length > 0 && onNavigateToCook && (
        <div className="saved-meals-quick-banner" onClick={onNavigateToCook}>
          <div className="saved-meals-banner-left">
            <Icon name="bookmarkFilled" size={17} />
            <div>
              <strong>{favorites.length} Mahlzeit{favorites.length > 1 ? "en" : ""} gemerkt</strong>
              <p>Bereit zum Kochen mit Vorratsabbuchung & Anleitung</p>
            </div>
          </div>
          <button type="button" className="saved-meals-banner-btn">
            Zu Kochen →
          </button>
        </div>
      )}

      {/* Daily Discover Collapsible Container (Cards & Action Buttons) */}
      <div
        className="tinderswipe-collapsible-wrapper"
        style={{
          margin: "12px 0 16px",
          background: "#ffffff",
          border: "1.5px solid #e2e8f0",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          transition: "border-color 0.2s ease",
        }}
      >
        {/* Accordion / Dropdown Toggle Bar */}
        <button
          type="button"
          onClick={() => setIsSwipeExpanded((prev) => !prev)}
          aria-expanded={isSwipeExpanded}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            background: isSwipeExpanded ? "#f8fafc" : "#ffffff",
            border: "none",
            borderBottom: isSwipeExpanded ? "1px solid #e2e8f0" : "none",
            cursor: "pointer",
            textAlign: "left",
            transition: "background 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexShrink: 1 }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: isSwipeExpanded ? "#ebf3ee" : "#f1f5f9",
                color: isSwipeExpanded ? "#2d5a3e" : "#64748b",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="5" y="4" width="14" height="17" rx="2" />
                <path d="M9 2h6" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                Daily Discover
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 750,
                  padding: "2px 7px",
                  borderRadius: "6px",
                  background: isSwipeExpanded ? "#dcfce7" : "#f1f5f9",
                  color: isSwipeExpanded ? "#15803d" : "#64748b",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                title={`Wechselt 3× täglich (Morgens, Mittags, Abends) · Aktuell: ${currentMealSlot.title}`}
              >
                {currentMealSlot.badge} · {filteredDeckRecipes.length} Rezepte
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShuffleIndex((prev) => prev + 1);
                  setDeckKey((k) => k + 1);
                  if (onNotify) {
                    onNotify(`Vorschläge für ${currentMealSlot.badge} neu gemischt`);
                  }
                }}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  padding: "2px 7px",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "#475569",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  whiteSpace: "nowrap",
                }}
                title="Deck für diesen Slot jetzt neu mischen"
              >
                <Icon name="sync" size={11} />
                <span>Neu mischen</span>
              </button>
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 9px",
              borderRadius: "8px",
              background: isSwipeExpanded ? "#ffffff" : "#ebf3ee",
              border: `1px solid ${isSwipeExpanded ? "#cbd5e1" : "#c6dcce"}`,
              color: isSwipeExpanded ? "#475569" : "#2d5a3e",
              fontSize: "11px",
              fontWeight: 750,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <span>{isSwipeExpanded ? "Einklappen" : "Aufklappen"}</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                transform: isSwipeExpanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              <Icon name="chevron" size={10} />
            </span>
          </div>
        </button>

        {/* Collapsible Swipe Content (Cards + Control Action Buttons) */}
        {isSwipeExpanded && (
          <div style={{ padding: "14px 10px 10px", background: "#f8fafc" }}>
            {/* Reste-Modus Active Banner */}
            {expiringSearchIngredients && expiringSearchIngredients.length > 0 && (
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1.5px solid #86efac",
                  borderRadius: "14px",
                  padding: "10px 14px",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  fontSize: "12px",
                  color: "#166534",
                  boxShadow: "0 2px 6px rgba(22, 101, 52, 0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                  <span style={{ display: "inline-flex", color: "#15803d", flexShrink: 0 }}>
                    <Icon name="leaf" size={16} />
                  </span>
                  <span style={{ fontWeight: 650, lineHeight: 1.35 }}>
                    Reste-Modus aktiv: Rezepte mit <strong>{expiringSearchIngredients.slice(0, 3).join(", ")}</strong> werden zuerst gezeigt
                  </span>
                </div>
                {onClearExpiringFilter && (
                  <button
                    type="button"
                    onClick={onClearExpiringFilter}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #86efac",
                      borderRadius: "8px",
                      padding: "5px 10px",
                      fontSize: "11px",
                      fontWeight: 750,
                      color: "#15803d",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            )}

            <RecipeSwipeDeck
              key={`${deckKey}-${surpriseFilters ? JSON.stringify(surpriseFilters) : "default"}`}
              recipes={filteredDeckRecipes}
              servings={servings}
              pantry={pantry}
              favorites={favorites}
              onToggleFavorite={onToggleFavorite}
              onBookmark={onBookmark}
              onCook={(title, s) => onCook(title, s)}
              onOpenDetails={(rec) => setActiveModalRecipe(rec)}
              onAddMissingToGroceries={onAddMissingToGroceries}
              onNotify={onNotify}
              onShuffle={handleSurpriseMe}
              onNavigateToSaved={onNavigateToCook}
            />
          </div>
        )}
      </div>

      {/* Full-screen / Rich Step-by-Step Cooking Modal */}
      <CookingModal
        recipe={activeModalRecipe}
        isOpen={Boolean(activeModalRecipe)}
        onClose={() => setActiveModalRecipe(null)}
        onCook={onCook}
        pantry={pantry}
        isFavorite={activeModalRecipe ? favorites.includes(activeModalRecipe.id) : false}
        onToggleFavorite={onToggleFavorite}
        onAddMissingToGroceries={onAddMissingToGroceries}
      />

      {/* Surprise Me Preferences Dialog Modal */}
      {isSurpriseModalOpen && (
        <SurpriseMeModal
          isOpen={isSurpriseModalOpen}
          onClose={() => setSurpriseModalOpen(false)}
          recipes={catalogShuffleList}
          pantry={pantry}
          servings={servings}
          onApplyFilters={(filters) => {
            setSurpriseFilters(filters);
            setDeckKey((k) => k + 1);
            setIsSwipeExpanded(true);
          }}
          onSelectRecipe={(rec) => {
            setActiveSearchedRecipe(rec);
            setDeckKey((k) => k + 1);
            setIsSwipeExpanded(true);
            setGenerated(true);
          }}
          onCookRecipe={(rec) => {
            setActiveModalRecipe(rec);
          }}
          onNotify={onNotify}
        />
      )}
    </main>
  );
}

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
      name.includes("ei") ||
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
  if (name.includes("ei")) {
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

function ShoppingScreen({
  groceries,
  onComplete,
  onToggleItem,
  onDeleteGrocery,
  onClearGroceries,
  onNavigateToPlanner,
  onNotify,
}: {
  groceries: GroceryItem[];
  onComplete: (checkedIds: number[]) => void;
  onToggleItem: (id: number) => void;
  onDeleteGrocery: (id: number) => void;
  onClearGroceries?: () => void;
  onNavigateToPlanner?: () => void;
  onNotify?: (message: string) => void;
}) {
  const [checked, setChecked] = useState<number[]>([1, 2]);

  const activeChecked = checked.filter((id) => groceries.some((g) => g.id === id));

  const groups = Array.from(new Set(groceries.map((item) => item.category)));

  const totalCost = useMemo(() => {
    return groceries
      .reduce((sum, item) => {
        const num = parseFloat(item.price.replace("€", "").replace(",", ".").trim());
        return sum + (isNaN(num) ? 0 : num);
      }, 0)
      .toFixed(2)
      .replace(".", ",");
  }, [groceries]);

  const toggle = (id: number) => {
    setChecked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
    onToggleItem(id);
  };

  const hasPlannerItems = groceries.some(
    (g) => g.reason.toLowerCase().includes("planer") || g.reason.toLowerCase().includes("wochenplan")
  );

  return (
    <main className="screen shop-screen">
      <section className="title-row">
        <div>
          <p className="eyebrow">Deine Einkaufsliste</p>
          <h1>Einkauf</h1>
        </div>
        <div className="summary-pill">
          <span>{groceries.length}</span> Artikel
        </div>
      </section>

      <section className="budget-card">
        <div className="budget-top">
          <div>
            <p>Geschätzte Gesamtsumme</p>
            <strong>{totalCost} €</strong>
          </div>
          <div className="budget-icon">
            <Icon name="cart" size={22} />
          </div>
        </div>
        <div className="savings-row">
          <span>
            <Icon name="check" size={14} /> {activeChecked.length} von {groceries.length} Artikeln abgehakt
          </span>
          <strong>
            {groceries.length === 0
              ? "Alles erledigt"
              : activeChecked.length === groceries.length
              ? "Vollständig"
              : `${groceries.length - activeChecked.length} noch offen`}
          </strong>
        </div>
      </section>

      {/* Wochenplaner Sync-Banner */}
      {hasPlannerItems && onNavigateToPlanner && (
        <div
          className="planner-sync-banner"
          onClick={onNavigateToPlanner}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "14px",
            margin: "4px 0 12px",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="calendar" size={17} />
            <div>
              <strong style={{ fontSize: "12px", color: "#065f46", display: "block" }}>
                Wocheneinkauf aus Mahlzeiten-Planer integriert
              </strong>
              <small style={{ fontSize: "11px", color: "#047857" }}>
                Zutaten für deine geplanten Wochentage
              </small>
            </div>
          </div>
          <span style={{ fontSize: "12px", color: "#059669", fontWeight: "700" }}>
            Zum Planer →
          </span>
        </div>
      )}

      {groceries.length === 0 ? (
        <div className="saved-meals-empty-card" style={{ margin: "24px 0" }}>
          <div className="empty-icon-circle">
            <Icon name="cart" size={24} />
          </div>
          <h3>Einkaufsliste ist leer</h3>
          <p>
            Alle markierten Artikel wurden eingekauft und in deinen Vorrat eingebucht. Wenn beim Kochen Zutaten zur Neige gehen oder du im Planer Mahlzeiten einträgst, erscheinen sie automatisch wieder hier.
          </p>
          {onNavigateToPlanner && (
            <button
              type="button"
              className="primary-button"
              onClick={onNavigateToPlanner}
              style={{ marginTop: "12px", width: "auto", padding: "0 22px", height: "42px" }}
            >
              <span>Mahlzeiten im Planer einteilen</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="list-meta">
            <span>
              <strong>{groceries.length}</strong> Artikel in {groups.length} Kategorien
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>{activeChecked.length} erledigt</span>
              {onClearGroceries && (
                <button
                  type="button"
                  onClick={onClearGroceries}
                  style={{
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#e11d48",
                    fontSize: "11px",
                    fontWeight: 650,
                    padding: "3px 8px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 140ms ease",
                  }}
                  title="Alle Artikel aus der Einkaufsliste löschen"
                >
                  <Icon name="trash" size={12} />
                  <span>Einkauf leeren</span>
                </button>
              )}
            </div>
          </div>

          <div className="grocery-groups">
            {groups.map((group) => {
              const itemsInGroup = groceries.filter((item) => item.category === group);
              return (
                <section className="grocery-group" key={group}>
                  <div className="group-heading">
                    <h2>{group}</h2>
                    <span>{itemsInGroup.length}</span>
                  </div>
                  <div className="grocery-list">
                    {itemsInGroup.map((item) => {
                      const isChecked = activeChecked.includes(item.id);
                      const isFromPlanner =
                        item.reason.toLowerCase().includes("planer") ||
                        item.reason.toLowerCase().includes("wochenplan");
                      return (
                        <div
                          key={item.id}
                          style={{ position: "relative", display: "flex", alignItems: "center" }}
                        >
                          <button
                            className={`grocery-item ${isChecked ? "checked" : ""}`}
                            onClick={() => toggle(item.id)}
                            type="button"
                            style={{ flex: 1, alignItems: "center" }}
                          >
                            <span className="check-circle">
                              {isChecked && <Icon name="check" size={15} strokeWidth={2.4} />}
                            </span>
                            <ProductMark tone={getFoodTone(item.name)} name={item.name} compact />
                            <span className="grocery-copy">
                              <span className="grocery-line">
                                <strong>{item.name}</strong>
                                <b>{item.price}</b>
                              </span>
                              <span className="grocery-quantity">{item.quantity}</span>
                              <span className={`reason-tag ${isFromPlanner ? "planner-origin-tag" : ""}`}>
                                {item.reason}
                              </span>
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="shopping-footer" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Button
              className="primary-button checkout-button"
              onClick={() => {
                if (activeChecked.length === 0) {
                  onNotify?.("Bitte hake mindestens einen gekauften Artikel ab.");
                  return;
                }
                onComplete(activeChecked);
                setChecked((prev) => prev.filter((id) => !activeChecked.includes(id)));
              }}
              disabled={activeChecked.length === 0}
              style={{
                opacity: activeChecked.length === 0 ? 0.6 : 1,
                cursor: activeChecked.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              <span>Einkauf abschließen</span>
              <span>
                {activeChecked.length} {activeChecked.length === 1 ? "Artikel" : "Artikel"} in Vorrat buchen{" "}
                <Icon name="chevron" size={16} />
              </span>
            </Button>
            {onClearGroceries && (
              <button
                type="button"
                onClick={onClearGroceries}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "4px 8px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e11d48")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                <Icon name="trash" size={13} />
                <span>Einkaufsliste leeren</span>
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function BottomNav({
  active,
  pantryBadge = 0,
  shoppingCount = 0,
  savedCount,
  plannedCount = 0,
  onChange,
}: {
  active: Tab;
  pantryBadge?: number;
  shoppingCount?: number;
  savedCount: number;
  plannedCount?: number;
  onChange: (tab: Tab) => void;
}) {
  const items: { id: Tab; label: string; icon: IconName; count?: number }[] = [
    { id: "pantry", label: "Vorrat", icon: "archive", count: pantryBadge > 0 ? pantryBadge : undefined },
    { id: "discover", label: "Entdecken", icon: "sparkles" },
    { id: "planner", label: "Planer", icon: "calendar", count: plannedCount > 0 ? plannedCount : undefined },
    { id: "cook", label: "Kochbuch", icon: "book", count: savedCount > 0 ? savedCount : undefined },
    { id: "shop", label: "Einkauf", icon: "cart", count: shoppingCount > 0 ? shoppingCount : undefined },
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
            {item.count !== undefined && item.count > 0 && <b>{item.count}</b>}
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
      const saved =
        localStorage.getItem(STORAGE_KEYS.FAVORITES) ||
        localStorage.getItem("forret_favorite_recipes") ||
        localStorage.getItem("forret_favorites");
      if (saved) return JSON.parse(saved);
    } catch {}
    return ["r1", "r2"];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSurpriseModalOpen, setIsSurpriseModalOpen] = useState(false);

  const [pantry, setPantry] = useState<PantryItem[]>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEYS.PANTRY) ||
        localStorage.getItem("forret_design_pantry");
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasWater = parsed.some((p: any) => p.name.toLowerCase().includes("wasser"));
        const base = hasWater ? parsed : [...parsed, defaultPantry[6]];
        const enhanced = base.map((item: any) => {
          const specs = getItemNutrientSpecs(item);
          return {
            ...item,
            isUnlimited: Boolean(item.isUnlimited || item.name.toLowerCase().includes("wasser") || item.amount >= 99999),
            caloriesPer100g: (item.caloriesPer100g !== undefined && item.caloriesPer100g !== 180) ? item.caloriesPer100g : specs.caloriesPer100g,
            proteinPer100g: (item.proteinPer100g !== undefined && item.caloriesPer100g !== 180) ? item.proteinPer100g : specs.proteinPer100g,
            carbsPer100g: (item.carbsPer100g !== undefined && item.caloriesPer100g !== 180) ? item.carbsPer100g : specs.carbsPer100g,
            fatPer100g: (item.fatPer100g !== undefined && item.caloriesPer100g !== 180) ? item.fatPer100g : specs.fatPer100g,
          };
        });
        return deduplicatePantry(enhanced);
      }
    } catch {}
    return defaultPantry;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(pantry));
    } catch {}
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
    } catch {}
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
      const saved =
        localStorage.getItem(STORAGE_KEYS.GROCERIES) ||
        localStorage.getItem("forret_design_groceries");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return decomposeCompositeIngredients(parsed);
        }
      }
    } catch {}
    return defaultGroceries;
  });

  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEYS.WEEKLY_PLAN) ||
        localStorage.getItem("forret_weekly_plan");
      if (saved) return JSON.parse(saved);
    } catch {}
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
    } catch {}
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

  // Supabase Auto-Sync State
  const [hasCloudUser, setHasCloudUser] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const isInitialCloudLoadedRef = useRef(false);

  // Auto-fetch from Supabase on mount if user is logged in
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user && isMounted) {
          setHasCloudUser(true);
          setIsCloudSyncing(true);
          const cloudData = await fetchUserDataFromSupabase();
          if (cloudData && isMounted) {
            if (Array.isArray(cloudData.pantry) && cloudData.pantry.length > 0) {
              setPantry(cloudData.pantry as PantryItem[]);
            }
            if (Array.isArray(cloudData.groceries)) {
              setGroceries(cloudData.groceries as GroceryItem[]);
            }
            if (Array.isArray(cloudData.customRecipes)) {
              setCustomRecipes((cloudData.customRecipes as any[]).map(rehydrateCustomRecipe));
            }
            if (Array.isArray(cloudData.mealPlan)) {
              setPlannedMeals(cloudData.mealPlan as PlannedMeal[]);
            }
            if (Array.isArray(cloudData.favorites)) {
              setFavorites(cloudData.favorites as string[]);
            }
          }
        }
      } catch (err) {
        console.warn("Auto-sync fetch on mount error:", err);
      } finally {
        if (isMounted) {
          setIsCloudSyncing(false);
          isInitialCloudLoadedRef.current = true;
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced auto-save to Supabase when inventory/planner/recipes change
  useEffect(() => {
    if (!hasCloudUser || !isInitialCloudLoadedRef.current) return;

    const timer = setTimeout(async () => {
      setIsCloudSyncing(true);
      try {
        await backupUserDataToSupabase({
          pantry,
          groceries,
          customRecipes,
          mealPlan: plannedMeals,
          favorites,
        });
      } catch (err) {
        console.warn("Auto-save to Supabase error:", err);
      } finally {
        setIsCloudSyncing(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [pantry, groceries, customRecipes, plannedMeals, favorites, hasCloudUser]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expiringSearchIngredients, setExpiringSearchIngredients] = useState<string[]>([]);

  const [foodWasteSaved, setFoodWasteSaved] = useState<{ count: number; money: number }>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEYS.FOOD_WASTE) ||
        localStorage.getItem("vorrat_food_waste_saved");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.count === "number" && typeof parsed.money === "number") {
          return parsed;
        }
      }
    } catch {}
    return { count: 0, money: 0 };
  });

  const handleCookFromExpiring = (urgentItemNames: string[]) => {
    setExpiringSearchIngredients(urgentItemNames);
    setActiveTab("discover");
    notify(
      `Reste-Modus aktiv: ${urgentItemNames.length} ablaufende ${
        urgentItemNames.length === 1 ? "Zutat" : "Zutaten"
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
    } catch {}
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
    } catch {}
    notify("Einkaufsliste geleert");
  };

  const lowStockCount = useMemo(
    () => pantry.filter((item) => !item.isUnlimited && !item.name.toLowerCase().includes("wasser") && item.amount / item.total <= 0.25).length,
    [pantry]
  );

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const cookRecipe = (recipeTitle: string, servings: number) => {
    // 1. Find matching recipe from catalog to get actual ingredient specs
    const recipe = allRecipes.find(
      (r) => r.title.toLowerCase() === recipeTitle.toLowerCase()
    );

    // Track what got deducted for feedback
    const deductedItems: string[] = [];
    const lowStockAlerts: string[] = [];
    let savedUrgentCount = 0;

    setPantry((items) =>
      items.map((item) => {
        if (item.isUnlimited || item.name.toLowerCase().includes("wasser")) {
          return item;
        }

        let deductAmount = 0;
        const itemNameLower = item.name.toLowerCase();

        if (recipe) {
          const ingList = typeof recipe.ingredientsList === "function"
            ? recipe.ingredientsList(servings)
            : getSafeIngredientsList(recipe, servings);
          const matchingIng = ingList.find((ing) => {
            const ingLower = ing.name.toLowerCase();
            return (
              ingLower.includes(itemNameLower) ||
              itemNameLower.includes(ingLower) ||
              (itemNameLower.includes("reis") && ingLower.includes("reis")) ||
              (itemNameLower.includes("eier") && ingLower.includes("eier")) ||
              (itemNameLower.includes("soja") && ingLower.includes("soja")) ||
              (itemNameLower.includes("erbsen") && ingLower.includes("erbsen")) ||
              (itemNameLower.includes("zwiebel") && ingLower.includes("zwiebel")) ||
              (itemNameLower.includes("hähnchen") && ingLower.includes("hähnchen"))
            );
          });

          if (matchingIng) {
            const match = matchingIng.amount.match(/^(\d+)/);
            if (match) {
              deductAmount = parseInt(match[1], 10);
            }
          }
        }

        // Fallback default deductions if not dynamically matched
        if (deductAmount === 0) {
          if (itemNameLower.includes("reis") && (recipeTitle.toLowerCase().includes("reis") || recipeTitle.toLowerCase().includes("fried") || recipeTitle.toLowerCase().includes("rice"))) {
            deductAmount = 90 * servings;
          } else if (itemNameLower.includes("eier") && (recipeTitle.toLowerCase().includes("ei") || recipeTitle.toLowerCase().includes("omelett"))) {
            deductAmount = servings;
          } else if (itemNameLower.includes("soja") && (recipeTitle.toLowerCase().includes("soja") || recipeTitle.toLowerCase().includes("fried") || recipeTitle.toLowerCase().includes("teriyaki") || recipeTitle.toLowerCase().includes("bowl"))) {
            deductAmount = 12 * servings;
          } else if (itemNameLower.includes("erbsen") && (recipeTitle.toLowerCase().includes("erbsen") || recipeTitle.toLowerCase().includes("spar"))) {
            deductAmount = 60 * servings;
          } else if (itemNameLower.includes("hähnchen") && (recipeTitle.toLowerCase().includes("hähnchen") || recipeTitle.toLowerCase().includes("teriyaki"))) {
            deductAmount = 110 * servings;
          } else if (itemNameLower.includes("zwiebel") && (recipeTitle.toLowerCase().includes("zwiebel") || recipeTitle.toLowerCase().includes("spar"))) {
            deductAmount = Math.max(1, Math.round(servings * 0.5));
          }
        }

        if (deductAmount > 0) {
          deductedItems.push(`${item.name} (-${deductAmount}${item.unit})`);
          const mhdStatus = getMhdStatus(item.mhd);
          if (mhdStatus === "soon" || mhdStatus === "expired") {
            savedUrgentCount++;
          }
          const newAmount = Math.max(0, item.amount - deductAmount);
          if (newAmount <= (item.minAmount || 0.25 * item.total)) {
            lowStockAlerts.push(item.name);
          }
          return {
            ...item,
            amount: newAmount,
          };
        }

        return item;
      })
    );

    // Save food waste counter
    if (savedUrgentCount > 0) {
      setFoodWasteSaved((prev) => {
        const next = {
          count: prev.count + savedUrgentCount,
          money: Number((prev.money + savedUrgentCount * 2.5).toFixed(2)),
        };
        try {
          localStorage.setItem(STORAGE_KEYS.FOOD_WASTE, JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    // Auto-check for low ingredients & add to groceries
    if (lowStockAlerts.length > 0) {
      setGroceries((prev) => {
        const copy = [...prev];
        lowStockAlerts.forEach((name) => {
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
      `«${recipeTitle}» gekocht! Vorrat für ${servings} Pers. aktualisiert${
        deductedItems.length > 0 ? ` (${deductedItems.slice(0, 2).join(", ")})` : ""
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

  const handleReceiptImported = (importedItems?: Array<Omit<PantryItem, "id">>) => {
    if (!importedItems || !Array.isArray(importedItems) || importedItems.length === 0) {
      notify("Keine Kassenbon-Positionen ausgewählt");
      return;
    }
    importedItems.forEach((item) => {
      handleAddProduct(item);
    });
    notify(
      `${importedItems.length} ${
        importedItems.length === 1 ? "Position" : "Positionen"
      } vom Kassenbon erfolgreich eingebucht!`
    );
  };

  const handleAddProduct = (item: Omit<PantryItem, "id">) => {
    const normName = item.name.trim().toLowerCase();
    setPantry((prev) => {
      const existingIdx = prev.findIndex((p) => p.name.trim().toLowerCase() === normName);
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
      return [...prev, { ...item, id: uniqueId }];
    });
    notify(`«${item.name}» im Vorrat erfasst`);
  };

  const handleResetDemo = () => {
    setPantry(defaultPantry);
    setGroceries(defaultGroceries);
    try {
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(defaultPantry));
      localStorage.setItem(STORAGE_KEYS.GROCERIES, JSON.stringify(defaultGroceries));
    } catch {}
    notify("Standard-Demo Vorrat & Einkaufsliste wiederhergestellt!");
  };

  const handleClearPantry = () => {
    setPantry([]);
    try {
      localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify([]));
    } catch {}
    notify("Vorrat komplett geleert (0 Produkte)");
  };

  const handleDeduplicatePantry = () => {
    setPantry((prev) => {
      const cleaned = deduplicatePantry(prev);
      try {
        localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(cleaned));
      } catch {}
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
    } catch {}
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
        isCloudSyncing={isCloudSyncing}
        hasCloudUser={hasCloudUser}
      />

      {activeTab === "pantry" && (
        <PantryScreen
          pantry={pantry}
          updateAmount={updateAmount}
          onUpdateCategory={updateCategory}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onEditItem={(item) => setEditingPantryItem(item)}
          onDeleteItem={handleDeletePantryItem}
          onOpenReset={() => setIsResetModalOpen(true)}
          onCookFromExpiring={handleCookFromExpiring}
          onResetDemo={handleResetDemo}
          savedWasteStats={foodWasteSaved}
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
        <ShoppingScreen
          groceries={groceries}
          onComplete={completeShopping}
          onToggleItem={() => {}}
          onDeleteGrocery={(id) => setGroceries((prev) => prev.filter((g) => g.id !== id))}
          onClearGroceries={handleClearGroceries}
          onNavigateToPlanner={() => setActiveTab("planner")}
          onNotify={notify}
        />
      )}

      <BottomNav
        active={activeTab}
        pantryBadge={lowStockCount}
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

      {/* Account / Pantry Reset & Deduplication Modal */}
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

      {/* Unified Add Modal (Plus Button: Kamera, Bon, DB-Suche oder Manuell) */}
      <UnifiedAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddProduct={handleAddProduct}
        onImportReceipt={handleReceiptImported}
        onNotify={notify}
      />

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
      <RecipeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        pantryItems={pantry}
        onSaveRecipe={handleSaveImportedRecipe}
        onNotify={notify}
      />
    </div>
  );
}

