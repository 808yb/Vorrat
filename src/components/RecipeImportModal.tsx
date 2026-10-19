import React, { useState } from "react";
import {
  X,
  Sparkles,
  Link as LinkIcon,
  FileText,
  CheckCircle2,
  ShoppingCart,
  AlertCircle,
  ChefHat,
  Clock,
  Flame,
  Video,
} from "lucide-react";
import { type CatalogRecipe } from "../data/recipeCatalog";
import {
  importRecipeFromTextOrUrlWithGemini,
  type RawGeminiIngredient,
} from "../utils/geminiRecipes";
import { findMatchingPantryItem } from "../utils/pantryMatching";

interface RecipeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantryItems: Array<{ name: string; amount?: number }>;
  onSaveRecipe: (
    recipe: CatalogRecipe,
    addMissingToGroceries: boolean,
    missingItems: Array<{ name: string; amount?: string }>
  ) => void;
  onNotify: (msg: string) => void;
}

export function RecipeImportModal({
  isOpen,
  onClose,
  pantryItems,
  onSaveRecipe,
  onNotify,
}: RecipeImportModalProps) {
  const [activeTab, setActiveTab] = useState<"url" | "text">("url");
  const [inputUrl, setInputUrl] = useState("");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extracted preview state
  const [importedData, setImportedData] = useState<{
    recipe: CatalogRecipe;
    missingIngredients: RawGeminiIngredient[];
  } | null>(null);
  const [addToGroceries, setAddToGroceries] = useState(true);

  if (!isOpen) return null;

  const handleLoadDemoReel = () => {
    // Instant test with real viral TikTok / Reel recipe
    const demoRecipe: CatalogRecipe = {
      id: "demo-reel-" + Date.now(),
      title: "Crispy Lime-Chicken Wraps (Viral Reel)",
      subtitle: "Knusprige Hähnchenstreifen mit Avocado-Limetten-Creme & knackigem Salat",
      time: "15 Min.",
      difficulty: "Einfach",
      baseCal: 520,
      baseProt: 34,
      baseCarb: 42,
      baseCost: 3.40,
      tone: "mint",
      chefTip: "Tortilla-Wraps vor dem Rollen 10 Sekunden in einer trockenen Pfanne erwärmen – so reißen sie nicht!",
      imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
      isAiGenerated: true,
      matchScore: 80,
      optional: "Alles im Vorrat vorhanden",
      available: (s: number) => `${Math.round(150 * s)}g Hähnchenbrust · ${Math.round(1 * s)} Stk. Tortilla Wraps`,
      ingredientsList: (s: number) => [
        { name: "Hähnchenbrust (oder Schnitzel)", amount: `${Math.round(150 * s)} g`, optional: false },
        { name: "Tortilla Wraps", amount: `${Math.round(1 * s)} Stk.`, optional: false },
        { name: "Pflücksalat / Salat", amount: `${Math.round(40 * s)} g`, optional: false },
        { name: "Limetten", amount: `${Math.round(1 * s)} Stk.`, optional: false },
        { name: "Joghurt mild (als Creme)", amount: `${Math.round(50 * s)} g`, optional: false },
        { name: "Olivenöl / Pflanzenöl", amount: `${Math.round(10 * s)} ml`, optional: false },
      ],
      steps: [
        {
          stepNumber: 1,
          title: "Hähnchen anbraten",
          instruction: "Hähnchen in Streifen schneiden, mit Salz, Pfeffer und Paprika würzen und in heißem Öl 4–5 Min. goldbraun braten.",
          duration: "5 Min.",
          tag: "Braten",
        },
        {
          stepNumber: 2,
          title: "Limetten-Creme anrühren",
          instruction: "Joghurt mit dem Saft einer halben Limette, Salz und einem Hauch Knoblauch glattrühren.",
          duration: "2 Min.",
          tag: "Sauce",
        },
        {
          stepNumber: 3,
          title: "Wrap belegen & rollen",
          instruction: "Tortilla mit der Creme bestreichen, mit frischem Pflücksalat und warmem Knusper-Hähnchen belegen, straff einrollen.",
          duration: "3 Min.",
          tag: "Rollen",
        },
      ],
    };

    const rawIngs: RawGeminiIngredient[] = [
      { name: "Hähnchenbrust", baseAmountPerPortion: 150, unit: "g", optional: false },
      { name: "Tortilla Wraps", baseAmountPerPortion: 1, unit: "Stk.", optional: false },
      { name: "Pflücksalat", baseAmountPerPortion: 40, unit: "g", optional: false },
      { name: "Limetten", baseAmountPerPortion: 1, unit: "Stk.", optional: false },
      { name: "Joghurt mild", baseAmountPerPortion: 50, unit: "g", optional: false },
      { name: "Olivenöl", baseAmountPerPortion: 10, unit: "ml", optional: false },
    ];
    demoRecipe.rawIngredients = rawIngs;
    demoRecipe.ingredients = rawIngs;

    const inStock = rawIngs.filter((ing) => findMatchingPantryItem(ing.name, pantryItems) !== null);
    const missing = rawIngs.filter((ing) => !inStock.includes(ing));

    setImportedData({
      recipe: demoRecipe,
      missingIngredients: missing,
    });
    onNotify("Viral TikTok-Reel erfolgreich analysiert!");
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const content = activeTab === "url" ? inputUrl.trim() : inputText.trim();
      if (!content) {
        setError(
          activeTab === "url"
            ? "Bitte gib eine Rezept-URL oder einen Video-Link (TikTok, Reels, Shorts) ein."
            : "Bitte füge Rezept-Text oder eine Notiz ein."
        );
        setIsLoading(false);
        return;
      }
      const result = await importRecipeFromTextOrUrlWithGemini(content, pantryItems);
      setImportedData({
        recipe: result.recipe,
        missingIngredients: result.missingIngredients,
      });
      onNotify("Rezept erfolgreich analysiert!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Fehler beim Analysieren des Rezepts.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSave = () => {
    if (!importedData) return;

    const missingForGroceries = importedData.missingIngredients.map((m) => ({
      name: m.name,
      amount: `${m.baseAmountPerPortion * 2} ${m.unit}`,
    }));

    onSaveRecipe(importedData.recipe, addToGroceries, missingForGroceries);
    onNotify(`«${importedData.recipe.title}» zu deinen Rezepten hinzugefügt!`);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setInputUrl("");
    setInputText("");
    setError(null);
    setImportedData(null);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Rezept importieren</h3>
              <p className="text-xs text-slate-500">Aus Web-Links, TikTok, Reels (&lt; 2:10 Min.) oder Notizen</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-white">
          {!importedData ? (
            <>
              {/* 2-Way Tab Switcher: Link vs. Notiz */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setActiveTab("url")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "url"
                      ? "bg-white text-emerald-700 shadow-sm font-bold border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LinkIcon size={14} />
                  <span>Web-Link / Social Reel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("text")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "text"
                      ? "bg-white text-emerald-700 shadow-sm font-bold border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText size={14} />
                  <span>Notiz / Text</span>
                </button>
              </div>

              {/* LINK TAB */}
              {activeTab === "url" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Rezept- oder Video-Link einfügen</label>
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://tiktok.com/@... oder https://instagram.com/reel/... oder https://chefkoch.de/..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  {/* Prominent Video & Recipe Notice Banner (< 2:10 Min.) */}
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs">
                    <Video size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold text-emerald-950 block">
                        Videos & Reels unter 2:10 Min. werden direkt analysiert
                      </strong>
                      <span className="text-[11.5px] text-emerald-800 leading-relaxed block mt-0.5">
                        Unterstützt Links zu TikTok, Instagram Reels, YouTube Shorts sowie Foodblogs & Rezept-Websites. Videos unter 2:10 Min. (130s) werden sekundenschnell von der KI erfasst.
                      </span>
                    </div>
                  </div>

                  {/* Demo Button for Testing */}
                  <button
                    type="button"
                    onClick={handleLoadDemoReel}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles size={14} className="text-emerald-600" />
                    <span>Beispiel-Reel testen: Crispy Chicken Wraps (TikTok)</span>
                  </button>
                </div>
              )}

              {/* TEXT TAB */}
              {activeTab === "text" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">Rezept-Text oder Notiz einfügen</label>
                  <textarea
                    rows={6}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Kopiere hier Zutaten & Zubereitung aus Instagram, WhatsApp, Notizen oder Kochbuch..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    Die KI erkennt Zutaten, Mengenangaben und Schritte automatisch und gleicht sie mit deinem Vorrat ab.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                disabled={isLoading}
                onClick={handleAnalyze}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gemini analysiert Rezept...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Rezept mit KI erfassen</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Analysis Result Preview */
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={importedData.recipe.imageUrl}
                  alt={importedData.recipe.title}
                  className="w-full h-44 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

                <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm">
                  {importedData.recipe.matchScore}% im Vorrat
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h4 className="font-bold text-lg leading-tight">{importedData.recipe.title}</h4>
                  <p className="text-xs text-slate-200 line-clamp-1 mt-0.5">{importedData.recipe.subtitle}</p>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-200">
                  <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px]">
                    <Clock size={12} /> Zeit
                  </div>
                  <span className="font-bold text-xs text-slate-800">{importedData.recipe.time}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-200">
                  <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px]">
                    <Flame size={12} /> Kalorien
                  </div>
                  <span className="font-bold text-xs text-slate-800">{importedData.recipe.baseCal} kcal</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-200">
                  <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px]">
                    <ChefHat size={12} /> Protein
                  </div>
                  <span className="font-bold text-xs text-slate-800">{importedData.recipe.baseProt}g</span>
                </div>
              </div>

              {/* Ingredients Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <h5 className="font-semibold text-xs text-slate-800 flex items-center justify-between">
                  <span>Zutaten-Abgleich mit Vorrat</span>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    {importedData.recipe.ingredientsList(1).length - importedData.missingIngredients.length} / {importedData.recipe.ingredientsList(1).length} vorhanden
                  </span>
                </h5>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {importedData.recipe.ingredientsList(1).map((ing, idx) => {
                    const match = findMatchingPantryItem(ing.name, pantryItems);
                    const isMissing = !match;
                    const altName = match?.matchedByAlternative && match.matchedByAlternative.toLowerCase() !== ing.name.toLowerCase()
                      ? match.matchedByAlternative
                      : null;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                          isMissing
                            ? "bg-amber-50 border border-amber-200 text-amber-900"
                            : "bg-emerald-50 border border-emerald-200 text-emerald-900"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isMissing ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          ) : (
                            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{ing.name}</span>
                            {altName && (
                              <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100/90 text-emerald-800 rounded">
                                ({altName} im Vorrat)
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-slate-500 font-medium shrink-0 ml-2">{ing.amount}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add to Groceries Option */}
              {importedData.missingIngredients.length > 0 && (
                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={addToGroceries}
                    onChange={(e) => setAddToGroceries(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 bg-white"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-slate-800 block">
                      {importedData.missingIngredients.length} fehlende Zutaten auf Einkaufsliste setzen
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Werden direkt für den nächsten Einkauf vorbereitet
                    </span>
                  </div>
                  <ShoppingCart size={16} className="text-slate-400" />
                </label>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Anderes Rezept
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={15} />
                  Rezept merken
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
