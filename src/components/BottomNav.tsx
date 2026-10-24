import React from "react";
import { Icon, type IconName } from "./UiIcons";

export type Tab = "pantry" | "discover" | "planner" | "cook" | "shop";

export interface BottomNavProps {
  active: Tab;
  pantryBadge?: number;
  shoppingCount?: number;
  savedCount?: number;
  plannedCount?: number;
  onChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  active,
  pantryBadge = 0,
  shoppingCount = 0,
  onChange,
}) => {
  const items: { id: Tab; label: string; icon: IconName; count?: number; badgeStyle?: "warning" | "shop" }[] = [
    {
      id: "pantry",
      label: "Vorrat",
      icon: "archive",
      count: pantryBadge > 0 ? pantryBadge : undefined,
      badgeStyle: "warning",
    },
    { id: "discover", label: "Entdecken", icon: "sparkles" },
    { id: "planner", label: "Planer", icon: "calendar" },
    { id: "cook", label: "Kochbuch", icon: "book" },
    {
      id: "shop",
      label: "Einkauf",
      icon: "cart",
      count: shoppingCount > 0 ? shoppingCount : undefined,
      badgeStyle: "shop",
    },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${active === item.id ? "active" : ""}`}
          onClick={() => onChange(item.id)}
          type="button"
          aria-label={item.label}
        >
          <span className="nav-icon">
            <Icon name={item.icon} size={20} strokeWidth={active === item.id ? 2.2 : 1.8} />
            {item.count !== undefined && item.count > 0 && (
              <b className={item.badgeStyle === "shop" ? "badge-shop" : "badge-warning"}>
                {item.count}
              </b>
            )}
          </span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
