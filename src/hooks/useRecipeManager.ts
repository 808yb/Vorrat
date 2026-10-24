import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { FULL_RECIPE_CATALOG, type CatalogRecipe } from "../data/recipeCatalog";
import {
  getStoredCustomRecipes,
  rehydrateCustomRecipe,
  deleteStoredCustomRecipe,
  markRecipeAsDeleted,
} from "../utils/geminiRecipes";
import {
  type PlannedMeal,
  type WeekdayId,
  WEEKDAYS,
} from "../components/WeeklyMealPlannerScreen";
import { STORAGE_KEYS } from "../constants/storage";
import { reportWarning } from "../utils/logger";

export interface UseRecipeManagerOptions {
  notify?: (message: string) => void;
  onAddMissingToGroceries?: (missingItems: Array<{ name: string; amount?: string }>) => void;
}

export interface UseRecipeManagerReturn {
  customRecipes: CatalogRecipe[];
  setCustomRecipes: Dispatch<SetStateAction<CatalogRecipe[]>>;
  allRecipes: CatalogRecipe[];
  favorites: string[];
  setFavorites: Dispatch<SetStateAction<string[]>>;
  plannedMeals: PlannedMeal[];
  setPlannedMeals: Dispatch<SetStateAction<PlannedMeal[]>>;
  handleAddCustomRecipe: (recipe: CatalogRecipe) => void;
  handleUpdateCustomRecipe: (recipe: CatalogRecipe) => void;
  handleDeleteRecipe: (recipe: CatalogRecipe) => void;
  toggleFavorite: (recipeId: string, recipeTitle: string) => void;
  bookmarkRecipe: (recipeId: string, recipeTitle: string) => void;
  addPlannedMeal: (meal: Omit<PlannedMeal, "id">) => void;
  removePlannedMeal: (id: string) => void;
  updateMealServings: (id: string, servings: number) => void;
  movePlannedMeal: (id: string, newDay: WeekdayId) => void;
  clearPlan: () => void;
  autoPlanWeek: () => void;
  cookSelectedRecipeId: string | null;
  setCookSelectedRecipeId: Dispatch<SetStateAction<string | null>>;
  cookSelectedServings: number;
  setCookSelectedServings: Dispatch<SetStateAction<number>>;
  expiringSearchIngredients: string[];
  setExpiringSearchIngredients: Dispatch<SetStateAction<string[]>>;
  isSurpriseModalOpen: boolean;
  setIsSurpriseModalOpen: Dispatch<SetStateAction<boolean>>;
  isImportModalOpen: boolean;
  setIsImportModalOpen: Dispatch<SetStateAction<boolean>>;
  handleStartCookingFromPlanner: (recipeId: string, servings: number, onNavigateToCook?: () => void) => void;
  handleCookFromExpiring: (urgentItemNames: string[], onNavigateToDiscover?: () => void) => void;
  handleClearExpiringFilter: () => void;
  handleSaveImportedRecipe: (
    recipe: CatalogRecipe,
    addMissingToGroceries: boolean,
    missingItems: Array<{ name: string; amount?: string }>
  ) => void;
  handleWipeRecipes: () => void;
}

export function useRecipeManager({
  notify,
  onAddMissingToGroceries,
}: UseRecipeManagerOptions = {}): UseRecipeManagerReturn {
  // 1. Custom Recipes & Full Recipe Catalog
  const [customRecipes, setCustomRecipes] = useState<CatalogRecipe[]>(() => getStoredCustomRecipes());

  const allRecipes = useMemo(() => {
    const customIds = new Set(customRecipes.map((r) => r.id));
    return [...customRecipes, ...FULL_RECIPE_CATALOG.filter((r) => !customIds.has(r.id))];
  }, [customRecipes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(customRecipes));
    } catch (err) {
      reportWarning("useRecipeManager: Failed to persist customRecipes to localStorage", err);
    }
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

  const handleDeleteRecipe = (recipe: CatalogRecipe) => {
    deleteStoredCustomRecipe(recipe.id);
    markRecipeAsDeleted(recipe.id);
    setCustomRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
    setFavorites((prev) => prev.filter((id) => id !== recipe.id));
    notify?.(`🗑️ «${recipe.title}» wurde gelöscht.`);
  };

  // 2. Favorites State
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      reportWarning("useRecipeManager: Failed to read favorites from localStorage", err);
    }
    return ["r1", "r2"];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch (err) {
      reportWarning("useRecipeManager: Failed to persist favorites to localStorage", err);
    }
  }, [favorites]);

  const toggleFavorite = (recipeId: string, recipeTitle: string) => {
    setFavorites((prev) => {
      const isFav = prev.includes(recipeId);
      let next: string[];
      if (isFav) {
        next = prev.filter((id) => id !== recipeId);
        notify?.(`«${recipeTitle}» aus gemerkten Meals entfernt`);
      } else {
        next = [...prev, recipeId];
        notify?.(`«${recipeTitle}» zu gemerkten Meals hinzugefügt`);
      }
      return next;
    });
  };

  const bookmarkRecipe = (recipeId: string, recipeTitle: string) => {
    setFavorites((prev) => {
      if (prev.includes(recipeId)) {
        notify?.(`«${recipeTitle}» ist bereits gemerkt`);
        return prev;
      }
      const next = [...prev, recipeId];
      notify?.(`«${recipeTitle}» gemerkt! Zu gemerkten Mahlzeiten hinzugefügt.`);
      return next;
    });
  };

  // 3. Weekly Meal Planner State
  const [plannedMeals, setPlannedMeals] = useState<PlannedMeal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WEEKLY_PLAN);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      reportWarning("useRecipeManager: Failed to read plannedMeals from localStorage", err);
    }
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
    } catch (err) {
      reportWarning("useRecipeManager: Failed to persist plannedMeals to localStorage", err);
    }
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
    notify?.("Mahlzeit aus Wochenplan entfernt");
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
    notify?.(`Mahlzeit auf ${dayName} verschoben`);
  };

  const clearPlan = () => {
    setPlannedMeals([]);
    notify?.("Wochenplan geleert");
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
    notify?.("Gemerkte Mahlzeiten auf Wochentage verteilt");
  };

  // 4. Modal & Interaction States
  const [cookSelectedRecipeId, setCookSelectedRecipeId] = useState<string | null>(null);
  const [cookSelectedServings, setCookSelectedServings] = useState<number>(2);
  const [expiringSearchIngredients, setExpiringSearchIngredients] = useState<string[]>([]);
  const [isSurpriseModalOpen, setIsSurpriseModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleStartCookingFromPlanner = (
    recipeId: string,
    servings: number,
    onNavigateToCook?: () => void
  ) => {
    setFavorites((prev) => (prev.includes(recipeId) ? prev : [...prev, recipeId]));
    setCookSelectedRecipeId(recipeId);
    setCookSelectedServings(servings);
    onNavigateToCook?.();
    const found = allRecipes.find((r) => r.id === recipeId);
    notify?.(`«${found ? found.title : "Rezept"}» im Koch-Tab geöffnet (${servings} ${servings === 1 ? "Portion" : "Portionen"})`);
  };

  const handleCookFromExpiring = (
    urgentItemNames: string[],
    onNavigateToDiscover?: () => void
  ) => {
    setExpiringSearchIngredients(urgentItemNames);
    onNavigateToDiscover?.();
    notify?.(
      `Reste-Modus aktiv: ${urgentItemNames.length} ablaufende ${urgentItemNames.length === 1 ? "Zutat" : "Zutaten"} priorisiert!`
    );
  };

  const handleClearExpiringFilter = () => {
    setExpiringSearchIngredients([]);
    notify?.("Reste-Filter zurückgesetzt");
  };

  const handleSaveImportedRecipe = (
    recipe: CatalogRecipe,
    addMissingToGroceries: boolean,
    missingItems: Array<{ name: string; amount?: string }>
  ) => {
    handleAddCustomRecipe(recipe);
    setFavorites((prev) => (prev.includes(recipe.id) ? prev : [recipe.id, ...prev]));
    if (addMissingToGroceries && missingItems.length > 0 && onAddMissingToGroceries) {
      onAddMissingToGroceries(missingItems);
    }
  };

  const handleWipeRecipes = () => {
    setCustomRecipes([]);
    setFavorites([]);
    setPlannedMeals([]);
    setExpiringSearchIngredients([]);
  };

  return {
    customRecipes,
    setCustomRecipes,
    allRecipes,
    favorites,
    setFavorites,
    plannedMeals,
    setPlannedMeals,
    handleAddCustomRecipe,
    handleUpdateCustomRecipe,
    handleDeleteRecipe,
    toggleFavorite,
    bookmarkRecipe,
    addPlannedMeal,
    removePlannedMeal,
    updateMealServings,
    movePlannedMeal,
    clearPlan,
    autoPlanWeek,
    cookSelectedRecipeId,
    setCookSelectedRecipeId,
    cookSelectedServings,
    setCookSelectedServings,
    expiringSearchIngredients,
    setExpiringSearchIngredients,
    isSurpriseModalOpen,
    setIsSurpriseModalOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    handleStartCookingFromPlanner,
    handleCookFromExpiring,
    handleClearExpiringFilter,
    handleSaveImportedRecipe,
    handleWipeRecipes,
  };
}
