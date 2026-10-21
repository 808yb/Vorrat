import React, { useState, useEffect, useMemo } from "react";
import {
  setAlternativeOverride,
  getAlternativeOverride,
  type AlternativeOverride,
  cleanAlternativeText,
  getIngredientKind,
  getAmbiguousIngredientTag,
} from "../utils/pantryMatching";
import { ProductMark, getFoodTone } from "./FoodIcons";
import { type CatalogRecipe } from "../data/recipeCatalog";
import { STORAGE_KEYS } from "../constants/storage";

export interface AlternativeManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: CatalogRecipe;
  recipeId?: string;
  recipeTitle?: string;
  ingredientName: string;
  amount?: string;
  currentMatchedPantryName?: string;
  pantryItems: Array<{ name: string; amount?: number; unit?: string; category?: string }>;
  onChanged?: () => void;
}

export const AlternativeManageModal: React.FC<AlternativeManageModalProps> = ({
  isOpen,
  onClose,
  recipe,
  recipeId,
  recipeTitle,
  ingredientName,
  amount,
  currentMatchedPantryName,
  pantryItems,
  onChanged,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [existingOverride, setExistingOverride] = useState<AlternativeOverride | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");

  const targetRecipeId = recipe?.id || recipeId;
  const targetRecipeTitle = recipe?.title || recipeTitle;

  useEffect(() => {
    if (isOpen && ingredientName) {
      setSearchQuery("");
      setShowCustomInput(false);
      setCustomText("");

      // Check recipe.alternativeOverrides first, then storage
      const direct = (recipe as any)?.alternativeOverrides?.[ingredientName];
      if (direct === "NONE" || direct === "missing") {
        setExistingOverride({ mode: "missing" });
      } else if (direct) {
        setExistingOverride({ mode: "pantry", pantryItemName: direct });
      } else {
        const active = getAlternativeOverride(targetRecipeId, ingredientName);
        setExistingOverride(active);
        if (active?.mode === "custom" && active.customName) {
          setCustomText(active.customName);
          setShowCustomInput(true);
        }
      }
    }
  }, [isOpen, targetRecipeId, ingredientName, recipe]);

  const ingKind = useMemo(() => {
    return getIngredientKind(ingredientName, undefined, undefined, amount);
  }, [ingredientName, amount]);

  const ambiguousTag = useMemo(() => {
    return getAmbiguousIngredientTag(ingredientName, undefined, undefined);
  }, [ingredientName]);

  // Filter and sort pantry items based on search and relevance
  const { recommendedItems, otherItems } = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = pantryItems.filter((item) => {
      if (!item || !item.name) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    });

    const recommended: typeof pantryItems = [];
    const others: typeof pantryItems = [];

    for (const item of filtered) {
      const pKind = getIngredientKind(item.name, item.unit, item.category, item.amount);
      const isSameKind = pKind !== "other" && pKind === ingKind;
      const isAmbiguousMatch =
        getAmbiguousIngredientTag(item.name, item.unit, item.category) === ambiguousTag;

      if (isSameKind || isAmbiguousMatch) {
        recommended.push(item);
      } else {
        others.push(item);
      }
    }

    return { recommendedItems: recommended, otherItems: others };
  }, [pantryItems, searchQuery, ingKind, ambiguousTag]);

  if (!isOpen) return null;

  const persistToRecipe = (assignedValue: string | null) => {
    if (recipe) {
      if (!recipe.alternativeOverrides) {
        recipe.alternativeOverrides = {};
      }
      if (assignedValue === null) {
        delete recipe.alternativeOverrides[ingredientName];
      } else {
        recipe.alternativeOverrides[ingredientName] = assignedValue;
      }
      // Persist in custom recipes if stored
      try {
        const storedRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_RECIPES);
        if (storedRaw) {
          const list: CatalogRecipe[] = JSON.parse(storedRaw);
          const idx = list.findIndex((r) => r.id === recipe.id);
          if (idx >= 0) {
            list[idx].alternativeOverrides = { ...recipe.alternativeOverrides };
            localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(list));
          }
        }
      } catch {}
    }
  };

  const handleSelectPantryItem = (item: { name: string }) => {
    setAlternativeOverride(targetRecipeId, ingredientName, {
      mode: "pantry",
      pantryItemName: item.name,
    });
    persistToRecipe(item.name);
    onChanged?.();
    onClose();
  };

  const handleSetMissing = () => {
    setAlternativeOverride(targetRecipeId, ingredientName, { mode: "missing" });
    persistToRecipe("NONE");
    onChanged?.();
    onClose();
  };

  const handleReset = () => {
    setAlternativeOverride(targetRecipeId, ingredientName, null);
    persistToRecipe(null);
    onChanged?.();
    onClose();
  };

  const handleSaveCustom = () => {
    if (!customText.trim()) return;
    setAlternativeOverride(targetRecipeId, ingredientName, {
      mode: "custom",
      customName: customText.trim(),
    });
    persistToRecipe(customText.trim());
    onChanged?.();
    onClose();
  };

  const cleanCurrentMatch = cleanAlternativeText(currentMatchedPantryName || "");
  const activeSelectedName =
    existingOverride?.mode === "pantry" ? existingOverride.pantryItemName : cleanCurrentMatch;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          animation: "modalFadeIn 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <path d="M16 3h5v5" />
                <path d="M4 20L21 3" />
                <path d="M21 16v5h-5" />
                <path d="M15 15l6 6" />
                <path d="M4 4l5 5" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 750, color: "#ffffff" }}>
                Alternative aus Vorrat wählen
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#d1fae5" }}>
                {targetRecipeTitle ? `Rezept: «${targetRecipeTitle}»` : "Vorrats-Zuordnung ändern"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "none",
              color: "#ffffff",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto", flex: 1 }}>
          {/* Active Ingredient Overview Box */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Rezept-Zutat
              </span>
              {amount && (
                <span style={{ fontSize: "12px", fontWeight: 750, color: "#0f172a" }}>
                  {amount}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>
                {ingredientName}
              </span>
              {ambiguousTag && (
                <span
                  style={{
                    fontSize: "9.5px",
                    fontWeight: 750,
                    padding: "1px 6px",
                    borderRadius: "4px",
                    background: ambiguousTag === "Gemüse" ? "#ecfdf5" : "#fef3c7",
                    color: ambiguousTag === "Gemüse" ? "#065f46" : "#92400e",
                    border: `1px solid ${ambiguousTag === "Gemüse" ? "#a7f3d0" : "#fde68a"}`,
                  }}
                >
                  {ambiguousTag}
                </span>
              )}
            </div>

            {/* Current Matching Pill */}
            {activeSelectedName && existingOverride?.mode !== "missing" && (
              <div
                style={{
                  marginTop: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  color: "#065f46",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  width: "fit-content",
                }}
              >
                <span>⇄ Aktuell zugeordnet:</span>
                <strong style={{ color: "#047857" }}>{activeSelectedName}</strong>
              </div>
            )}

            {existingOverride?.mode === "missing" && (
              <div
                style={{
                  marginTop: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  color: "#9f1239",
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  width: "fit-content",
                }}
              >
                <span>✕ Manuell als fehlend markiert (Original verlangt)</span>
              </div>
            )}
          </div>

          {/* Top Action Buttons: Mark as Missing / Force Original & Reset */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSetMissing}
              style={{
                flex: 1,
                minWidth: "180px",
                padding: "9px 12px",
                borderRadius: "10px",
                background: existingOverride?.mode === "missing" ? "#be123c" : "#fff1f2",
                color: existingOverride?.mode === "missing" ? "#ffffff" : "#be123c",
                border: "1px solid #fda4af",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 150ms ease",
              }}
              title="Keine Alternative nutzen, Originalzutat auf Einkaufsliste setzen"
            >
              <span>✕ Keine Alternative nutzen</span>
              <span style={{ fontSize: "10px", opacity: 0.85 }}>(Original verlangen)</span>
            </button>

            {existingOverride && (
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  fontSize: "11.5px",
                  fontWeight: 650,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Manuelle Zuweisung löschen und automatische Erkennung nutzen"
              >
                ↺ Auf Standard zurücksetzen
              </button>
            )}
          </div>

          {/* Search Field */}
          <div>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="🔍 Vorratsartikel durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  padding: "0 12px 0 34px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "12.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#ffffff",
                }}
              />
              <span style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8", fontSize: "14px" }}>
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "9px",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Pantry Items List (Recommended First) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recommendedItems.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 750, color: "#065f46", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <span>✨ Empfohlene Alternativen aus deinem Vorrat:</span>
                </div>
                <div style={{ display: "grid", gap: "6px" }}>
                  {recommendedItems.map((item, idx) => {
                    const isSelected =
                      activeSelectedName?.toLowerCase().trim() === item.name.toLowerCase().trim();
                    const itemAmbTag = getAmbiguousIngredientTag(item.name, item.unit, item.category);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPantryItem(item)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "9px 12px",
                          borderRadius: "10px",
                          background: isSelected ? "#ecfdf5" : "#ffffff",
                          border: isSelected ? "1.5px solid #10b981" : "1px solid #e2e8f0",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 120ms ease",
                          boxShadow: isSelected ? "0 2px 6px rgba(16, 185, 129, 0.15)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                          <ProductMark
                            tone={getFoodTone(item.name, item.category)}
                            name={item.name}
                            compact
                          />
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "12.5px", fontWeight: isSelected ? 750 : 600, color: isSelected ? "#065f46" : "#0f172a" }}>
                                {item.name}
                              </span>
                              {itemAmbTag && (
                                <span
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    padding: "1px 4px",
                                    borderRadius: "4px",
                                    background: itemAmbTag === "Gemüse" ? "#ecfdf5" : "#fef3c7",
                                    color: itemAmbTag === "Gemüse" ? "#065f46" : "#92400e",
                                    border: `1px solid ${itemAmbTag === "Gemüse" ? "#a7f3d0" : "#fde68a"}`,
                                  }}
                                >
                                  {itemAmbTag}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                              {item.category || "Vorrat"} · {item.amount !== undefined ? `${item.amount} ${item.unit || ""}` : "Vorhanden"}
                            </span>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, marginLeft: "8px" }}>
                          {isSelected ? (
                            <span style={{ fontSize: "11px", fontWeight: 750, color: "#059669" }}>
                              ✓ Aktiv
                            </span>
                          ) : (
                            <span style={{ fontSize: "11px", fontWeight: 650, color: "#64748b", background: "#f1f5f9", padding: "3px 8px", borderRadius: "6px" }}>
                              Wählen
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Other Pantry Items */}
            {otherItems.length > 0 && (
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                  {recommendedItems.length > 0
                    ? `Weitere Vorratsartikel (${otherItems.length}):`
                    : `Alle Vorratsartikel (${otherItems.length}):`}
                </div>
                <div style={{ display: "grid", gap: "6px" }}>
                  {otherItems.map((item, idx) => {
                    const isSelected =
                      activeSelectedName?.toLowerCase().trim() === item.name.toLowerCase().trim();
                    const itemAmbTag = getAmbiguousIngredientTag(item.name, item.unit, item.category);

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPantryItem(item)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          background: isSelected ? "#ecfdf5" : "#ffffff",
                          border: isSelected ? "1.5px solid #10b981" : "1px solid #e2e8f0",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 120ms ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                          <ProductMark
                            tone={getFoodTone(item.name, item.category)}
                            name={item.name}
                            compact
                          />
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "12px", fontWeight: isSelected ? 750 : 550, color: isSelected ? "#065f46" : "#1e293b" }}>
                                {item.name}
                              </span>
                              {itemAmbTag && (
                                <span
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: 700,
                                    padding: "1px 4px",
                                    borderRadius: "4px",
                                    background: itemAmbTag === "Gemüse" ? "#ecfdf5" : "#fef3c7",
                                    color: itemAmbTag === "Gemüse" ? "#065f46" : "#92400e",
                                    border: `1px solid ${itemAmbTag === "Gemüse" ? "#a7f3d0" : "#fde68a"}`,
                                  }}
                                >
                                  {itemAmbTag}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "10px", color: "#64748b" }}>
                              {item.category || "Vorrat"} · {item.amount !== undefined ? `${item.amount} ${item.unit || ""}` : "Vorhanden"}
                            </span>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, marginLeft: "8px" }}>
                          {isSelected ? (
                            <span style={{ fontSize: "11px", fontWeight: 750, color: "#059669" }}>
                              ✓ Aktiv
                            </span>
                          ) : (
                            <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                              Wählen
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {recommendedItems.length === 0 && otherItems.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "12px" }}>
                Keine passenden Vorratsartikel für «{searchQuery}» gefunden.
              </div>
            )}
          </div>

          {/* Custom Text Accordion */}
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
            <button
              type="button"
              onClick={() => setShowCustomInput(!showCustomInput)}
              style={{
                background: "none",
                border: "none",
                color: "#059669",
                fontSize: "11.5px",
                fontWeight: 650,
                cursor: "pointer",
                padding: "4px 0",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>{showCustomInput ? "− Manuelle Notiz schließen" : "+ Eigene Notiz / Freitext-Alternative eingeben"}</span>
            </button>

            {showCustomInput && (
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <input
                  type="text"
                  placeholder="z.B. Selbstgemachte Mandelcreme"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  disabled={!customText.trim()}
                  style={{
                    background: "#059669",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "7px 14px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: customText.trim() ? "pointer" : "not-allowed",
                    opacity: customText.trim() ? 1 : 0.6,
                    whiteSpace: "nowrap",
                  }}
                >
                  Speichern
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
