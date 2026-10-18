import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Check, ChefHat, Clock, AlertCircle, Camera, RotateCcw } from "lucide-react";
import type { CatalogRecipe, RecipeStep } from "../data/recipeCatalog";
import { getSafeIngredientsList, getSafeSteps } from "../utils/recipeHelpers";
import { compressImageFile } from "../utils/imageUtils";
import { resolveRecipeFoodImage } from "../utils/geminiRecipes";

interface EditRecipeModalProps {
  isOpen: boolean;
  recipe: CatalogRecipe | null;
  onClose: () => void;
  onSave: (updatedRecipe: CatalogRecipe) => void;
}

interface EditableIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  optional: boolean;
}

const COMMON_UNITS = ["g", "ml", "Stk.", "EL", "TL", "Prise", "Bund", "Dose", "Pkg."];

export function EditRecipeModal({
  isOpen,
  recipe,
  onClose,
  onSave,
}: EditRecipeModalProps) {
  if (!isOpen || !recipe) return null;

  const [title, setTitle] = useState(recipe.title || "");
  const [subtitle, setSubtitle] = useState(recipe.subtitle || "");
  const [imageUrl, setImageUrl] = useState(recipe.imageUrl || "");
  const [time, setTime] = useState(recipe.time || "25 Min.");
  const [difficulty, setDifficulty] = useState<"Einfach" | "Mittel" | "Super Einfach">(
    recipe.difficulty || "Einfach"
  );
  const [chefTip, setChefTip] = useState(recipe.chefTip || "");

  // Initialize editable ingredients
  const [ingredients, setIngredients] = useState<EditableIngredient[]>(() => {
    let sourceIngs: Array<{ name: string; baseAmountPerPortion?: number; amount?: string; unit?: string; optional?: boolean }> = [];

    if (Array.isArray(recipe.rawIngredients) && recipe.rawIngredients.length > 0) {
      sourceIngs = recipe.rawIngredients;
    } else if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
      sourceIngs = recipe.ingredients;
    } else {
      sourceIngs = getSafeIngredientsList(recipe, 1).map((ing) => {
        const match = String(ing.amount || "").trim().match(/^([\d.,]+)\s*(.*)$/);
        const num = match ? parseFloat(match[1].replace(",", ".")) : 100;
        const u = match && match[2] ? match[2].trim() : "g";
        return {
          name: ing.name,
          baseAmountPerPortion: isNaN(num) ? 100 : num,
          unit: u || "g",
          optional: Boolean(ing.optional),
        };
      });
    }

    return sourceIngs.map((ing, idx) => {
      let amountNum = Number(ing.baseAmountPerPortion);
      let unitStr = ing.unit || "g";

      if (isNaN(amountNum) || amountNum <= 0) {
        const match = String(ing.amount || "").trim().match(/^([\d.,]+)\s*(.*)$/);
        amountNum = match ? parseFloat(match[1].replace(",", ".")) : 100;
        unitStr = match && match[2] ? match[2].trim() : "g";
      }

      return {
        id: `ing-${idx}-${Date.now()}`,
        name: ing.name || "",
        amount: isNaN(amountNum) ? 100 : amountNum,
        unit: unitStr || "g",
        optional: Boolean(ing.optional),
      };
    });
  });

  const [steps, setSteps] = useState<RecipeStep[]>(() => getSafeSteps(recipe));

  // Reset form whenever active recipe changes
  useEffect(() => {
    if (recipe) {
      setTitle(recipe.title || "");
      setSubtitle(recipe.subtitle || "");
      setImageUrl(recipe.imageUrl || "");
      setTime(recipe.time || "25 Min.");
      setDifficulty(recipe.difficulty || "Einfach");
      setChefTip(recipe.chefTip || "");

      let sourceIngs: Array<{ name: string; baseAmountPerPortion?: number; amount?: string; unit?: string; optional?: boolean }> = [];
      if (Array.isArray(recipe.rawIngredients) && recipe.rawIngredients.length > 0) {
        sourceIngs = recipe.rawIngredients;
      } else if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
        sourceIngs = recipe.ingredients;
      } else {
        sourceIngs = getSafeIngredientsList(recipe, 1).map((ing) => {
          const match = String(ing.amount || "").trim().match(/^([\d.,]+)\s*(.*)$/);
          const num = match ? parseFloat(match[1].replace(",", ".")) : 100;
          const u = match && match[2] ? match[2].trim() : "g";
          return {
            name: ing.name,
            baseAmountPerPortion: isNaN(num) ? 100 : num,
            unit: u || "g",
            optional: Boolean(ing.optional),
          };
        });
      }

      setIngredients(
        sourceIngs.map((ing, idx) => {
          let amountNum = Number(ing.baseAmountPerPortion);
          let unitStr = ing.unit || "g";

          if (isNaN(amountNum) || amountNum <= 0) {
            const match = String(ing.amount || "").trim().match(/^([\d.,]+)\s*(.*)$/);
            amountNum = match ? parseFloat(match[1].replace(",", ".")) : 100;
            unitStr = match && match[2] ? match[2].trim() : "g";
          }

          return {
            id: `ing-${idx}-${Date.now()}`,
            name: ing.name || "",
            amount: isNaN(amountNum) ? 100 : amountNum,
            unit: unitStr || "g",
            optional: Boolean(ing.optional),
          };
        })
      );

      setSteps(getSafeSteps(recipe));
    }
  }, [recipe]);

  const handleAddIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      {
        id: `ing-new-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: "",
        amount: 100,
        unit: "g",
        optional: false,
      },
    ]);
  };

  const handleUpdateIngredient = (
    id: string,
    field: keyof EditableIngredient,
    value: any
  ) => {
    setIngredients((prev) =>
      prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((ing) => ing.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) return;

    // Filter out completely empty ingredients
    const validIngredients = ingredients
      .filter((i) => i.name.trim().length > 0)
      .map((i) => ({
        name: i.name.trim(),
        baseAmountPerPortion: Math.max(0.1, Number(i.amount) || 1),
        unit: i.unit.trim() || "g",
        optional: Boolean(i.optional),
      }));

    const updatedRecipe: CatalogRecipe = {
      ...recipe,
      title: title.trim(),
      subtitle: subtitle.trim(),
      imageUrl: imageUrl.trim() || undefined,
      time: time.trim() || "20 Min.",
      difficulty,
      chefTip: chefTip.trim(),
      rawIngredients: validIngredients,
      ingredients: validIngredients,
      steps,
      available: (s: number) => {
        if (validIngredients.length > 0) {
          return validIngredients
            .slice(0, 3)
            .map((ing) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
            .join(" · ");
        }
        return "Zutaten vorhanden";
      },
      ingredientsList: (s: number) => {
        return validIngredients.map((ing) => ({
          name: ing.name,
          amount: `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit}`,
          optional: Boolean(ing.optional),
        }));
      },
    };

    onSave(updatedRecipe);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-xl bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ChefHat size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base leading-tight">Rezept anpassen</h3>
              <p className="text-xs text-slate-500">Zutaten, Mengen & Details bearbeiten</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Cover Photo Preview & Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Camera size={13} className="text-emerald-700" />
                <span>Rezept-Cover / Eigenes Foto</span>
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 font-medium transition-colors"
                  title="Eigenes Foto entfernen & Standard verwenden"
                >
                  <RotateCcw size={11} /> Zurücksetzen
                </button>
              )}
            </div>

            <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
              <img
                src={imageUrl || resolveRecipeFoodImage(title, subtitle)}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = resolveRecipeFoodImage(title);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end justify-between p-3">
                <span className="text-[11px] font-semibold text-white drop-shadow">
                  {imageUrl ? "✓ Eigenes Foto aktiv" : "Automatisches Bild (Unsplash)"}
                </span>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 rounded-xl shadow cursor-pointer transition-transform active:scale-95 border border-slate-200">
                  <Camera size={14} className="text-emerald-700" />
                  <span>Foto wählen / aufnehmen</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const dataUrl = await compressImageFile(file, 1200, 900, 0.82);
                          setImageUrl(dataUrl);
                        } catch (err) {
                          console.error("Fehler beim Komprimieren:", err);
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Recipe Name & Subtitle */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rezepttitel</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Cremige Pasta mit Pilzen"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Untertitel / Notiz</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="z.B. Extra knusprig mit frischen Champignons"
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-600"
              />
            </div>
          </div>

          {/* Time & Difficulty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock size={12} className="text-slate-400" /> Dauer
              </label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="25 Min."
                className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Schwierigkeit</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 bg-white"
              >
                <option value="Super Einfach">Super Einfach</option>
                <option value="Einfach">Einfach</option>
                <option value="Mittel">Mittel</option>
              </select>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Zutaten pro Portion ({ingredients.length})
                </h4>
                <p className="text-[11px] text-slate-500">Mengen skalieren automatisch mit Personenzahl</p>
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200"
              >
                <Plus size={14} />
                <span>Zutat hinzufügen</span>
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((ing) => (
                <div
                  key={ing.id}
                  className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {/* Ingredient Name */}
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => handleUpdateIngredient(ing.id, "name", e.target.value)}
                    placeholder="z.B. Pilze / Champignons"
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium"
                  />

                  {/* Amount */}
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={ing.amount}
                    onChange={(e) => handleUpdateIngredient(ing.id, "amount", parseFloat(e.target.value) || 0)}
                    placeholder="Menge"
                    className="w-16 px-2 py-1.5 text-xs text-right border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium"
                  />

                  {/* Unit */}
                  <div className="w-16">
                    <select
                      value={ing.unit}
                      onChange={(e) => handleUpdateIngredient(ing.id, "unit", e.target.value)}
                      className="w-full px-1.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 font-medium"
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      {!COMMON_UNITS.includes(ing.unit) && ing.unit && (
                        <option value={ing.unit}>{ing.unit}</option>
                      )}
                    </select>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(ing.id)}
                    title="Zutat löschen"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              {ingredients.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl">
                  Keine Zutaten definiert. Klicke auf «Zutat hinzufügen».
                </div>
              )}
            </div>
          </div>

          {/* Chef Tip */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Zubereitungs-Tipp (Optional)</label>
            <textarea
              rows={2}
              value={chefTip}
              onChange={(e) => setChefTip(e.target.value)}
              placeholder="z.B. Die Pilze erst am Ende salzen, damit sie schön bräunen."
              className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || ingredients.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-colors shadow-sm"
          >
            <Check size={15} />
            <span>Änderungen speichern</span>
          </button>
        </div>

      </div>
    </div>
  );
}
