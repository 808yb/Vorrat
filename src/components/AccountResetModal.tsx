import React, { useState } from "react";
import { RotateCcw, Trash2, Layers, AlertTriangle, CheckCircle2, X } from "lucide-react";

interface AccountResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantryCount: number;
  shoppingCount: number;
  onResetDemo: () => void;
  onClearPantry: () => void;
  onDeduplicate: () => void;
  onFullReset: () => void;
  onNotify?: (msg: string) => void;
}

export function AccountResetModal({
  isOpen,
  onClose,
  pantryCount,
  shoppingCount,
  onResetDemo,
  onClearPantry,
  onDeduplicate,
  onFullReset,
  onNotify,
}: AccountResetModalProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmFullReset, setConfirmFullReset] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 65 }}>
      <div
        className="modal-content hide-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "440px",
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
                Vorrat & Account verwalten
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                Bereinigen, Duplikate fixen oder zurücksetzen
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

        {/* Current State Info */}
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              background: "#f8fafc",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
              color: "#475569",
            }}
          >
            <span>Gespeicherte Daten:</span>
            <div style={{ display: "flex", gap: "8px", fontWeight: 700 }}>
              <span style={{ color: "#059669" }}>{pantryCount} Vorräte</span>
              <span style={{ color: "#cbd5e1" }}>•</span>
              <span style={{ color: "#0284c7" }}>{shoppingCount} Einkaufsartikel</span>
            </div>
          </div>

          {/* Option 1: Deduplicate (Safe clean) */}
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
                  Führt mehrfach gespeicherte Produkte (z. B. 2x Reis) automatisch zu einem Eintrag zusammen und addiert die Bestände.
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
                  Jetzt Duplikate bereinigen
                </button>
              </div>
            </div>
          </div>

          {/* Option 2: Reset to Clean Demo (Recommended) */}
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
                  Standard-Demo wiederherstellen (Empfohlen)
                </strong>
                <p style={{ margin: "3px 0 8px", fontSize: "11.5px", color: "#047857", lineHeight: 1.4 }}>
                  Setzt deinen Vorrat auf die sauberen 7 Standard-Grundzutaten (Reis, Eier, Sojasoße etc.) und 5 Einkaufsartikel zurück. Alle fehlerhaften Einträge werden entfernt.
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

          {/* Option 3: Danger Zone - Empty Pantry / Full Reset */}
          <div
            style={{
              padding: "14px",
              borderRadius: "16px",
              border: "1.5px solid #fee2e2",
              background: "#fff5f5",
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
                <strong style={{ display: "block", fontSize: "13.5px", color: "#7f1d1d", fontWeight: 750 }}>
                  Vorrat komplett leeren (0 Produkte)
                </strong>
                <p style={{ margin: "3px 0 8px", fontSize: "11.5px", color: "#991b1b", lineHeight: 1.4 }}>
                  Löscht alle Artikel aus deinem Vorrat, sodass du eine komplett frische, leere Küche hast.
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmClear) {
                        setConfirmClear(true);
                        setTimeout(() => setConfirmClear(false), 5000);
                        return;
                      }
                      onClearPantry();
                      onClose();
                    }}
                    style={{
                      background: confirmClear ? "#b91c1c" : "#dc2626",
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
                      boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
                    }}
                  >
                    <Trash2 size={14} />
                    {confirmClear ? "⚠️ Bestätigen: Vorrat jetzt leeren" : "Vorrat leeren"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmFullReset) {
                        setConfirmFullReset(true);
                        setTimeout(() => setConfirmFullReset(false), 5000);
                        return;
                      }
                      onFullReset();
                      onClose();
                    }}
                    style={{
                      background: "transparent",
                      color: "#991b1b",
                      border: "1px solid #fca5a5",
                      borderRadius: "10px",
                      padding: "6px 12px",
                      fontSize: "11.5px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {confirmFullReset ? "⚠️ Gesamte App zurücksetzen?" : "Komplett-Reset"}
                  </button>
                </div>
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
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
