import React, { useState, useEffect, useRef } from "react";
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  LogIn,
  UserPlus,
  LogOut,
  AlertCircle,
  Settings,
  Download,
  Upload,
} from "lucide-react";
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  backupUserDataToSupabase,
  fetchUserDataFromSupabase,
  DEFAULT_SUPABASE_URL,
  displayUsernameFromEmail,
  type VorratSyncPayload,
} from "../utils/supabaseClient";
import { STORAGE_KEYS } from "../constants/storage";
import { reportWarning, reportUserError } from "../utils/logger";

interface HouseholdSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (msg: string) => void;
  pantryCount: number;
  shoppingCount: number;
  pantryData?: unknown[];
  groceriesData?: unknown[];
  customRecipesData?: unknown[];
  mealPlanData?: unknown[];
  onRestoreData?: (payload: VorratSyncPayload) => void;
  onOpenReset?: () => void;
  onAuthChange?: (isLoggedIn: boolean) => void;
}

export function HouseholdSyncModal({
  isOpen,
  onClose,
  onNotify,
  pantryCount,
  shoppingCount,
  pantryData = [],
  groceriesData = [],
  customRecipesData = [],
  mealPlanData = [],
  onRestoreData,
  onOpenReset,
  onAuthChange,
}: HouseholdSyncModalProps) {
  // Household Name for local JSON backups
  const [householdName, setHouseholdName] = useState(() => {
    try {
      return (
        localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_NAME) ||
        "Unsere Küche (WG & Familie)"
      );
    } catch (err) {
      reportWarning("HouseholdSyncModal: Failed to read HOUSEHOLD_NAME", err);
      return "Unsere Küche (WG & Familie)";
    }
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Supabase Auth & Config State
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [anonKeyInput, setAnonKeyInput] = useState(supabaseConfig.anonKey || "");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    checkUser();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const checkUser = async () => {
    try {
      const user = await getCurrentUser();
      const email = user?.email || null;
      setCurrentUserEmail(email);
      onAuthChange?.(Boolean(email));
    } catch (err) {
      reportWarning("HouseholdSyncModal: checkUser failed", err);
      setCurrentUserEmail(null);
      onAuthChange?.(false);
    }
  };

  const handleExportJson = () => {
    try {
      const payload = {
        version: 1,
        appName: "Vorrat",
        exportedAt: new Date().toISOString(),
        householdName,
        pantry: pantryData,
        groceries: groceriesData,
        customRecipes: customRecipesData,
        mealPlan: mealPlanData,
      };
      const dataStr =
        "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute(
        "download",
        `vorrat-backup-${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      if (onNotify) onNotify("Lokales Backup als JSON heruntergeladen!");
    } catch (err) {
      reportUserError("HouseholdSyncModal.exportJson", "Fehler beim Erstellen des Backups.", err);
      if (onNotify) onNotify("Fehler beim Erstellen des Backups.");
    }
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Ungültiges JSON-Format.");
        }
        if (onRestoreData) {
          onRestoreData({
            pantry: Array.isArray(parsed.pantry) ? parsed.pantry : [],
            groceries: Array.isArray(parsed.groceries) ? parsed.groceries : [],
            customRecipes: Array.isArray(parsed.customRecipes) ? parsed.customRecipes : [],
            mealPlan: Array.isArray(parsed.mealPlan) ? parsed.mealPlan : [],
            householdName: parsed.householdName,
          });
        }
        if (parsed.householdName) {
          handleSaveName(parsed.householdName);
        }
        if (onNotify) {
          onNotify("Lokales Backup erfolgreich eingespielt!");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Ungültige Datei";
        reportUserError("HouseholdSyncModal.importJson", `Fehler beim JSON-Import: ${msg}`, err);
        if (onNotify) {
          onNotify(`Fehler beim JSON-Import: ${msg}`);
        }
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSaveName = (newName: string) => {
    setHouseholdName(newName);
    try {
      localStorage.setItem(STORAGE_KEYS.HOUSEHOLD_NAME, newName);
    } catch (err) {
      reportWarning("HouseholdSyncModal: Failed to persist householdName", err);
    }
  };

  const handleSaveAnonKey = (keyToSave?: string) => {
    const key = (keyToSave || anonKeyInput).trim();
    if (!key) {
      setAuthError("Bitte füge deinen Supabase Anon Key ein.");
      return;
    }
    saveSupabaseConfig(DEFAULT_SUPABASE_URL, key);
    const updated = getSupabaseConfig();
    setSupabaseConfig(updated);
    setAnonKeyInput(updated.anonKey);
    setAuthError(null);
    if (onNotify) onNotify("Supabase Anon Key gespeichert & aktiviert!");
  };

  // Supabase Auth Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Bitte Benutzername und Passwort eingeben.");
      return;
    }
    if (authPassword.length < 6) {
      setAuthError("Das Passwort muss mindestens 6 Zeichen lang sein.");
      return;
    }

    if (!supabaseConfig.isConfigured) {
      if (anonKeyInput.trim()) {
        saveSupabaseConfig(DEFAULT_SUPABASE_URL, anonKeyInput.trim());
        const updated = getSupabaseConfig();
        setSupabaseConfig(updated);
        if (!updated.isConfigured) {
          setAuthError("Ungültiger Anon Key. Bitte überprüfe den Key aus deinem Supabase Dashboard.");
          return;
        }
      } else {
        setAuthError("Bitte füge unten deinen Supabase Anon Key ein.");
        return;
      }
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === "login") {
        const { user } = await signInWithEmail(authEmail, authPassword);
        const email = user?.email || authEmail;
        setCurrentUserEmail(email);
        try {
          const cloudData = await fetchUserDataFromSupabase();
          if (cloudData && onRestoreData) {
            onRestoreData(cloudData);
            if (cloudData.householdName) {
              handleSaveName(cloudData.householdName);
            }
          }
        } catch (fetchErr) {
          console.warn("Auto-restore after login:", fetchErr);
        }
        onAuthChange?.(true);
        if (onNotify) onNotify(`Eingeloggt als ${displayUsernameFromEmail(email)} – Vorrat synchronisiert!`);
      } else {
        const { user } = await signUpWithEmail(authEmail, authPassword);
        const email = user?.email || authEmail;
        setCurrentUserEmail(email);
        try {
          await backupUserDataToSupabase({
            householdName,
            pantry: pantryData,
            groceries: groceriesData,
            customRecipes: customRecipesData,
            mealPlan: mealPlanData,
          });
        } catch (saveErr) {
          console.warn("Auto-save on signup:", saveErr);
        }
        onAuthChange?.(true);
        if (onNotify) onNotify(`Account «${displayUsernameFromEmail(email)}» erstellt & synchronisiert!`);
      }
      setAuthEmail("");
      setAuthPassword("");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Authentifizierung fehlgeschlagen.";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentUserEmail(null);
    onAuthChange?.(false);
    if (onNotify) onNotify("Erfolgreich abgemeldet.");
  };

  const handleCloudBackup = async () => {
    setIsSyncing(true);
    try {
      await backupUserDataToSupabase({
        householdName,
        pantry: pantryData,
        groceries: groceriesData,
        customRecipes: customRecipesData,
        mealPlan: mealPlanData,
      });
      if (onNotify) onNotify("Gesamter Vorrat erfolgreich in Supabase gesichert!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Fehler beim Cloud-Backup.";
      if (onNotify) onNotify(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudRestore = async () => {
    setIsSyncing(true);
    try {
      const data = await fetchUserDataFromSupabase();
      if (!data) {
        if (onNotify) onNotify("Keine gesicherten Cloud-Daten für diesen Account gefunden.");
        return;
      }
      if (onRestoreData) {
        onRestoreData(data);
      }
      if (data.householdName) {
        handleSaveName(data.householdName);
      }
      if (onNotify) onNotify("Vorrat & Rezepte aus Supabase Cloud wiederhergestellt!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Fehler beim Laden aus der Cloud.";
      if (onNotify) onNotify(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{ zIndex: 60, cursor: "pointer" }}
    >
      <div
        className="modal-content hide-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "440px",
          borderRadius: "24px",
          maxHeight: "90vh",
          overflowY: "auto",
          cursor: "default",
          position: "relative",
        }}
      >
        {/* Sticky Header with Always Accessible Close Button */}
        <div
          className="modal-header"
          style={{
            position: "sticky",
            top: 0,
            background: "#ffffff",
            zIndex: 20,
            padding: "16px 20px 14px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "12px",
                background: "#ecfdf5",
                color: "#059669",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Cloud size={20} strokeWidth={2.4} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: "16px", color: "#0f172a", fontWeight: 800 }}>
                Account & Cloud-Sync
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                <span
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: currentUserEmail ? "#10b981" : "#94a3b8",
                    display: "inline-block",
                    boxShadow: currentUserEmail ? "0 0 6px #10b981" : "none",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "11px", color: currentUserEmail ? "#059669" : "#64748b", fontWeight: 650 }}>
                  {currentUserEmail ? `Verbunden: ${displayUsernameFromEmail(currentUserEmail)}` : "Supabase Cloud-Sync"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="clear-button"
            aria-label="Schließen"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              border: "none",
              background: "#f1f5f9",
              cursor: "pointer",
              color: "#475569",
              fontSize: "16px",
              width: "40px",
              height: "40px",
              minWidth: "40px",
              minHeight: "40px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
              transition: "all 140ms ease",
              touchAction: "manipulation",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* KARTE 1: ACCOUNT & CLOUD-SYNC */}
          {currentUserEmail ? (
            /* Logged In State */
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "18px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <span style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                    Eingeloggter Account
                  </span>
                  <strong style={{ display: "block", fontSize: "15px", color: "#0f172a", marginTop: "2px" }}>
                    {displayUsernameFromEmail(currentUserEmail)}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    padding: "6px 12px",
                    background: "#fee2e2",
                    color: "#b91c1c",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 750,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <LogOut size={12} />
                  Abmelden
                </button>
              </div>

              {/* Live Status Pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: "10px",
                  padding: "9px 12px",
                  fontSize: "12px",
                  color: "#047857",
                  fontWeight: 650,
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 6px rgba(16,185,129,0.8)",
                    flexShrink: 0,
                  }}
                />
                <span>
                  <strong>Automatischer Cloud-Sync aktiv:</strong> Synchronisiert in Echtzeit.
                </span>
              </div>

              {/* Statistik */}
              <div
                style={{
                  fontSize: "12px",
                  color: "#475569",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Aktueller Datenbestand:</span>
                <strong>
                  {pantryCount} {pantryCount === 1 ? "Produkt" : "Produkte"} · {shoppingCount} {shoppingCount === 1 ? "Einkaufsartikel" : "Einkaufsartikel"}
                </strong>
              </div>

              {/* Sync Actions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleCloudBackup}
                  style={{
                    padding: "10px 12px",
                    background: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "12.5px",
                    fontWeight: 750,
                    cursor: isSyncing ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    boxShadow: "0 2px 4px rgba(5,150,105,0.2)",
                  }}
                >
                  <CloudUpload size={15} />
                  {isSyncing ? "Sichert..." : "In Cloud sichern"}
                </button>

                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleCloudRestore}
                  style={{
                    padding: "10px 12px",
                    background: "#ffffff",
                    color: "#1e293b",
                    border: "1px solid #cbd5e1",
                    borderRadius: "10px",
                    fontSize: "12.5px",
                    fontWeight: 750,
                    cursor: isSyncing ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <CloudDownload size={15} />
                  Aus Cloud laden
                </button>
              </div>

              {/* WG & Paare Hinweis */}
              <div
                style={{
                  fontSize: "11.5px",
                  color: "#64748b",
                  lineHeight: 1.45,
                  background: "#f1f5f9",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "7px",
                }}
              >
                <span style={{ fontSize: "14px", lineHeight: 1 }}>💡</span>
                <span>
                  <strong>Tipp für Paare & WGs:</strong> Einfach auf beiden Handys mit demselben Account anmelden, um Vorrat & Einkaufsliste gemeinsam zu nutzen.
                </span>
              </div>
            </div>
          ) : (
            /* Auth Form (Login / Register) */
            <form onSubmit={handleAuthSubmit} style={{ background: "#f8fafc", padding: "16px", borderRadius: "18px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: authMode === "login" ? 800 : 600,
                      color: authMode === "login" ? "#059669" : "#64748b",
                      cursor: "pointer",
                      paddingBottom: "2px",
                      borderBottom: authMode === "login" ? "2px solid #059669" : "none",
                    }}
                  >
                    Anmelden
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: authMode === "signup" ? 800 : 600,
                      color: authMode === "signup" ? "#059669" : "#64748b",
                      cursor: "pointer",
                      paddingBottom: "2px",
                      borderBottom: authMode === "signup" ? "2px solid #059669" : "none",
                    }}
                  >
                    Konto erstellen
                  </button>
                </div>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b" }}>
                  Kostenlos & Sicher
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="text"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="Benutzername (z. B. wg-mitte oder unserekueche)"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    background: "#ffffff",
                    minHeight: "44px",
                    boxSizing: "border-box",
                  }}
                />
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Passwort"
                  required
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    outline: "none",
                    background: "#ffffff",
                    minHeight: "44px",
                    boxSizing: "border-box",
                  }}
                />

                {authError && (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#dc2626", fontSize: "11px", marginTop: "2px" }}>
                    <AlertCircle size={13} />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  style={{
                    marginTop: "4px",
                    padding: "11px 14px",
                    background: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: 750,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    minHeight: "44px",
                    touchAction: "manipulation",
                  }}
                >
                  {authMode === "login" ? <LogIn size={15} /> : <UserPlus size={15} />}
                  {authLoading
                    ? "Verbinde..."
                    : authMode === "login"
                    ? "Mit Benutzername einloggen"
                    : "Account jetzt registrieren"}
                </button>
              </div>

              {!supabaseConfig.isConfigured && (
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #e2e8f0" }}>
                  <label style={{ display: "block", fontSize: "10.5px", fontWeight: 700, color: "#64748b", marginBottom: "4px" }}>
                    Supabase Anon Public Key:
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="password"
                      value={anonKeyInput}
                      onChange={(e) => setAnonKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      style={{
                        flex: 1,
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "11px",
                        outline: "none",
                        background: "#ffffff",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveAnonKey()}
                      style={{
                        padding: "7px 12px",
                        background: "#059669",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "11.5px",
                        fontWeight: 750,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Speichern
                    </button>
                  </div>
                </div>
              )}

              {/* WG & Paare Hinweis */}
              <div
                style={{
                  fontSize: "11.5px",
                  color: "#64748b",
                  lineHeight: 1.45,
                  background: "#f1f5f9",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "7px",
                  marginTop: "12px",
                }}
              >
                <span style={{ fontSize: "14px", lineHeight: 1 }}>💡</span>
                <span>
                  <strong>Tipp für Paare & WGs:</strong> Einfach auf beiden Handys mit demselben Account anmelden, um Vorrat & Einkaufsliste gemeinsam zu nutzen.
                </span>
              </div>
            </form>
          )}

          {/* KARTE 2: DATEN-VERWALTUNG & BACKUP */}
          <div style={{ background: "#ffffff", padding: "16px", borderRadius: "18px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Daten-Verwaltung & Backup
              </span>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                {pantryCount} Produkte
              </span>
            </div>

            {/* Reset & Deduplication Trigger */}
            {onOpenReset && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReset();
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "12px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "#dc2626",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "background 150ms ease",
                  marginBottom: "10px",
                }}
              >
                <Settings size={14} />
                <span>Account & Vorrat leeren / Duplikate fixen / Reset</span>
              </button>
            )}

            {/* Hidden File Input for JSON restore */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJsonFile}
              style={{ display: "none" }}
            />

            {/* Dezente Backup-Aktionen */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                type="button"
                onClick={handleExportJson}
                style={{
                  padding: "7px 10px",
                  background: "#f8fafc",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "9px",
                  fontSize: "11px",
                  fontWeight: 650,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                }}
                title="Sichert alle Daten als JSON-Datei auf diesem Gerät"
              >
                <Download size={13} />
                <span>Lokales JSON-Backup exportieren</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: "7px 10px",
                  background: "#f8fafc",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: "9px",
                  fontSize: "11px",
                  fontWeight: 650,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                }}
                title="Stellt Daten aus einer lokalen JSON-Backup-Datei wieder her"
              >
                <Upload size={13} />
                <span>Importieren</span>
              </button>
            </div>
          </div>

          {/* Primary Bottom Close Button */}
          <div style={{ marginTop: "4px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                padding: "11px 16px",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                fontSize: "13px",
                fontWeight: 700,
                color: "#334155",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "background 140ms ease",
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
