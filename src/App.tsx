import { useState } from "react";
import { defaultPantry } from "./utils/pantryHelpers";
import { rehydrateCustomRecipe } from "./utils/geminiRecipes";
import { type AddMode } from "./components/UnifiedAddModal";
import { AppHeader } from "./components/AppHeader";
import { BottomNav, type Tab } from "./components/BottomNav";
import { ToastBanner } from "./components/ToastBanner";
import { AppModals } from "./components/AppModals";
import { PantryScreen, PANTRY_CATEGORY_GROUPS, getCategoryGroupKey } from "./screens/PantryScreen";
import { GroceriesScreen, ShoppingScreen } from "./screens/GroceriesScreen";
import { CookScreen, type CookScreenProps } from "./screens/CookScreen";
import { SavedMealsScreen } from "./screens/SavedMealsScreen";
import { WeeklyMealPlannerScreen } from "./screens/WeeklyMealPlannerScreen";
import { usePantryManager } from "./hooks/usePantryManager";
import { useRecipeManager } from "./hooks/useRecipeManager";
import { useCloudSync } from "./hooks/useCloudSync";
import { Icon, Button, type IconName, type ButtonProps } from "./components/UiIcons";

// Re-exports for backward compatibility with tests (e.g. tests/suite.test.ts)
export { PantryScreen, PANTRY_CATEGORY_GROUPS, getCategoryGroupKey };
export { GroceriesScreen, ShoppingScreen };
export { CookScreen, type CookScreenProps };
export { Icon, Button, type IconName, type ButtonProps };
export { AppHeader } from "./components/AppHeader";
export { BottomNav, type Tab } from "./components/BottomNav";

export {
  type PantryItem,
  type GroceryItem,
  type NutrientSpecs,
  defaultPantry,
  deduplicatePantry,
  formatMhdDisplay,
  getMhdStatus,
  isItemExpiringSoonOrCritical,
  getItemNutrientSpecs,
  calculateItemTotalNutrients,
  parseGroceryQuantity,
  applyCookingDeduction,
  confirmCookingCompletion,
  processReceiptImport,
} from "./utils/pantryHelpers";

export {
  findMatchingPantryItem,
  isSpiceOrKitchenBasic,
  deductIngredientFromPantryAmount,
  parseIngredientAmountAndUnit,
} from "./utils/pantryMatching";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("discover");
  const [toast, setToast] = useState("");

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  // Recipe, favorites and weekly planner state & handlers
  const {
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
    cookSelectedServings,
    expiringSearchIngredients,
    isSurpriseModalOpen,
    setIsSurpriseModalOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    handleStartCookingFromPlanner,
    handleCookFromExpiring,
    handleClearExpiringFilter,
    handleSaveImportedRecipe,
    handleWipeRecipes,
  } = useRecipeManager({
    notify,
    onAddMissingToGroceries: (missing) => handleAddMissingToGroceries(missing),
  });

  // Pantry & Groceries Domain Manager Hook
  const {
    pantry,
    setPantry,
    groceries,
    setGroceries,
    foodWasteSaved,
    expiringPantryCount,
    updateAmount,
    updateCategory,
    handleUpdatePantryItem,
    handleDeletePantryItem,
    handleAddProduct,
    handleReceiptImported,
    completeShopping,
    handleClearGroceries,
    handleAddMissingToGroceries,
    cookRecipe,
    handleResetDemo,
    handleClearPantry,
    handleDeduplicatePantry,
    handleFullReset,
    handleWipeEverything: wipePantryEverything,
  } = usePantryManager({ allRecipes, notify });

  const syncWeeklyShopping = (newItems: import("./utils/pantryHelpers").GroceryItem[]) => {
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

  // Cloud Sync Integration (Supabase)
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

  // UI Modals & Interaction State
  const [isHouseholdModalOpen, setIsHouseholdModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalMode, setAddModalMode] = useState<AddMode>("menu");
  const [editingPantryItem, setEditingPantryItem] = useState<import("./utils/pantryHelpers").PantryItem | null>(null);

  const handleOpenAddModal = (mode: AddMode = "menu") => {
    setAddModalMode(mode);
    setIsAddModalOpen(true);
  };

  const handleWipeEverything = () => {
    wipePantryEverything();
    handleWipeRecipes();
  };

  return (
    <div className="app-shell">
      <AppHeader
        activeTab={activeTab}
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
          onCookFromExpiring={(urgentItems) => handleCookFromExpiring(urgentItems, () => setActiveTab("discover"))}
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
          onStartCookingMeal={(recipeId, servings) =>
            handleStartCookingFromPlanner(recipeId, servings, () => setActiveTab("cook"))
          }
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
          onToggleItem={() => {}}
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

      <ToastBanner message={toast} />

      <AppModals
        isHouseholdModalOpen={isHouseholdModalOpen}
        onCloseHouseholdModal={() => setIsHouseholdModalOpen(false)}
        onAuthChange={(isLoggedIn) => setHasCloudUser(isLoggedIn)}
        onRestoreCloudData={(cloud) => {
          if (Array.isArray(cloud.pantry)) setPantry(cloud.pantry as import("./utils/pantryHelpers").PantryItem[]);
          if (Array.isArray(cloud.groceries)) setGroceries(cloud.groceries as import("./utils/pantryHelpers").GroceryItem[]);
          if (Array.isArray(cloud.customRecipes)) setCustomRecipes((cloud.customRecipes as unknown[]).map((r) => rehydrateCustomRecipe(r as import("./data/recipeCatalog").CatalogRecipe)));
          if (Array.isArray(cloud.mealPlan)) setPlannedMeals(cloud.mealPlan as import("./components/WeeklyMealPlannerScreen").PlannedMeal[]);
          if (Array.isArray(cloud.favorites)) setFavorites(cloud.favorites as string[]);
        }}
        isResetModalOpen={isResetModalOpen}
        onCloseResetModal={() => setIsResetModalOpen(false)}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        onResetDemo={handleResetDemo}
        onClearPantry={handleClearPantry}
        onDeduplicatePantry={handleDeduplicatePantry}
        onFullReset={handleFullReset}
        onWipeEverything={handleWipeEverything}
        isAddModalOpen={isAddModalOpen}
        onCloseAddModal={() => setIsAddModalOpen(false)}
        addModalMode={addModalMode}
        onAddProduct={handleAddProduct}
        onReceiptImported={handleReceiptImported}
        editingPantryItem={editingPantryItem}
        onCloseEditPantryItem={() => setEditingPantryItem(null)}
        onSavePantryItem={handleUpdatePantryItem}
        onDeletePantryItem={handleDeletePantryItem}
        isImportModalOpen={isImportModalOpen}
        onCloseImportModal={() => setIsImportModalOpen(false)}
        onSaveImportedRecipe={handleSaveImportedRecipe}
        pantry={pantry}
        groceries={groceries}
        customRecipes={customRecipes}
        plannedMeals={plannedMeals}
        onNotify={notify}
      />
    </div>
  );
}
