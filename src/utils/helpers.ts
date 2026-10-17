import { PantryItem, Recipe, Unit, ReceiptParsedItem, PantryCategory, OpenFoodFactsProduct } from '../types';
import { MOCK_OPEN_FOOD_FACTS_DATABASE } from '../data/mockData';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatQuantity(amount: number, unit: Unit): string {
  if (unit === 'stk') {
    return `${amount % 1 === 0 ? amount : amount.toFixed(1)} Stk`;
  }
  if (unit === 'g') {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 2)} kg`;
    }
    return `${Math.round(amount)} g`;
  }
  if (unit === 'ml') {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 2)} L`;
    }
    return `${Math.round(amount)} ml`;
  }
  return `${amount} ${unit}`;
}

export type StockStatus = 'sufficient' | 'low' | 'empty';

export function getStockStatus(currentQuantity: number, minQuantity: number): {
  status: StockStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  if (currentQuantity <= 0) {
    return {
      status: 'empty',
      label: 'Aufgebraucht',
      badgeClass: 'text-rose-600 bg-rose-50 border-rose-200',
      dotClass: 'bg-rose-500',
    };
  }
  if (currentQuantity < minQuantity) {
    return {
      status: 'low',
      label: `Unter Mindestmenge (< ${minQuantity})`,
      badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
      dotClass: 'bg-amber-500',
    };
  }
  return {
    status: 'sufficient',
    label: 'Ausreichend',
    badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dotClass: 'bg-emerald-500',
  };
}

export interface CalculatedRecipeData {
  caloriesPerPortion: number;
  proteinPerPortion: number;
  carbsPerPortion: number;
  fatPerPortion: number;
  costPerPortion: number;
  totalCost: number;
  ingredientStatus: Array<{
    name: string;
    amountPerServing: number;
    totalAmountNeeded: number;
    unit: Unit;
    currentStock: number;
    isInStock: boolean;
    isPartial: boolean;
    isMissing: boolean;
    alternatives?: string;
    pantryItemId?: string;
  }>;
  allIngredientsAvailable: boolean;
  missingCount: number;
}

export function calculateRecipeMetrics(
  recipe: Recipe,
  servings: number,
  pantryItems: PantryItem[]
): CalculatedRecipeData {
  let totalCaloriesPerPortion = 0;
  let totalProteinPerPortion = 0;
  let totalCarbsPerPortion = 0;
  let totalFatPerPortion = 0;
  let totalCostPerPortion = 0;
  let missingCount = 0;

  const pantryMap = new Map<string, PantryItem>();
  pantryItems.forEach((item) => {
    pantryMap.set(item.id, item);
  });

  const ingredientStatus = recipe.ingredients.map((ing) => {
    // Find pantry item by id or loosely by name
    const pantryItem =
      (ing.pantryItemId ? pantryMap.get(ing.pantryItemId) : undefined) ||
      pantryItems.find((p) => p.name.toLowerCase().includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(p.name.toLowerCase()));

    const totalNeeded = ing.amountPerServing * servings;
    const currentStock = pantryItem ? pantryItem.currentQuantity : 0;

    const isInStock = currentStock >= totalNeeded;
    const isPartial = currentStock > 0 && currentStock < totalNeeded;
    const isMissing = currentStock <= 0;

    if (!isInStock) {
      missingCount++;
    }

    // Macro & cost calculation
    if (pantryItem) {
      let portionMultiplier = 0;
      const ingUnitLower = (ing.unit || '').toLowerCase();
      if (ingUnitLower === 'g' || ingUnitLower === 'ml') {
        portionMultiplier = ing.amountPerServing / 100; // per 100g/ml
      } else if (ingUnitLower === 'bund') {
        portionMultiplier = (ing.amountPerServing * 100) / 100; // 1 Bund ~ 100g
      } else if (ingUnitLower === 'dose') {
        portionMultiplier = (ing.amountPerServing * 400) / 100; // 1 Dose ~ 400g
      } else if (ingUnitLower === 'stk' || ingUnitLower === 'stück') {
        portionMultiplier = ing.amountPerServing * 0.6; // assuming average piece ~ 60g
      } else {
        portionMultiplier = ing.amountPerServing / 100;
      }

      const ingCalories = (pantryItem.caloriesPer100g || 0) * portionMultiplier;
      const ingProtein = (pantryItem.proteinPer100g || 0) * portionMultiplier;
      const ingCarbs = (pantryItem.carbsPer100g || 0) * portionMultiplier;
      const ingFat = (pantryItem.fatPer100g || 0) * portionMultiplier;

      const ingCost = (pantryItem.pricePerUnit || 0) * portionMultiplier;

      totalCaloriesPerPortion += ingCalories;
      totalProteinPerPortion += ingProtein;
      totalCarbsPerPortion += ingCarbs;
      totalFatPerPortion += ingFat;
      totalCostPerPortion += ingCost;
    } else {
      // rough fallback if not in pantry
      totalCaloriesPerPortion += 60;
      totalCostPerPortion += 0.40;
    }

    return {
      name: ing.name,
      amountPerServing: ing.amountPerServing,
      totalAmountNeeded: totalNeeded,
      unit: ing.unit,
      currentStock,
      isInStock,
      isPartial,
      isMissing,
      alternatives: ing.alternatives,
      pantryItemId: pantryItem?.id,
    };
  });

  return {
    caloriesPerPortion: Math.round(totalCaloriesPerPortion),
    proteinPerPortion: Math.round(totalProteinPerPortion * 10) / 10,
    carbsPerPortion: Math.round(totalCarbsPerPortion * 10) / 10,
    fatPerPortion: Math.round(totalFatPerPortion * 10) / 10,
    costPerPortion: Math.max(0.40, Math.round(totalCostPerPortion * 100) / 100),
    totalCost: Math.max(0.40, Math.round(totalCostPerPortion * servings * 100) / 100),
    ingredientStatus,
    allIngredientsAvailable: missingCount === 0,
    missingCount,
  };
}

export function parseReceiptText(text: string, pantryItems: PantryItem[]): ReceiptParsedItem[] {
  const lines = text.split('\n');
  const items: ReceiptParsedItem[] = [];

  const skipKeywords = ['summe', 'gesamt', 'eur', 'karte', 'bon', 'dank', 'filiale', 'datum', 'mwst', 'wechselgeld', 'ec-karte', 'gegeb'];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 4) return;

    const lower = trimmed.toLowerCase();
    if (skipKeywords.some((k) => lower.includes(k))) return;

    // Regex for price at end of line like "1,99 B" or "4.59" or "2,69"
    const priceMatch = trimmed.match(/(\d+[.,]\d{2})\s*(?:[A-Za-z*€])?$/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 1.99;

    // Remaining text without price
    let rawItemName = priceMatch ? trimmed.slice(0, priceMatch.index).trim() : trimmed;

    // Extract quantity and unit if specified e.g. "1kg", "400g", "150ml", "10er", "10 Stk", "500ml"
    let quantity = 1;
    let unit: Unit = 'stk';

    const weightKgMatch = rawItemName.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
    const weightGMatch = rawItemName.match(/(\d+)\s*g/i);
    const volLMatch = rawItemName.match(/(\d+(?:[.,]\d+)?)\s*l\b/i);
    const volMlMatch = rawItemName.match(/(\d+)\s*ml/i);
    const countStkMatch = rawItemName.match(/(\d+)\s*(?:stk|stück|er\b)/i);

    if (weightKgMatch) {
      quantity = parseFloat(weightKgMatch[1].replace(',', '.')) * 1000;
      unit = 'g';
    } else if (weightGMatch) {
      quantity = parseInt(weightGMatch[1], 10);
      unit = 'g';
    } else if (volLMatch) {
      quantity = parseFloat(volLMatch[1].replace(',', '.')) * 1000;
      unit = 'ml';
    } else if (volMlMatch) {
      quantity = parseInt(volMlMatch[1], 10);
      unit = 'ml';
    } else if (countStkMatch) {
      quantity = parseInt(countStkMatch[1], 10);
      unit = 'stk';
    } else {
      // Default guess
      if (rawItemName.toLowerCase().includes('reis') || rawItemName.toLowerCase().includes('nudel')) {
        quantity = 500;
        unit = 'g';
      } else if (rawItemName.toLowerCase().includes('öl') || rawItemName.toLowerCase().includes('sauce')) {
        quantity = 250;
        unit = 'ml';
      } else {
        quantity = 1;
        unit = 'stk';
      }
    }

    // Determine category
    let category: PantryCategory = 'Vorratsschrank';
    const lowerName = rawItemName.toLowerCase();
    if (lowerName.includes('hähnchen') || lowerName.includes('fleisch') || lowerName.includes('eier') || lowerName.includes('käse') || lowerName.includes('gouda') || lowerName.includes('milch')) {
      category = 'Kühlschrank';
    } else if (lowerName.includes('tk') || lowerName.includes('tiefkühl') || lowerName.includes('eis')) {
      category = 'Tiefkühl';
    } else if (lowerName.includes('soja') || lowerName.includes('öl') || lowerName.includes('sauce') || lowerName.includes('essig') || lowerName.includes('gewürz')) {
      category = 'Gewürze & Saucen';
    }

    // Try to match existing pantry item
    const matched = pantryItems.find((p) => {
      const pLower = p.name.toLowerCase();
      return lowerName.includes(pLower) || pLower.includes(lowerName.split(' ')[0]);
    });

    items.push({
      id: `receipt-item-${index}-${Date.now()}`,
      rawText: trimmed,
      name: rawItemName.replace(/\b\d+\s*(?:kg|g|ml|l|stk|er)\b/gi, '').trim() || rawItemName,
      quantity,
      unit,
      price,
      category: matched ? matched.category : category,
      matchedPantryId: matched?.id,
      selected: true,
    });
  });

  return items;
}

export function lookupBarcode(barcode: string): OpenFoodFactsProduct | null {
  const clean = barcode.trim();
  if (MOCK_OPEN_FOOD_FACTS_DATABASE[clean]) {
    return MOCK_OPEN_FOOD_FACTS_DATABASE[clean];
  }

  // If numeric barcode entered not in DB, generate a smart realistic food facts response
  if (/^\d{8,13}$/.test(clean)) {
    return {
      code: clean,
      product_name: `Gescannter Lebensmittelartikel (${clean.slice(-4)})`,
      brands: 'Markenprodukt',
      categories: 'Allgemeine Lebensmittel',
      quantity_str: '500 g',
      nutriments: {
        'energy-kcal_100g': 210,
        proteins_100g: 8.5,
        carbohydrates_100g: 35.0,
        fat_100g: 4.2,
      },
      nutrition_grades: 'b',
      default_unit: 'g',
      default_amount: 500,
      default_category: 'Vorratsschrank',
      default_min_qty: 250,
      estimated_price: 1.89,
    };
  }

  return null;
}

/**
 * Universal German pluralization helper.
 * Example: formatPlural(1, 'Zutat', 'Zutaten') => '1 Zutat'
 * Example: formatPlural(4, 'Zutat', 'Zutaten') => '4 Zutaten'
 */
export function formatPlural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatZutatenCount(count: number): string {
  return formatPlural(count, 'Zutat', 'Zutaten');
}

export function formatMahlzeitenCount(count: number): string {
  return formatPlural(count, 'Mahlzeit', 'Mahlzeiten');
}

export function formatArtikelCount(count: number): string {
  return formatPlural(count, 'Artikel', 'Artikel');
}

export function formatPositionenCount(count: number): string {
  return formatPlural(count, 'Position', 'Positionen');
}
