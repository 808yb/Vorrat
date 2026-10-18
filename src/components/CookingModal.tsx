import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { CatalogRecipe, RecipeStep } from "../data/recipeCatalog";
import { getRecipePantryBreakdown } from "../utils/pantryMatching";
import { getSafeSteps, getSafeIngredientsList } from "../utils/recipeHelpers";

interface CookingModalProps {
  recipe: CatalogRecipe | null;
  isOpen: boolean;
  onClose: () => void;
  onCook: (recipeTitle: string, servings: number) => void;
  initialServings?: number;
  pantry?: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string, title: string) => void;
  onAddMissingToGroceries?: (items: Array<{ name: string; amount?: string }>) => void;
}

export function CookingModal({
  recipe,
  isOpen,
  onClose,
  onCook,
  initialServings = 3,
  pantry,
  isFavorite = false,
  onToggleFavorite,
  onAddMissingToGroceries,
}: CookingModalProps) {
  const [servings, setServings] = useState(initialServings);
  const [mode, setMode] = useState<"focus" | "all">("all");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [showFocusIngredients, setShowFocusIngredients] = useState(true);

  // Kitchen Timer state
  const [timerSeconds, setTimerSeconds] = useState(180); // 3 mins default
  const [initialTimerDuration, setInitialTimerDuration] = useState(180);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDone, setTimerDone] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);

  // Sync servings if initial changes
  useEffect(() => {
    if (isOpen && recipe) {
      setServings(initialServings);
      setCurrentStepIndex(0);
      setCheckedSteps({});
      setCheckedIngredients({});
      setTimerDone(false);
      setIsTimerRunning(false);
      setTimerSeconds(180);
      setInitialTimerDuration(180);
    }
  }, [isOpen, recipe, initialServings]);

  // Timer countdown
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            setTimerDone(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  if (!isOpen || !recipe) return null;

  const toggleStep = (stepNum: number) => {
    setCheckedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const toggleIngredient = (name: string) => {
    setCheckedIngredients((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const startTimer = (secs: number) => {
    setInitialTimerDuration(secs);
    setTimerSeconds(secs);
    setTimerDone(false);
    setIsTimerRunning(true);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFinishCooking = () => {
    onCook(recipe.title, servings);
    onClose();
  };

  const steps = getSafeSteps(recipe);
  const safeIngredients = getSafeIngredientsList(recipe, servings);
  const currentStep = steps[currentStepIndex] || steps[0];
  const completedCount = Object.values(checkedSteps).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / Math.max(1, steps.length)) * 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content cooking-modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "540px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "24px",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #064e3b, #047857)",
            color: "white",
            borderBottom: "0",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
              <span
                style={{
                  fontSize: "9px",
                  background: "rgba(255,255,255,0.2)",
                  color: "#ffffff",
                  padding: "2px 8px",
                  borderRadius: "99px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Koch-Modus
              </span>
              <span style={{ fontSize: "10px", color: "#a7f3d0" }}>
                {recipe.time} · {recipe.difficulty}
              </span>
            </div>
            <h2 style={{ color: "#ffffff", fontSize: "17px", margin: 0, fontWeight: 750 }}>
              {recipe.title}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#d1fae5" }}>
              {recipe.subtitle}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(recipe.id, recipe.title)}
                style={{
                  color: isFavorite ? "#fbbf24" : "white",
                  background: isFavorite ? "rgba(251, 191, 36, 0.22)" : "rgba(255,255,255,0.15)",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  border: isFavorite ? "1px solid #fbbf24" : 0,
                  transition: "all 150ms ease",
                }}
                title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
              >
                <svg width="15" height="15" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="clear-button"
              onClick={onClose}
              style={{
                color: "white",
                background: "rgba(255,255,255,0.15)",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                border: 0,
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div
          className="modal-body"
          style={{
            padding: "16px 18px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            background: "#f8fafc",
          }}
        >
          {/* Servings Adjuster */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <span style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                Portionen anpassen
              </span>
              <strong style={{ fontSize: "12px", color: "#0f172a" }}>
                Zutaten für {servings} {servings === 1 ? "Person" : "Personen"}
              </strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setServings(num)}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "8px",
                    border: servings === num ? "2px solid #047857" : "1px solid #cbd5e1",
                    background: servings === num ? "#ecfdf5" : "#ffffff",
                    color: servings === num ? "#047857" : "#475569",
                    fontWeight: 750,
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Integrated Kitchen Timer */}
          <div
            style={{
              padding: "12px 14px",
              background: timerDone ? "#fef2f2" : "#ffffff",
              borderRadius: "16px",
              border: timerDone ? "1.5px solid #ef4444" : "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(15,23,42,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#334155" }}>
                  Küchen-Timer
                </span>
                {timerDone && (
                  <span
                    style={{
                      fontSize: "9px",
                      background: "#ef4444",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      fontWeight: 750,
                      animation: "pulse 1s infinite",
                    }}
                  >
                    FERTIG!
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                {[60, 180, 300, 600].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => startTimer(s)}
                    style={{
                      padding: "3px 7px",
                      fontSize: "9px",
                      borderRadius: "6px",
                      background: "#f1f5f9",
                      border: "1px solid #e2e8f0",
                      color: "#475569",
                      fontWeight: 650,
                      cursor: "pointer",
                    }}
                  >
                    {s / 60}m
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "24px",
                  fontWeight: 800,
                  color: timerDone ? "#dc2626" : isTimerRunning ? "#047857" : "#0f172a",
                  letterSpacing: "-0.04em",
                }}
              >
                {formatTimer(timerSeconds)}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "9px",
                    background: isTimerRunning ? "#fee2e2" : "#059669",
                    color: isTimerRunning ? "#dc2626" : "#ffffff",
                    border: 0,
                    fontSize: "11px",
                    fontWeight: 750,
                    cursor: "pointer",
                  }}
                >
                  {isTimerRunning ? "Pause" : timerSeconds === 0 ? "Neustart" : "Start"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsTimerRunning(false);
                    setTimerSeconds(initialTimerDuration);
                    setTimerDone(false);
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "9px",
                    background: "#f1f5f9",
                    color: "#64748b",
                    border: "1px solid #e2e8f0",
                    fontSize: "11px",
                    fontWeight: 650,
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Ingredients Checklist */}
          {/* Ingredients Breakdown Checklist */}
          {(() => {
            const breakdown = getRecipePantryBreakdown(recipe, pantry || [], servings);
            return (
              <div
                style={{
                  padding: "14px",
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: 750, color: "#1e293b" }}>
                    Zutaten-Check ({servings} {servings === 1 ? "Portion" : "Portionen"})
                  </span>
                  <span style={{ fontSize: "9.5px", color: "#64748b" }}>
                    {breakdown.missing.length > 0 ? `${breakdown.missing.length} fehlen noch` : "Alles im Vorrat ✓"}
                  </span>
                </div>

                {/* Missing Ingredients Section */}
                {breakdown.missing.length > 0 && (
                  <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "12px", padding: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 750, color: "#be123c", display: "flex", alignItems: "center", gap: "5px" }}>
                        <span>Fehlt im Vorrat / Einkaufsliste ({breakdown.missing.length})</span>
                      </span>
                      {onAddMissingToGroceries && (
                        <button
                          type="button"
                          onClick={() => onAddMissingToGroceries(breakdown.missing)}
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: "#ffffff",
                            border: "1px solid #fda4af",
                            color: "#e11d48",
                            cursor: "pointer",
                          }}
                        >
                          + Auf Einkaufsliste
                        </button>
                      )}
                    </div>
                    <div style={{ display: "grid", gap: "5px" }}>
                      {breakdown.missing.map((ing) => {
                        const isChecked = !!checkedIngredients[ing.name];
                        return (
                          <button
                            key={ing.name}
                            type="button"
                            onClick={() => toggleIngredient(ing.name)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              borderRadius: "7px",
                              background: isChecked ? "#f0fdf4" : "#ffffff",
                              border: isChecked ? "1px solid #86efac" : "1px solid #fecdd3",
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: "10.5px",
                            }}
                          >
                            <span style={{ color: isChecked ? "#15803d" : "#9f1239", textDecoration: isChecked ? "line-through" : "none", fontWeight: 600 }}>
                              {isChecked ? "✓ " : "• "}{ing.name}
                            </span>
                            <strong style={{ fontSize: "10px", color: "#e11d48" }}>{ing.amount}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* In-Stock Ingredients Section */}
                {breakdown.inStock.length > 0 && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "10px" }}>
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 750, color: "#065f46", display: "flex", alignItems: "center", gap: "5px" }}>
                        <span>Im Vorrat vorhanden ({breakdown.inStock.length})</span>
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: "5px" }}>
                      {breakdown.inStock.map((ing) => {
                        const isChecked = !!checkedIngredients[ing.name];
                        return (
                          <button
                            key={ing.name}
                            type="button"
                            onClick={() => toggleIngredient(ing.name)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 8px",
                              borderRadius: "7px",
                              background: isChecked ? "#f0fdf4" : "#ffffff",
                              border: isChecked ? "1px solid #86efac" : "1px solid #e2e8f0",
                              cursor: "pointer",
                              textAlign: "left",
                              fontSize: "10.5px",
                            }}
                          >
                            <span style={{ color: isChecked ? "#15803d" : "#334155", textDecoration: isChecked ? "line-through" : "none", fontWeight: 500 }}>
                              {isChecked ? "✓ " : "✓ "}{ing.name}
                              {ing.matchedByAlternative && (
                                <span style={{ opacity: 0.85, marginLeft: "4px", fontSize: "9px", color: "#047857" }}>
                                  (Vorrat: {ing.matchedByAlternative})
                                </span>
                              )}
                            </span>
                            <strong style={{ fontSize: "10px", color: "#059669" }}>{ing.amount}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* View Mode Toggle: All Steps vs Focus Mode */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "12px", fontWeight: 750, color: "#0f172a" }}>
                Schritt-für-Schritt Anleitung
              </span>
              <span style={{ fontSize: "10px", color: "#059669", marginLeft: "6px", fontWeight: 650 }}>
                ({completedCount} von {steps.length} erledigt)
              </span>
            </div>
            <div
              style={{
                display: "flex",
                background: "#e2e8f0",
                padding: "2px",
                borderRadius: "8px",
                gap: "2px",
              }}
            >
              <button
                type="button"
                onClick={() => setMode("all")}
                style={{
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: 0,
                  background: mode === "all" ? "#ffffff" : "transparent",
                  color: mode === "all" ? "#0f172a" : "#64748b",
                  cursor: "pointer",
                }}
              >
                Alle Schritte
              </button>
              <button
                type="button"
                onClick={() => setMode("focus")}
                style={{
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontWeight: 700,
                  borderRadius: "6px",
                  border: 0,
                  background: mode === "focus" ? "#ffffff" : "transparent",
                  color: mode === "focus" ? "#0f172a" : "#64748b",
                  cursor: "pointer",
                }}
              >
                Fokus-Modus
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden" }}>
            <motion.div
              style={{ height: "100%", background: "#059669", borderRadius: "99px" }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.25 }}
            />
          </div>

          {/* Mode 1: ALL STEPS VIEW */}
          {mode === "all" && (
            <div style={{ display: "grid", gap: "10px" }}>
              {steps.map((step) => {
                const isChecked = !!checkedSteps[step.stepNumber];
                return (
                  <div
                    key={step.stepNumber}
                    onClick={() => toggleStep(step.stepNumber)}
                    style={{
                      padding: "12px 14px",
                      background: isChecked ? "#f0fdf4" : "#ffffff",
                      borderRadius: "14px",
                      border: isChecked ? "1px solid #86efac" : "1px solid #e2e8f0",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
                      transition: "all 140ms ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            background: isChecked ? "#059669" : "#f1f5f9",
                            color: isChecked ? "#ffffff" : "#475569",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "11px",
                            fontWeight: 800,
                          }}
                        >
                          {isChecked ? "✓" : step.stepNumber}
                        </span>
                        <strong
                          style={{
                            fontSize: "12.5px",
                            color: isChecked ? "#15803d" : "#0f172a",
                            textDecoration: isChecked ? "line-through" : "none",
                          }}
                        >
                          {step.title}
                        </strong>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {step.duration && (
                          <span
                            style={{
                              fontSize: "9.5px",
                              background: "#f1f5f9",
                              color: "#64748b",
                              padding: "2px 7px",
                              borderRadius: "6px",
                              fontWeight: 650,
                            }}
                          >
                            {step.duration}
                          </span>
                        )}
                        {step.tag && (
                          <span
                            style={{
                              fontSize: "9px",
                              background: "#ecfdf5",
                              color: "#047857",
                              padding: "2px 6px",
                              borderRadius: "6px",
                              fontWeight: 700,
                            }}
                          >
                            {step.tag}
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "11.5px",
                        lineHeight: 1.5,
                        color: isChecked ? "#4b5563" : "#334155",
                      }}
                    >
                      {step.instruction}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mode 2: FOCUS STEP BY STEP VIEW */}
          {mode === "focus" && (
            <div
              style={{
                padding: "16px",
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 750,
                    textTransform: "uppercase",
                    color: "#059669",
                    background: "#ecfdf5",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  Schritt {currentStepIndex + 1} von {steps.length}
                </span>
                {currentStep.duration && (
                  <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 650 }}>
                    Richtzeit: {currentStep.duration}
                  </span>
                )}
              </div>

              <div>
                <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#0f172a", fontWeight: 750 }}>
                  {currentStep.title}
                </h3>
                <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6, color: "#334155" }}>
                  {currentStep.instruction}
                </p>
              </div>

              {/* Zutaten-Checkliste direkt im Koch-Modus */}
              <div style={{ background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setShowFocusIngredients(!showFocusIngredients)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 750,
                    color: "#1e293b",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "#059669" }}>🛒</span>
                    <span>Zutaten für {servings} {servings === 1 ? "Person" : "Personen"} ({safeIngredients.length})</span>
                  </span>
                  <span style={{ fontSize: "10px", color: "#059669", fontWeight: 700 }}>
                    {showFocusIngredients ? "Einklappen ▲" : "Anzeigen ▼"}
                  </span>
                </button>
                {showFocusIngredients && (
                  <div style={{ padding: "0 10px 10px", display: "grid", gap: "5px" }}>
                    {safeIngredients.map((ing, idx) => {
                      const isChecked = !!checkedIngredients[ing.name];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleIngredient(ing.name)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 9px",
                            background: isChecked ? "#f0fdf4" : "#ffffff",
                            borderRadius: "8px",
                            border: isChecked ? "1px solid #86efac" : "1px solid #e2e8f0",
                            cursor: "pointer",
                            fontSize: "11px",
                            transition: "all 120ms ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ color: isChecked ? "#059669" : "#94a3b8", fontWeight: 800, fontSize: "11.5px" }}>
                              {isChecked ? "✓" : "○"}
                            </span>
                            <span style={{ color: isChecked ? "#15803d" : "#1e293b", textDecoration: isChecked ? "line-through" : "none", fontWeight: 600 }}>
                              {ing.name}
                            </span>
                            {ing.optional && (
                              <span style={{ fontSize: "8.5px", background: "#e2e8f0", padding: "1px 4px", borderRadius: "4px", color: "#64748b" }}>
                                opt.
                              </span>
                            )}
                          </div>
                          <strong style={{ color: isChecked ? "#15803d" : "#0f172a", fontSize: "11px", fontWeight: 750 }}>
                            {ing.amount}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step completion button in focus mode */}
              <button
                type="button"
                onClick={() => toggleStep(currentStep.stepNumber)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  background: checkedSteps[currentStep.stepNumber] ? "#f0fdf4" : "#f8fafc",
                  border: checkedSteps[currentStep.stepNumber] ? "1px solid #86efac" : "1px solid #cbd5e1",
                  color: checkedSteps[currentStep.stepNumber] ? "#15803d" : "#475569",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <span>{checkedSteps[currentStep.stepNumber] ? "✓ Schritt erledigt!" : "Als erledigt abhaken"}</span>
              </button>

              {/* Step Navigation buttons */}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  disabled={currentStepIndex === 0}
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: "10px",
                    background: "#f1f5f9",
                    color: currentStepIndex === 0 ? "#cbd5e1" : "#334155",
                    border: 0,
                    fontWeight: 700,
                    fontSize: "11px",
                    cursor: currentStepIndex === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  ← Vorheriger
                </button>
                <button
                  type="button"
                  disabled={currentStepIndex >= steps.length - 1}
                  onClick={() => setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                  style={{
                    flex: 1,
                    padding: "9px",
                    borderRadius: "10px",
                    background: currentStepIndex >= steps.length - 1 ? "#f1f5f9" : "#059669",
                    color: currentStepIndex >= steps.length - 1 ? "#cbd5e1" : "#ffffff",
                    border: 0,
                    fontWeight: 750,
                    fontSize: "11px",
                    cursor: currentStepIndex >= steps.length - 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Nächster Schritt →
                </button>
              </div>
            </div>
          )}

          {/* Pro Chef-Tipp Box */}
          <div
            style={{
              padding: "12px 14px",
              background: "#fffbeb",
              borderRadius: "14px",
              border: "1px solid #fef3c7",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <div>
              <strong style={{ fontSize: "10px", color: "#b45309", textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
                Küchen-Geheimtipp
              </strong>
              <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#78350f", lineHeight: 1.45 }}>
                {recipe.chefTip}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 20px",
            background: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 14px",
              borderRadius: "12px",
              background: "#f1f5f9",
              color: "#475569",
              border: 0,
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Schließen
          </button>
          <button
            type="button"
            className="primary-button generate-button"
            onClick={handleFinishCooking}
            style={{
              flex: 1,
              height: "42px",
              fontSize: "11.5px",
              fontWeight: 750,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <span>Fertig gekocht! Vorrat abbuchen</span>
            <span>✓</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Inline Accordion inside the recipe card on CookScreen
 */
interface RecipeStepsAccordionProps {
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
  pantry,
  onToggle,
  onOpenModal,
  onCook,
  onBookmark,
  isBookmarked,
  onAddMissingToGroceries,
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
