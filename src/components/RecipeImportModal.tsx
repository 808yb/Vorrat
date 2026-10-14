import { useState } from "react";
import { X, Sparkles, Link as LinkIcon, FileText, CheckCircle2, ShoppingCart, AlertCircle, ChefHat, Clock, Flame } from "lucide-react";
import { type CatalogRecipe } from "../data/recipeCatalog";
import { importRecipeFromTextOrUrlWithGemini } from "../utils/geminiRecipes";

interface RecipeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantryItems: Array<{ name: string; amount?: number }>;
  onSaveRecipe: (recipe: CatalogRecipe, addMissingToGroceries: boolean, missingItems: Array<{ name: string; amount?: string }>) => void;
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
    missingIngredients: Array<{ name: string; baseAmountPerPortion: number; unit: string }>;
  } | null>(null);
  const [addToGroceries, setAddToGroceries] = useState(true);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    const content = activeTab === "url" ? inputUrl.trim() : inputText.trim();
    if (!content) {
      setError(activeTab === "url" ? "Bitte gib eine Rezept-URL ein." : "Bitte füge Rezept-Text oder eine Caption ein.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
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
    onNotify(`"${importedData.recipe.title}" zu Gemerkte Rezepte hinzugefügt!`);
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-xl bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Rezept importieren</h3>
              <p className="text-xs text-slate-400">Aus dem Web, Instagram, TikTok oder Notizen</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {!importedData ? (
            <>
              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setActiveTab("url")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "url"
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <LinkIcon size={14} />
                  Weblink / URL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("text")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === "text"
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileText size={14} />
                  Text / Caption
                </button>
              </div>

              {/* Input Area */}
              {activeTab === "url" ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Rezept-Link einfügen</label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://chefkoch.de/... oder foodblog.com/..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                  <p className="text-[11px] text-slate-400">
                    Unterstützt Koch-Websites, Foodblogs und Online-Rezepte.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Rezept-Text oder Social-Media Caption</label>
                  <textarea
                    rows={6}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Kopiere hier Zutaten & Zubereitung aus Instagram, TikTok, WhatsApp oder Kochbuch..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Die KI erkennt Zutaten, Mengenangaben und Schritte automatisch.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                disabled={isLoading}
                onClick={handleAnalyze}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Gemini AI analysiert Rezept...</span>
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
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <img
                  src={importedData.recipe.imageUrl}
                  alt={importedData.recipe.title}
                  className="w-full h-44 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                <div className="absolute top-3 right-3 bg-emerald-500/90 text-slate-950 font-bold text-xs px-2.5 py-1 rounded-full backdrop-blur-md">
                  {importedData.recipe.matchScore}% im Vorrat
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h4 className="font-bold text-lg leading-tight">{importedData.recipe.title}</h4>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{importedData.recipe.subtitle}</p>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/80 p-2 rounded-xl text-center border border-slate-700/50">
                  <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px]">
                    <Clock size={12} /> Zeit
                  </div>
                  <span className="font-bold text-xs text-slate-100">{importedData.recipe.time}</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl text-center border border-slate-700/50">
                  <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px]">
                    <Flame size={12} /> Kalorien
                  </div>
                  <span className="font-bold text-xs text-slate-100">{importedData.recipe.baseCal} kcal</span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl text-center border border-slate-700/50">
                  <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px]">
                    <ChefHat size={12} /> Protein
                  </div>
                  <span className="font-bold text-xs text-slate-100">{importedData.recipe.baseProt}g</span>
                </div>
              </div>

              {/* Ingredients Breakdown */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <h5 className="font-semibold text-xs text-slate-200 flex items-center justify-between">
                  <span>Zutaten-Abgleich mit Vorrat</span>
                  <span className="text-[11px] text-emerald-400">
                    {importedData.recipe.ingredientsList(1).length - importedData.missingIngredients.length} / {importedData.recipe.ingredientsList(1).length} vorhanden
                  </span>
                </h5>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {importedData.recipe.ingredientsList(1).map((ing, idx) => {
                    const isMissing = importedData.missingIngredients.some(
                      (m) => m.name.toLowerCase().trim() === ing.name.toLowerCase().trim()
                    );
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                          isMissing
                            ? "bg-amber-950/30 border border-amber-800/40 text-amber-200"
                            : "bg-emerald-950/30 border border-emerald-800/40 text-emerald-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isMissing ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          ) : (
                            <CheckCircle2 size={13} className="text-emerald-400" />
                          )}
                          <span>{ing.name}</span>
                        </div>
                        <span className="text-slate-400 font-medium">{ing.amount}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add to Groceries Option */}
              {importedData.missingIngredients.length > 0 && (
                <label className="flex items-center gap-3 p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl cursor-pointer hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={addToGroceries}
                    onChange={(e) => setAddToGroceries(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-slate-600 bg-slate-900"
                  />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-slate-200 block">
                      {importedData.missingIngredients.length} fehlende Zutaten auf Einkaufsliste setzen
                    </span>
                    <span className="text-slate-400 text-[11px]">
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
                  className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Anderes Rezept
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="py-3 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5"
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
