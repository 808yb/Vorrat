import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { ProductMark } from "../components/FoodIcons";
import { Icon, Button, type PantryItem, type IconName } from "../App";
import {
  isItemExpiringSoonOrCritical,
  formatMhdDisplay,
  getMhdStatus,
  getItemNutrientSpecs,
} from "../App";
import {
  getAmbiguousIngredientTag,
  isSpiceOrKitchenBasic,
} from "../utils/pantryMatching";

export const PANTRY_CATEGORY_GROUPS: Array<{
  id: string;
  name: string;
  iconName: IconName;
  chip: string;
}> = [
  { id: "Kühl", name: "Kühlschrank", iconName: "fridge", chip: "Kühlschrank" },
  { id: "Tiefkühl", name: "Tiefkühl (TK)", iconName: "snowflake", chip: "Tiefkühl" },
  { id: "Trocken", name: "Trockenvorrat", iconName: "can", chip: "Trockenvorrat" },
  { id: "Saucen", name: "Gewürze & Saucen", iconName: "sparkles", chip: "Gewürze & Saucen" },
  { id: "Getränke", name: "Getränke", iconName: "bottle", chip: "Getränke" },
  { id: "Sonstiges", name: "Sonstiges", iconName: "package", chip: "" },
];

export function getCategoryGroupKey(cat: string): string {
  const c = (cat || "").toLowerCase();
  if (c.includes("tief") || c.includes("tk") || c.includes("gefrier")) return "Tiefkühl";
  if (c.includes("kühl")) return "Kühl";
  if (
    c.includes("trocken") ||
    c.includes("reis") ||
    c.includes("nudel") ||
    c.includes("mehl") ||
    c.includes("hafer") ||
    c.includes("grund")
  )
    return "Trocken";
  if (
    c.includes("sauc") ||
    c.includes("gewürz") ||
    c.includes("öl") ||
    c.includes("essig") ||
    c.includes("dressing")
  )
    return "Saucen";
  if (
    c.includes("getränk") ||
    c.includes("saft") ||
    c.includes("wasser") ||
    c.includes("tee") ||
    c.includes("kaffee")
  )
    return "Getränke";
  return "Sonstiges";
}

export interface PantryScreenProps {
  pantry: PantryItem[];
  updateAmount: (id: number | string, delta: number) => void;
  onUpdateCategory?: (id: number | string, newCategory: string) => void;
  onOpenAddModal: (initialMode?: "menu" | "camera" | "receipt" | "manual") => void;
  onEditItem: (item: PantryItem) => void;
  onDeleteItem: (id: number | string) => void;
  onOpenReset?: () => void;
  onCookFromExpiring?: (urgentItemNames: string[]) => void;
  onResetDemo?: () => void;
  onLoadDemoPantry?: () => void;
  savedWasteStats?: { count: number; money: number };
  onAddToGroceries?: (name: string, amount?: string) => void;
}

export function PantryScreen({
  pantry,
  updateAmount,
  onOpenAddModal,
  onEditItem,
  onOpenReset,
  onCookFromExpiring,
  onResetDemo,
  onLoadDemoPantry,
  savedWasteStats,
  onAddToGroceries,
}: PantryScreenProps) {
  const [filter, setFilter] = useState("Alle");
  const [search, setSearch] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const toggleCat = (catId: string) => {
    setCollapsedCats((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const urgentItems = useMemo(() => {
    return pantry.filter((item) => isItemExpiringSoonOrCritical(item));
  }, [pantry]);

  const wasteStats = savedWasteStats ?? { count: 0, money: 0 };

  const chips = [
    "Alle",
    ...(urgentItems.length > 0 ? [`Dringend (${urgentItems.length})`] : ["Dringend"]),
    "Kühlschrank",
    "Tiefkühl",
    "Trockenvorrat",
    "Gewürze & Saucen",
    "Getränke",
  ];

  const visible = pantry.filter((item) => {
    const isUrgent = isItemExpiringSoonOrCritical(item);
    const catKey = getCategoryGroupKey(item.category);

    const categoryMatch =
      filter === "Alle" ||
      (filter.startsWith("Dringend") && isUrgent) ||
      (filter === "Kühlschrank" && catKey === "Kühl") ||
      (filter === "Tiefkühl" && catKey === "Tiefkühl") ||
      (filter === "Trockenvorrat" && catKey === "Trocken") ||
      (filter === "Gewürze & Saucen" && catKey === "Saucen") ||
      (filter === "Getränke" && catKey === "Getränke");
    return categoryMatch && item.name.toLowerCase().includes(search.toLowerCase());
  });

  const renderProductCard = (item: PantryItem) => {
    const isUnlimited = Boolean(
      item.isUnlimited || item.name.toLowerCase().includes("wasser") || item.amount >= 99999
    );
    const percent = isUnlimited ? 100 : Math.min(100, Math.round((item.amount / item.total) * 100));
    const status = isUnlimited ? "Vorhanden" : percent === 0 ? "Leer" : percent <= 25 ? "Niedrig" : "Vorhanden";
    const step = item.unit === "g" ? 50 : item.unit === "ml" ? 25 : 1;
    const mhdStatus = getMhdStatus(item.mhd);
    const hasRealMhd = mhdStatus !== "missing";

    return (
      <article
        className="product-card clickable"
        key={item.id}
        onClick={() => onEditItem(item)}
      >
        <ProductMark tone={item.tone} name={item.name} category={item.category} />
        <div className="product-content">
          <div className="product-heading">
            <div className="product-title-row" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <h3>{item.name}</h3>
              {(() => {
                const tag = getAmbiguousIngredientTag(item.name, item.unit, item.category);
                if (!tag) return null;
                return (
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 750,
                      padding: "1px 5px",
                      borderRadius: "4px",
                      background: tag === "Gemüse" ? "#ecfdf5" : "#fef3c7",
                      color: tag === "Gemüse" ? "#065f46" : "#92400e",
                      border: `1px solid ${tag === "Gemüse" ? "#a7f3d0" : "#fde68a"}`,
                      display: "inline-block",
                    }}
                  >
                    {tag}
                  </span>
                );
              })()}
            </div>
            <span className={`status ${status.toLowerCase()}`}>
              {isUnlimited ? "Unbegrenzt" : status}
            </span>
          </div>

          <div className="product-sub-row">
            {hasRealMhd && (
              <span className={`mhd-badge ${mhdStatus}`}>
                {formatMhdDisplay(item.mhd)}
              </span>
            )}
            {(() => {
              const specs = getItemNutrientSpecs(item);
              return (
                <span
                  className="product-macro-badge"
                  title={`Makros pro 100g: ${specs.caloriesPer100g} kcal · ${specs.proteinPer100g}g Protein · ${specs.carbsPer100g}g Carbs · ${specs.fatPer100g}g Fett`}
                >
                  <strong style={{ color: "#0f172a" }}>{specs.caloriesPer100g}</strong> kcal
                  <span style={{ color: "#cbd5e1" }}>·</span>
                  <strong style={{ color: "#059669" }}>{specs.proteinPer100g}g</strong> P
                </span>
              );
            })()}
          </div>
          <div className="stock-row">
            {isSpiceOrKitchenBasic(item.name, item.category) ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#065f46",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>🧂</span>
                  <span>Gewürzglas · Vorhanden</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAddToGroceries) {
                      onAddToGroceries(item.name, "1 Glas");
                    }
                  }}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    fontSize: "10.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    flexShrink: 0,
                  }}
                  title="Gewürz auf Einkaufsliste setzen"
                >
                  <span>🛒</span>
                  <span>Nachkaufen</span>
                </button>
              </div>
            ) : isUnlimited ? (
              <span className="unlimited-stock-badge" style={{ color: "#2d5a3e", fontWeight: 700, fontSize: "12px" }}>
                ∞ Immer vorrätig
              </span>
            ) : (
              <span>
                {item.amount}{item.unit} <small>/ {item.total}{item.unit}</small>
              </span>
            )}
            {!isUnlimited && !isSpiceOrKitchenBasic(item.name, item.category) && (
              <div className="stepper" onClick={(e) => e.stopPropagation()}>
                <Button
                  className="stepper-button"
                  onClick={() => updateAmount(item.id, -step)}
                >
                  <Icon name="minus" size={14} />
                </Button>
                <Button
                  className="stepper-button plus"
                  onClick={() => updateAmount(item.id, step)}
                >
                  <Icon name="plus" size={14} />
                </Button>
              </div>
            )}
          </div>
          {!isSpiceOrKitchenBasic(item.name, item.category) && (
            <div className="progress-track">
              <motion.div
                className={`progress-bar-fill ${isUnlimited ? "vorhanden" : status.toLowerCase()}`}
                initial={false}
                animate={{ width: `${percent}%` }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 24,
                  mass: 0.6,
                }}
              />
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <main className="screen pantry-screen">
      <section className="title-row">
        <div><p className="eyebrow">Deine Küche</p><h1>Vorrat</h1></div>
        <div className="summary-pill"><span>{pantry.length}</span> Produkte</div>
      </section>

      {/* Onboarding Empty State in Nordic Design when pantry is completely empty */}
      {pantry.length === 0 ? (
        <section
          style={{
            margin: "20px 0 32px",
            padding: "36px 24px",
            textAlign: "center",
            background: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#ebf3ee",
              color: "#059669",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              border: "1px solid #c6dcce",
            }}
          >
            <Icon name="archive" size={28} />
          </div>

          <h2 style={{ margin: "0 0 8px", fontSize: "19px", color: "#0f172a", fontWeight: 750 }}>
            Dein Vorrat ist noch leer
          </h2>
          <p
            style={{
              margin: "0 auto 24px",
              fontSize: "13.5px",
              color: "#64748b",
              lineHeight: 1.55,
              maxWidth: "340px",
            }}
          >
            Scanne deinen ersten Kassenbon oder füge Vorräte hinzu, um passende Rezepte und MHD-Erinnerungen zu erhalten.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "340px", margin: "0 auto" }}>
            {/* Button 1: Primär (Waldgrün) -> Bon-Scan */}
            <button
              type="button"
              className="primary-button"
              onClick={() => onOpenAddModal("receipt")}
              style={{
                height: "44px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                color: "#ffffff",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
              }}
            >
              <span>📸</span>
              <span>Ersten Kassenbon scannen</span>
            </button>

            {/* Button 2: Sekundär -> Manuell / Barcode */}
            <button
              type="button"
              onClick={() => onOpenAddModal("menu")}
              style={{
                height: "42px",
                borderRadius: "10px",
                fontSize: "12.5px",
                fontWeight: 650,
                background: "#f8fafc",
                color: "#334155",
                border: "1px solid #cbd5e1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <span>➕</span>
              <span>Artikel manuell / per Barcode hinzufügen</span>
            </button>

            {/* Button 3: Dezent darunter -> Beispiel-Vorrat laden */}
            {(onLoadDemoPantry || onResetDemo) && (
              <button
                type="button"
                onClick={onLoadDemoPantry || onResetDemo}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "6px 8px",
                  marginTop: "6px",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                }}
              >
                🧪 Beispiel-Vorrat zum Testen laden (34 Artikel)
              </button>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* Food Waste Retter Alert Banner */}
          {urgentItems.length > 0 && (
            <div className="food-waste-alert-banner">
              <div className="food-waste-header">
                <span className="waste-badge" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Icon name="alert" size={13} /> Food-Waste Alarm
                </span>
                <span className="waste-count">
                  {urgentItems.length} {urgentItems.length === 1 ? "Zutat läuft bald ab" : "Zutaten laufen bald ab"}
                </span>
              </div>
              <p className="waste-names">
                {urgentItems.map((u) => u.name).slice(0, 4).join(" · ")}
              </p>
              <div className="waste-action-row">
                <button
                  type="button"
                  className="waste-cook-btn"
                  onClick={() => {
                    if (onCookFromExpiring) {
                      onCookFromExpiring(urgentItems.map((u) => u.name));
                    }
                  }}
                >
                  <span>Aus Resten kochen</span>
                  <Icon name="chevron" size={14} />
                </button>
                <div className="waste-saved-pill" title="Bereits gerettete Lebensmittel">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Icon name="leaf" size={12} /> Bisher gerettet: {wasteStats.count} Zutaten (~{wasteStats.money.toFixed(0)} €)
                  </span>
                </div>
              </div>
            </div>
          )}

          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Vorrat durchsuchen"
            />
            {search && (
              <Button className="clear-button" onClick={() => setSearch("")}>
                <Icon name="close" size={15} />
              </Button>
            )}
          </label>

          <div className="chip-row hide-scrollbar">
            {chips.map((chip) => (
              <Button
                key={chip}
                className={`chip ${filter === chip ? "active" : ""}`}
                onClick={() => setFilter(chip)}
              >
                {chip}
              </Button>
            ))}
          </div>

          <div className="section-heading">
            <div><h2>Lebensmittel</h2><p>In Kategorien geordnet · Nach Füllstand sortiert</p></div>
          </div>

          {/* Product List Grouped into Dropdown Accordions */}
          {filter === "Alle" ? (
            <div className="pantry-category-sections">
              {PANTRY_CATEGORY_GROUPS.map((group) => {
                const itemsInGroup = visible.filter(
                  (item) => getCategoryGroupKey(item.category) === group.id
                );
                if (itemsInGroup.length === 0) return null;
                const isCollapsed = Boolean(collapsedCats[group.id]);

                return (
                  <div key={group.id} className="pantry-category-group">
                    <button
                      type="button"
                      className="pantry-category-header"
                      onClick={() => toggleCat(group.id)}
                      aria-expanded={!isCollapsed}
                    >
                      <div className="pantry-cat-title">
                        <span className="pantry-cat-icon" style={{ display: "inline-flex", alignItems: "center" }}>
                          <Icon name={group.iconName} size={15} />
                        </span>
                        <h3>{group.name}</h3>
                        <span className="pantry-cat-count">{itemsInGroup.length}</span>
                      </div>
                      <span className={`pantry-cat-chevron ${isCollapsed ? "collapsed" : ""}`}>
                        <Icon name="chevron" size={14} />
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="inventory-list">
                        {itemsInGroup.map(renderProductCard)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="inventory-list">
              {visible.map(renderProductCard)}
            </div>
          )}

          {visible.length === 0 && (
            <div
              style={{
                padding: "36px 20px",
                textAlign: "center",
                background: "#ffffff",
                borderRadius: "18px",
                border: "1.5px dashed #cbd5e1",
                margin: "12px 0",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#f1f5f9",
                  color: "#64748b",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 12px",
                }}
              >
                <Icon name="archive" size={24} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: "15px", color: "#0f172a", fontWeight: 750 }}>
                Keine Treffer gefunden
              </h3>
              <p style={{ margin: "0 auto 14px", fontSize: "12.5px", color: "#64748b", maxWidth: "280px" }}>
                Keine Vorräte für den Filter «{filter}» vorhanden.
              </p>
            </div>
          )}

          {/* Bottom Management & Reset Action */}
          {onOpenReset && (
            <div className="pantry-bottom-actions">
              <button
                type="button"
                className="pantry-bottom-reset-btn"
                onClick={onOpenReset}
                title="Vorrat verwalten / Duplikate fixen / Reset"
              >
                <Icon name="trash" size={13} />
                <span>Vorrat verwalten, Duplikate bereinigen & Reset</span>
              </button>
            </div>
          )}
        </>
      )}

      <Button className="fab" title="Produkt hinzufügen" onClick={() => onOpenAddModal("menu")}>
        <Icon name="plus" size={24} />
      </Button>
    </main>
  );
}
