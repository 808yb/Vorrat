import { useState, useEffect, useRef, useCallback } from "react";
import {
  getCurrentUser,
  fetchUserDataFromSupabase,
  backupUserDataToSupabase,
} from "../utils/supabaseClient";
import { rehydrateCustomRecipe } from "../utils/geminiRecipes";
import { reportWarning, reportUserError } from "../utils/logger";
import type { PantryItem, GroceryItem } from "../App";
import type { CatalogRecipe } from "../data/recipeCatalog";
import type { PlannedMeal } from "../components/WeeklyMealPlannerScreen";

export type CloudSyncStatus = "idle" | "saving" | "saved" | "error";

export interface UseCloudSyncProps {
  pantry: PantryItem[];
  groceries: GroceryItem[];
  customRecipes: CatalogRecipe[];
  plannedMeals: PlannedMeal[];
  favorites: string[];
  setPantry: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  setGroceries: React.Dispatch<React.SetStateAction<GroceryItem[]>>;
  setCustomRecipes: React.Dispatch<React.SetStateAction<CatalogRecipe[]>>;
  setPlannedMeals: React.Dispatch<React.SetStateAction<PlannedMeal[]>>;
  setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface UseCloudSyncReturn {
  hasCloudUser: boolean;
  setHasCloudUser: React.Dispatch<React.SetStateAction<boolean>>;
  hasCompletedInitialCloudLoad: boolean;
  syncStatus: CloudSyncStatus;
  lastSyncTime: string | null;
  triggerManualSync: () => Promise<void>;
  checkUserSession: () => Promise<void>;
}

/**
 * Pure state updater for cloud data.
 * Fixes the Empty-Cloud-Bug: empty arrays (e.g. pantry.length === 0) are honored
 * so that an emptied pantry on Device A correctly clears Device B.
 */
export function applyCloudDataToState(
  cloudData: {
    pantry?: unknown[];
    groceries?: unknown[];
    customRecipes?: unknown[];
    mealPlan?: unknown[];
    favorites?: unknown[];
  },
  callbacks: {
    setPantry: (items: PantryItem[]) => void;
    setGroceries: (items: GroceryItem[]) => void;
    setCustomRecipes: (recipes: CatalogRecipe[]) => void;
    setPlannedMeals: (meals: PlannedMeal[]) => void;
    setFavorites: (favs: string[]) => void;
  }
): void {
  if (Array.isArray(cloudData.pantry)) {
    callbacks.setPantry(cloudData.pantry as PantryItem[]);
  }
  if (Array.isArray(cloudData.groceries)) {
    callbacks.setGroceries(cloudData.groceries as GroceryItem[]);
  }
  if (Array.isArray(cloudData.customRecipes)) {
    callbacks.setCustomRecipes(
      (cloudData.customRecipes as any[]).map(rehydrateCustomRecipe)
    );
  }
  if (Array.isArray(cloudData.mealPlan)) {
    callbacks.setPlannedMeals(cloudData.mealPlan as PlannedMeal[]);
  }
  if (Array.isArray(cloudData.favorites)) {
    callbacks.setFavorites(cloudData.favorites as string[]);
  }
}

/**
 * Custom hook to manage Supabase Cloud Sync with debounced auto-save and visible sync states.
 */
export function useCloudSync({
  pantry,
  groceries,
  customRecipes,
  plannedMeals,
  favorites,
  setPantry,
  setGroceries,
  setCustomRecipes,
  setPlannedMeals,
  setFavorites,
}: UseCloudSyncProps): UseCloudSyncReturn {
  const [hasCloudUser, setHasCloudUser] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>("idle");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [hasCompletedInitialCloudLoad, setHasCompletedInitialCloudLoad] = useState(false);
  const isInitialCloudLoadedRef = useRef(false);

  const checkUserSession = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      const hasUser = Boolean(user);
      setHasCloudUser(hasUser);
      if (!hasUser) {
        setHasCompletedInitialCloudLoad(true);
        isInitialCloudLoadedRef.current = true;
      }
    } catch (err) {
      reportWarning("CloudSync.checkUserSession", err);
      setHasCloudUser(false);
    }
  }, []);

  // 1. Initial Cloud Load on Mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          if (isMounted) {
            setHasCloudUser(false);
            setHasCompletedInitialCloudLoad(true);
            isInitialCloudLoadedRef.current = true;
          }
          return;
        }

        if (isMounted) {
          setHasCloudUser(true);
          setSyncStatus("saving");
        }

        const cloudData = await fetchUserDataFromSupabase();

        if (isMounted) {
          if (cloudData) {
            applyCloudDataToState(cloudData, {
              setPantry,
              setGroceries,
              setCustomRecipes,
              setPlannedMeals,
              setFavorites,
            });
            setSyncStatus("saved");
            setLastSyncTime(
              new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            );
          } else {
            setSyncStatus("idle");
          }
          // Mark initial load successful ONLY on non-error
          setHasCompletedInitialCloudLoad(true);
          isInitialCloudLoadedRef.current = true;
        }
      } catch (err) {
        reportWarning("CloudSync.initialFetch", err);
        if (isMounted) {
          setSyncStatus("error");
          // DO NOT mark initial load as completed on failure to prevent wiping cloud data
          setHasCompletedInitialCloudLoad(false);
          isInitialCloudLoadedRef.current = false;
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [setPantry, setGroceries, setCustomRecipes, setPlannedMeals, setFavorites]);

  // 2. Debounced auto-save to Supabase when data changes
  useEffect(() => {
    // Strictly block auto-saving until initial cloud load succeeded (or manual sync succeeds)
    if (!hasCloudUser || !isInitialCloudLoadedRef.current || !hasCompletedInitialCloudLoad) return;

    const timer = setTimeout(async () => {
      setSyncStatus("saving");
      try {
        await backupUserDataToSupabase({
          pantry,
          groceries,
          customRecipes,
          mealPlan: plannedMeals,
          favorites,
        });
        setSyncStatus("saved");
        setLastSyncTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
      } catch (err) {
        reportWarning("CloudSync.autoSave", err);
        setSyncStatus("error");
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [pantry, groceries, customRecipes, plannedMeals, favorites, hasCloudUser, hasCompletedInitialCloudLoad]);

  // Manual force sync trigger
  const triggerManualSync = useCallback(async () => {
    if (!hasCloudUser) return;
    setSyncStatus("saving");
    try {
      await backupUserDataToSupabase({
        pantry,
        groceries,
        customRecipes,
        mealPlan: plannedMeals,
        favorites,
      });
      // Manual save succeeds, so cloud data is now validly aligned
      setHasCompletedInitialCloudLoad(true);
      isInitialCloudLoadedRef.current = true;
      setSyncStatus("saved");
      setLastSyncTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch (err) {
      reportUserError("CloudSync.manualSync", "Cloud-Synchronisation fehlgeschlagen.", err);
      setSyncStatus("error");
      throw err;
    }
  }, [pantry, groceries, customRecipes, plannedMeals, favorites, hasCloudUser]);

  return {
    hasCloudUser,
    setHasCloudUser,
    syncStatus,
    lastSyncTime,
    hasCompletedInitialCloudLoad,
    triggerManualSync,
    checkUserSession,
  };
}
