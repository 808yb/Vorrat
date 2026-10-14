import React, { useState, useMemo } from 'react';
import {
  Users,
  Sparkles,
  Clock,
  Flame,
  Euro,
  CheckCircle,
  AlertCircle,
  ChefHat,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PantryItem, Recipe, ShoppingItem } from '../types';
import { RECIPE_DATABASE } from '../data/mockData';
import {
  calculateRecipeMetrics,
  formatCurrency,
  formatQuantity,
  CalculatedRecipeData,
} from '../utils/helpers';

interface CookingTabProps {
  pantryItems: PantryItem[];
  onCookRecipe: (
    recipe: Recipe,
    servings: number,
    deductions: Array<{ pantryId: string; amount: number }>,
    lowStockItemsToAdd: ShoppingItem[]
  ) => void;
  onNavigateToShopping: () => void;
}

export const CookingTab: React.FC<CookingTabProps> = ({
  pantryItems,
  onCookRecipe,
  onNavigateToShopping,
}) => {
  const [servings, setServings] = useState<number>(3);
  const [customPrompt, setCustomPrompt] = useState<string>(
    'Lust auf Reis mit Hähnchen und Gemüse, asiatisch, unter 20 Min'
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedRecipeToCook, setSelectedRecipeToCook] = useState<Recipe | null>(null);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [cookingSuccessNotice, setCookingSuccessNotice] = useState<{
    recipeTitle: string;
    servings: number;
    shoppingCount: number;
  } | null>(null);

  const quickPrompts = [
    'Reis & Hähnchen Wok',
    'Unter 15 Min & Protein-reich',
    'Eier-Pfanne & Low-Carb',
    'Reste-Verwertung & Budget',
  ];

  // Dynamic filter / sorting of recipes based on prompt and pantry items
  const suggestedRecipes = useMemo(() => {
    const promptLower = customPrompt.toLowerCase();

    // Sort database based on relevance to prompt & pantry availability
    return [...RECIPE_DATABASE].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (promptLower.includes('reis') && a.title.toLowerCase().includes('reis')) scoreA += 5;
      if (promptLower.includes('reis') && b.title.toLowerCase().includes('reis')) scoreB += 5;

      if (promptLower.includes('hähnchen') && a.title.toLowerCase().includes('hähnchen')) scoreA += 5;
      if (promptLower.includes('hähnchen') && b.title.toLowerCase().includes('hähnchen')) scoreB += 5;

      if (promptLower.includes('ei') && a.title.toLowerCase().includes('egg') || a.title.toLowerCase().includes('eier')) scoreA += 4;
      if (promptLower.includes('ei') && b.title.toLowerCase().includes('egg') || b.title.toLowerCase().includes('eier')) scoreB += 4;

      if (promptLower.includes('15') && (a.prepTime.includes('12') || a.prepTime.includes('14'))) scoreA += 4;

      return scoreB - scoreA;
    }).slice(0, 3); // 3 creative suggestions as requested!
  }, [customPrompt]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 450);
  };

  const handlePrepareCook = (recipe: Recipe) => {
    setSelectedRecipeToCook(recipe);
  };

  const handleExecuteCook = (recipe: Recipe) => {
    const metrics = calculateRecipeMetrics(recipe, servings, pantryItems);

    const deductions: Array<{ pantryId: string; amount: number }> = [];
    const lowStockItemsToAdd: ShoppingItem[] = [];

    // Map ingredients to deductions and check low-stock thresholds
    metrics.ingredientStatus.forEach((ing) => {
      if (ing.pantryItemId) {
        deductions.push({
          pantryId: ing.pantryItemId,
          amount: ing.totalAmountNeeded,
        });

        const targetPantry = pantryItems.find((p) => p.id === ing.pantryItemId);
        if (targetPantry) {
          const remaining = Math.max(0, targetPantry.currentQuantity - ing.totalAmountNeeded);
          if (remaining < targetPantry.minQuantity) {
            // Need to buy difference to reach at least minQuantity + safety margin
            const buyQty = Math.max(
              targetPantry.minQuantity * 1.5,
              targetPantry.minQuantity - remaining
            );
            const estPrice =
              targetPantry.pricePerUnit *
              (targetPantry.unit === 'stk' ? buyQty : buyQty / 100);

            lowStockItemsToAdd.push({
              id: `shop-auto-${targetPantry.id}-${Date.now()}`,
              name: targetPantry.name,
              quantityToBuy: Math.round(buyQty),
              unit: targetPantry.unit,
              estimatedPrice: Math.round(estPrice * 100) / 100,
              reason: 'Unterschreitet Mindestbestand',
              checked: false,
              pantryItemId: targetPantry.id,
              category: targetPantry.category,
            });
          }
        }
      }
    });

    onCookRecipe(recipe, servings, deductions, lowStockItemsToAdd);
    setSelectedRecipeToCook(null);

    setCookingSuccessNotice({
      recipeTitle: recipe.title,
      servings,
      shoppingCount: lowStockItemsToAdd.length,
    });
  };

  return (
    <div className="space-y-4 pb-32">
      {/* Top Configuration Card */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-3.5">
        {/* Servings Segmented Control */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Portionen / Personenanzahl</span>
            </label>
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {servings} {servings === 1 ? 'Portion' : 'Portionen'}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setServings(num)}
                className={`py-2 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                  servings === num
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {num} P.
              </button>
            ))}
          </div>
        </div>

        {/* Free text custom prompt */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1.5">
            Was hast du im Kopf? (Wünsche & Reste)
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="z. B. Reis von gestern, schnell, viel Protein..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-0.5 no-scrollbar">
            {quickPrompts.map((chip) => (
              <button
                key={chip}
                onClick={() => setCustomPrompt(chip)}
                className="px-2.5 py-1 bg-slate-900/70 hover:bg-slate-700/80 border border-slate-800 rounded-lg text-[11px] text-slate-300 whitespace-nowrap transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Suggest Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analysiere Vorrat & Makros...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>3 Rezepte vorschlagen</span>
            </>
          )}
        </button>
      </div>

      {/* Cooking Success Notice Banner */}
      {cookingSuccessNotice && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl animate-in fade-in duration-200 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Check className="w-5 h-5 text-emerald-400" />
            <span>Guten Appetit! Vorrat erfolgreich verbucht</span>
          </div>
          <p className="text-xs text-slate-300">
            Zutaten für <strong>{cookingSuccessNotice.servings} Portionen</strong> von «
            {cookingSuccessNotice.recipeTitle}» wurden vom Vorrat abgezogen.
          </p>
          {cookingSuccessNotice.shoppingCount > 0 ? (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-amber-300">
                {cookingSuccessNotice.shoppingCount} Zutat(en) unter Mindestbestand auf Einkaufsliste gesetzt!
              </span>
              <button
                onClick={onNavigateToShopping}
                className="px-3 py-1 bg-amber-500 text-slate-950 text-xs font-bold rounded-lg hover:bg-amber-400"
              >
                Zur Einkaufsliste
              </button>
            </div>
          ) : (
            <p className="text-xs text-emerald-400/90">
              Alle Mindestbestände weiterhin gedeckt.
            </p>
          )}
          <button
            onClick={() => setCookingSuccessNotice(null)}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline block"
          >
            Hinweis schließen
          </button>
        </div>
      )}

      {/* 3 Recipe Cards */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-300">
            Passende Rezeptvorschläge ({suggestedRecipes.length})
          </span>
          <span className="text-[11px] text-slate-400">Skaliert auf {servings} P.</span>
        </div>

        {suggestedRecipes.map((recipe) => {
          const metrics = calculateRecipeMetrics(recipe, servings, pantryItems);
          const isExpanded = expandedRecipeId === recipe.id;

          return (
            <div
              key={recipe.id}
              className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-sm transition-all hover:border-slate-600 space-y-3"
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base text-white leading-snug">
                    {recipe.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded-lg shrink-0 border border-slate-800">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{recipe.prepTime}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {recipe.description}
                </p>
              </div>

              {/* KPI Badges Strip (Strict Zero-Pill Typography with Dividers) */}
              <div className="p-3 bg-slate-900/90 border border-slate-800/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-white font-bold">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-mono">{metrics.caloriesPerPortion} kcal</span>
                    <span className="text-[11px] text-slate-400 font-normal">/ Portion</span>
                  </div>

                  <div className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                    <Euro className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{formatCurrency(metrics.costPerPortion)}</span>
                    <span className="text-[11px] text-slate-400 font-normal">/ Portion</span>
                  </div>
                </div>

                {/* Macro summary text */}
                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800 font-mono">
                  <span>
                    Protein: <strong className="text-emerald-400">{metrics.proteinPerPortion}g</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Carbs: <strong className="text-amber-300">{metrics.carbsPerPortion}g</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Fett: <strong className="text-slate-300">{metrics.fatPerPortion}g</strong>
                  </span>
                  <span>·</span>
                  <span className="text-slate-500">
                    Gesamt: {formatCurrency(metrics.totalCost)}
                  </span>
                </div>
              </div>

              {/* Ingredients preview with status */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Zutaten ({servings} {servings === 1 ? 'Portion' : 'Portionen'}):
                </span>

                <div className="space-y-1">
                  {metrics.ingredientStatus.map((ing, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/60 flex items-start justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          {ing.isInStock ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          )}
                          <span className="font-medium text-slate-200">
                            {formatQuantity(ing.totalAmountNeeded, ing.unit)} {ing.name}
                          </span>
                        </div>
                        {ing.alternatives && (
                          <span className="text-[10px] text-emerald-400/90 block mt-0.5 ml-5">
                            ↳ Flexibel: {ing.alternatives}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0 text-[11px]">
                        {ing.isInStock ? (
                          <span className="text-emerald-400 font-mono">
                            Im Vorrat ({formatQuantity(ing.currentStock, ing.unit)})
                          </span>
                        ) : (
                          <span className="text-amber-400 font-mono">
                            {ing.currentStock > 0
                              ? `Nur ${formatQuantity(ing.currentStock, ing.unit)} da`
                              : 'Nicht vorrätig'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expandable Preparation Steps */}
              {isExpanded && (
                <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 space-y-2 text-xs animate-in fade-in duration-150">
                  <span className="font-semibold text-slate-200 block text-[11px] uppercase tracking-wider">
                    Zubereitungsschritte:
                  </span>
                  <ol className="space-y-1.5 list-decimal list-inside text-slate-300 text-xs">
                    {recipe.steps.map((step, sIdx) => (
                      <li key={sIdx} className="leading-relaxed">
                        <span className="text-slate-300">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setExpandedRecipeId(isExpanded ? null : recipe.id)}
                  className="px-3 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <span>{isExpanded ? 'Weniger' : 'Schritte'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handlePrepareCook(recipe)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-98 transition-all"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>Kochen & Vorrat abbuchen</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal: Kochen & Vorrat abbuchen */}
      {selectedRecipeToCook && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl text-slate-100">
            <div className="p-5 border-b border-slate-800">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Verbrauch verbuchen
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                {selectedRecipeToCook.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Folgende Mengen werden exakt für {servings} Portionen vom Vorrat abgebucht:
              </p>
            </div>

            <div className="overflow-y-auto p-5 space-y-2">
              {calculateRecipeMetrics(
                selectedRecipeToCook,
                servings,
                pantryItems
              ).ingredientStatus.map((ing, idx) => {
                const targetPantry = pantryItems.find((p) => p.id === ing.pantryItemId);
                const remaining = targetPantry
                  ? Math.max(0, targetPantry.currentQuantity - ing.totalAmountNeeded)
                  : 0;
                const willFallBelowMin = targetPantry
                  ? remaining < targetPantry.minQuantity
                  : false;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/70 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-100 block">{ing.name}</span>
                      <span className="text-[11px] text-slate-400">
                        Restbestand danach:{' '}
                        <strong
                          className={willFallBelowMin ? 'text-amber-400' : 'text-slate-300'}
                        >
                          {targetPantry
                            ? formatQuantity(remaining, targetPantry.unit)
                            : 'Nicht erfasst'}
                        </strong>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-rose-400 font-bold font-mono text-sm block">
                        -{formatQuantity(ing.totalAmountNeeded, ing.unit)}
                      </span>
                      {willFallBelowMin && (
                        <span className="text-[10px] text-amber-400 font-medium block">
                          Geht auf Einkaufsliste
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedRecipeToCook(null)}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-medium text-xs hover:bg-slate-800"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => handleExecuteCook(selectedRecipeToCook)}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
              >
                Jetzt abbuchen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
