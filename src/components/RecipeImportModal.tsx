import React, { useState, useRef } from "react";
import { X, Sparkles, Link as LinkIcon, FileText, CheckCircle2, ShoppingCart, AlertCircle, ChefHat, Clock, Flame, Video, UploadCloud, Play, Film } from "lucide-react";
import { type CatalogRecipe } from "../data/recipeCatalog";
import { importRecipeFromTextOrUrlWithGemini, importRecipeFromVideoWithGemini, type RawGeminiIngredient } from "../utils/geminiRecipes";

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
  const [activeTab, setActiveTab] = useState<"url" | "video" | "text">("video");
  const [inputUrl, setInputUrl] = useState("");
  const [inputText, setInputText] = useState("");
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extracted preview state
  const [importedData, setImportedData] = useState<{
    recipe: CatalogRecipe;
    missingIngredients: RawGeminiIngredient[];
  } | null>(null);
  const [addToGroceries, setAddToGroceries] = useState(true);

  if (!isOpen) return null;

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 26 * 1024 * 1024) {
      setError("Das Video ist über 25 MB groß. Bitte wähle einen kürzeren Clip oder komprimiere das Video für die Analyse.");
      return;
    }

    setSelectedVideoFile(file);
    setError(null);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
  };

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
        { stepNumber: 1, title: "Hähnchen anbraten", instruction: "Hähnchen in Streifen schneiden, mit Salz, Pfeffer und Paprika würzen und in heißem Öl 4–5 Min. goldbraun braten.", duration: "5 Min.", tag: "Braten" },
        { stepNumber: 2, title: "Limetten-Creme anrühren", instruction: "Joghurt mit dem Saft einer halben Limette, Salz und einem Hauch Knoblauch glattrühren.", duration: "2 Min.", tag: "Sauce" },
        { stepNumber: 3, title: "Wrap belegen & rollen", instruction: "Tortilla mit der Creme bestreichen, mit frischem Pflücksalat und warmem Knusper-Hähnchen belegen, straff einrollen.", duration: "3 Min.", tag: "Rollen" },
      ],
    };

    const pantryNames = pantryItems.map((p) => p.name.toLowerCase().trim());
    const rawIngs: RawGeminiIngredient[] = [
      { name: "Hähnchenbrust", baseAmountPerPortion: 150, unit: "g", optional: false },
      { name: "Tortilla Wraps", baseAmountPerPortion: 1, unit: "Stk.", optional: false },
      { name: "Pflücksalat", baseAmountPerPortion: 40, unit: "g", optional: false },
      { name: "Limetten", baseAmountPerPortion: 1, unit: "Stk.", optional: false },
      { name: "Joghurt mild", baseAmountPerPortion: 50, unit: "g", optional: false },
      { name: "Olivenöl", baseAmountPerPortion: 10, unit: "ml", optional: false },
    ];
    const missing = rawIngs.filter(
      (ing) => !pantryNames.some((p) => p.includes(ing.name.toLowerCase()) || ing.name.toLowerCase().includes(p))
    );

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
      if (activeTab === "video") {
        if (!selectedVideoFile) {
          setError("Bitte wähle ein Video (MP4, WebM oder MOV) aus.");
          setIsLoading(false);
          return;
        }
        const result = await importRecipeFromVideoWithGemini(selectedVideoFile, pantryItems);
        setImportedData({
          recipe: result.recipe,
          missingIngredients: result.missingIngredients,
        });
        onNotify("Video-Rezept erfolgreich analysiert!");
      } else {
        const content = activeTab === "url" ? inputUrl.trim() : inputText.trim();
        if (!content) {
          setError(activeTab === "url" ? "Bitte gib eine Rezept-URL ein." : "Bitte füge Rezept-Text oder eine Caption ein.");
          setIsLoading(false);
          return;
        }
        const result = await importRecipeFromTextOrUrlWithGemini(content, pantryItems);
        setImportedData({
          recipe: result.recipe,
          missingIngredients: result.missingIngredients,
        });
        onNotify("Rezept erfolgreich analysiert!");
      }
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
    setSelectedVideoFile(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
      setVideoPreviewUrl(null);
    }
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
              <h3 className="font-bold text-base text-white">Rezept mit KI importieren</h3>
              <p className="text-xs text-slate-400">Aus Videos, TikToks, Reels, URLs oder Text</p>
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
              {/* 3-Way Mode Switcher */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setActiveTab("video")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "video"
                      ? "bg-emerald-500 text-slate-950 shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Video size={14} />
                  <span>Video / Reel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("url")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "url"
                      ? "bg-emerald-500 text-slate-950 shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <LinkIcon size={14} />
                  <span>Web-Link</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("text")}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "text"
                      ? "bg-emerald-500 text-slate-950 shadow-sm font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileText size={14} />
                  <span>Text / Notiz</span>
                </button>
              </div>

              {/* VIDEO TAB */}
              {activeTab === "video" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Kochvideo, TikTok oder Reel hochladen
                    </label>
                    <span className="text-[10px] text-slate-400">MP4, MOV, WebM (bis 25 MB)</span>
                  </div>

                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                      selectedVideoFile
                        ? "border-emerald-500/80 bg-emerald-950/20"
                        : "border-slate-700 hover:border-slate-600 bg-slate-950/50 hover:bg-slate-950/80"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/*"
                      onChange={handleVideoFileChange}
                      className="hidden"
                    />

                    {selectedVideoFile ? (
                      <div className="space-y-3">
                        {videoPreviewUrl && (
                          <div className="max-h-40 rounded-xl overflow-hidden bg-black flex justify-center">
                            <video
                              src={videoPreviewUrl}
                              controls
                              className="max-h-40 rounded-xl"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                          <CheckCircle2 size={16} />
                          <span>{selectedVideoFile.name}</span>
                          <span className="text-slate-400 font-normal">
                            ({(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">Klicke, um ein anderes Video zu wählen</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto shadow-md">
                          <UploadCloud size={24} />
                        </div>
                        <strong className="text-xs text-slate-200 block">
                          Video hier ablegen oder Datei auswählen
                        </strong>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          Gemini analysiert visuelle Zutaten, Text-Einblendungen & gesprochene Mengenangaben.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Demo Reel Button for Quick Test */}
                  <button
                    type="button"
                    onClick={handleLoadDemoReel}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles size={14} className="text-emerald-400" />
                    <span>✨ Beispiel-Reel testen: Crispy Chicken Wraps (TikTok)</span>
                  </button>
                </div>
              )}

              {/* URL TAB */}
              {activeTab === "url" && (
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
              )}

              {/* TEXT TAB */}
              {activeTab === "text" && (
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
                    <span>
                      {activeTab === "video"
                        ? "Gemini analysiert Video & Tonspur..."
                        : "Gemini analysiert Rezept..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>
                      {activeTab === "video"
                        ? "Rezept aus Video extrahieren"
                        : "Rezept mit KI erfassen"}
                    </span>
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
                  className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Anderes Rezept
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="py-3 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
