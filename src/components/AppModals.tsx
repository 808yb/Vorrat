import React, { lazy, Suspense } from "react";
import { UnifiedAddModal, type AddMode } from "./UnifiedAddModal";
import { EditPantryItemModal } from "./EditPantryItemModal";
import { PwaInstallBanner } from "./PwaInstallBanner";
import type { PantryItem, GroceryItem } from "../utils/pantryHelpers";
import type { CatalogRecipe } from "../data/recipeCatalog";
import type { PlannedMeal } from "./WeeklyMealPlannerScreen";
import type { VorratSyncPayload } from "../utils/supabaseClient";

// Lazy-loaded modal dialogs
const HouseholdSyncModal = lazy(() =>
  import("./HouseholdSyncModal").then((m) => ({ default: m.HouseholdSyncModal }))
);
const RecipeImportModal = lazy(() =>
  import("./RecipeImportModal").then((m) => ({ default: m.RecipeImportModal }))
);
const AccountResetModal = lazy(() =>
  import("./AccountResetModal").then((m) => ({ default: m.AccountResetModal }))
);

export interface AppModalsProps {
  // Household sync modal
  isHouseholdModalOpen: boolean;
  onCloseHouseholdModal: () => void;
  onAuthChange: (isLoggedIn: boolean) => void;
  onRestoreCloudData: (cloud: VorratSyncPayload) => void;

  // Account reset modal
  isResetModalOpen: boolean;
  onCloseResetModal: () => void;
  onOpenResetModal: () => void;
  onResetDemo: () => void;
  onClearPantry: () => void;
  onDeduplicatePantry: () => void;
  onFullReset: () => void;
  onWipeEverything: () => void;

  // Add modal
  isAddModalOpen: boolean;
  onCloseAddModal: () => void;
  addModalMode: AddMode;
  onAddProduct: (item: {
    name: string;
    category: string;
    amount: number;
    total: number;
    unit: string;
    tone: string;
    minAmount?: number;
    caloriesPer100g?: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    fatPer100g?: number;
    isUnlimited?: boolean;
    mhd?: string;
  }) => void;
  onReceiptImported: (items: Array<{
    name: string;
    category: string;
    amount: number;
    total: number;
    unit: string;
    tone: string;
    price?: number;
    minAmount?: number;
    caloriesPer100g?: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    fatPer100g?: number;
    isUnlimited?: boolean;
    mhd?: string;
  }>) => void;

  // Edit pantry item modal
  editingPantryItem: PantryItem | null;
  onCloseEditPantryItem: () => void;
  onSavePantryItem: (item: PantryItem) => void;
  onDeletePantryItem: (id: string | number) => void;

  // Recipe import modal
  isImportModalOpen: boolean;
  onCloseImportModal: () => void;
  onSaveImportedRecipe: (
    recipe: CatalogRecipe,
    addMissingToGroceries: boolean,
    missingItems: Array<{ name: string; amount?: string }>
  ) => void;

  // Data props
  pantry: PantryItem[];
  groceries: GroceryItem[];
  customRecipes: CatalogRecipe[];
  plannedMeals: PlannedMeal[];

  // Notification callback
  onNotify: (message: string) => void;
}

export const AppModals: React.FC<AppModalsProps> = ({
  isHouseholdModalOpen,
  onCloseHouseholdModal,
  onAuthChange,
  onRestoreCloudData,
  isResetModalOpen,
  onCloseResetModal,
  onOpenResetModal,
  onResetDemo,
  onClearPantry,
  onDeduplicatePantry,
  onFullReset,
  onWipeEverything,
  isAddModalOpen,
  onCloseAddModal,
  addModalMode,
  onAddProduct,
  onReceiptImported,
  editingPantryItem,
  onCloseEditPantryItem,
  onSavePantryItem,
  onDeletePantryItem,
  isImportModalOpen,
  onCloseImportModal,
  onSaveImportedRecipe,
  pantry,
  groceries,
  customRecipes,
  plannedMeals,
  onNotify,
}) => {
  return (
    <>
      {/* Household Sync & Sharing Modal */}
      {isHouseholdModalOpen && (
        <Suspense fallback={null}>
          <HouseholdSyncModal
            isOpen={isHouseholdModalOpen}
            onClose={onCloseHouseholdModal}
            onNotify={onNotify}
            pantryCount={pantry.length}
            shoppingCount={groceries.length}
            pantryData={pantry}
            groceriesData={groceries}
            customRecipesData={customRecipes}
            mealPlanData={plannedMeals}
            onAuthChange={onAuthChange}
            onRestoreData={onRestoreCloudData}
            onOpenReset={onOpenResetModal}
          />
        </Suspense>
      )}

      {/* Account / Pantry Reset & Deduplication Modal */}
      {isResetModalOpen && (
        <Suspense fallback={null}>
          <AccountResetModal
            isOpen={isResetModalOpen}
            onClose={onCloseResetModal}
            pantryCount={pantry.length}
            shoppingCount={groceries.length}
            recipesCount={customRecipes.length}
            plannedCount={plannedMeals.length}
            onResetDemo={onResetDemo}
            onClearPantry={onClearPantry}
            onDeduplicate={onDeduplicatePantry}
            onFullReset={onFullReset}
            onWipeEverything={onWipeEverything}
            onNotify={onNotify}
          />
        </Suspense>
      )}

      {/* Unified Add Modal */}
      {isAddModalOpen && (
        <UnifiedAddModal
          isOpen={isAddModalOpen}
          onClose={onCloseAddModal}
          groceries={groceries}
          onAddProduct={onAddProduct}
          onImportReceipt={onReceiptImported}
          onNotify={onNotify}
          initialMode={addModalMode}
        />
      )}

      {/* Edit Pantry Item Modal */}
      <EditPantryItemModal
        isOpen={Boolean(editingPantryItem)}
        item={editingPantryItem}
        onClose={onCloseEditPantryItem}
        onSave={onSavePantryItem}
        onDelete={onDeletePantryItem}
      />

      {/* PWA Install Banner */}
      <PwaInstallBanner />

      {/* Recipe Import Modal */}
      {isImportModalOpen && (
        <Suspense fallback={null}>
          <RecipeImportModal
            isOpen={isImportModalOpen}
            onClose={onCloseImportModal}
            pantryItems={pantry}
            onSaveRecipe={onSaveImportedRecipe}
            onNotify={onNotify}
          />
        </Suspense>
      )}
    </>
  );
};
