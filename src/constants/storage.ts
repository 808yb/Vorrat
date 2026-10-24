/**
 * Central storage keys constant for Vorrat.
 * Unifies all localStorage access and ensures complete data wipes without orphaned keys.
 */
export const STORAGE_KEYS = {
  PANTRY: "vorrat_pantry",
  GROCERIES: "vorrat_groceries",
  FAVORITES: "vorrat_favorites",
  CUSTOM_RECIPES: "vorrat_custom_recipes",
  DELETED_RECIPES: "vorrat_deleted_recipes",
  WEEKLY_PLAN: "vorrat_weekly_plan",
  FOOD_WASTE: "vorrat_food_waste_saved",
  HOUSEHOLD_NAME: "vorrat_household_name",
  HOUSEHOLD_CODE: "vorrat_household_code",
  PWA_DISMISSED: "vorrat_pwa_dismissed",
  ALTERNATIVE_OVERRIDES: "vorrat_alternative_overrides",
  RECIPE_SOURCES: "vorrat_recipe_sources",
  RECEIPT_EXPENSES: "vorrat_receipt_expenses",
} as const;

/**
 * Migration mapping from legacy forret_* keys to standardized vorrat_* keys.
 */
export const LEGACY_STORAGE_MIGRATION_MAP: ReadonlyArray<{ legacy: string; modern: string }> = [
  { legacy: "forret_design_pantry", modern: STORAGE_KEYS.PANTRY },
  { legacy: "forret_design_groceries", modern: STORAGE_KEYS.GROCERIES },
  { legacy: "forret_favorite_recipes", modern: STORAGE_KEYS.FAVORITES },
  { legacy: "forret_favorites", modern: STORAGE_KEYS.FAVORITES },
  { legacy: "forret_custom_recipes", modern: STORAGE_KEYS.CUSTOM_RECIPES },
  { legacy: "forret_weekly_plan", modern: STORAGE_KEYS.WEEKLY_PLAN },
  { legacy: "forret_household_name", modern: STORAGE_KEYS.HOUSEHOLD_NAME },
  { legacy: "forret_household_code", modern: STORAGE_KEYS.HOUSEHOLD_CODE },
];

/**
 * One-time lossless migration of legacy forret_* storage keys to modern vorrat_* keys.
 * Runs on application startup before the initial state is read.
 */
export function migrateLegacyStorageKeys(): void {
  const storage =
    typeof window !== "undefined" && window.localStorage
      ? window.localStorage
      : typeof localStorage !== "undefined"
      ? localStorage
      : null;

  if (!storage) return;

  for (const { legacy, modern } of LEGACY_STORAGE_MIGRATION_MAP) {
    try {
      const modernVal = storage.getItem(modern);
      const legacyVal = storage.getItem(legacy);

      // If modern key is empty but legacy key has data, migrate value to modern key
      if (!modernVal && legacyVal) {
        storage.setItem(modern, legacyVal);
      }
      // Clean up legacy key once migrated or if modern key already has data
      if (legacyVal) {
        storage.removeItem(legacy);
      }
    } catch (err) {
      console.warn(`[Storage Migration] Error migrating ${legacy} -> ${modern}:`, err);
    }
  }
}

/**
 * Complete list of all active and legacy storage keys.
 * Used during reset and wipe operations to guarantee 100% clean state.
 */
export const ALL_STORAGE_KEYS: readonly string[] = [
  ...Object.values(STORAGE_KEYS),
  // Legacy keys for complete backward compatibility wipe
  "forret_design_pantry",
  "forret_design_groceries",
  "forret_favorite_recipes",
  "forret_favorites",
  "forret_custom_recipes",
  "forret_weekly_plan",
  "forret_household_name",
  "forret_household_code",
  "vorrat_coach_chat_history",
  "vorrat_fitness_goal",
  "vorrat_dietary_pref",
];

import { reportWarning } from "../utils/logger";

/**
 * Completely wipes all application data from localStorage.
 */
export function wipeAllAppData(): void {
  try {
    ALL_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        reportWarning(`wipeAllAppData key ${key}`, err);
      }
    });
    localStorage.clear();
  } catch (err) {
    console.error("Fehler beim Zurücksetzen des lokalen Speichers:", err);
  }
}
