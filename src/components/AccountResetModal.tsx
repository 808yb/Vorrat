import React, { useState } from "react";
import { RotateCcw, Trash2, Layers, AlertTriangle, CheckCircle2, X, Utensils, Calendar, ShoppingBag, Bot } from "lucide-react";

interface AccountResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantryCount: number;
  shoppingCount: number;
  recipesCount?: number;
  plannedCount?: number;
  onResetDemo: () => void;
  onClearPantry: () => void;
  onDeduplicate: () => void;
  onFullReset: () => void;
  onWipeEverything?: () => void;
  onNotify?: (msg: string) => void;
}

export function AccountResetModal({
  isOpen,
  onClose,
  pantryCount,
  shoppingCount,
  recipesCount = 0,
  plannedCount = 0,
  onResetDemo,
  onClearPantry,
  onDeduplicate,
  onFullReset,
  onWipeEverything,
  onNotify,
}: AccountResetModalProps) {
  const [confirmClearPantry, setConfirmClearPantry] = useState(false);
  const [confirmWipeAll, setConfirmWipeAll] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 65 }}>
      <div
        className="modal-content hide-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "460px",
          borderRadius: "24px",
          background: "#ffffff",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 22px 16px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "14px",
                background: "#fef2f2",
                color: "#dc2626",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <RotateCcw size={22} strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "#0f172a" }}>
                Account & Daten verwalten
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Vorrat, Rezepte, Einkauf & Planung zurücksetzen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "8px",
              display: "grid",
              placeItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current State Grid */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
              padding: "12px",
              background: "#f8fafc",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "10px", color: "#64748b", display: "block" }}>Vorrat</span>
              <strong style={{ fontSize: "13px", color: "#059669", fontWeight: 800 }}>{pantryCount}</strong>
            </div>
            <div>
              <span style={{ fontSize: "10px", color: "#64748b", display: "block" }}>Einkauf</span>
              <strong style={{ fontSize: "13px", color: "#0284c7", fontWeight: 800 }}>{shoppingCount}</strong>
            </div>
            <div>
              <span style={{ fontSize: "10px", color: "#64748b", display: "block" }}>Rezepte</span>
              <strong style={{ fontSize: "13px", color: "#7c3aed", fontWeight: 800 }}>{recipesCount}</strong>
            </div>
            <div>
              <span style={{ fontSize: "10px", color: "#64748b", display: "block" }}>Geplant</span>
              <strong style={{ fontSize: "13px", color: "#ea580c", fontWeight: 800 }}>{plannedCount}</strong>
            </div>
          </div>

          {/* Option 1: Hard Reset / Wipe Everything (What User Requested) */}
          <div
            style={{
              padding: "14px",
              borderRadius: "16px",
              border: "1.5px solid #fecaca",
              background: "linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "#dc2626",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <Trash2 size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong style={{ fontSize: "13.5px", color: "#7f1d1d", fontWeight: 800 }}>
                    Kompletten Account leeren (Alles auf 0)
                  </strong>
                  <span style={{ fontSize: "9px", fontWeight: 800, background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: "4px" }}>
                    Tabula Rasa
                  </span>
                </div>
                <p style={{ margin: "3px 0 8px", fontSize: "11.5px", color: "#991b1b", lineHeight: 1.4 }}>
                  Löscht <strong>alle Vorräte, alle eigenen Rezepte, die gesamte Einkaufsliste, den Wochenplan</strong> und den Coach-Verlauf. Startet mit einer absolut frischen, leeren Küche.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmWipeAll) {
                      setConfirmWipeAll(true);
                      setTimeout(() => setConfirmWipeAll(false), 5000);
                      return;
                    }
                    if (onWipeEverything) {
                      onWipeEverything();
                    } else {
                      onFullReset();
                    }
                    onClose();
                  }}
                  style={{
                    background: confirmWipeAll ? "#991b1b" : "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(220, 38, 38, 0.25)",
                    transition: "all 150ms ease",
                  }}
                >
                  <Trash2 size={14} />
                  {confirmWipeAll
                    ? "⚠️ Wirklich bestätigen: ALLES AUF 0 LEEREN"
                    : "Account & Alle Daten jetzt leeren"}
                </button>
              </div>
            </div>
          </div>

          {/* Option 2: Reset to Clean Demo */}
          <div
            style={{
              padding: "14px",
              borderRadius: "16px",
              border: "1.5px solid #d1fae5",
              background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "#059669",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <RotateCcw size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: "block", fontSize: "13.5px", color: "#064e3b", fontWeight: 750 }}>
                  Standard-Demo wiederherstellen
                </strong>
                <p style={{ margin: "3px 0 8px", fontSize: "11.5px", color: "#047857", lineHeight: 1.4 }}>
                  Setzt deinen Vorrat auf die sauberen 7 Standard-Grundzutaten (Reis, Eier, Sojasoße etc.) und 5 Einkaufsartikel zurück.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onResetDemo();
                    onClose();
                  }}
                  style={{
                    background: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "7px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
                  }}
                >
                  <RotateCcw size={14} />
                  Auf Demo zurücksetzen
                </button>
              </div>
            </div>
          </div>

          {/* Option 3: Deduplicate (Safe clean) */}
          <div
            style={{
              padding: "14px",
              borderRadius: "16px",
              border: "1.5px solid #e0e7ff",
              background: "linear-gradient(135deg, #eef2ff 0%, #f8faff 100%)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  background: "#4f46e5",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              >
                <Layers size={17} />
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ display: "block", fontSize: "13.5px", color: "#1e1b4b", fontWeight: 750 }}>
                  Duplikate zusammenführen
                </strong>
                <p style={{ margin: "3px 0 8px", fontSize: "11.5px", color: "#4338ca", lineHeight: 1.4 }}>
                  Führt mehrfach gespeicherte Produkte (z. B. 2x Reis) automatisch zusammen und addiert die Bestände, ohne Daten zu löschen.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onDeduplicate();
                    onClose();
                  }}
                  style={{
                    background: "#4f46e5",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    padding: "7px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)",
                  }}
                >
                  <CheckCircle2 size={14} />
                  Duplikate bereinigen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 22px 16px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              background: "#f1f5f9",
              border: "none",
              borderRadius: "10px",
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#475569",
              cursor: "pointer",
            }}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
