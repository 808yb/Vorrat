import React, { useState, useEffect } from "react";
import { type PantryItem } from "../App";
import { ProductMark, getFoodTone } from "./FoodIcons";

interface EditPantryItemModalProps {
  isOpen: boolean;
  item: PantryItem | null;
  onClose: () => void;
  onSave: (updatedItem: PantryItem) => void;
  onDelete: (id: number) => void;
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
  const [amount, setAmount] = useState<number>(100);
  const [total, setTotal] = useState<number>(500);
  const [unit, setUnit] = useState("g");
  const [mhd, setMhd] = useState("");
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      setAmount(unlimited ? 1000 : (item.amount ?? 0));
      setTotal(unlimited ? 1000 : (item.total || 500));
      setUnit(item.unit || "g");
      setMhd(item.mhd || "");
      setConfirmDelete(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updated: PantryItem = {
      ...item,
      name: name.trim(),
      category,
      isUnlimited,
      amount: isUnlimited ? 999999 : Math.max(0, Number(amount) || 0),
      total: isUnlimited ? 999999 : Math.max(1, Number(total) || 1),
      unit: isUnlimited ? (unit || "ml") : unit,
      mhd: isUnlimited ? (mhd.trim() || "Unbegrenzt") : (mhd.trim() || undefined),
      tone: getFoodTone(name.trim(), category),
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
              <p>Details und Mindesthaltbarkeit anpassen</p>
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
            <div className="edit-category-pills">
              {["Kühl", "Trocken", "Saucen"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`cat-pill-btn ${category === cat ? "active" : ""}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat === "Kühl" && "Kühlschrank"}
                  {cat === "Trocken" && "Trockenvorrat"}
                  {cat === "Saucen" && "Saucen & Gewürze"}
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
                <input
                  type="number"
                  min="0"
                  className="edit-input"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required={!isUnlimited}
                />
              </div>
              <div className="edit-field-group">
                <label className="edit-field-label">Gesamtpackung</label>
                <input
                  type="number"
                  min="1"
                  className="edit-input"
                  value={total}
                  onChange={(e) => setTotal(Number(e.target.value))}
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
              <button type="submit" className="save-edit-btn">
                Speichern
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
