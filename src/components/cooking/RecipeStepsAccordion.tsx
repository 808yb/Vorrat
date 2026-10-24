import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { CatalogRecipe } from "../../data/recipeCatalog";
import { getSafeSteps } from "../../utils/recipeHelpers";

export interface RecipeStepsAccordionProps {
  recipe: CatalogRecipe;
  servings: number;
  isOpen: boolean;
  pantry?: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>;
  onToggle: () => void;
  onOpenModal: () => void;
  onCook?: (recipeTitle: string, servings: number) => void;
  onBookmark?: (recipeId: string, recipeTitle: string) => void;
  isBookmarked?: boolean;
  onAddMissingToGroceries?: (items: Array<{ name: string; amount?: string }>) => void;
}

export function RecipeStepsAccordion({
  recipe,
  servings,
  isOpen,
  pantry: _pantry,
  onToggle,
  onOpenModal,
  onCook,
  onBookmark,
  isBookmarked,
  onAddMissingToGroceries: _onAddMissingToGroceries,
}: RecipeStepsAccordionProps) {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const steps = getSafeSteps(recipe);

  const toggleStep = (stepNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;

  return (
    <div style={{ marginTop: "10px", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
      {/* Accordion Trigger Button */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          background: isOpen ? "#ecfdf5" : "#f8fafc",
          border: isOpen ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
          borderRadius: "10px",
          cursor: "pointer",
          transition: "all 150ms ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 750,
              color: isOpen ? "#047857" : "#334155",
            }}
          >
            Zubereitung & Anleitung ({steps.length} Schritte)
          </span>
          {completedCount > 0 && (
            <span
              style={{
                fontSize: "9px",
                background: "#059669",
                color: "white",
                padding: "1px 6px",
                borderRadius: "99px",
                fontWeight: 700,
              }}
            >
              {completedCount}/{steps.length} ✓
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "9.5px", color: isOpen ? "#047857" : "#94a3b8", fontWeight: 650 }}>
            {isOpen ? "Einklappen" : "Schritte anzeigen"}
          </span>
          <span
            style={{
              display: "inline-block",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms ease",
              color: isOpen ? "#047857" : "#64748b",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* Expandable Step-by-Step Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "10px" }}>
              {steps.map((step) => {
                const isChecked = !!completedSteps[step.stepNumber];
                return (
                  <div
                    key={step.stepNumber}
                    onClick={(e) => toggleStep(step.stepNumber, e)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "9px",
                      padding: "8px 10px",
                      borderRadius: "10px",
                      background: isChecked ? "#f0fdf4" : "#ffffff",
                      border: isChecked ? "1px solid #86efac" : "1px solid #f1f5f9",
                      cursor: "pointer",
                      transition: "all 120ms ease",
                    }}
                  >
                    <span
                      style={{
                        width: "22px",
                        height: "22px",
                        flexShrink: 0,
                        borderRadius: "50%",
                        background: isChecked ? "#059669" : "#f8fafc",
                        border: isChecked ? "1.5px solid #059669" : "1.5px solid #cbd5e1",
                        color: isChecked ? "#ffffff" : "#334155",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10.5px",
                        fontWeight: 800,
                        lineHeight: 1,
                        marginTop: "1px",
                        boxSizing: "border-box",
                      }}
                    >
                      {isChecked ? "✓" : step.stepNumber}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                        <strong
                          style={{
                            fontSize: "11.5px",
                            color: isChecked ? "#15803d" : "#0f172a",
                            textDecoration: isChecked ? "line-through" : "none",
                          }}
                        >
                          {step.title}
                        </strong>
                        {step.duration && (
                          <span style={{ fontSize: "9px", color: "#64748b", background: "#f8fafc", padding: "1px 5px", borderRadius: "4px" }}>
                            {step.duration}
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "11px",
                          lineHeight: 1.45,
                          color: isChecked ? "#64748b" : "#334155",
                        }}
                      >
                        {step.instruction}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Chef-Tipp banner */}
              <div
                style={{
                  padding: "8px 10px",
                  background: "#fffbeb",
                  borderRadius: "10px",
                  border: "1px solid #fef3c7",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "7px",
                  fontSize: "10px",
                  color: "#78350f",
                  lineHeight: 1.4,
                }}
              >
                <div>
                  <strong style={{ color: "#b45309", display: "block", fontSize: "9px", textTransform: "uppercase" }}>
                    Profi-Tipp
                  </strong>
                  {recipe.chefTip}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={onOpenModal}
                  style={{
                    flex: 1,
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "9px",
                    color: "#047857",
                    fontSize: "10.5px",
                    fontWeight: 750,
                    cursor: "pointer",
                  }}
                >
                  <span>Koch-Modus & Timer öffnen</span>
                </button>
                {onBookmark ? (
                  <button
                    type="button"
                    onClick={() => onBookmark(recipe.id, recipe.title)}
                    style={{
                      padding: "0 14px",
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      background: isBookmarked ? "#047857" : "#059669",
                      border: 0,
                      borderRadius: "9px",
                      color: "#ffffff",
                      fontSize: "10.5px",
                      fontWeight: 750,
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(5, 150, 105, 0.2)",
                    }}
                    title="Mahlzeit merken"
                  >
                    <span>{isBookmarked ? "Gemerkt" : "Merken"}</span>
                  </button>
                ) : onCook ? (
                  <button
                    type="button"
                    onClick={() => onCook(recipe.title, servings)}
                    style={{
                      padding: "0 12px",
                      height: "36px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      background: "#059669",
                      border: 0,
                      borderRadius: "9px",
                      color: "#ffffff",
                      fontSize: "10.5px",
                      fontWeight: 750,
                      cursor: "pointer",
                    }}
                  >
                    <span>Kochen</span>
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
