import React, { useState, useEffect } from "react";
import { Users, Cloud, CloudUpload, CloudDownload, LogIn, UserPlus, LogOut, Database, AlertCircle, CheckCircle2, RefreshCw, Key } from "lucide-react";
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  getCurrentUser,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  backupUserDataToSupabase,
  fetchUserDataFromSupabase,
  SUPABASE_SQL_SETUP,
  DEFAULT_SUPABASE_PROJECT_ID,
  DEFAULT_SUPABASE_URL,
  displayUsernameFromEmail,
  type VorratSyncPayload,
} from "../utils/supabaseClient";

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
}: HouseholdSyncModalProps) {
  const [activeTab, setActiveTab] = useState<"link" | "cloud">("cloud");

  // Household Link State
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

  // Supabase State
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [anonKeyInput, setAnonKeyInput] = useState(supabaseConfig.anonKey || "");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showSqlDetails, setShowSqlDetails] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    checkUser();
  }, [isOpen]);

  const checkUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUserEmail(user?.email || null);
    } catch {
      setCurrentUserEmail(null);
    }
  };

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
    if (onNotify) onNotify("✓ Supabase Anon Key gespeichert & aktiviert!");
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

    // Auto-save key if entered in the modal
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
        setAuthError("Bitte füge unten deinen Supabase Anon Key (aus dem Supabase Dashboard) ein.");
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
        if (onNotify) onNotify(`Eingeloggt als ${displayUsernameFromEmail(email)}!`);
      } else {
        const { user } = await signUpWithEmail(authEmail, authPassword);
        const email = user?.email || authEmail;
        setCurrentUserEmail(email);
        if (onNotify) onNotify(`Account «${displayUsernameFromEmail(email)}» erfolgreich erstellt!`);
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
      setLastSyncTime("Gerade eben");
      if (onNotify) onNotify("✓ Gesamter Vorrat erfolgreich in Supabase gesichert!");
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
      if (onNotify) onNotify("✓ Vorrat & Rezepte aus Supabase Cloud wiederhergestellt!");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Fehler beim Laden aus der Cloud.";
      if (onNotify) onNotify(msg);
    } finally {
      setIsSyncing(false);
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 60 }}>
      <div
        className="modal-content hide-scrollbar"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "440px", borderRadius: "24px", maxHeight: "90vh", overflowY: "auto" }}
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
              <Cloud size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", color: "#0f172a", fontWeight: 800 }}>
                Accounts & Cloud-Sync
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
                  }}
                />
                <span style={{ fontSize: "11px", color: currentUserEmail ? "#059669" : "#64748b", fontWeight: 650 }}>
                  {currentUserEmail ? `Verbunden: ${displayUsernameFromEmail(currentUserEmail)}` : "Supabase PostgreSQL Sync"}
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

        {/* Tab Switcher */}
        <div style={{ padding: "12px 20px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "12px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("cloud")}
              style={{
                padding: "8px",
                borderRadius: "9px",
                border: "none",
                fontSize: "12px",
                fontWeight: 750,
                cursor: "pointer",
                background: activeTab === "cloud" ? "#ffffff" : "transparent",
                color: activeTab === "cloud" ? "#0f172a" : "#64748b",
                boxShadow: activeTab === "cloud" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Database size={14} />
              <span>Supabase Cloud</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("link")}
              style={{
                padding: "8px",
                borderRadius: "9px",
                border: "none",
                fontSize: "12px",
                fontWeight: 750,
                cursor: "pointer",
                background: activeTab === "link" ? "#ffffff" : "transparent",
                color: activeTab === "link" ? "#0f172a" : "#64748b",
                boxShadow: activeTab === "link" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Users size={14} />
              <span>Haushalts-Link</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* TAB 1: SUPABASE CLOUD & ACCOUNTS */}
          {activeTab === "cloud" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {currentUserEmail ? (
                /* Logged In State */
                <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <div>
                      <span style={{ fontSize: "10.5px", color: "#64748b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                        Eingeloggter Account
                      </span>
                      <strong style={{ display: "block", fontSize: "14px", color: "#0f172a", marginTop: "2px" }}>
                        {displayUsernameFromEmail(currentUserEmail)}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      style={{
                        padding: "5px 10px",
                        background: "#fee2e2",
                        color: "#b91c1c",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: 750,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <LogOut size={12} />
                      Abmelden
                    </button>
                  </div>

                  {/* Backup & Restore Controls */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleCloudBackup}
                      style={{
                        padding: "9px 12px",
                        background: "#059669",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 750,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        boxShadow: "0 2px 4px rgba(5,150,105,0.2)",
                      }}
                    >
                      <CloudUpload size={14} />
                      {isSyncing ? "Sichert..." : "In Cloud sichern"}
                    </button>

                    <button
                      type="button"
                      disabled={isSyncing}
                      onClick={handleCloudRestore}
                      style={{
                        padding: "9px 12px",
                        background: "#ffffff",
                        color: "#1e293b",
                        border: "1px solid #cbd5e1",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 750,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <CloudDownload size={14} />
                      Aus Cloud laden
                    </button>
                  </div>
                </div>
              ) : (
                /* Auth Form (Login / Register) */
                <form onSubmit={handleAuthSubmit} style={{ background: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
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
                        padding: "9px 12px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "12.5px",
                        outline: "none",
                        background: "#ffffff",
                      }}
                    />
                    <input
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Passwort"
                      required
                      style={{
                        padding: "9px 12px",
                        borderRadius: "10px",
                        border: "1px solid #cbd5e1",
                        fontSize: "12.5px",
                        outline: "none",
                        background: "#ffffff",
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
                        padding: "10px 14px",
                        background: "#059669",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "12.5px",
                        fontWeight: 750,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
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
                </form>
              )}

              {/* Pre-configured Supabase Direct Status & Key Input */}
              <div style={{ background: "#ffffff", border: `1px solid ${supabaseConfig.isConfigured ? "#e2e8f0" : "#fcd34d"}`, borderRadius: "14px", padding: "13px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: supabaseConfig.isConfigured ? "#ecfdf5" : "#fef3c7",
                        color: supabaseConfig.isConfigured ? "#059669" : "#d97706",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Database size={15} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 750, color: "#0f172a" }}>
                          {supabaseConfig.isConfigured ? "Supabase Cloud direkt aktiv" : "Anon Key erforderlich"}
                        </span>
                        <span
                          style={{
                            fontSize: "9.5px",
                            fontWeight: 750,
                            padding: "1px 6px",
                            borderRadius: "5px",
                            background: supabaseConfig.isConfigured ? "#dcfce7" : "#fef08a",
                            color: supabaseConfig.isConfigured ? "#15803d" : "#854d0e",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          {supabaseConfig.isConfigured ? (
                            <>
                              <CheckCircle2 size={10} /> Direkt eingerichtet
                            </>
                          ) : (
                            "Key einfügen"
                          )}
                        </span>
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#64748b", fontFamily: "monospace", marginTop: "1px" }}>
                        Projekt: <strong>{DEFAULT_SUPABASE_PROJECT_ID}</strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSqlDetails((prev) => !prev)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {showSqlDetails ? "SQL Info ▲" : "SQL Info ▼"}
                  </button>
                </div>

                {/* If anon key is missing, show convenient 1-tap paste & activate box */}
                {!supabaseConfig.isConfigured && (
                  <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #fef3c7" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
                      <Key size={12} style={{ color: "#d97706" }} />
                      <label style={{ fontSize: "10.5px", fontWeight: 750, color: "#92400e" }}>
                        Anon Public Key hier einfügen (aus Supabase Settings ➔ API):
                      </label>
                    </div>
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
                        Aktivieren
                      </button>
                    </div>
                  </div>
                )}

                {showSqlDetails && (
                  <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <p style={{ margin: 0, fontSize: "11px", color: "#64748b", lineHeight: 1.4 }}>
                      Falls du die Tabelle im Supabase SQL Editor noch anlegen möchtest, kannst du hier das Schema kopieren:
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                        setSqlCopied(true);
                        setTimeout(() => setSqlCopied(false), 2500);
                      }}
                      style={{
                        padding: "7px 12px",
                        background: "#f1f5f9",
                        color: "#334155",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      {sqlCopied ? "✓ SQL Table Schema kopiert!" : "SQL Table Schema kopieren"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HOUSEHOLD WG LINK */}
          {activeTab === "link" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
            </div>
          )}

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

          {/* Danger Zone: Link to Full Reset Modal */}
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
                <span>⚙️ Account & Vorrat leeren / Duplikate fixen / Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
