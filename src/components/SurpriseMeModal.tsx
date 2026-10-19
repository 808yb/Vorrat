import React, { useState, useMemo } from "react";
import {
  Utensils,
  Sun,
  Sparkles,
  Flame,
  Zap,
  Clock,
  CheckCircle2,
  Leaf,
  Dumbbell,
  Coins,
  Wind,
  Box,
  Radio,
  RefreshCw,
  X,
  ArrowLeft,
  ArrowRight,
  Dices,
  Check,
} from "lucide-react";
import type { CatalogRecipe } from "../data/recipeCatalog";
import { getRecipePantryBreakdown } from "../utils/pantryMatching";
import { getSafeIngredientsList } from "../utils/recipeHelpers";

export interface SurpriseFilters {
  mealType: "dinner" | "breakfast" | "dessert" | "baking" | "snack" | "all";
  preferences: string[];
  equipment: string[];
}

interface SurpriseMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: CatalogRecipe[];
  pantry?: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>;
  servings: number;
  onApplyFilters?: (filters: SurpriseFilters) => void;
  onSelectRecipe: (recipe: CatalogRecipe) => void;
  onCookRecipe?: (recipe: CatalogRecipe) => void;
  onNotify?: (message: string) => void;
}

interface MealTypeOption {
  id: "dinner" | "breakfast" | "dessert" | "baking" | "snack" | "all";
  title: string;
  description: string;
  iconName: "utensils" | "sun" | "sparkles" | "flame" | "zap" | "all";
}

const MEAL_TYPES: MealTypeOption[] = [
  {
    id: "dinner",
    title: "Mittag- & Abendessen",
    description: "Herzhafte Pfannen, One-Pot Gerichte, Pasta, Wok & Bowls",
    iconName: "utensils",
  },
  {
    id: "breakfast",
    title: "Frühstück & Brunch",
    description: "Fluffige Protein-Pancakes, Eiergerichte & Frühstücks-Bowls",
    iconName: "sun",
  },
  {
    id: "dessert",
    title: "Dessert & Süßes",
    description: "Kaiserschmarrn, süße Crepes & fruchtige Nachspeisen",
    iconName: "sparkles",
  },
  {
    id: "baking",
    title: "Backen & Teige",
    description: "Apfel-Crumble, schnelle Tassenkuchen & Aufläufe",
    iconName: "flame",
  },
  {
    id: "snack",
    title: "Snack & Heißhunger",
    description: "Knusprige Wedges, schnelle Bissen & kleine Leckereien",
    iconName: "zap",
  },
];

interface GoalOption {
  id: string;
  title: string;
  description: string;
  iconName: "clock" | "check" | "leaf" | "dumbbell" | "sparkles" | "flame" | "coins";
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: "quick",
    title: "Blitz-Rezept (<= 15 Min.)",
    description: "Schnell fertig, minimaler Vorbereitungsaufwand",
    iconName: "clock",
  },
  {
    id: "pantry100",
    title: "100% Vorrat (Restekochen)",
    description: "Exakt 0 Zutaten nachkaufen nötig",
    iconName: "check",
  },
  {
    id: "veggie",
    title: "Vegetarisch & Plant-based",
    description: "Frisch, pflanzlich und ohne Fleisch",
    iconName: "leaf",
  },
  {
    id: "protein",
    title: "High Protein (>= 15g)",
    description: "Sättigend, ideal für Training & Muskelaufbau",
    iconName: "dumbbell",
  },
  {
    id: "lowcarb",
    title: "Low Carb & Leicht",
    description: "Wenig Kohlenhydrate, leicht bekömmlich",
    iconName: "sparkles",
  },
  {
    id: "spicy",
    title: "Pikant & Würzig",
    description: "Mit Chili, Knoblauch, Wok-Sauce & Röstaromen",
    iconName: "flame",
  },
  {
    id: "budget",
    title: "Budget (<= 2 € / Portion)",
    description: "Maximal preiswert und schonend für den Geldbeutel",
    iconName: "coins",
  },
];

interface EquipmentOption {
  id: string;
  title: string;
  description: string;
  iconName: "utensils" | "wind" | "box" | "radio" | "refresh";
}

const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  {
    id: "pan",
    title: "Pfanne & Kochtopf",
    description: "Klassisches Kochen auf dem Herd",
    iconName: "utensils",
  },
  {
    id: "airfryer",
    title: "Heißluftfritteuse (Airfryer)",
    description: "Knusprig rösten & backen mit Heißluft",
    iconName: "wind",
  },
  {
    id: "oven",
    title: "Backofen",
    description: "Aufläufe, Gratins & Crumble",
    iconName: "box",
  },
  {
    id: "microwave",
    title: "Mikrowelle",
    description: "Blitz-Tassenkuchen & schnelles Garen",
    iconName: "radio",
  },
  {
    id: "blender",
    title: "Standmixer / Pürierstab",
    description: "Pancaketeig, Cremes & Dressings",
    iconName: "refresh",
  },
];

export function SurpriseMeModal({
  isOpen,
  onClose,
  recipes,
  pantry = [],
  servings,
  onApplyFilters,
  onSelectRecipe,
  onCookRecipe,
  onNotify,
}: SurpriseMeModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [selectedMealType, setSelectedMealType] = useState<"dinner" | "breakfast" | "dessert" | "baking" | "snack" | "all">("all");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(["pan"]);
  const [pickedRecipe, setPickedRecipe] = useState<CatalogRecipe | null>(null);

  if (!isOpen) return null;

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleEquipment = (id: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((e) => e !== id) : prev) : [...prev, id]
    );
  };

  // Helper to evaluate recipe matching
  const testRecipeMatch = (r: CatalogRecipe): boolean => {
    // 1. Meal type filter
    if (selectedMealType !== "all") {
      if (r.mealType && r.mealType !== selectedMealType) return false;
      const titleLower = r.title.toLowerCase();
      const subLower = r.subtitle.toLowerCase();
      if (selectedMealType === "breakfast" && !(r.mealType === "breakfast" || titleLower.includes("pancake") || titleLower.includes("rührei") || titleLower.includes("ei") || titleLower.includes("toast"))) {
        return false;
      }
      if (selectedMealType === "dessert" && !(r.mealType === "dessert" || titleLower.includes("schmarrn") || titleLower.includes("süß") || titleLower.includes("dessert") || subLower.includes("puderzucker"))) {
        return false;
      }
      if (selectedMealType === "baking" && !(r.mealType === "baking" || titleLower.includes("crumble") || titleLower.includes("kuchen") || titleLower.includes("back") || titleLower.includes("teig"))) {
        return false;
      }
    }

    // 2. Goals filter
    const ings = typeof r.ingredientsList === "function" ? r.ingredientsList(1) : getSafeIngredientsList(r, 1);
    const ingsText = ings.map((i) => i.name).join(" ").toLowerCase();
    const fullText = `${r.title} ${r.subtitle} ${ingsText}`.toLowerCase();
    const timeNum = parseInt(r.time.replace(/\D/g, ""), 10) || 20;

    for (const goal of selectedGoals) {
      if (goal === "quick" && timeNum > 15) return false;
      if (goal === "veggie" && (fullText.includes("hähnchen") || fullText.includes("rind") || fullText.includes("hack") || fullText.includes("fleisch") || fullText.includes("speck") || fullText.includes("wurst"))) {
        return false;
      }
      if (goal === "protein" && r.baseProt < 15) return false;
      if (goal === "lowcarb" && r.baseCarb > 18) return false;
      if (goal === "budget" && r.baseCost > 2.0) return false;
      if (goal === "spicy" && !(fullText.includes("chili") || fullText.includes("knoblauch") || fullText.includes("scharf") || fullText.includes("pikant") || fullText.includes("arrabbiata") || fullText.includes("teriyaki"))) {
        return false;
      }
      if (goal === "pantry100") {
        const breakdown = getRecipePantryBreakdown(r, pantry, servings);
        if (breakdown.missing.length > 0) return false;
      }
    }

    // 3. Equipment filter
    if (selectedEquipment.length > 0 && r.equipment && r.equipment.length > 0) {
      const hasEquipmentMatch = r.equipment.some((eq) => selectedEquipment.includes(eq));
      if (!hasEquipmentMatch) return false;
    }

    return true;
  };

  const matchingPool = useMemo(() => {
    return recipes.filter(testRecipeMatch);
  }, [recipes, selectedMealType, selectedGoals, selectedEquipment, pantry, servings]);

  const handleApplyAndClose = () => {
    const filters: SurpriseFilters = {
      mealType: selectedMealType,
      preferences: selectedGoals,
      equipment: selectedEquipment,
    };
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
    if (onNotify) {
      onNotify(`Daily Discover mit deinen Wünschen aktualisiert (${matchingPool.length > 0 ? matchingPool.length : recipes.length} Rezepte)!`);
    }
    onClose();
  };

  const handleInstantSurprise = () => {
    const pool = matchingPool.length > 0 ? matchingPool : recipes;
    if (pool.length === 0) return;

    // Rank candidate by standard 70-80% match rule unless 100% pantry is requested
    const isPantry100 = selectedGoals.includes("pantry100");
    const scored = pool.map((r) => {
      const breakdown = getRecipePantryBreakdown(r, pantry, servings);
      const total = breakdown.inStock.length + breakdown.missing.length;
      const pct = total > 0 ? breakdown.inStock.length / total : 0;
      let score = 0;
      if (isPantry100) {
        score = breakdown.missing.length === 0 ? 100 : pct * 20;
      } else {
        // Favor 70-85% pantry match for variety
        if (pct >= 0.70 && pct <= 0.85) {
          score = 80 + Math.random() * 10;
        } else if (pct > 0.85) {
          score = 60 + Math.random() * 10;
        } else {
          score = pct * 40 + Math.random() * 10;
        }
      }
      return { recipe: r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0].recipe;
    setPickedRecipe(chosen);
    onSelectRecipe(chosen);
    if (onNotify) {
      onNotify(`Überraschungs-Treffer: «${chosen.title}»`);
    }
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-container"
        style={{
          maxWidth: "460px",
          width: "94%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "20px",
          overflow: "hidden",
          background: "#ffffff",
          boxShadow: "0 20px 40px rgba(0,0,0,0.22)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px 14px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#dcfce7",
                color: "#15803d",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                Überrasch mich
              </h2>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                Schritt {currentStep} von 3 · Daily Discover anpassen
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 3-Step Progress Bar Indicator */}
        <div style={{ display: "flex", height: "4px", background: "#f1f5f9" }}>
          <div
            style={{
              flex: 1,
              background: currentStep >= 1 ? "#10b981" : "#e2e8f0",
              transition: "background 0.3s ease",
            }}
          />
          <div
            style={{
              flex: 1,
              background: currentStep >= 2 ? "#10b981" : "#e2e8f0",
              transition: "background 0.3s ease",
            }}
          />
          <div
            style={{
              flex: 1,
              background: currentStep >= 3 ? "#10b981" : "#e2e8f0",
              transition: "background 0.3s ease",
            }}
          />
        </div>

        {/* Content Body */}
        <div style={{ padding: "18px 20px", overflowY: "auto", flex: 1 }}>
          {/* STEP 1: Mahlzeit & Typ */}
          {currentStep === 1 && (
            <div>
              <div style={{ marginBottom: "14px" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                  Worauf hast du heute Lust?
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                  Wähle eine Kategorie für passende Rezeptvorschläge
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedMealType("all")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: `1.5px solid ${selectedMealType === "all" ? "#10b981" : "#e2e8f0"}`,
                    background: selectedMealType === "all" ? "#f0fdf4" : "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: selectedMealType === "all" ? "#dcfce7" : "#f1f5f9",
                        color: selectedMealType === "all" ? "#15803d" : "#64748b",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>
                        Alles anzeigen (Beste Mischung)
                      </strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        Vielfältige Vorschläge über alle Gerichte
                      </span>
                    </div>
                  </div>
                  {selectedMealType === "all" && <Check size={18} color="#10b981" />}
                </button>

                {MEAL_TYPES.map((type) => {
                  const isSelected = selectedMealType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setSelectedMealType(type.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: `1.5px solid ${isSelected ? "#10b981" : "#e2e8f0"}`,
                        background: isSelected ? "#f0fdf4" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            background: isSelected ? "#dcfce7" : "#f1f5f9",
                            color: isSelected ? "#15803d" : "#64748b",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          {type.iconName === "utensils" && <Utensils size={16} />}
                          {type.iconName === "sun" && <Sun size={16} />}
                          {type.iconName === "sparkles" && <Sparkles size={16} />}
                          {type.iconName === "flame" && <Flame size={16} />}
                          {type.iconName === "zap" && <Zap size={16} />}
                        </div>
                        <div>
                          <strong style={{ fontSize: "13px", color: "#0f172a", display: "block" }}>
                            {type.title}
                          </strong>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {type.description}
                          </span>
                        </div>
                      </div>
                      {isSelected && <Check size={18} color="#10b981" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Ernährungsziel & Stil */}
          {currentStep === 2 && (
            <div>
              <div style={{ marginBottom: "14px" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                  Ernährungsziel & Stil
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                  Mehrfachauswahl möglich oder einfach weitergehen
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {GOAL_OPTIONS.map((goal) => {
                  const isSelected = selectedGoals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => toggleGoal(goal.id)}
                      style={{
                        padding: "11px 14px",
                        borderRadius: "12px",
                        border: `1.5px solid ${isSelected ? "#10b981" : "#e2e8f0"}`,
                        background: isSelected ? "#f0fdf4" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            background: isSelected ? "#dcfce7" : "#f1f5f9",
                            color: isSelected ? "#15803d" : "#64748b",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          {goal.iconName === "clock" && <Clock size={15} />}
                          {goal.iconName === "check" && <CheckCircle2 size={15} />}
                          {goal.iconName === "leaf" && <Leaf size={15} />}
                          {goal.iconName === "dumbbell" && <Dumbbell size={15} />}
                          {goal.iconName === "sparkles" && <Sparkles size={15} />}
                          {goal.iconName === "flame" && <Flame size={15} />}
                          {goal.iconName === "coins" && <Coins size={15} />}
                        </div>
                        <div>
                          <strong style={{ fontSize: "12.5px", color: "#0f172a", display: "block" }}>
                            {goal.title}
                          </strong>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {goal.description}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "6px",
                          border: `1.5px solid ${isSelected ? "#10b981" : "#cbd5e1"}`,
                          background: isSelected ? "#10b981" : "#ffffff",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Küchengeräte */}
          {currentStep === 3 && (
            <div>
              <div style={{ marginBottom: "14px" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                  Küchengeräte & Zubereitung
                </h3>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                  Welche Geräte möchtest du heute verwenden?
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const isSelected = selectedEquipment.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      onClick={() => toggleEquipment(eq.id)}
                      style={{
                        padding: "11px 14px",
                        borderRadius: "12px",
                        border: `1.5px solid ${isSelected ? "#10b981" : "#e2e8f0"}`,
                        background: isSelected ? "#f0fdf4" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "8px",
                            background: isSelected ? "#dcfce7" : "#f1f5f9",
                            color: isSelected ? "#15803d" : "#64748b",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          {eq.iconName === "utensils" && <Utensils size={15} />}
                          {eq.iconName === "wind" && <Wind size={15} />}
                          {eq.iconName === "box" && <Box size={15} />}
                          {eq.iconName === "radio" && <Radio size={15} />}
                          {eq.iconName === "refresh" && <RefreshCw size={15} />}
                        </div>
                        <div>
                          <strong style={{ fontSize: "12.5px", color: "#0f172a", display: "block" }}>
                            {eq.title}
                          </strong>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {eq.description}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "6px",
                          border: `1.5px solid ${isSelected ? "#10b981" : "#cbd5e1"}`,
                          background: isSelected ? "#10b981" : "#ffffff",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Summary pill */}
              <div
                style={{
                  marginTop: "16px",
                  padding: "10px 14px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  fontSize: "11.5px",
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Passende Rezepte im Katalog:</span>
                <strong style={{ color: "#0f172a" }}>
                  {matchingPool.length > 0 ? `${matchingPool.length} Treffer` : "Alle Rezepte"}
                </strong>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div
          style={{
            padding: "14px 20px 16px",
            borderTop: "1px solid #e2e8f0",
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => (s - 1) as any)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <ArrowLeft size={14} />
              Zurück
            </button>
          ) : (
            <button
              type="button"
              onClick={handleInstantSurprise}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                color: "#334155",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
              title="Direkt ein passendes Zufallsrezept öffnen"
            >
              <Dices size={14} />
              Sofort würfeln
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => (s + 1) as any)}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: "#0f172a",
                color: "#ffffff",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              Weiter
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyAndClose}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: "#059669",
                color: "#ffffff",
                fontSize: "12.5px",
                fontWeight: 750,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Check size={15} />
              Daily Discover aktualisieren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
