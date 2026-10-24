import { useState, useMemo } from "react";
import { Icon, Button, type GroceryItem } from "../App";
import { ProductMark, getFoodTone } from "../components/FoodIcons";

export interface GroceriesScreenProps {
  groceries: GroceryItem[];
  onComplete: (checkedIds: number[]) => void;
  onToggleItem: (id: number) => void;
  onDeleteGrocery: (id: number) => void;
  onClearGroceries?: () => void;
  onNavigateToPlanner?: () => void;
  onNotify?: (message: string) => void;
}

export function GroceriesScreen({
  groceries,
  onComplete,
  onToggleItem,
  onDeleteGrocery,
  onClearGroceries,
  onNavigateToPlanner,
  onNotify,
}: GroceriesScreenProps) {
  const [checked, setChecked] = useState<number[]>([]);

  const activeChecked = checked.filter((id) => groceries.some((g) => g.id === id));
  const groups = Array.from(new Set(groceries.map((item) => item.category)));

  const totalCost = useMemo(() => {
    return groceries
      .reduce((sum, item) => {
        const num = parseFloat(item.price.replace("€", "").replace(",", ".").trim());
        return sum + (isNaN(num) ? 0 : num);
      }, 0)
      .toFixed(2)
      .replace(".", ",");
  }, [groceries]);

  const toggle = (id: number) => {
    setChecked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
    onToggleItem(id);
  };

  const hasPlannerItems = groceries.some(
    (g) => g.reason.toLowerCase().includes("planer") || g.reason.toLowerCase().includes("wochenplan")
  );

  return (
    <main className="screen shop-screen">
      <section className="title-row">
        <div>
          <p className="eyebrow">Deine Einkaufsliste</p>
          <h1>Einkauf</h1>
        </div>
        <div className="summary-pill">
          <span>{groceries.length}</span> Artikel
        </div>
      </section>

      <section className="budget-card">
        <div className="budget-top">
          <div>
            <p>Geschätzte Gesamtsumme</p>
            <strong>{totalCost} €</strong>
          </div>
          <div className="budget-icon">
            <Icon name="cart" size={22} />
          </div>
        </div>
        <div className="savings-row">
          <span>
            <Icon name="check" size={14} /> {activeChecked.length} von {groceries.length} Artikeln abgehakt
          </span>
          <strong>
            {groceries.length === 0
              ? "Alles erledigt"
              : activeChecked.length === groceries.length
                ? "Vollständig"
                : `${groceries.length - activeChecked.length} noch offen`}
          </strong>
        </div>
      </section>

      {/* Wochenplaner Sync-Banner */}
      {hasPlannerItems && onNavigateToPlanner && (
        <div
          className="planner-sync-banner"
          onClick={onNavigateToPlanner}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "14px",
            margin: "4px 0 12px",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="calendar" size={17} />
            <div>
              <strong style={{ fontSize: "12px", color: "#065f46", display: "block" }}>
                Wocheneinkauf aus Mahlzeiten-Planer integriert
              </strong>
              <small style={{ fontSize: "11px", color: "#047857" }}>
                Zutaten für deine geplanten Wochentage
              </small>
            </div>
          </div>
          <span style={{ fontSize: "12px", color: "#059669", fontWeight: "700" }}>
            Zum Planer →
          </span>
        </div>
      )}

      {groceries.length === 0 ? (
        <div className="saved-meals-empty-card" style={{ margin: "24px 0" }}>
          <div className="empty-icon-circle">
            <Icon name="cart" size={24} />
          </div>
          <h3>Einkaufsliste ist leer</h3>
          <p>
            Alle markierten Artikel wurden eingekauft und in deinen Vorrat eingebucht. Wenn beim Kochen Zutaten zur Neige gehen oder du im Planer Mahlzeiten einträgst, erscheinen sie automatisch wieder hier.
          </p>
          {onNavigateToPlanner && (
            <button
              type="button"
              className="primary-button"
              onClick={onNavigateToPlanner}
              style={{ marginTop: "12px", width: "auto", padding: "0 22px", height: "42px" }}
            >
              <span>Mahlzeiten im Planer einteilen</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="list-meta">
            <span>
              <strong>{groceries.length}</strong> Artikel in {groups.length} Kategorien
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span>{activeChecked.length} erledigt</span>
              {onClearGroceries && (
                <button
                  type="button"
                  onClick={onClearGroceries}
                  style={{
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#e11d48",
                    fontSize: "11px",
                    fontWeight: 650,
                    padding: "3px 8px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 140ms ease",
                  }}
                  title="Alle Artikel aus der Einkaufsliste löschen"
                >
                  <Icon name="trash" size={12} />
                  <span>Einkauf leeren</span>
                </button>
              )}
            </div>
          </div>

          <div className="grocery-groups">
            {groups.map((group) => {
              const itemsInGroup = groceries.filter((item) => item.category === group);
              return (
                <section className="grocery-group" key={group}>
                  <div className="group-heading">
                    <h2>{group}</h2>
                    <span>{itemsInGroup.length}</span>
                  </div>
                  <div className="grocery-list">
                    {itemsInGroup.map((item) => {
                      const isChecked = activeChecked.includes(item.id);
                      const isFromPlanner =
                        item.reason.toLowerCase().includes("planer") ||
                        item.reason.toLowerCase().includes("wochenplan");
                      return (
                        <div
                          key={item.id}
                          style={{ position: "relative", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <button
                            className={`grocery-item ${isChecked ? "checked" : ""}`}
                            onClick={() => toggle(item.id)}
                            type="button"
                            style={{ flex: 1, alignItems: "center" }}
                          >
                            <span className="check-circle">
                              {isChecked && <Icon name="check" size={15} strokeWidth={2.4} />}
                            </span>
                            <ProductMark tone={getFoodTone(item.name)} name={item.name} compact />
                            <span className="grocery-copy">
                              <span className="grocery-line">
                                <strong>{item.name}</strong>
                                <b>{item.price}</b>
                              </span>
                              <span className="grocery-quantity">{item.quantity}</span>
                              <span className={`reason-tag ${isFromPlanner ? "planner-origin-tag" : ""}`}>
                                {item.reason}
                              </span>
                            </span>
                          </button>
                          {onDeleteGrocery && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteGrocery(item.id);
                              }}
                              title="Artikel löschen"
                              aria-label={`${item.name} löschen`}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#94a3b8",
                                cursor: "pointer",
                                padding: "8px 10px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "8px",
                                fontSize: "16px",
                                lineHeight: 1,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="shopping-footer" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Button
              className="primary-button checkout-button"
              onClick={() => {
                if (activeChecked.length === 0) {
                  onNotify?.("Bitte hake mindestens einen gekauften Artikel ab.");
                  return;
                }
                onComplete(activeChecked);
                setChecked((prev) => prev.filter((id) => !activeChecked.includes(id)));
              }}
              disabled={activeChecked.length === 0}
              style={{
                opacity: activeChecked.length === 0 ? 0.6 : 1,
                cursor: activeChecked.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              <span>Einkauf abschließen</span>
              <span>
                {activeChecked.length} {activeChecked.length === 1 ? "Artikel" : "Artikel"} in Vorrat buchen{" "}
                <Icon name="chevron" size={16} />
              </span>
            </Button>
            {onClearGroceries && (
              <button
                type="button"
                onClick={onClearGroceries}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "4px 8px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#e11d48")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >
                <Icon name="trash" size={13} />
                <span>Einkaufsliste leeren</span>
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}

// Re-export as ShoppingScreen for backward compatibility
export const ShoppingScreen = GroceriesScreen;
