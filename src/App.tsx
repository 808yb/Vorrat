import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { motion } from "motion/react";
import { ProductMark, getFoodTone } from "./components/FoodIcons";
import { FULL_RECIPE_CATALOG, type CatalogRecipe } from "./data/recipeCatalog";
import { getStoredCustomRecipes, generateRecipeWithGemini } from "./utils/geminiRecipes";
import { CookingModal, RecipeStepsAccordion } from "./components/CookingModal";
import { RecipeSwipeDeck } from "./components/RecipeSwipeDeck";
import { getRecipePantryBreakdown } from "./utils/pantryMatching";
import { UnifiedAddModal } from "./components/UnifiedAddModal";
import { EditPantryItemModal } from "./components/EditPantryItemModal";
import { SavedMealsScreen } from "./components/SavedMealsScreen";
import { HouseholdSyncModal } from "./components/HouseholdSyncModal";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import { RecipeImportModal } from "./components/RecipeImportModal";
import { NutritionCoachModal } from "./components/NutritionCoachModal";
import { AccountResetModal } from "./components/AccountResetModal";
import {
  WeeklyMealPlannerScreen,
  type PlannedMeal,
  type WeekdayId,
  WEEKDAYS,
} from "./components/WeeklyMealPlannerScreen";

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
  | "trash";

function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
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
  };

  return (
    <svg
      aria-hidden="true"
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
  if (typeof item.caloriesPer100g === "number" && item.caloriesPer100g > 0) {
    return {
      caloriesPer100g: item.caloriesPer100g,
      proteinPer100g: item.proteinPer100g || 0,
      carbsPer100g: item.carbsPer100g || 0,
      fatPer100g: item.fatPer100g || 0,
    };
  }

  const tone = item.tone || getFoodTone(item.name, item.category);
  const lower = item.name.toLowerCase();

  if (tone === "rice" || lower.includes("reis")) {
    return { caloriesPer100g: 350, proteinPer100g: 8.5, carbsPer100g: 78.0, fatPer100g: 1.0 };
  }
  if (tone === "egg" || lower.includes("ei")) {
    return { caloriesPer100g: 140, proteinPer100g: 12.5, carbsPer100g: 0.8, fatPer100g: 9.8 };
  }
  if (tone === "chicken" || lower.includes("hähnchen") || lower.includes("huhn") || lower.includes("fleisch")) {
    return { caloriesPer100g: 110, proteinPer100g: 24.0, carbsPer100g: 0.0, fatPer100g: 1.5 };
  }
  if (tone === "pasta" || lower.includes("nudel") || lower.includes("penne")) {
    return { caloriesPer100g: 355, proteinPer100g: 12.0, carbsPer100g: 72.0, fatPer100g: 1.5 };
  }
  if (tone === "oats" || lower.includes("hafer")) {
    return { caloriesPer100g: 370, proteinPer100g: 13.5, carbsPer100g: 60.0, fatPer100g: 7.0 };
  }
  if (tone === "milk" || lower.includes("milch")) {
    return { caloriesPer100g: 50, proteinPer100g: 3.4, carbsPer100g: 4.9, fatPer100g: 1.5 };
  }
  if (tone === "cheese" || lower.includes("käse")) {
    return { caloriesPer100g: 350, proteinPer100g: 25.0, carbsPer100g: 1.5, fatPer100g: 28.0 };
  }
  if (tone === "peas" || lower.includes("erbse")) {
    return { caloriesPer100g: 82, proteinPer100g: 6.2, carbsPer100g: 12.5, fatPer100g: 0.5 };
  }
  if (tone === "sauce" || lower.includes("soja") || lower.includes("sauce")) {
    return { caloriesPer100g: 65, proteinPer100g: 10.5, carbsPer100g: 5.5, fatPer100g: 0.1 };
  }
  if (tone === "onion" || lower.includes("zwiebel")) {
    return { caloriesPer100g: 34, proteinPer100g: 1.9, carbsPer100g: 4.8, fatPer100g: 0.3 };
  }
  if (tone === "tomato" || lower.includes("tomate")) {
    return { caloriesPer100g: 20, proteinPer100g: 1.0, carbsPer100g: 3.5, fatPer100g: 0.2 };
  }
  if (tone === "oil" || lower.includes("öl")) {
    return { caloriesPer100g: 820, proteinPer100g: 0.0, carbsPer100g: 0.0, fatPer100g: 92.0 };
  }
  if (tone === "bread" || lower.includes("brot")) {
    return { caloriesPer100g: 260, proteinPer100g: 9.0, carbsPer100g: 48.0, fatPer100g: 2.5 };
  }
  if (tone === "apple" || lower.includes("apfel")) {
    return { caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14.0, fatPer100g: 0.2 };
  }
  if (tone === "carrot" || lower.includes("karotte")) {
    return { caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 9.6, fatPer100g: 0.2 };
  }
  if (tone === "broccoli" || lower.includes("brokkoli")) {
    return { caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7.0, fatPer100g: 0.4 };
  }

  return { caloriesPer100g: 120, proteinPer100g: 5.0, carbsPer100g: 16.0, fatPer100g: 3.0 };
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
  } else if (unit.includes("stk") || unit.includes("stück")) {
    const lower = item.name.toLowerCase();
    const weightPerPiece = lower.includes("ei")
      ? 55
      : lower.includes("zwiebel") || lower.includes("lauch")
      ? 25
      : lower.includes("limette") || lower.includes("zitrone")
      ? 60
      : lower.includes("apfel")
      ? 150
      : lower.includes("knoblauch")
      ? 10
      : 50;
    factor = (item.amount * weightPerPiece) / 100;
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
  onOpenCoach,
  onResetDemo,
  onOpenReset,
}: {
  onOpenHousehold: () => void;
  onOpenCoach?: () => void;
  onResetDemo?: () => void;
  onOpenReset?: () => void;
}) {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark"><Icon name="leaf" size={18} /></div>
        <span>Forret</span>
      </div>
      <div className="header-actions">
        {onOpenCoach && (
          <button
            type="button"
            className="coach-header-btn"
            onClick={onOpenCoach}
            title="Smarter Ernährungs-Coach & Makros"
          >
            <Icon name="sparkles" size={13} />
            <span>Coach</span>
          </button>
        )}
        <div
          className="sync-state"
          onClick={onOpenHousehold}
          title="Haushalt & Mitbewohner einladen (Cloud-Sync)"
          style={{ cursor: "pointer" }}
        >
          <span />
          <Icon name="sync" size={14} /> Synced
        </div>
        {onOpenReset && (
          <button
            type="button"
            className="coach-header-btn"
            onClick={onOpenReset}
            title="Vorrat verwalten / Duplikate fixen / Reset"
            style={{
              background: "#fff1f2",
              borderColor: "#fecdd3",
              color: "#e11d48",
              padding: "4px 8px",
            }}
          >
            <Icon name="trash" size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>
    </header>
  );
}

function PantryScreen({
  pantry,
  updateAmount,
  onOpenAddModal,
  onEditItem,
  onDeleteItem,
  onOpenReset,
  onCookFromExpiring,
  onResetDemo,
}: {
  pantry: PantryItem[];
  updateAmount: (id: number | string, delta: number) => void;
  onOpenAddModal: () => void;
  onEditItem: (item: PantryItem) => void;
  onDeleteItem: (id: number | string) => void;
  onOpenReset?: () => void;
  onCookFromExpiring?: (urgentItemNames: string[]) => void;
  onResetDemo?: () => void;
}) {
  const [filter, setFilter] = useState("Alle");
  const [search, setSearch] = useState("");

  const urgentItems = useMemo(() => {
    return pantry.filter(
      (item) =>
        !item.isUnlimited &&
        item.amount > 0 &&
        (getMhdStatus(item.mhd) === "soon" || getMhdStatus(item.mhd) === "expired")
    );
  }, [pantry]);

  const [savedWasteStats] = useState<{ count: number; money: number }>(() => {
    try {
      const saved = localStorage.getItem("vorrat_food_waste_saved");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { count: 8, money: 24.5 };
  });

  const chips = [
    "Alle",
    ...(urgentItems.length > 0 ? [`🚨 Dringend (${urgentItems.length})`] : ["🚨 Dringend"]),
    "Kühlschrank",
    "Trockenvorrat",
    "Gewürze & Saucen",
    "Getränke",
  ];

  const visible = pantry.filter((item) => {
    const isUrgent =
      !item.isUnlimited &&
      item.amount > 0 &&
      (getMhdStatus(item.mhd) === "soon" || getMhdStatus(item.mhd) === "expired");

    const categoryMatch =
      filter === "Alle" ||
      (filter.startsWith("🚨") && isUrgent) ||
      (filter === "Kühlschrank" && item.category === "Kühl") ||
      (filter === "Trockenvorrat" && item.category === "Trocken") ||
      (filter === "Gewürze & Saucen" && item.category === "Saucen") ||
      (filter === "Getränke" && item.category === "Getränke");
    return categoryMatch && item.name.toLowerCase().includes(search.toLowerCase());
  });

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
            <span className="waste-badge">🚨 Food-Waste Alarm</span>
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
              🌱 Bisher gerettet: {savedWasteStats.count} Zutaten (~{savedWasteStats.money.toFixed(0)} €)
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
        <div><h2>Lebensmittel</h2><p>Nach Füllstand sortiert</p></div>
        <Button className="text-button">Sortieren <Icon name="chevron" size={14} /></Button>
      </div>

      <div className="inventory-list">
        {visible.map((item) => {
          const isUnlimited = Boolean(item.isUnlimited || item.name.toLowerCase().includes("wasser") || item.amount >= 99999);
          const percent = isUnlimited ? 100 : Math.min(100, Math.round((item.amount / item.total) * 100));
          const status = isUnlimited ? "Vorhanden" : percent === 0 ? "Leer" : percent <= 25 ? "Niedrig" : "Vorhanden";
          const step = item.unit === "g" ? 50 : item.unit === "ml" ? 25 : 1;

          return (
            <article
              className="product-card clickable"
              key={item.id}
              onClick={() => onEditItem(item)}
            >
              <ProductMark tone={item.tone} name={item.name} />
              <div className="product-content">
                <div className="product-heading">
                  <div>
                    <div className="product-title-row">
                      <h3>{item.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
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
                    <div className="product-sub-row">
                      <span className="product-cat-pill">{item.category}</span>
                      <span className={`mhd-badge ${getMhdStatus(item.mhd)}`}>
                        {formatMhdDisplay(item.mhd)}
                      </span>
                    </div>
                  </div>
                  <span className={`status ${status.toLowerCase()}`}>
                    {isUnlimited ? "Unbegrenzt" : status}
                  </span>
                </div>
                <div className="stock-row">
                  {isUnlimited ? (
                    <span className="unlimited-stock-badge" style={{ color: "#059669", fontWeight: 700, fontSize: "12px" }}>
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
        })}

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
      </div>

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
}) {
  const [servings, setServings] = useState(3);
  const [intent, setIntent] = useState("");
  const [generated, setGenerated] = useState(false);
  const [shuffleIndex, setShuffleIndex] = useState(0);
  const [matchScore, setMatchScore] = useState(98);
  const [isRotating, setIsRotating] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [activeSearchedRecipe, setActiveSearchedRecipe] = useState<CatalogRecipe | null>(null);
  const [deckKey, setDeckKey] = useState(0);

  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [activeModalRecipe, setActiveModalRecipe] = useState<CatalogRecipe | null>(null);

  // Pure curated catalog recipes for the shuffle deck (always the 9 standard catalog proposals)
  const catalogShuffleList = useMemo(() => {
    const total = FULL_RECIPE_CATALOG.length;
    const reordered: CatalogRecipe[] = [];
    for (let i = 0; i < total; i++) {
      reordered.push(FULL_RECIPE_CATALOG[(i + shuffleIndex * 3) % total]);
    }
    return reordered;
  }, [shuffleIndex]);

  // Pre-calculated list of bookmarked favorite recipes (calories & macros remain constant per portion)
  const favoriteRecipes = useMemo(() => {
    const all = activeSearchedRecipe ? [activeSearchedRecipe, ...FULL_RECIPE_CATALOG] : FULL_RECIPE_CATALOG;
    return all.filter((item) => favorites.includes(item.id)).map((item) => ({
      ...item,
      calories: `${Math.round(item.baseCal)}`,
      protein: `${Math.round(item.baseProt)}g`,
      carbs: `${Math.round(item.baseCarb)}g`,
      cost: `${item.baseCost.toFixed(2).replace(".", ",")} €`,
      availableFormatted: item.available(servings),
    }));
  }, [activeSearchedRecipe, favorites, servings]);

  const [viewMode, setViewMode] = useState<"swipe" | "list">("swipe");
  const [stockFilter, setStockFilter] = useState<"all" | "perfect" | "max2">("all");

  // All catalog recipes formatted for the Tinder Swipe Deck (calories & macros per portion)
  // When a recipe is searched, it becomes the CURRENT (first) card at index 0!
  // It is explicitly NOT part of the shuffle list.
  const allCatalogRecipesFormatted = useMemo(() => {
    const deckList = activeSearchedRecipe
      ? [activeSearchedRecipe, ...catalogShuffleList.filter((r) => r.id !== activeSearchedRecipe.id)]
      : catalogShuffleList;

    return deckList.map((item) => ({
      ...item,
      calories: `${Math.round(item.baseCal)}`,
      protein: `${Math.round(item.baseProt)}g`,
      carbs: `${Math.round(item.baseCarb)}g`,
      cost: `${item.baseCost.toFixed(2).replace(".", ",")} €`,
      availableFormatted: item.available(servings),
    }));
  }, [activeSearchedRecipe, catalogShuffleList, servings]);

  // Calculate missing ingredient counts for every recipe in the catalog
  const recipesWithStockStats = useMemo(() => {
    return allCatalogRecipesFormatted.map((rec) => {
      const breakdown = getRecipePantryBreakdown(rec, pantry, servings);
      return {
        ...rec,
        missingCount: breakdown.missing.length,
      };
    });
  }, [allCatalogRecipesFormatted, pantry, servings]);

  const perfectStockCount = useMemo(() => {
    return recipesWithStockStats.filter((r) => r.missingCount === 0).length;
  }, [recipesWithStockStats]);

  const max2StockCount = useMemo(() => {
    return recipesWithStockStats.filter((r) => r.missingCount <= 2).length;
  }, [recipesWithStockStats]);

  const filteredDeckRecipes = useMemo(() => {
    if (stockFilter === "perfect") {
      const filtered = recipesWithStockStats.filter((r) => r.missingCount === 0);
      return filtered.length > 0 ? filtered : recipesWithStockStats;
    }
    if (stockFilter === "max2") {
      const filtered = recipesWithStockStats.filter((r) => r.missingCount <= 2);
      return filtered.length > 0 ? filtered : recipesWithStockStats;
    }
    return allCatalogRecipesFormatted;
  }, [stockFilter, recipesWithStockStats, allCatalogRecipesFormatted]);

  // Active 3 recipes selected from catalog based on shuffle index (for list view)
  const recipes = useMemo(() => {
    const list: Array<
      CatalogRecipe & {
        calories: string;
        protein: string;
        carbs: string;
        cost: string;
        availableFormatted: string;
      }
    > = [];

    if (activeSearchedRecipe) {
      list.push({
        ...activeSearchedRecipe,
        calories: `${Math.round(activeSearchedRecipe.baseCal)}`,
        protein: `${Math.round(activeSearchedRecipe.baseProt)}g`,
        carbs: `${Math.round(activeSearchedRecipe.baseCarb)}g`,
        cost: `${activeSearchedRecipe.baseCost.toFixed(2).replace(".", ",")} €`,
        availableFormatted: activeSearchedRecipe.available(servings),
      });
    }

    const total = FULL_RECIPE_CATALOG.length;
    const count = Math.min(3, total);
    for (let i = 0; i < count; i++) {
      const item = FULL_RECIPE_CATALOG[(shuffleIndex * 3 + i) % total];
      if (activeSearchedRecipe && item.id === activeSearchedRecipe.id) continue;
      list.push({
        ...item,
        calories: `${Math.round(item.baseCal)}`,
        protein: `${Math.round(item.baseProt)}g`,
        carbs: `${Math.round(item.baseCarb)}g`,
        cost: `${item.baseCost.toFixed(2).replace(".", ",")} €`,
        availableFormatted: item.available(servings),
      });
    }
    return list;
  }, [activeSearchedRecipe, shuffleIndex, servings]);

  // Shuffle Handler: Strictly rotates through catalog proposals, clears searched recipe from shuffle
  const handleShuffle = () => {
    setIsRotating(true);
    setActiveSearchedRecipe(null);
    setShuffleIndex((prev) => (prev + 1) % 3);
    setDeckKey((k) => k + 1);
    setMatchScore(Math.floor(Math.random() * 5) + 95); // 95% - 99%
    setGenerated(true);

    if (onNotify) {
      onNotify("3 neue Rezeptvorschläge gemischt");
    }

    setTimeout(() => {
      setIsRotating(false);
    }, 400);
  };

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
        setViewMode("swipe");
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
        setViewMode("swipe");
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
      handleShuffle();
      if (onNotify) onNotify("Rezeptvorschläge für deinen Vorrat aktualisiert");
    }
  };

  return (
    <main className="screen cook-screen">
      <section className="title-row cook-title">
        <div><p className="eyebrow">Smart & restefreundlich</p><h1>Was kochen wir?</h1></div>
        <div className="ai-orb"><Icon name="sparkles" size={19} /></div>
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
          <Button
            className="mic-button"
            title="Sprachnotiz aufnehmen"
            onClick={() => {
              if (intent.trim().length === 0) {
                setIntent("Schnelle Ramen mit Ei und Gemüse");
                if (onNotify) onNotify("Sprachnotiz erfasst: 'Schnelle Ramen'");
              } else {
                onMicTrigger();
              }
            }}
          >
            <Icon name="mic" size={19} />
          </Button>
        </label>

        {/* Dual button bar: Generate + Shuffle */}
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            className={`primary-button generate-button ${isAiGenerating ? "loading" : ""}`}
            style={{ flex: 2 }}
            icon={isAiGenerating ? "sync" : "wand"}
            disabled={isAiGenerating}
            onClick={handleGenerate}
          >
            {isAiGenerating ? "AI kreiert Rezept..." : "Rezepte generieren"}
          </Button>

          <Button
            className="secondary-button"
            style={{
              flex: 1,
              height: "44px",
              background: "#ecfdf5",
              borderColor: "#a7f3d0",
              color: "#047857",
              fontWeight: 750,
              gap: "5px",
            }}
            title="Alternative Rezeptvorschläge anzeigen"
            disabled={isAiGenerating}
            onClick={handleShuffle}
          >
            <span style={{ display: "inline-block", transform: isRotating ? "rotate(180deg)" : "none", transition: "transform 350ms ease" }}>
              <Icon name="shuffle" size={16} />
            </span>
            Shuffle
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
            <span>Rezept importieren (Link / Instagram / TikTok / Text)</span>
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

      {/* View Mode Toggle: Tinder-Swipe Deck vs. List View */}
      <div className="recipe-view-mode-toggle">
        <button
          type="button"
          className={viewMode === "swipe" ? "active" : ""}
          onClick={() => setViewMode("swipe")}
        >
          <span>Tinder-Swipe Deck</span>
        </button>
        <button
          type="button"
          className={viewMode === "list" ? "active" : ""}
          onClick={() => setViewMode("list")}
        >
          <span>Listenansicht</span>
        </button>
      </div>

      {/* Resteverwertungs-Filter: Alle vs 100% Vorrat vs Max 1-2 Zutaten nachkaufen */}
      <div className="stock-filter-toolbar" style={{ margin: "10px 0 14px" }}>
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
          <button
            type="button"
            className={`chip ${stockFilter === "all" ? "active" : ""}`}
            style={{
              background: stockFilter === "all" ? "#0f172a" : "#ffffff",
              color: stockFilter === "all" ? "#ffffff" : "#475569",
              borderColor: stockFilter === "all" ? "#0f172a" : "#e2e8f0",
              fontWeight: 700,
            }}
            onClick={() => {
              setStockFilter("all");
              setDeckKey((k) => k + 1);
            }}
          >
            Alle Rezepte ({allCatalogRecipesFormatted.length})
          </button>
          <button
            type="button"
            className={`chip ${stockFilter === "perfect" ? "active" : ""}`}
            style={{
              background: stockFilter === "perfect" ? "#059669" : "#ffffff",
              color: stockFilter === "perfect" ? "#ffffff" : "#047857",
              borderColor: stockFilter === "perfect" ? "#059669" : "#a7f3d0",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            onClick={() => {
              setStockFilter("perfect");
              setDeckKey((k) => k + 1);
            }}
            title="Kein Zukauf nötig · Perfekt wenn Läden abends schon zu haben"
          >
            <span>🌙</span> 100% Vorrat ({perfectStockCount})
          </button>
          <button
            type="button"
            className={`chip ${stockFilter === "max2" ? "active" : ""}`}
            style={{
              background: stockFilter === "max2" ? "#0284c7" : "#ffffff",
              color: stockFilter === "max2" ? "#ffffff" : "#0369a1",
              borderColor: stockFilter === "max2" ? "#0284c7" : "#bae6fd",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            onClick={() => {
              setStockFilter("max2");
              setDeckKey((k) => k + 1);
            }}
            title="Maximal 1 bis 2 Zutaten nachkaufen"
          >
            <span>🛒</span> Max. 1–2 Zukauf ({max2StockCount})
          </button>
        </div>

        {stockFilter === "perfect" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 12px",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "12px",
              marginTop: "8px",
              fontSize: "11px",
              color: "#065f46",
            }}
          >
            <span style={{ fontSize: "16px" }}>🌙</span>
            <div>
              <strong>Abend-Filter aktiv: Läden schon zu?</strong>
              <div style={{ color: "#047857", fontSize: "10.5px" }}>
                Zeige nur Rezepte, für die du 0 Zutaten nachkaufen musst.
              </div>
            </div>
          </div>
        )}
      </div>

      {viewMode === "swipe" ? (
        <RecipeSwipeDeck
          key={`${deckKey}-${stockFilter}`}
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
          onShuffle={handleShuffle}
          onNavigateToSaved={onNavigateToCook}
        />
      ) : (
        <>
          <div className="section-heading recipe-heading">
            <div>
              <h2>{generated ? "Frisch für dich erstellt" : "Passt zu deinem Vorrat"}</h2>
              <p>Runde {(shuffleIndex % 3) + 1} von 3 · Preiswert und ohne Verschwendung</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span className="match-badge">{matchScore}% Match</span>
              <Button
                className="secondary-button"
                style={{
                  height: "30px",
                  padding: "0 9px",
                  fontSize: "10px",
                  gap: "4px",
                  background: "#fff",
                  borderColor: "#cbd5e1",
                  color: "#334155",
                }}
                onClick={handleShuffle}
                title="Andere 3 Rezepte anzeigen"
              >
                <Icon name="shuffle" size={12} />
                Shuffle
              </Button>
            </div>
          </div>

          <div className="recipe-list">
            {recipes.map((recipe, index) => (
              <article className="recipe-card" key={recipe.id}>
                <div className={`recipe-visual ${recipe.tone}`}>
                  {/* Bookmark / Favorite Button */}
                  <button
                    type="button"
                    className={`recipe-bookmark-button ${favorites.includes(recipe.id) ? "active" : ""}`}
                    title={favorites.includes(recipe.id) ? "Aus Favoriten entfernen" : "Als Favorit speichern"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(recipe.id, recipe.title);
                    }}
                  >
                    <Icon
                      name={favorites.includes(recipe.id) ? "bookmarkFilled" : "bookmark"}
                      size={16}
                    />
                  </button>

                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.title}
                      className="recipe-card-img"
                      loading="lazy"
                    />
                  ) : (
                    <div className="plate">
                      <span className="rice-grain one" /><span className="rice-grain two" /><span className="rice-grain three" />
                      <span className="yolk" /><span className="green one" /><span className="green two" />
                    </div>
                  )}
                  <span className="recipe-number">0{index + 1}</span>
                </div>
                <div className="recipe-body">
                  <div className="recipe-topline">
                    <span><Icon name="clock" size={14} /> {recipe.time}</span>
                    <span>{recipe.difficulty}</span>
                    {favorites.includes(recipe.id) && (
                      <span className="favorite-badge">
                        <Icon name="bookmarkFilled" size={10} /> Favorit
                      </span>
                    )}
                  </div>
                  <h3>{recipe.title}</h3>
                  <p className="recipe-subtitle">{recipe.subtitle}</p>
                  <div className="metric-grid">
                    <div><span>Kalorien</span><strong>{recipe.calories}<small> kcal</small></strong></div>
                    <div><span>Protein</span><strong>{recipe.protein}</strong></div>
                    <div><span>Carbs</span><strong>{recipe.carbs}</strong></div>
                    <div className="cost"><span>Kosten / Port.</span><strong>{recipe.cost}</strong></div>
                  </div>
                  {(() => {
                    const breakdown = getRecipePantryBreakdown(recipe, pantry, servings);
                    return (
                      <div className="swipe-pantry-breakdown" style={{ margin: "8px 0" }}>
                        {breakdown.missing.length > 0 ? (
                          <>
                            <div className="pantry-status-box missing">
                              <div className="pantry-status-header">
                                <div className="pantry-status-title missing">
                                  <Icon name="cart" size={13} />
                                  <span>Fehlt im Vorrat ({breakdown.missing.length})</span>
                                </div>
                                {onAddMissingToGroceries && (
                                  <button
                                    type="button"
                                    className="add-to-groceries-btn"
                                    onClick={() => onAddMissingToGroceries(breakdown.missing)}
                                    title="Fehlende Zutaten auf Einkaufsliste setzen"
                                  >
                                    + Auf Einkaufsliste
                                  </button>
                                )}
                              </div>
                              <div className="pantry-chips-wrap">
                                {breakdown.missing.map((item, idx) => (
                                  <span key={idx} className="pantry-chip missing">
                                    <span className="chip-bullet">•</span>
                                    <strong className="chip-name">{item.name}</strong>
                                    <span className="chip-amount">{item.amount}</span>
                                  </span>
                                ))}
                              </div>
                            </div>

                            {breakdown.inStock.length > 0 && (
                              <div className="pantry-status-box instock">
                                <div className="pantry-status-header">
                                  <div className="pantry-status-title instock">
                                    <Icon name="check" size={13} />
                                    <span>Im Vorrat ({breakdown.inStock.length})</span>
                                  </div>
                                </div>
                                <div className="pantry-chips-wrap">
                                  {breakdown.inStock.map((item, idx) => (
                                    <span key={idx} className="pantry-chip instock">
                                      <span className="chip-bullet">✓</span>
                                      <span className="chip-name">
                                        {item.name}
                                        {item.matchedByAlternative && (
                                          <small style={{ opacity: 0.85, marginLeft: "4px", fontSize: "9px", color: "#047857" }}>
                                            (Vorrat: {item.matchedByAlternative})
                                          </small>
                                        )}
                                      </span>
                                      <span className="chip-amount">{item.amount}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="pantry-status-box all-matched">
                            <div className="pantry-status-header">
                              <div className="pantry-status-title instock">
                                <Icon name="check" size={13} />
                                <span>Alle {breakdown.all.length} Zutaten im Vorrat vorhanden (100% Match)</span>
                              </div>
                            </div>
                            <div className="pantry-chips-wrap">
                              {breakdown.all.map((item, idx) => (
                                <span key={idx} className="pantry-chip instock">
                                  <span className="chip-bullet">✓</span>
                                  <span className="chip-name">
                                    {item.name}
                                    {item.matchedByAlternative && (
                                      <small style={{ opacity: 0.85, marginLeft: "4px", fontSize: "9px", color: "#047857" }}>
                                        (Vorrat: {item.matchedByAlternative})
                                      </small>
                                    )}
                                  </span>
                                  <span className="chip-amount">{item.amount}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Inline Step-by-Step Instructions Accordion */}
                  <RecipeStepsAccordion
                    recipe={recipe}
                    servings={servings}
                    isOpen={expandedRecipeId === recipe.id}
                    onToggle={() => setExpandedRecipeId((prev) => (prev === recipe.id ? null : recipe.id))}
                    onOpenModal={() => setActiveModalRecipe(recipe)}
                    onBookmark={(id, title) => onBookmark(id, title)}
                    isBookmarked={favorites.includes(recipe.id)}
                  />

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                    <Button
                      className="secondary-button"
                      style={{
                        flex: 1,
                        height: "40px",
                        background: "#ffffff",
                        borderColor: "#cbd5e1",
                        color: "#0f172a",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        gap: "6px",
                      }}
                      onClick={() => setActiveModalRecipe(recipe)}
                    >
                      <Icon name="book" size={15} />
                      Koch-Modus & Timer
                    </Button>
                    <Button
                      className={favorites.includes(recipe.id) ? "secondary-button" : "cook-button"}
                      style={{
                        flex: 1,
                        height: "40px",
                        margin: 0,
                        background: favorites.includes(recipe.id) ? "#ecfdf5" : undefined,
                        borderColor: favorites.includes(recipe.id) ? "#a7f3d0" : undefined,
                        color: favorites.includes(recipe.id) ? "#047857" : undefined,
                        fontWeight: 750,
                      }}
                      onClick={() => onBookmark(recipe.id, recipe.title)}
                    >
                      <Icon name="bookmarkFilled" size={15} />
                      <span>{favorites.includes(recipe.id) ? "Gemerkt" : "Merken"}</span>
                    </Button>
                  </div>
                </div>
              </article>
            ))}

            {/* Dedicated Bottom Shuffle Card */}
            <div
              style={{
                padding: "16px 14px",
                background: "#ffffff",
                border: "1px dashed #cbd5e1",
                borderRadius: "18px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "7px",
                marginTop: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontSize: "11px", fontWeight: 700 }}>
                <Icon name="shuffle" size={15} />
                <span>Gefällt dir keiner der Vorschläge?</span>
              </div>
              <p style={{ margin: 0, fontSize: "10px", color: "#94a3b8" }}>
                Tippe auf Shuffle für weitere 3 Rezept-Kombinationen aus deinem Vorrat.
              </p>
              <Button
                className="secondary-button"
                style={{
                  width: "100%",
                  height: "40px",
                  justifyContent: "center",
                  gap: "6px",
                  background: "#ecfdf5",
                  borderColor: "#6ee7b7",
                  color: "#047857",
                  fontSize: "11px",
                  fontWeight: 750,
                }}
                onClick={handleShuffle}
              >
                <Icon name="shuffle" size={15} />
                Andere Rezepte anzeigen (Shuffle)
              </Button>
            </div>
          </div>
        </>
      )}

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
    </main>
  );
}

export function findMatchingPantryItem(groceryName: string, pantry: PantryItem[]): PantryItem | undefined {
  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/bio\s+/g, "")
      .replace(/tk\s*[-]?/g, "")
      .replace(/soße/g, "sauce")
      .replace(/frühlingszwiebeln/g, "frühlingszwiebel")
      .trim();

  const gNorm = normalize(groceryName);

  // 1. Direct or normalized exact match
  const exact = pantry.find((p) => {
    const pNorm = normalize(p.name);
    return pNorm === gNorm || p.name.toLowerCase().trim() === groceryName.toLowerCase().trim();
  });
  if (exact) return exact;

  // 2. Substring matching
  return pantry.find((p) => {
    const pNorm = normalize(p.name);
    return (
      (pNorm.length >= 3 && gNorm.includes(pNorm)) ||
      (gNorm.length >= 3 && pNorm.includes(gNorm))
    );
  });
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
  onNavigateToPlanner,
  onNotify,
}: {
  groceries: GroceryItem[];
  onComplete: (checkedIds: number[]) => void;
  onToggleItem: (id: number) => void;
  onDeleteGrocery: (id: number) => void;
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
            <span>{activeChecked.length} erledigt</span>
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

          <div className="shopping-footer">
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
    { id: "cook", label: "Kochen", icon: "chef", count: savedCount > 0 ? savedCount : undefined },
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
      const saved = localStorage.getItem("forret_favorite_recipes");
      if (saved) return JSON.parse(saved);
    } catch {}
    return ["r1", "r2"];
  });

  useEffect(() => {
    try {
      localStorage.setItem("forret_favorite_recipes", JSON.stringify(favorites));
    } catch {}
  }, [favorites]);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [pantry, setPantry] = useState<PantryItem[]>(() => {
    try {
      const saved = localStorage.getItem("forret_design_pantry");
      if (saved) {
        const parsed = JSON.parse(saved);
        const hasWater = parsed.some((p: any) => p.name.toLowerCase().includes("wasser"));
        const base = hasWater ? parsed : [...parsed, defaultPantry[6]];
        const enhanced = base.map((item: any) => {
          const specs = getItemNutrientSpecs(item);
          return {
            ...item,
            isUnlimited: Boolean(item.isUnlimited || item.name.toLowerCase().includes("wasser") || item.amount >= 99999),
            caloriesPer100g: item.caloriesPer100g !== undefined ? item.caloriesPer100g : specs.caloriesPer100g,
            proteinPer100g: item.proteinPer100g !== undefined ? item.proteinPer100g : specs.proteinPer100g,
            carbsPer100g: item.carbsPer100g !== undefined ? item.carbsPer100g : specs.carbsPer100g,
            fatPer100g: item.fatPer100g !== undefined ? item.fatPer100g : specs.fatPer100g,
          };
        });
        return deduplicatePantry(enhanced);
      }
    } catch {}
    return defaultPantry;
  });

  useEffect(() => {
    try {
      localStorage.setItem("forret_design_pantry", JSON.stringify(pantry));
    } catch {}
  }, [pantry]);

  const [customRecipes, setCustomRecipes] = useState<CatalogRecipe[]>(() => getStoredCustomRecipes());

  const allRecipes = useMemo(() => {
    return [...customRecipes, ...FULL_RECIPE_CATALOG];
  }, [customRecipes]);

  const handleAddCustomRecipe = (recipe: CatalogRecipe) => {
    setCustomRecipes((prev) => [recipe, ...prev.filter((r) => r.id !== recipe.id)]);
  };

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
      const saved = localStorage.getItem("forret_design_groceries");
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultGroceries;
  });

  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>(() => {
    try {
      const saved = localStorage.getItem("forret_weekly_plan");
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
      localStorage.setItem("forret_weekly_plan", JSON.stringify(plannedMeals));
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
  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleCookFromExpiring = (urgentItemNames: string[]) => {
    setActiveTab("discover");
    notify(`Reste-Kochen vorbereitet: ${urgentItemNames.slice(0, 3).join(", ")}`);
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

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem("forret_design_pantry", JSON.stringify(pantry));
    } catch {}
  }, [pantry]);

  useEffect(() => {
    try {
      localStorage.setItem("forret_design_groceries", JSON.stringify(groceries));
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

    setPantry((items) =>
      items.map((item) => {
        if (item.isUnlimited || item.name.toLowerCase().includes("wasser")) {
          return item;
        }

        let deductAmount = 0;
        const itemNameLower = item.name.toLowerCase();

        if (recipe) {
          const ingList = recipe.ingredientsList(servings);
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
        const match = findMatchingPantryItem(grocery.name, updatedPantry);

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

  const handleReceiptImported = () => {
    setPantry((prev) =>
      prev.map((p) => {
        if (p.id === 1) return { ...p, amount: 1000 };
        if (p.id === 2) return { ...p, amount: 10 };
        if (p.id === 3) return { ...p, amount: 250 };
        if (p.id === 4) return { ...p, amount: 450 };
        return p;
      })
    );
    notify("4 Kassenbon-Positionen erfolgreich eingebucht");
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
      localStorage.setItem("forret_design_pantry", JSON.stringify(defaultPantry));
      localStorage.setItem("forret_design_groceries", JSON.stringify(defaultGroceries));
    } catch {}
    notify("Standard-Demo Vorrat & Einkaufsliste wiederhergestellt!");
  };

  const handleClearPantry = () => {
    setPantry([]);
    try {
      localStorage.setItem("forret_design_pantry", JSON.stringify([]));
    } catch {}
    notify("Vorrat komplett geleert (0 Produkte)");
  };

  const handleDeduplicatePantry = () => {
    setPantry((prev) => {
      const cleaned = deduplicatePantry(prev);
      try {
        localStorage.setItem("forret_design_pantry", JSON.stringify(cleaned));
      } catch {}
      return cleaned;
    });
    notify("Duplikate erfolgreich zusammengeführt & bereinigt!");
  };

  const handleFullReset = () => {
    setPantry(defaultPantry);
    setGroceries(defaultGroceries);
    try {
      localStorage.clear();
      localStorage.setItem("forret_design_pantry", JSON.stringify(defaultPantry));
      localStorage.setItem("forret_design_groceries", JSON.stringify(defaultGroceries));
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
    setGroceries((prev) => {
      const next = [...prev];
      let addedCount = 0;
      for (const it of items) {
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
    notify(`${items.length} ${items.length === 1 ? "fehlende Zutat" : "fehlende Zutaten"} zur Einkaufsliste hinzugefügt!`);
  };

  return (
    <div className="app-shell">
      <AppHeader
        onOpenHousehold={() => setIsHouseholdModalOpen(true)}
        onOpenCoach={() => setIsCoachModalOpen(true)}
        onResetDemo={handleResetDemo}
        onOpenReset={() => setIsResetModalOpen(true)}
      />

      {activeTab === "pantry" && (
        <PantryScreen
          pantry={pantry}
          updateAmount={updateAmount}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onEditItem={(item) => setEditingPantryItem(item)}
          onDeleteItem={handleDeletePantryItem}
          onOpenReset={() => setIsResetModalOpen(true)}
          onCookFromExpiring={handleCookFromExpiring}
          onResetDemo={handleResetDemo}
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
          onNotify={notify}
        />
      )}

      {activeTab === "shop" && (
        <ShoppingScreen
          groceries={groceries}
          onComplete={completeShopping}
          onToggleItem={() => {}}
          onDeleteGrocery={(id) => setGroceries((prev) => prev.filter((g) => g.id !== id))}
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

      {/* Household Sync & Sharing Modal (WG / Familie Einladungslink) */}
      <HouseholdSyncModal
        isOpen={isHouseholdModalOpen}
        onClose={() => setIsHouseholdModalOpen(false)}
        onNotify={notify}
        pantryCount={pantry.length}
        shoppingCount={groceries.length}
        onOpenReset={() => setIsResetModalOpen(true)}
      />

      {/* Account / Pantry Reset & Deduplication Modal */}
      <AccountResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        pantryCount={pantry.length}
        shoppingCount={groceries.length}
        onResetDemo={handleResetDemo}
        onClearPantry={handleClearPantry}
        onDeduplicate={handleDeduplicatePantry}
        onFullReset={handleFullReset}
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

      {/* Smart Nutrition Coach Modal (Zero-cost macros & lean AI consult) */}
      <NutritionCoachModal
        isOpen={isCoachModalOpen}
        onClose={() => setIsCoachModalOpen(false)}
        pantry={pantry}
        onNotify={notify}
      />
    </div>
  );
}

