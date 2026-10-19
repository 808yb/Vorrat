import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  Cloud,
  CloudUpload,
  CloudDownload,
  LogIn,
  UserPlus,
  LogOut,
  Database,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Key,
  Settings,
  Download,
  Upload,
  Copy,
  FileText,
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
  SUPABASE_SQL_SETUP,
  DEFAULT_SUPABASE_PROJECT_ID,
  DEFAULT_SUPABASE_URL,
  displayUsernameFromEmail,
  type VorratSyncPayload,
} from "../utils/supabaseClient";
import { STORAGE_KEYS } from "../constants/storage";

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
  const [activeTab, setActiveTab] = useState<"cloud" | "backup">("cloud");

  // Household State
  const [householdName, setHouseholdName] = useState(() => {
    try {
      return (
        localStorage.getItem(STORAGE_KEYS.HOUSEHOLD_NAME) ||
        localStorage.getItem("forret_household_name") ||
        "Unsere Küche (WG & Familie)"
      );
    } catch {
      return "Unsere Küche (WG & Familie)";
    }
  });

  const [jsonCopied, setJsonCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    } catch {
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
        `vorrat-haushalt-${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      if (onNotify) onNotify("Haushalts-Backup als JSON heruntergeladen!");
    } catch (err) {
      console.error(err);
      if (onNotify) onNotify("Fehler beim Erstellen des Backups.");
    }
  };

  const handleCopyJson = () => {
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
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setJsonCopied(true);
      if (onNotify) onNotify("Haushalts-Daten in Zwischenablage kopiert!");
      setTimeout(() => setJsonCopied(false), 2200);
    } catch {
      if (onNotify) onNotify("Kopieren nicht unterstützt.");
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
          onNotify("Haushalts-Backup erfolgreich eingespielt!");
        }
      } catch (err: any) {
        console.error(err);
        if (onNotify) {
          onNotify(`Fehler beim JSON-Import: ${err?.message || "Ungültige Datei"}`);
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
      setLastSyncTime("Gerade eben");
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
                    flexShrink: 0,
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
              onClick={() => setActiveTab("backup")}
              style={{
                padding: "8px",
                borderRadius: "9px",
                border: "none",
                fontSize: "12px",
                fontWeight: 750,
                cursor: "pointer",
                background: activeTab === "backup" ? "#ffffff" : "transparent",
                color: activeTab === "backup" ? "#0f172a" : "#64748b",
                boxShadow: activeTab === "backup" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Users size={14} />
              <span>Haushalt & Backup</span>
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

                  {/* Auto-Sync Live Status */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      borderRadius: "10px",
                      padding: "8px 12px",
                      fontSize: "11.5px",
                      color: "#047857",
                      fontWeight: 650,
                      marginTop: "6px",
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
                      <strong>Automatischer Cloud-Sync aktiv:</strong> Jede Änderung an Vorrat & Einkaufsliste wird automatisch in Echtzeit gesichert.
                    </span>
                  </div>

                  {/* Backup & Restore Controls */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
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
                      {sqlCopied ? "SQL Table Schema kopiert!" : "SQL Table Schema kopieren"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HOUSEHOLD BACKUP & TRANSFER */}
          {activeTab === "backup" && (
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
                  placeholder="z.B. Familie Muster oder WG Sonnenallee"
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

              {/* Offline / JSON Backup & Sharing */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "16px",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <FileText size={16} color="#0f172a" />
                    <span style={{ fontSize: "13px", fontWeight: 750, color: "#0f172a" }}>
                      Lokales Haushalts-Backup (JSON)
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      background: "#2d5a3e",
                      color: "white",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    OFFLINE-SICHER
                  </span>
                </div>
                <p style={{ margin: "0 0 14px", fontSize: "11.5px", color: "#475569", lineHeight: 1.45 }}>
                  Sichere deinen aktuellen Vorrat, eigene Rezepte, Wochenpläne und Einkaufslisten als JSON-Datei oder teile sie direkt mit Mitbewohnern und Partnern per Datei oder Zwischenablage.
                </p>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImportJsonFile}
                  style={{ display: "none" }}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={handleExportJson}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#2d5a3e",
                        color: "white",
                        border: "none",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        boxShadow: "0 1px 2px rgba(45, 90, 62, 0.2)",
                      }}
                    >
                      <Download size={13} />
                      <span>JSON herunterladen</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: jsonCopied ? "#047857" : "#ffffff",
                        color: jsonCopied ? "white" : "#1e293b",
                        border: jsonCopied ? "1px solid #047857" : "1px solid #cbd5e1",
                        borderRadius: "10px",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 150ms ease",
                      }}
                    >
                      <Copy size={13} />
                      <span>{jsonCopied ? "Kopiert!" : "JSON kopieren"}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#ffffff",
                      color: "#1e293b",
                      border: "1px dashed #94a3b8",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <Upload size={13} />
                    <span>JSON-Backup wiederherstellen / importieren</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sync Stats & Honest Action Trigger */}
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
              <span>Status: <strong>{pantryCount} Produkte</strong> · <strong>{shoppingCount} Einkaufsartikel</strong></span>
              <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>
                {currentUserEmail
                  ? `Cloud-Sync aktiv (${displayUsernameFromEmail(currentUserEmail)}) · ${lastSyncTime}`
                  : "Lokal im Browser gespeichert (kein Cloud-Konto)"}
              </div>
            </div>
            {currentUserEmail ? (
              <button
                type="button"
                onClick={handleCloudBackup}
                disabled={isSyncing}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#1e293b",
                  cursor: isSyncing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span style={{ display: "inline-block", transform: isSyncing ? "rotate(180deg)" : "none", transition: "transform 400ms ease" }}>
                  <RefreshCw size={12} />
                </span>
                {isSyncing ? "Sichert..." : "In Cloud sichern"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportJson}
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
                <Download size={12} />
                JSON-Backup
              </button>
            )}
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
                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Settings className="w-3.5 h-3.5" /> Account & Vorrat leeren / Duplikate fixen / Reset</span>
              </button>
            </div>
          )}

          {/* Primary Bottom Close Button */}
          <div style={{ marginTop: "12px", paddingTop: "8px" }}>
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
