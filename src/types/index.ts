export type PantryCategory =
  | 'Kühlschrank'
  | 'Vorratsschrank'
  | 'Gewürze & Saucen'
  | 'Tiefkühl';

export type Unit = 'g' | 'ml' | 'stk';

export interface PantryItem {
  id: string;
  name: string;
  category: PantryCategory;
  currentQuantity: number;
  unit: Unit;
  minQuantity: number;
  pricePerUnit: number; // EUR pro 100g / 100ml bzw. pro 1 Stk
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  barcode?: string;
  brand?: string;
  nutriScore?: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantityToBuy: number;
  unit: Unit;
  estimatedPrice: number;
  reason: 'Unterschreitet Mindestbestand' | 'Manuell hinzugefügt' | 'Rezept-Bedarf';
  checked: boolean;
  pantryItemId?: string;
  category?: PantryCategory;
}

export interface CookingPreferences {
  servings: number; // 1 to 5, default 3
  customPrompt: string;
}

export interface RecipeIngredient {
  name: string;
  amountPerServing: number;
  unit: Unit;
  pantryItemId?: string;
  alternatives?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  prepTime: string;
  difficulty: 'Einfach' | 'Mittel';
  cuisine: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
}

export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands?: string;
  categories?: string;
  quantity_str?: string;
  nutriments: {
    'energy-kcal_100g': number;
    proteins_100g: number;
    carbohydrates_100g: number;
    fat_100g: number;
  };
  nutrition_grades?: 'a' | 'b' | 'c' | 'd' | 'e';
  default_unit: Unit;
  default_amount: number;
  default_category: PantryCategory;
  default_min_qty: number;
  estimated_price: number;
}

export interface ReceiptParsedItem {
  id: string;
  rawText: string;
  name: string;
  quantity: number;
  unit: Unit;
  price: number;
  category: PantryCategory;
  matchedPantryId?: string;
  selected: boolean;
}
