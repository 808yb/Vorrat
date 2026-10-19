/**
 * Central storage keys constant for Vorrat.
 * Unifies all localStorage access and ensures complete data wipes without orphaned keys.
 */
export const STORAGE_KEYS = {
  PANTRY: "vorrat_pantry",
  GROCERIES: "vorrat_groceries",
  FAVORITES: "vorrat_favorites",
  CUSTOM_RECIPES: "vorrat_custom_recipes",
  WEEKLY_PLAN: "vorrat_weekly_plan",
  FOOD_WASTE: "vorrat_food_waste_saved",
  HOUSEHOLD_NAME: "vorrat_household_name",
  HOUSEHOLD_CODE: "vorrat_household_code",
  PWA_DISMISSED: "vorrat_pwa_dismissed",
} as const;

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

/**
 * Completely wipes all application data from localStorage.
 */
export function wipeAllAppData(): void {
  try {
    ALL_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });
    localStorage.clear();
  } catch (err) {
    console.error("Fehler beim Zurücksetzen des lokalen Speichers:", err);
  }
}
