import React, { useState, useMemo } from "react";
import { Dices, Check, AlertCircle, Sparkles, X } from "lucide-react";
import type { CatalogRecipe } from "../data/recipeCatalog";
import { getRecipePantryBreakdown } from "../utils/pantryMatching";

interface SurpriseMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: CatalogRecipe[];
  pantry?: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>;
  servings: number;
  onSelectRecipe: (recipe: CatalogRecipe) => void;
  onCookRecipe?: (recipe: CatalogRecipe) => void;
  onNotify?: (message: string) => void;
}

export type PreferenceCategory =
  | "quick" // <= 15 Min
  | "meat" // Fleisch / Geflügel
  | "veggie" // Vegetarisch
  | "egg" // Eier / Pfanne
  | "rice" // Reis & Bowls
  | "pasta" // Pasta & Nudeln
  | "protein" // High Protein >= 15g
  | "lowcarb" // Low Carb
  | "pantry100" // 100% Vorrat
  | "budget" // <= 1.50 €
  | "spicy"; // Pikant / Scharf

interface PreferenceOption {
  id: PreferenceCategory;
  label: string;
  icon: string;
  description: string;
}

const PREFERENCE_OPTIONS: PreferenceOption[] = [
  { id: "quick", label: "Schnell (≤ 15 Min.)", icon: "⚡", description: "In wenigen Minuten auf dem Tisch" },
  { id: "meat", label: "Fleisch / Geflügel", icon: "🍗", description: "Hähnchenfilet, Rind oder herzhaft" },
  { id: "veggie", label: "Vegetarisch / Plant", icon: "🥗", description: "Ohne Fleisch, frisch & grün" },
  { id: "protein", label: "High Protein (≥ 15g)", icon: "💪", description: "Perfekt für Training & Muskelaufbau" },
  { id: "lowcarb", label: "Low Carb / Leicht", icon: "🥑", description: "Wenig Kohlenhydrate, leicht bekömmlich" },
  { id: "pantry100", label: "100% im Vorrat", icon: "🏠", description: "0 Zutaten nachkaufen nötig" },
  { id: "egg", label: "Eier & Pfanne", icon: "🍳", description: "Omelett, Rührei oder Fried Rice" },
  { id: "rice", label: "Reis & Bowls", icon: "🍚", description: "Bunte Bowls & asiatische Wok-Hits" },
  { id: "pasta", label: "Pasta & Nudeln", icon: "🍝", description: "Klassiker & schnelle Nudelgerichte" },
  { id: "budget", label: "Budget (≤ 1,50 €)", icon: "💰", description: "Maximal preiswert pro Portion" },
  { id: "spicy", label: "Pikant & Herzhaft", icon: "🔥", description: "Mit Chili, Knoblauch oder Soja" },
];

export function SurpriseMeModal({
  isOpen,
  onClose,
  recipes,
  pantry = [],
  servings,
  onSelectRecipe,
  onCookRecipe,
  onNotify,
}: SurpriseMeModalProps) {
  const [selectedPreferences, setSelectedPreferences] = useState<PreferenceCategory[]>([]);
  const [pickedRecipe, setPickedRecipe] = useState<CatalogRecipe | null>(null);
  const [customWish, setCustomWish] = useState("");

  // Helper to test if a recipe matches a category
  const matchesCategory = (recipe: CatalogRecipe, cat: PreferenceCategory): boolean => {
    const titleLower = recipe.title.toLowerCase();
    const subLower = recipe.subtitle.toLowerCase();
    const fullText = `${titleLower} ${subLower}`;

    // Extract minutes from recipe time like "15 Min." -> 15
    const timeMatch = recipe.time.match(/\d+/);
    const minutes = timeMatch ? parseInt(timeMatch[0], 10) : 20;

    switch (cat) {
      case "quick":
        return minutes <= 15;
      case "meat":
        return (
          fullText.includes("hähnchen") ||
          fullText.includes("fleisch") ||
          fullText.includes("rind") ||
          fullText.includes("speck") ||
          fullText.includes("filet") ||
          fullText.includes("chicken") ||
          fullText.includes("wurst")
        );
      case "veggie":
        return !(
          fullText.includes("hähnchen") ||
          fullText.includes("fleisch") ||
          fullText.includes("rind") ||
          fullText.includes("speck") ||
          fullText.includes("filet") ||
          fullText.includes("chicken")
        );
      case "protein":
        return recipe.baseProt >= 14;
      case "lowcarb":
        return recipe.baseCarb <= 16;
      case "pantry100": {
        const breakdown = getRecipePantryBreakdown(recipe, pantry, servings);
        return breakdown.missing.length === 0;
      }
      case "budget":
        return recipe.baseCost <= 1.55;
      case "egg":
        return (
          fullText.includes("ei") ||
          fullText.includes("eier") ||
          fullText.includes("omelett") ||
          fullText.includes("rührei") ||
          fullText.includes("fried rice")
        );
      case "rice":
        return fullText.includes("reis") || fullText.includes("bowl") || fullText.includes("rice");
      case "pasta":
        return fullText.includes("pasta") || fullText.includes("nudel") || fullText.includes("penne");
      case "spicy":
        return (
          fullText.includes("chili") ||
          fullText.includes("knoblauch") ||
          fullText.includes("scharf") ||
          fullText.includes("teriyaki") ||
          fullText.includes("pikant")
        );
      default:
        return true;
    }
  };

  // Filter pool based on active preferences & custom search term
  const matchingPool = useMemo(() => {
    let pool = [...recipes];

    // Filter by custom wish text if present
    if (customWish.trim().length > 1) {
      const q = customWish.trim().toLowerCase();
      pool = pool.filter(
        (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
      );
    }

    // Filter by selected preferences
    if (selectedPreferences.length > 0) {
      pool = pool.filter((r) => {
        return selectedPreferences.every((cat) => matchesCategory(r, cat));
      });
    }

    return pool;
  }, [recipes, selectedPreferences, customWish, pantry, servings]);

  const togglePreference = (cat: PreferenceCategory) => {
    // If switching between meat and veggie, make them mutually exclusive
    if (cat === "meat") {
      setSelectedPreferences((prev) =>
        prev.includes("meat")
          ? prev.filter((c) => c !== "meat")
          : [...prev.filter((c) => c !== "veggie"), "meat"]
      );
      setPickedRecipe(null);
      return;
    }
    if (cat === "veggie") {
      setSelectedPreferences((prev) =>
        prev.includes("veggie")
          ? prev.filter((c) => c !== "veggie")
          : [...prev.filter((c) => c !== "meat"), "veggie"]
      );
      setPickedRecipe(null);
      return;
    }

    setSelectedPreferences((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setPickedRecipe(null);
  };

  const handlePickRandom = () => {
    const pool = matchingPool.length > 0 ? matchingPool : recipes;
    if (pool.length === 0) return;

    // Weight selection towards higher pantry match
    const scored = pool.map((r) => {
      const breakdown = getRecipePantryBreakdown(r, pantry, servings);
      const inStock = breakdown.inStock.length;
      const total = breakdown.inStock.length + breakdown.missing.length;
      const pct = total > 0 ? inStock / total : 0;
      return { recipe: r, pct };
    });

    // Sort by pantry percentage descending with some random variance
    scored.sort((a, b) => b.pct - a.pct + (Math.random() * 0.4 - 0.2));
    const chosen = scored[0].recipe;

    setPickedRecipe(chosen);
    if (onNotify) {
      const breakdown = getRecipePantryBreakdown(chosen, pantry, servings);
      const total = breakdown.inStock.length + breakdown.missing.length;
      const pct = total > 0 ? Math.round((breakdown.inStock.length / total) * 100) : 0;
      onNotify(`Überraschung: «${chosen.title}» (${pct}% vorrätig)!`);
    }
  };

  const handleAcceptSwipe = () => {
    if (pickedRecipe) {
      onSelectRecipe(pickedRecipe);
      onClose();
    }
  };

  const handleAcceptCook = () => {
    if (pickedRecipe && onCookRecipe) {
      onCookRecipe(pickedRecipe);
      onClose();
    } else if (pickedRecipe) {
      handleAcceptSwipe();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 70 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "480px",
          width: "92%",
          borderRadius: "20px",
          padding: "20px",
          background: "#ffffff",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "#ebf3ee",
                color: "#2d5a3e",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Dices size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
                Überrasch mich!
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                Was möchtest du heute essen? Wähle deine Wünsche:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="clear-button"
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b", fontSize: "16px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================
            VIEW 1: SELECTION MENU (If no recipe picked yet)
            ======================================================== */}
        {!pickedRecipe ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Quick Keyword Search Input */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Spezielle Zutat oder Wunsch (optional)
              </label>
              <input
                type="text"
                value={customWish}
                onChange={(e) => {
                  setCustomWish(e.target.value);
                  setPickedRecipe(null);
                }}
                placeholder="z. B. Hähnchen, Pasta, Erbsen, Curry..."
                className="search-field"
                style={{ width: "100%", height: "38px", fontSize: "12px" }}
              />
            </div>

            {/* Category Preference Chips */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 750, color: "#334155", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Worauf hast du Lust?
                </span>
                {selectedPreferences.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPreferences([])}
                    style={{ border: "none", background: "none", color: "#dc2626", fontSize: "10.5px", fontWeight: 700, cursor: "pointer" }}
                  >
                    Filter leeren
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {PREFERENCE_OPTIONS.map((opt) => {
                  const isSelected = selectedPreferences.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => togglePreference(opt.id)}
                      style={{
                        padding: "7px 11px",
                        borderRadius: "11px",
                        border: isSelected ? "1.5px solid #2d5a3e" : "1px solid #cbd5e1",
                        background: isSelected ? "#2d5a3e" : "#f8fafc",
                        color: isSelected ? "#ffffff" : "#334155",
                        fontSize: "11.5px",
                        fontWeight: isSelected ? 750 : 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: isSelected ? "0 2px 6px rgba(45, 90, 62, 0.25)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Matching Counter Banner */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: matchingPool.length > 0 ? "#f4f7f5" : "#fef2f2",
                border: `1px solid ${matchingPool.length > 0 ? "#c6dcce" : "#fecaca"}`,
                borderRadius: "12px",
                fontSize: "11.5px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {matchingPool.length > 0 ? (
                  <Check size={15} color="#166534" />
                ) : (
                  <AlertCircle size={15} color="#991b1b" />
                )}
                <span style={{ fontWeight: 700, color: matchingPool.length > 0 ? "#1b4332" : "#991b1b" }}>
                  {matchingPool.length > 0
                    ? `${matchingPool.length} passende Rezepte gefunden`
                    : "Kein exakter Treffer für diese Kombination"}
                </span>
              </div>
              {selectedPreferences.length > 0 && (
                <span style={{ fontSize: "10px", color: "#64748b" }}>
                  {selectedPreferences.length} aktiv
                </span>
              )}
            </div>

            {/* Action Button: Überrasch mich */}
            <button
              type="button"
              className="primary-button"
              onClick={handlePickRandom}
              style={{
                height: "46px",
                borderRadius: "13px",
                fontSize: "13px",
                fontWeight: 750,
                background: "#2d5a3e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 3px 10px rgba(45, 90, 62, 0.25)",
              }}
            >
              <Dices size={18} />
              <span>Zufälliges Rezept würfeln</span>
            </button>
          </div>
        ) : (
          /* ========================================================
             VIEW 2: SURPRISE RESULT CARD
             ======================================================== */
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div
              style={{
                padding: "8px 12px",
                background: "#ecfdf5",
                borderRadius: "12px",
                border: "1px solid #a7f3d0",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#065f46",
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              <Sparkles size={14} color="#059669" />
              <span>Dein Überraschungs-Treffer nach deinen Wünschen:</span>
            </div>

            {/* Highlight Recipe Card */}
            <div
              style={{
                background: "#ffffff",
                border: "1.5px solid #2d5a3e",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 4px 16px rgba(45, 90, 62, 0.12)",
              }}
            >
              {pickedRecipe.imageUrl && (
                <div style={{ width: "100%", height: "140px", overflow: "hidden", position: "relative" }}>
                  <img
                    src={pickedRecipe.imageUrl}
                    alt={pickedRecipe.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "rgba(15, 23, 42, 0.85)",
                      color: "white",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    ⏱ {pickedRecipe.time}
                  </span>
                </div>
              )}

              <div style={{ padding: "14px" }}>
                <h3 style={{ margin: "0 0 3px", fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                  {pickedRecipe.title}
                </h3>
                <p style={{ margin: "0 0 10px", fontSize: "11px", color: "#64748b" }}>
                  {pickedRecipe.subtitle}
                </p>

                {/* Macro & Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                  <div style={{ background: "#f8fafc", padding: "6px", borderRadius: "8px", textAlign: "center" }}>
                    <span style={{ fontSize: "9px", color: "#64748b", display: "block" }}>KCAL</span>
                    <strong style={{ fontSize: "11.5px", color: "#0f172a" }}>{pickedRecipe.baseCal}</strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "6px", borderRadius: "8px", textAlign: "center" }}>
                    <span style={{ fontSize: "9px", color: "#059669", display: "block" }}>PROTEIN</span>
                    <strong style={{ fontSize: "11.5px", color: "#047857" }}>{pickedRecipe.baseProt}g</strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "6px", borderRadius: "8px", textAlign: "center" }}>
                    <span style={{ fontSize: "9px", color: "#d97706", display: "block" }}>CARBS</span>
                    <strong style={{ fontSize: "11.5px", color: "#b45309" }}>{pickedRecipe.baseCarb}g</strong>
                  </div>
                  <div style={{ background: "#f8fafc", padding: "6px", borderRadius: "8px", textAlign: "center" }}>
                    <span style={{ fontSize: "9px", color: "#2563eb", display: "block" }}>PREIS</span>
                    <strong style={{ fontSize: "11.5px", color: "#1d4ed8" }}>{pickedRecipe.baseCost.toFixed(2).replace(".", ",")}€</strong>
                  </div>
                </div>

                {/* Pantry coverage note */}
                {(() => {
                  const breakdown = getRecipePantryBreakdown(pickedRecipe, pantry, servings);
                  const inStock = breakdown.inStock.length;
                  const total = inStock + breakdown.missing.length;
                  const pct = total > 0 ? Math.round((inStock / total) * 100) : 0;
                  return (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        background: pct === 100 ? "#ecfdf5" : "#f1f5f9",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    >
                      <span style={{ color: pct === 100 ? "#047857" : "#334155", fontWeight: 700 }}>
                        {pct === 100 ? "✓ Alle Zutaten vorrätig!" : `${inStock} von ${total} Zutaten im Vorrat`}
                      </span>
                      <span style={{ fontWeight: 800, color: pct === 100 ? "#059669" : "#0284c7" }}>
                        {pct}% Match
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                {onCookRecipe && (
                  <button
                    type="button"
                    onClick={handleAcceptCook}
                    className="primary-button"
                    style={{
                      flex: 1,
                      height: "44px",
                      borderRadius: "12px",
                      fontSize: "12.5px",
                      fontWeight: 750,
                      background: "#2d5a3e",
                    }}
                  >
                    Jetzt kochen →
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAcceptSwipe}
                  className="secondary-button"
                  style={{
                    flex: 1,
                    height: "44px",
                    borderRadius: "12px",
                    fontSize: "12.5px",
                    fontWeight: 750,
                    background: "#ffffff",
                    border: "1.5px solid #cbd5e1",
                    color: "#1e293b",
                  }}
                >
                  Im Swipe-Deck ansehen
                </button>
              </div>

              <button
                type="button"
                onClick={handlePickRandom}
                style={{
                  height: "36px",
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: "10px",
                  color: "#475569",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <Dices size={15} />
                Nochmal würfeln
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
