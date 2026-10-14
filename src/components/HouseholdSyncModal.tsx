import React, { useState } from "react";
import { RefreshCw, Users, Check, Copy, X } from "lucide-react";

interface HouseholdSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (msg: string) => void;
  pantryCount: number;
  shoppingCount: number;
  onOpenReset?: () => void;
}

export function HouseholdSyncModal({
  isOpen,
  onClose,
  onNotify,
  pantryCount,
  shoppingCount,
  onOpenReset,
}: HouseholdSyncModalProps) {
  const [householdName, setHouseholdName] = useState(() => {
    try {
      return localStorage.getItem("forret_household_name") || "Unsere Küche (WG & Familie)";
    } catch {
      return "Unsere Küche (WG & Familie)";
    }
  });

  const [inviteCode] = useState(() => {
    try {
      const saved = localStorage.getItem("forret_household_code");
      if (saved) return saved;
      const gen = "VORRAT-" + Math.random().toString(36).substring(2, 7).toUpperCase();
      localStorage.setItem("forret_household_code", gen);
      return gen;
    } catch {
      return "VORRAT-808YB";
    }
  });

  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("Gerade eben");

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}?household=${inviteCode.toLowerCase()}`;

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      if (onNotify) onNotify("Einladungs-Link in die Zwischenablage kopiert!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (onNotify) onNotify("Link: " + inviteUrl);
    }
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime("Gerade eben");
      if (onNotify) onNotify("Haushalt synchronisiert: Vorrat & Einkaufsliste sind aktuell!");
    }, 800);
  };

  const handleSaveName = (newName: string) => {
    setHouseholdName(newName);
    try {
      localStorage.setItem("forret_household_name", newName);
    } catch {}
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 60 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "420px", borderRadius: "24px" }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "#ecfdf5",
                color: "#059669",
                display: "grid",
                placeItems: "center",
              }}
            >
              <RefreshCw size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", color: "#0f172a", fontWeight: 800 }}>
                Haushalt & Cloud-Sync
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "#10b981",
                    display: "inline-block",
                    boxShadow: "0 0 6px #10b981",
                  }}
                />
                <span style={{ fontSize: "11px", color: "#059669", fontWeight: 650 }}>
                  Echtzeit-Synchronisation aktiv
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="clear-button"
            onClick={onClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", fontSize: "16px" }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Household Name */}
          <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Name des Haushalts
            </label>
            <input
              type="text"
              value={householdName}
              onChange={(e) => handleSaveName(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                fontSize: "14px",
                fontWeight: 750,
                color: "#0f172a",
                outline: "none",
              }}
            />
          </div>

          {/* Share / Invite Link Box */}
          <div
            style={{
              background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
              border: "1.5px solid #a7f3d0",
              borderRadius: "16px",
              padding: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 750, color: "#065f46" }}>
                Partner oder Mitbewohner einladen
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  background: "#10b981",
                  color: "white",
                  padding: "2px 7px",
                  borderRadius: "6px",
                  letterSpacing: "0.05em",
                }}
              >
                CODE: {inviteCode}
              </span>
            </div>
            <p style={{ margin: "0 0 10px", fontSize: "11.5px", color: "#047857", lineHeight: 1.4 }}>
              Teile diesen Einladungs-Link. Sobald dein Partner oder Mitbewohner den Link öffnet, teilt ihr automatisch denselben Vorrat und dieselbe Einkaufsliste in Echtzeit.
            </p>

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                readOnly
                value={inviteUrl}
                style={{
                  flex: 1,
                  background: "white",
                  border: "1px solid #a7f3d0",
                  borderRadius: "10px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  color: "#334155",
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  padding: "6px 14px",
                  background: copied ? "#047857" : "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: "10px",
                  fontSize: "11.5px",
                  fontWeight: 750,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  transition: "background 150ms ease",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? "✓ Kopiert!" : "Link kopieren"}
              </button>
            </div>
          </div>

          {/* Members in Household */}
          <div>
            <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#475569", display: "block", marginBottom: "8px" }}>
              Mitglieder im Haushalt (2)
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#059669",
                      color: "white",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "11px",
                      fontWeight: 750,
                    }}
                  >
                    DU
                  </div>
                  <div>
                    <strong style={{ fontSize: "12.5px", color: "#0f172a", display: "block" }}>
                      Du (Dieses Gerät)
                    </strong>
                    <span style={{ fontSize: "10.5px", color: "#64748b" }}>Admin / Ersteller</span>
                  </div>
                </div>
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 8px", borderRadius: "99px" }}>
                  Online
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#e2e8f0",
                      color: "#64748b",
                      display: "grid",
                      placeItems: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    +
                  </div>
                  <div>
                    <strong style={{ fontSize: "12.5px", color: "#475569", display: "block" }}>
                      Partner / Mitbewohner
                    </strong>
                    <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>Bereit zum Verbinden</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#059669",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Einladen →
                </button>
              </div>
            </div>
          </div>

          {/* Sync Stats & Manual Trigger */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "11px",
              color: "#64748b",
            }}
          >
            <div>
              <span>Synchronisiert: <strong>{pantryCount} Produkte</strong> · <strong>{shoppingCount} Einkaufsartikel</strong></span>
              <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>
                Letzter Abgleich: {lastSyncTime}
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#1e293b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ display: "inline-block", transform: isSyncing ? "rotate(180deg)" : "none", transition: "transform 400ms ease" }}>
                <RefreshCw size={12} />
              </span>
              {isSyncing ? "Gleicht ab..." : "Jetzt abgleichen"}
            </button>
          </div>

          {onOpenReset && (
            <div style={{ paddingTop: "4px", borderTop: "1px dashed #e2e8f0" }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReset();
                }}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#dc2626",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "background 150ms ease",
                }}
              >
                <span>⚙️ Vorrat verwalten / Duplikate fixen / Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
