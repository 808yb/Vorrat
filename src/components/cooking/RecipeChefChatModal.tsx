import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { CatalogRecipe, RecipeStep } from "../../data/recipeCatalog";
import { askAboutRecipeWithGemini } from "../../utils/geminiRecipes";

export interface RecipeChefChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: CatalogRecipe;
  currentStep: RecipeStep;
  currentStepIndex: number;
  stepsCount: number;
  servings: number;
  safeIngredients: Array<{ name: string; amount?: string; unit?: string; originalUnit?: string; isSpiceOrBasic?: boolean }>;
  pantry?: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>;
}

export function RecipeChefChatModal({
  isOpen,
  onClose,
  recipe,
  currentStep,
  currentStepIndex,
  stepsCount,
  servings,
  safeIngredients,
  pantry,
}: RecipeChefChatModalProps) {
  const [askInput, setAskInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [askHistory, setAskHistory] = useState<
    Array<{
      id: string;
      question: string;
      answer: string;
      stepNumber?: number;
      stepTitle?: string;
      timestamp: string;
    }>
  >([]);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [askHistory, isAsking, isOpen]);

  // Reset input when opening a new recipe
  useEffect(() => {
    if (isOpen) {
      setAskInput("");
    }
  }, [isOpen, recipe.id]);

  const handleSendQuestion = async (queryText?: string) => {
    const q = (queryText ?? askInput).trim();
    if (!q || isAsking) return;

    setIsAsking(true);
    const qId = Date.now().toString();

    const pantrySummary = pantry
      ? pantry.map((p) => p.name).slice(0, 15).join(", ")
      : undefined;

    const ingredientsSummary = safeIngredients
      .map((ing) => `${ing.amount} ${ing.name}`)
      .join(", ");

    try {
      const answer = await askAboutRecipeWithGemini(q, {
        recipeTitle: recipe.title,
        stepNumber: currentStep?.stepNumber,
        stepTitle: currentStep?.title,
        stepInstruction: currentStep?.instruction,
        ingredientsSummary,
        servings,
        pantrySummary,
      });

      setAskHistory((prev) => [
        ...prev,
        {
          id: qId,
          question: q,
          answer,
          stepNumber: currentStep?.stepNumber,
          stepTitle: currentStep?.title,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setAskInput("");
    } catch (err) {
      console.error("Error asking about recipe:", err);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.72)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "490px",
              maxHeight: "88vh",
              background: "#ffffff",
              borderRadius: "22px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              overflow: "hidden",
              border: "1px solid #e2e8f0",
            }}
          >
            {/* Dialog Header */}
            <div
              style={{
                padding: "14px 18px",
                background: "linear-gradient(135deg, #1e293b, #0f172a)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    display: "grid",
                    placeItems: "center",
                    color: "#ffffff",
                    fontSize: "19px",
                    fontWeight: 800,
                    boxShadow: "0 2px 8px rgba(245, 158, 11, 0.4)",
                  }}
                >
                  ★
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 750, color: "#ffffff", letterSpacing: "-0.01em" }}>
                    KI-Küchenchef fragen
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#cbd5e1" }}>
                    Fragen zum Rezept · Fortschritt bleibt unberührt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  border: 0,
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: "15px",
                }}
                title="Zurück zum Kochen"
              >
                ✕
              </button>
            </div>

            {/* Dialog Scrollable Body */}
            <div
              style={{
                padding: "16px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                background: "#f8fafc",
                flex: 1,
                minHeight: "180px",
              }}
            >
              {/* Active Step Context Card */}
              <div
                style={{
                  padding: "10px 12px",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: "9.5px",
                      fontWeight: 750,
                      textTransform: "uppercase",
                      color: "#065f46",
                      background: "#d1fae5",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    Schritt {currentStep.stepNumber} von {stepsCount}
                  </span>
                  <span style={{ fontSize: "10px", color: "#047857", fontWeight: 650 }}>
                    {recipe.title}
                  </span>
                </div>
                <strong style={{ fontSize: "12px", color: "#064e3b" }}>
                  {currentStep.title}
                </strong>
                <p style={{ margin: 0, fontSize: "11px", color: "#047857", lineHeight: 1.45 }}>
                  „{currentStep.instruction}“
                </p>
              </div>

              {/* 1-Click Quick Question Suggestion Chips */}
              <div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Schnellfragen (1-Klick)
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {[
                    "★ Alternative für eine Zutat?",
                    "★ Welche Herd-Stufe / Hitze?",
                    "★ Wie lange genau zubereiten?",
                    "★ Konsistenz & Profi-Tipp?",
                  ].map((chip) => {
                    const qText = chip.replace(/^★\s*/, "");
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleSendQuestion(qText)}
                        disabled={isAsking}
                        style={{
                          padding: "5px 10px",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: "99px",
                          color: "#92400e",
                          fontSize: "10.5px",
                          fontWeight: 650,
                          cursor: isAsking ? "not-allowed" : "pointer",
                          transition: "all 120ms ease",
                        }}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Q&A History */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  flex: 1,
                }}
              >
                {askHistory.length === 0 ? (
                  <div
                    style={{
                      padding: "20px 14px",
                      textAlign: "center",
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: "1px dashed #cbd5e1",
                    }}
                  >
                    <div style={{ fontSize: "28px", marginBottom: "6px" }}>👨‍🍳</div>
                    <strong style={{ fontSize: "12.5px", color: "#334155", display: "block", marginBottom: "4px" }}>
                      Frage deinen KI-Küchenchef
                    </strong>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.45 }}>
                      Unsicher bei Zutaten, Mengen oder Zubereitung? Frag z. B.:
                      <br />
                      <span style={{ fontStyle: "italic", color: "#0f172a" }}>„Was kann ich als Alternative nehmen?“ oder „Welche Herd-Stufe ist optimal?“</span>
                      <br />
                      <span style={{ color: "#059669", fontWeight: 650, display: "inline-block", marginTop: "4px" }}>
                        ✓ Dein Rezept-Fortschritt & Timer bleiben voll erhalten!
                      </span>
                    </p>
                  </div>
                ) : (
                  askHistory.map((item) => (
                    <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {/* User Question Bubble */}
                      <div
                        style={{
                          alignSelf: "flex-end",
                          maxWidth: "88%",
                          background: "#047857",
                          color: "#ffffff",
                          padding: "8px 12px",
                          borderRadius: "14px 14px 2px 14px",
                          fontSize: "11.5px",
                          lineHeight: 1.4,
                          boxShadow: "0 2px 5px rgba(4, 120, 87, 0.15)",
                        }}
                      >
                        <div style={{ fontSize: "9px", opacity: 0.8, marginBottom: "2px" }}>
                          Du · Schritt {item.stepNumber || currentStepIndex + 1} ({item.timestamp})
                        </div>
                        <div>{item.question}</div>
                      </div>

                      {/* Chef Answer Bubble */}
                      <div
                        style={{
                          alignSelf: "flex-start",
                          maxWidth: "94%",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "14px 14px 14px 2px",
                          padding: "10px 14px",
                          fontSize: "11.5px",
                          lineHeight: 1.5,
                          color: "#1e293b",
                          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                          <span style={{ color: "#f59e0b", fontSize: "12px" }}>★</span>
                          <strong style={{ fontSize: "10.5px", color: "#0f172a" }}>Küchenchef Antwort</strong>
                        </div>
                        <div style={{ whiteSpace: "pre-line" }}>{item.answer}</div>
                      </div>
                    </div>
                  ))
                )}

                {isAsking && (
                  <div
                    style={{
                      alignSelf: "flex-start",
                      padding: "10px 14px",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      fontSize: "11px",
                      color: "#475569",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ animation: "pulse 1s infinite" }}>⏳</span>
                    <span>Chefkoch überlegt...</span>
                  </div>
                )}

                {/* Auto-scroll anchor */}
                <div ref={chatBottomRef} />
              </div>
            </div>

            {/* Pinned Input Form Bar (stays neatly docked above footer) */}
            <div
              style={{
                padding: "10px 14px",
                background: "#ffffff",
                borderTop: "1px solid #e2e8f0",
                flexShrink: 0,
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuestion();
                }}
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder="Frage zu Zutaten, Alternativen oder Zubereitung..."
                  disabled={isAsking}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    outline: "none",
                    background: "#f8fafc",
                  }}
                />
                <button
                  type="submit"
                  disabled={!askInput.trim() || isAsking}
                  style={{
                    padding: "0 14px",
                    height: "36px",
                    borderRadius: "10px",
                    background:
                      !askInput.trim() || isAsking
                        ? "#cbd5e1"
                        : "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#ffffff",
                    border: 0,
                    fontWeight: 750,
                    fontSize: "11px",
                    cursor: !askInput.trim() || isAsking ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <span>★</span>
                  <span>Fragen</span>
                </button>
              </form>
            </div>

            {/* Dialog Footer (pinned) */}
            <div
              style={{
                padding: "10px 18px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "#059669", fontSize: "12px" }}>✓</span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>
                  Fortschritt bleibt erhalten
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  background: "#047857",
                  color: "#ffffff",
                  border: 0,
                  fontSize: "11px",
                  fontWeight: 750,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ← Zurück zum Kochen (Schritt {currentStepIndex + 1})
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
