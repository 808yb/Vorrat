import React from "react";
import type { Tab } from "./BottomNav";
import { Icon } from "./UiIcons";

export interface AppHeaderProps {
  activeTab?: Tab;
  onOpenHousehold: () => void;
  syncStatus?: "idle" | "saving" | "saved" | "error";
  hasCloudUser?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenHousehold,
  syncStatus = "idle",
  hasCloudUser = false,
}) => {
  let label = "Lokal";
  let title = "Haushalt & Cloud-Sync einrichten";
  let statusClass = "";

  if (hasCloudUser) {
    if (syncStatus === "saving") {
      label = "Speichert…";
      title = "Speichere Daten in der Supabase Cloud…";
      statusClass = "syncing";
    } else if (syncStatus === "error") {
      label = "Sync-Fehler";
      title = "Cloud-Synchronisation fehlgeschlagen. Bitte Internetverbindung prüfen.";
      statusClass = "sync-error";
    } else {
      label = "Gespeichert";
      title = "Live Cloud-Sync aktiv (Supabase)";
      statusClass = "cloud-live";
    }
  }

  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark"><Icon name="leaf" size={17} /></div>
        <span>Vorrat</span>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className={`sync-state ${statusClass}`}
          onClick={onOpenHousehold}
          title={title}
          aria-label={`Haushalt & Cloud-Sync (${label})`}
        >
          <span className="sync-dot" />
          <span className="sync-label">{label}</span>
        </button>
      </div>
    </header>
  );
};
