import React, { useState, useEffect } from "react";
import {
  setAlternativeOverride,
  getAlternativeOverride,
  type AlternativeOverride,
  cleanAlternativeText,
} from "../utils/pantryMatching";

export interface AlternativeManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId?: string;
  recipeTitle?: string;
  ingredientName: string;
  amount?: string;
  currentMatchedPantryName?: string;
  pantryItems: Array<{ name: string; amount?: number; unit?: string }>;
  onChanged?: () => void;
}

export const AlternativeManageModal: React.FC<AlternativeManageModalProps> = ({
  isOpen,
  onClose,
  recipeId,
  recipeTitle,
  ingredientName,
  amount,
  currentMatchedPantryName,
  pantryItems,
  onChanged,
}) => {
  const [selectedPantryName, setSelectedPantryName] = useState<string>("");
  const [customText, setCustomText] = useState<string>("");
  const [existingOverride, setExistingOverride] = useState<AlternativeOverride | null>(null);

  useEffect(() => {
    if (isOpen && ingredientName) {
      const active = getAlternativeOverride(recipeId, ingredientName);
      setExistingOverride(active);
      if (active?.mode === "pantry" && active.pantryItemName) {
        setSelectedPantryName(active.pantryItemName);
      } else if (currentMatchedPantryName) {
        setSelectedPantryName(currentMatchedPantryName);
      } else if (pantryItems.length > 0) {
        setSelectedPantryName(pantryItems[0].name);
      }

      if (active?.mode === "custom" && active.customName) {
        setCustomText(active.customName);
      } else {
        setCustomText("");
      }
    }
  }, [isOpen, recipeId, ingredientName, currentMatchedPantryName, pantryItems]);

  if (!isOpen) return null;

  const handleSetMissing = () => {
    setAlternativeOverride(recipeId, ingredientName, { mode: "missing" });
    onChanged?.();
    onClose();
  };

  const handleUsePantryItem = () => {
    if (!selectedPantryName) return;
    setAlternativeOverride(recipeId, ingredientName, {
      mode: "pantry",
      pantryItemName: selectedPantryName,
    });
    onChanged?.();
    onClose();
  };

  const handleUseCustom = () => {
    if (!customText.trim()) return;
    setAlternativeOverride(recipeId, ingredientName, {
      mode: "custom",
      customName: customText.trim(),
    });
    onChanged?.();
    onClose();
  };

  const handleReset = () => {
    setAlternativeOverride(recipeId, ingredientName, null);
    onChanged?.();
    onClose();
  };

  const cleanCurrentMatch = cleanAlternativeText(currentMatchedPantryName || "");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.65)",
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
          borderRadius: "18px",
          width: "100%",
          maxWidth: "460px",
          boxShadow: "0 20px 45px rgba(0,0,0,0.22)",
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
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                <path d="M16 3h5v5" />
                <path d="M4 20L21 3" />
                <path d="M21 16v5h-5" />
                <path d="M15 15l6 6" />
                <path d="M4 4l5 5" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#ffffff" }}>
                Alternative anpassen
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#d1fae5" }}>
                {recipeTitle ? `Gericht: ${recipeTitle}` : "Vorrats-Erkennung verwalten"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              color: "#ffffff",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Current Ingredient Overview Box */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Rezept-Original
              </span>
              {amount && (
                <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a" }}>
                  {amount}
                </span>
              )}
            </div>
            <div style={{ fontSize: "14.5px", fontWeight: 700, color: "#0f172a" }}>
              {ingredientName}
            </div>
            {cleanCurrentMatch && (
              <div
                style={{
                  marginTop: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "#047857",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  width: "fit-content",
                }}
              >
                <span>⇄ Aktuell zugeordnet:</span>
                <strong>{cleanCurrentMatch}</strong>
              </div>
            )}
            {existingOverride && (
              <div
                style={{
                  marginTop: "2px",
                  fontSize: "11px",
                  color: "#b45309",
                  background: "#fffbeb",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #fde68a",
                }}
              >
                Status: {existingOverride.mode === "missing" ? "Manuell als fehlend markiert" : "Benutzerdefinierte Zuweisung aktiv"}
              </div>
            )}
          </div>

          {/* Option 1: Mark as missing */}
          <div
            style={{
              border: "1px solid #fed7aa",
              background: "#fffaf5",
              borderRadius: "12px",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#9a3412" }}>
                Keine Alternative – Zutat fehlt
              </div>
              <div style={{ fontSize: "11.5px", color: "#7c2d12", marginTop: "2px" }}>
                Nicht ersetzen. Auf Einkaufsliste setzen.
              </div>
            </div>
            <button
              type="button"
              onClick={handleSetMissing}
              style={{
                background: "#ea580c",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 650,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Als fehlend markieren
            </button>
          </div>

          {/* Option 2: Choose different pantry item */}
          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
              Anderen Artikel aus deinem Vorrat wählen
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <select
                value={selectedPantryName}
                onChange={(e) => setSelectedPantryName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  background: "#ffffff",
                  color: "#0f172a",
                }}
              >
                {pantryItems.map((item, idx) => (
                  <option key={idx} value={item.name}>
                    {item.name} {item.amount ? `(${item.amount} ${item.unit || ""})` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleUsePantryItem}
                disabled={!selectedPantryName}
                style={{
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: 650,
                  cursor: selectedPantryName ? "pointer" : "not-allowed",
                  opacity: selectedPantryName ? 1 : 0.6,
                  whiteSpace: "nowrap",
                }}
              >
                Zuweisen
              </button>
            </div>
          </div>

          {/* Option 3: Custom substitution text */}
          <div
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
              Eigenen Ersatz / Notiz angeben
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="z.B. Milch mit Spritzer Zitrone"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleUseCustom}
                disabled={!customText.trim()}
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: 650,
                  cursor: customText.trim() ? "pointer" : "not-allowed",
                  opacity: customText.trim() ? 1 : 0.6,
                  whiteSpace: "nowrap",
                }}
              >
                Speichern
              </button>
            </div>
          </div>

          {/* Reset button if override was set */}
          {existingOverride && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                background: "transparent",
                border: "1px dashed #94a3b8",
                color: "#64748b",
                borderRadius: "8px",
                padding: "8px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Standard-Erkennung wiederherstellen
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
