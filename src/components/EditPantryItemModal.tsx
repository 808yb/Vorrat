import React, { useState, useEffect } from "react";
import { type PantryItem, getItemNutrientSpecs } from "../App";
import { ProductMark, getFoodTone } from "./FoodIcons";
import { findFoodNutrition } from "../data/foodNutritionDatabase";
import { Sparkles } from "lucide-react";

interface EditPantryItemModalProps {
  isOpen: boolean;
  item: PantryItem | null;
  onClose: () => void;
  onSave: (updatedItem: PantryItem) => void;
  onDelete: (id: number | string) => void;
}

export function EditPantryItemModal({
  isOpen,
  item,
  onClose,
  onSave,
  onDelete,
}: EditPantryItemModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Kühl");
  const [amountStr, setAmountStr] = useState("100");
  const [totalStr, setTotalStr] = useState("500");
  const [unit, setUnit] = useState("g");
  const [mhd, setMhd] = useState("");
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [calories, setCalories] = useState<number | "">("");
  const [protein, setProtein] = useState<number | "">("");
  const [carbs, setCarbs] = useState<number | "">("");
  const [fat, setFat] = useState<number | "">("");
  const [macroHint, setMacroHint] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      const unlimited = Boolean(
        item.isUnlimited ||
        item.name?.toLowerCase().includes("wasser") ||
        item.amount >= 99999
      );
      setName(item.name || "");
      setCategory(item.category || "Kühl");
      setIsUnlimited(unlimited);
      setAmountStr(unlimited ? "1000" : (item.amount !== undefined && item.amount !== null ? String(item.amount) : ""));
      setTotalStr(unlimited ? "1000" : (item.total ? String(item.total) : (item.amount ? String(item.amount) : "500")));
      setUnit(item.unit || "g");
      setMhd(item.mhd || "");
      setConfirmDelete(false);

      const specs = getItemNutrientSpecs(item);
      const realCal = typeof item.caloriesPer100g === "number" && item.caloriesPer100g > 0 && item.caloriesPer100g !== 180 ? item.caloriesPer100g : specs.caloriesPer100g;
      const realProt = typeof item.proteinPer100g === "number" && item.caloriesPer100g !== 180 ? item.proteinPer100g : specs.proteinPer100g;
      const realCarb = typeof item.carbsPer100g === "number" && item.caloriesPer100g !== 180 ? item.carbsPer100g : specs.carbsPer100g;
      const realFat = typeof item.fatPer100g === "number" && item.caloriesPer100g !== 180 ? item.fatPer100g : specs.fatPer100g;

      setCalories(realCal);
      setProtein(realProt);
      setCarbs(realCarb);
      setFat(realFat);
      setMacroHint(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleQuickMhd = (daysFromToday: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysFromToday);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    setMhd(`${yyyy}-${mm}-${dd}`);
  };

  const handleClearMhd = () => {
    setMhd("");
  };

  const stepAmount = (delta: number) => {
    const cur = Number(amountStr) || 0;
    const isSingleUnit = ["Stk.", "Bund", "Packung", "Dose", "Flasche"].includes(unit);
    const step = isSingleUnit ? 1 : 50;
    const next = Math.max(0, cur + delta * step);
    setAmountStr(String(next));
  };

  const numAmount = Number(amountStr);
  const isAmountValid = isUnlimited || (amountStr.trim() !== "" && !isNaN(numAmount) && numAmount > 0);

  const handleAutoMatchMacros = () => {
    const match = findFoodNutrition(name, category);
    setCalories(match.calories);
    setProtein(match.protein);
    setCarbs(match.carbs);
    setFat(match.fat);
    if (match.defaultUnit && ["g", "ml", "Stk.", "Bund"].includes(match.defaultUnit)) {
      setUnit(match.defaultUnit);
    }
    setMacroHint(`Erkannt: ${match.name} (${match.calories} kcal/100g)`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isAmountValid) return;

    const parsedAmount = isUnlimited ? 999999 : numAmount;
    const parsedTotal = isUnlimited ? 999999 : Math.max(parsedAmount, Number(totalStr) || parsedAmount);

    const updated: PantryItem = {
      ...item,
      name: name.trim(),
      category,
      isUnlimited,
      amount: parsedAmount,
      total: parsedTotal,
      unit: isUnlimited ? (unit || "ml") : unit,
      mhd: isUnlimited ? (mhd.trim() || "Unbegrenzt") : (mhd.trim() || undefined),
      tone: getFoodTone(name.trim(), category),
      caloriesPer100g: calories !== "" ? Number(calories) : undefined,
      proteinPer100g: protein !== "" ? Number(protein) : undefined,
      carbsPer100g: carbs !== "" ? Number(carbs) : undefined,
      fatPer100g: fat !== "" ? Number(fat) : undefined,
    };

    onSave(updated);
    onClose();
  };

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(item.id);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="edit-pantry-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="edit-modal-header">
          <div className="edit-header-left">
            <ProductMark tone={getFoodTone(name || item.name, category)} name={name || item.name} compact />
            <div>
              <h3>Vorrat bearbeiten</h3>
              <p>Details, Menge und Mindesthaltbarkeit anpassen</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="edit-modal-body hide-scrollbar">
          {/* Name Field */}
          <div className="edit-field-group">
            <label className="edit-field-label">Produktname</label>
            <input
              type="text"
              className="edit-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Basmati Reis"
              required
            />
          </div>

          {/* Category Chips */}
          <div className="edit-field-group">
            <label className="edit-field-label">Kategorie</label>
            <div className="edit-category-pills" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {[
                { id: "Kühl", label: "Kühlschrank" },
                { id: "Tiefkühl", label: "Tiefkühl" },
                { id: "Trocken", label: "Trockenvorrat" },
                { id: "Saucen", label: "Gewürze & Saucen" },
                { id: "Getränke", label: "Getränke" },
                { id: "Sonstiges", label: "Sonstiges" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`cat-pill-btn ${category === cat.id ? "active" : ""}`}
                  onClick={() => setCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Unbegrenzt Checkbox */}
          <div className={`edit-unlimited-toggle-wrap ${isUnlimited ? "active" : ""}`}>
            <label className="edit-unlimited-label">
              <input
                type="checkbox"
                checked={isUnlimited}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsUnlimited(checked);
                  if (checked && (!mhd || mhd.trim() === "")) {
                    setMhd("Unbegrenzt");
                  }
                }}
                className="edit-unlimited-checkbox"
              />
              <div className="unlimited-label-texts">
                <span className="unlimited-title">Unbegrenzt vorrätig</span>
                <span className="unlimited-sub">Für Vorräte wie Leitungswasser, Salz oder Grundgewürze</span>
              </div>
            </label>
          </div>

          {/* Stock Amounts & Unit OR Unlimited Banner */}
          {isUnlimited ? (
            <div className="unlimited-active-banner">
              <div className="unlimited-badge">∞ Immer vorrätig</div>
              <p>Keine Füllstandsmessung nötig – dieser Artikel steht in allen Rezepten und Wochenplänen unbegrenzt zur Verfügung.</p>
            </div>
          ) : (
            <div className="edit-amounts-grid">
              <div className="edit-field-group">
                <label className="edit-field-label">Aktueller Vorrat</label>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    type="button"
                    onClick={() => stepAmount(-1)}
                    style={{
                      width: "36px",
                      height: "38px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      fontSize: "16px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#334155"
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    className="edit-input"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="z. B. 250"
                    style={{ textAlign: "center" }}
                    required={!isUnlimited}
                  />
                  <button
                    type="button"
                    onClick={() => stepAmount(1)}
                    style={{
                      width: "36px",
                      height: "38px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      fontSize: "16px",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#334155"
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="edit-field-group">
                <label className="edit-field-label">Gesamtpackung</label>
                <input
                  type="number"
                  min="0"
                  className="edit-input"
                  value={totalStr}
                  onChange={(e) => setTotalStr(e.target.value)}
                  placeholder="z. B. 500"
                  required={!isUnlimited}
                />
              </div>
              <div className="edit-field-group">
                <label className="edit-field-label">Einheit</label>
                <select
                  className="edit-select"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  <option value="g">Gramm (g)</option>
                  <option value="ml">Milliliter (ml)</option>
                  <option value="Stk.">Stück (Stk.)</option>
                  <option value="Bund">Bund</option>
                  <option value="Packung">Packung (Pkg.)</option>
                  <option value="Dose">Dose</option>
                  <option value="Flasche">Flasche</option>
                  <option value="kg">Kilogramm (kg)</option>
                  <option value="l">Liter (l)</option>
                </select>
              </div>
            </div>
          )}

          {/* Mindesthaltbarkeitsdatum (MHD) Section */}
          <div className="edit-field-group mhd-section-group">
            <div className="mhd-header-row">
              <label className="edit-field-label">Mindesthaltbarkeitsdatum (MHD)</label>
              <span className={`mhd-preview-tag ${mhd ? "has-date" : "missing"}`}>
                {mhd ? `MHD: ${mhd.split("-").reverse().join(".")}` : "MHD: fehlt"}
              </span>
            </div>

            <div className="mhd-input-wrap">
              <input
                type="date"
                className="edit-input mhd-date-input"
                value={mhd}
                onChange={(e) => setMhd(e.target.value)}
              />
              {mhd && (
                <button
                  type="button"
                  className="mhd-clear-btn"
                  title="MHD entfernen (auf 'MHD: fehlt' setzen)"
                  onClick={handleClearMhd}
                >
                  ✕ Leeren
                </button>
              )}
            </div>

            {/* Quick date presets */}
            <div className="mhd-quick-presets">
              <span className="preset-label">Schnellwahl:</span>
              <button type="button" className="preset-btn" onClick={() => handleQuickMhd(3)}>
                +3 Tage
              </button>
              <button type="button" className="preset-btn" onClick={() => handleQuickMhd(7)}>
                +1 Woche
              </button>
              <button type="button" className="preset-btn" onClick={() => handleQuickMhd(30)}>
                +1 Monat
              </button>
              <button type="button" className="preset-btn" onClick={() => handleQuickMhd(180)}>
                +6 Monate
              </button>
            </div>
            <small className="mhd-hint">
              {mhd
                ? "Das Datum wird auf der Vorratskarte übersichtlich als MHD-Badge angezeigt."
                : "Ohne Angabe wird auf der Karte 'MHD: fehlt' eingeblendet."}
            </small>
          </div>

          {/* Nährwerte Section */}
          <div className="edit-field-group" style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <label className="edit-field-label" style={{ margin: 0 }}>Nährwerte pro 100g / 100ml</label>
              <button
                type="button"
                onClick={handleAutoMatchMacros}
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#047857",
                  borderRadius: "6px",
                  padding: "3px 8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <Sparkles size={12} />
                Makros ermitteln
              </button>
            </div>
            {macroHint && (
              <div style={{ fontSize: "11px", color: "#15803d", fontWeight: 600, marginBottom: "8px", background: "#dcfce7", padding: "4px 8px", borderRadius: "6px" }}>
                ✓ {macroHint}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
              <div>
                <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 700, display: "block", textAlign: "center", marginBottom: "2px" }}>KCAL</span>
                <input
                  type="number"
                  className="edit-input"
                  style={{ textAlign: "center", height: "36px", fontSize: "11px", fontWeight: 600 }}
                  value={calories}
                  onChange={(e) => setCalories(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Kcal"
                />
              </div>
              <div>
                <span style={{ fontSize: "9px", color: "#059669", fontWeight: 700, display: "block", textAlign: "center", marginBottom: "2px" }}>PROT (g)</span>
                <input
                  type="number"
                  className="edit-input"
                  style={{ textAlign: "center", height: "36px", fontSize: "11px", fontWeight: 600 }}
                  value={protein}
                  onChange={(e) => setProtein(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Prot"
                />
              </div>
              <div>
                <span style={{ fontSize: "9px", color: "#d97706", fontWeight: 700, display: "block", textAlign: "center", marginBottom: "2px" }}>CARB (g)</span>
                <input
                  type="number"
                  className="edit-input"
                  style={{ textAlign: "center", height: "36px", fontSize: "11px", fontWeight: 600 }}
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Carb"
                />
              </div>
              <div>
                <span style={{ fontSize: "9px", color: "#64748b", fontWeight: 700, display: "block", textAlign: "center", marginBottom: "2px" }}>FETT (g)</span>
                <input
                  type="number"
                  className="edit-input"
                  style={{ textAlign: "center", height: "36px", fontSize: "11px", fontWeight: 600 }}
                  value={fat}
                  onChange={(e) => setFat(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Fett"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="edit-modal-footer">
            <button
              type="button"
              className={`delete-pantry-btn ${confirmDelete ? "confirm" : ""}`}
              onClick={handleDeleteClick}
            >
              {confirmDelete ? "Wirklich löschen?" : "Löschen"}
            </button>
            <div className="footer-right-actions">
              <button type="button" className="cancel-edit-btn" onClick={onClose}>
                Abbrechen
              </button>
              <button
                type="submit"
                className="save-edit-btn"
                disabled={!name.trim() || !isAmountValid}
                style={{
                  opacity: (!name.trim() || !isAmountValid) ? 0.5 : 1,
                  cursor: (!name.trim() || !isAmountValid) ? "not-allowed" : "pointer"
                }}
              >
                {!isAmountValid ? "Menge eingeben" : "Speichern"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
