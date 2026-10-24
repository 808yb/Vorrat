import { useState, useEffect, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { ProductMark, getFoodTone } from "./FoodIcons";
import { searchProductsInOFF, type OFFProduct } from "../utils/openFoodFacts";
import { findFoodNutrition, type FoodNutritionInfo } from "../data/foodNutritionDatabase";
import { BarcodeScanTab } from "./add-modal/BarcodeScanTab";
import { ReceiptScanTab } from "./add-modal/ReceiptScanTab";

export type AddMode = "menu" | "camera" | "receipt" | "manual";

export interface ScannedMultiItem {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  amount: number;
  total: number;
  unit: string;
  category: string;
  tone: string;
  nutriScore: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mhd?: string;
  isLoading?: boolean;
}

interface UnifiedAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  groceries?: Array<{ id: number | string; name: string; category?: string; checked?: boolean; [key: string]: any }>;
  onAddProduct: (item: {
    name: string;
    category: string;
    amount: number;
    total: number;
    unit: string;
    tone: string;
    minAmount?: number;
    caloriesPer100g?: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    fatPer100g?: number;
    isUnlimited?: boolean;
    mhd?: string;
  }) => void;
  onImportReceipt?: (importedItems: Array<{
    name: string;
    category: string;
    amount: number;
    total: number;
    unit: string;
    tone: string;
    price?: number;
    minAmount?: number;
    caloriesPer100g?: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    fatPer100g?: number;
    isUnlimited?: boolean;
    mhd?: string;
  }>) => void;
  onAddItems?: (importedItems: Array<{
    name: string;
    category: string;
    amount: number;
    total: number;
    unit: string;
    tone: string;
    price?: number;
    minAmount?: number;
    caloriesPer100g?: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    fatPer100g?: number;
    isUnlimited?: boolean;
    mhd?: string;
  }>) => void;
  onNotify?: (msg: string) => void;
  initialMode?: AddMode;
}

export function UnifiedAddModal({
  isOpen,
  onClose,
  groceries = [],
  onAddProduct,
  onImportReceipt,
  onAddItems,
  onNotify,
  initialMode = "menu",
}: UnifiedAddModalProps) {
  const [activeMode, setActiveMode] = useState<AddMode>(initialMode);

  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Live Database Search suggestions within Unified mode
  const [offSearchResults, setOffSearchResults] = useState<OFFProduct[]>([]);
  const [isOffSearching, setIsOffSearching] = useState(false);
  const [selectedMatchedProduct, setSelectedMatchedProduct] = useState<OFFProduct | null>(null);

  // Manual Form State
  const [manualName, setManualName] = useState("");
  const [manualCategory, setManualCategory] = useState("Kühl");
  const [manualIsUnlimited, setManualIsUnlimited] = useState(false);
  const [manualAmountStr, setManualAmountStr] = useState("500");
  const [manualTotalStr, setManualTotalStr] = useState("500");
  const [manualUnit, setManualUnit] = useState("g");
  const [manualMhd, setManualMhd] = useState("");
  const [manualCalories, setManualCalories] = useState<number | "">("");
  const [manualProtein, setManualProtein] = useState<number | "">("");
  const [manualCarbs, setManualCarbs] = useState<number | "">("");
  const [manualFat, setManualFat] = useState<number | "">("");
  const [detectedNutrition, setDetectedNutrition] = useState<FoodNutritionInfo | null>(null);
  const [isMacroAutoFilled, setIsMacroAutoFilled] = useState(false);

  // Auto-detect macros and default packaging when typing food name
  useEffect(() => {
    const q = manualName.trim();
    if (!q || q.length < 2) {
      setDetectedNutrition(null);
      return;
    }

    const match = findFoodNutrition(q, manualCategory);
    setDetectedNutrition(match);

    if (manualCalories === "" || isMacroAutoFilled) {
      setManualCalories(match.calories);
      setManualProtein(match.protein);
      setManualCarbs(match.carbs);
      setManualFat(match.fat);
      setIsMacroAutoFilled(true);

      if (match.source === "bls" || match.source === "usda") {
        if (match.category && match.category !== "Sonstiges") {
          setManualCategory(match.category as any);
        }
        if (match.defaultUnit) {
          setManualUnit(match.defaultUnit);
        }
        if (match.weightPerUnit && match.defaultUnit !== "g" && match.defaultUnit !== "ml") {
          setManualAmountStr(String(1));
          setManualTotalStr(String(1));
        }
      }
    }
  }, [manualName]);

  // Live search in Open Food Facts when typing in Unified mode
  useEffect(() => {
    const q = manualName.trim();
    if (!q || q.length < 2) {
      setOffSearchResults([]);
      setIsOffSearching(false);
      return;
    }

    if (selectedMatchedProduct && selectedMatchedProduct.name.trim().toLowerCase() === q.toLowerCase()) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsOffSearching(true);
      try {
        const results = await searchProductsInOFF(q);
        setOffSearchResults(results);
      } catch (err) {
        console.error("OFF search error:", err);
      } finally {
        setIsOffSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [manualName, selectedMatchedProduct]);

  // Reset all state when closing or switching
  const handleClose = () => {
    setActiveMode("menu");
    setSelectedMatchedProduct(null);
    setOffSearchResults([]);
    setIsOffSearching(false);
    onClose();
  };

  const handleBackToMenu = () => {
    setActiveMode("menu");
    setSelectedMatchedProduct(null);
    setOffSearchResults([]);
    setIsOffSearching(false);
  };

  const handleApplySearchResultToForm = (prod: OFFProduct) => {
    setManualName(prod.name);
    setManualCategory(prod.category || "Kühl");
    setManualUnit(prod.unit || "g");
    setManualAmountStr(String(prod.amount || 500));
    setManualTotalStr(String(prod.total || prod.amount || 500));
    setManualCalories(prod.calories);
    setManualProtein(prod.protein);
    setManualCarbs(prod.carbs);
    setManualFat(prod.fat);
    setSelectedMatchedProduct(prod);
    setOffSearchResults([]);
    setIsMacroAutoFilled(true);
    if (onNotify) {
      onNotify(`Produkt «${prod.name}» übernommen (${prod.calories} kcal/100g)`);
    }
  };


  // Manual Submit
  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const numAmount = Number(manualAmountStr);
    if (!manualIsUnlimited && (!manualAmountStr.trim() || isNaN(numAmount) || numAmount <= 0)) {
      return;
    }

    const isUnlimited = manualIsUnlimited || manualName.toLowerCase().includes("wasser");
    const detectedTone = getFoodTone(manualName, manualCategory);
    const parsedAmount = isUnlimited ? 999999 : numAmount;
    const parsedTotal = isUnlimited ? 999999 : Math.max(parsedAmount, Number(manualTotalStr) || parsedAmount);

    const detected = findFoodNutrition(manualName, manualCategory);

    onAddProduct({
      name: manualName.trim(),
      category: manualCategory,
      amount: parsedAmount,
      total: parsedTotal,
      unit: manualUnit,
      tone: detectedTone,
      minAmount: isUnlimited ? 0 : Math.round(parsedTotal * 0.3),
      caloriesPer100g: manualCalories !== "" ? Number(manualCalories) : detected.calories,
      proteinPer100g: manualProtein !== "" ? Number(manualProtein) : detected.protein,
      carbsPer100g: manualCarbs !== "" ? Number(manualCarbs) : detected.carbs,
      fatPer100g: manualFat !== "" ? Number(manualFat) : detected.fat,
      isUnlimited,
      mhd: isUnlimited ? "Unbegrenzt" : (manualMhd.trim() || undefined),
    });

    if (onNotify) {
      onNotify(`+${manualName.trim()} zum Vorrat hinzugefügt`);
    }

    setManualName("");
    setManualIsUnlimited(false);
    setManualAmountStr("500");
    setManualTotalStr("500");
    setManualMhd("");
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setDetectedNutrition(null);
    setIsMacroAutoFilled(false);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {activeMode !== "menu" && (
              <button
                type="button"
                onClick={handleBackToMenu}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "8px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475569",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                ← Zurück
              </button>
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>
                {activeMode === "menu" && "Lebensmittel hinzufügen"}
                {activeMode === "camera" && "Barcode / Kamera Scan"}
                {activeMode === "receipt" && "Kassenbon importieren"}
                {activeMode === "manual" && "Lebensmittel suchen & erfassen"}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#64748b" }}>
                {activeMode === "menu" && "Wähle deine bevorzugte Eingabemethode"}
                {activeMode === "camera" && "EAN per Kamera, Foto oder Code scannen"}
                {activeMode === "receipt" && "Kassenbon per Foto scannen & Positionen einbuchen"}
                {activeMode === "manual" && "Live-Produktsuche, Nährwert-Erkennung & Mengenanpassung"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="clear-button"
            onClick={handleClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: "80vh", overflowY: "auto", padding: "16px 20px" }}>
          {/* ========================================================
              VIEW 1: MENU (Chooser: Kamera, Bon, Suchen & Erfassen)
              ======================================================== */}
          {activeMode === "menu" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Option 1: Barcode / Kamera */}
              <button
                type="button"
                className="add-method-card"
                onClick={() => setActiveMode("camera")}
              >
                <div className="add-method-icon camera">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 5v14M7 5v14M11 5v14M13.5 5v14M17 5v14M20 5v14" />
                  </svg>
                </div>
                <div className="add-method-info">
                  <div className="add-method-top">
                    <h4>Barcode scannen (Kamera)</h4>
                    <span className="add-badge green">Live & Foto</span>
                  </div>
                  <p>EAN-Strichcode per Kamera oder Foto scannen – Nährwerte & Mengen automatisch.</p>
                </div>
                <span className="add-method-arrow">→</span>
              </button>

              {/* Option 2: Kassenbon */}
              <button
                type="button"
                className="add-method-card"
                onClick={() => setActiveMode("receipt")}
              >
                <div className="add-method-icon receipt">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
                    <path d="M14 8H8M16 12H8M12 16H8" />
                  </svg>
                </div>
                <div className="add-method-info">
                  <div className="add-method-top">
                    <h4>Kassenbon scannen (Bon)</h4>
                    <span className="add-badge blue">Sammel-Import</span>
                  </div>
                  <p>Kassenzettel erfassen & alle Einkaufs-Positionen in einem Schritt einbuchen.</p>
                </div>
                <span className="add-method-arrow">→</span>
              </button>

              {/* Option 3: Lebensmittel suchen & erfassen (Unified Database & Manual) */}
              <button
                type="button"
                className="add-method-card"
                onClick={() => setActiveMode("manual")}
              >
                <div className="add-method-icon database">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <div className="add-method-info">
                  <div className="add-method-top">
                    <h4>Lebensmittel suchen & erfassen</h4>
                    <span className="add-badge green">Smart-Suche & Manuell</span>
                  </div>
                  <p>Name eingeben – durchsucht Open Food Facts & Nährwert-DB oder eigene Angaben erfassen.</p>
                </div>
                <span className="add-method-arrow">→</span>
              </button>
            </div>
          )}

          {/* ========================================================
              VIEW 2: CAMERA / BARCODE SCAN (Extracted Component)
              ======================================================== */}
          {activeMode === "camera" && (
            <BarcodeScanTab
              onAddProduct={onAddProduct}
              onAddItems={onAddItems}
              onNotify={onNotify}
              onClose={handleClose}
            />
          )}

          {/* ========================================================
              VIEW 3: RECEIPT IMPORT (Extracted Component)
              ======================================================== */}
          {activeMode === "receipt" && (
            <ReceiptScanTab
              groceries={groceries}
              onImportReceipt={onImportReceipt}
              onAddItems={onAddItems}
              onAddProduct={onAddProduct}
              onNotify={onNotify}
              onClose={handleClose}
            />
          )}

          {/* ========================================================
              VIEW 4: UNIFIED FOOD SEARCH & MANUAL ENTRY
              ======================================================== */}
          {activeMode === "manual" && (
            <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                Name des Lebensmittels oder Suchbegriff *
                <div style={{ position: "relative", marginTop: "4px" }}>
                  <input
                    required
                    value={manualName}
                    onChange={(e) => {
                      setManualName(e.target.value);
                      if (selectedMatchedProduct && e.target.value !== selectedMatchedProduct.name) {
                        setSelectedMatchedProduct(null);
                      }
                    }}
                    placeholder="z. B. Hafermilch, Bio Eier, Apfel, Barilla Penne..."
                    className="search-field"
                    style={{ width: "100%", paddingRight: isOffSearching ? "36px" : "12px" }}
                  />
                  {isOffSearching && (
                    <div
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "16px",
                        height: "16px",
                        border: "2px solid #059669",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  )}
                </div>
              </label>

              {/* Suggestions dropdown */}
              {offSearchResults.length > 0 && !selectedMatchedProduct && (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                    maxHeight: "220px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    padding: "4px",
                  }}
                >
                  <div style={{ padding: "4px 8px", fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                    Treffer in Open Food Facts (mit Nährwerten)
                  </div>
                  {offSearchResults.map((prod, idx) => (
                    <button
                      key={prod.code || idx}
                      type="button"
                      onClick={() => handleApplySearchResultToForm(prod)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        background: "transparent",
                        border: "none",
                        borderRadius: "8px",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "background 120ms ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <ProductMark tone={prod.tone || "egg"} compact />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {prod.name}
                        </div>
                        <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                          {prod.brand ? `${prod.brand} · ` : ""}{prod.amount ? `${prod.amount}${prod.unit || "g"} · ` : ""}{prod.calories} kcal/100g
                        </div>
                      </div>
                      <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 6px", borderRadius: "4px" }}>
                        Übernehmen
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Match Banner */}
              {selectedMatchedProduct && (
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ProductMark tone={selectedMatchedProduct.tone || "egg"} compact />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#065f46" }}>
                      Datenbank-Match: {selectedMatchedProduct.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMatchedProduct(null)}
                    style={{ background: "none", border: "none", color: "#059669", fontSize: "11px", cursor: "pointer", fontWeight: 700 }}
                  >
                    Lösen
                  </button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                    Kategorie
                  </label>
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="search-field"
                    style={{ width: "100%", height: "38px", fontSize: "12px" }}
                  >
                    <option value="Kühl">Kühlregal / Frische</option>
                    <option value="Trocken">Trockenvorrat / Vorratskammer</option>
                    <option value="Tiefkühl">Tiefkühl</option>
                    <option value="Gewürze">Gewürze & Kräuter</option>
                    <option value="Saucen">Öle, Essig & Saucen</option>
                    <option value="Getränke">Getränke</option>
                    <option value="Sonstiges">Sonstiges</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                    MHD / Haltbarkeit (optional)
                  </label>
                  <input
                    type="date"
                    value={manualMhd}
                    onChange={(e) => setManualMhd(e.target.value)}
                    className="search-field"
                    style={{ width: "100%", height: "38px", fontSize: "12px" }}
                  />
                </div>
              </div>

              {/* Amount & Unit */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                    Vorhandene Menge *
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={manualIsUnlimited}
                      onChange={(e) => setManualIsUnlimited(e.target.checked)}
                      style={{ accentColor: "#059669" }}
                    />
                    Immer vorrätig (z. B. Leitungswasser, Salz)
                  </label>
                </div>

                {!manualIsUnlimited && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      value={manualAmountStr}
                      onChange={(e) => {
                        setManualAmountStr(e.target.value);
                        setManualTotalStr(e.target.value);
                      }}
                      className="search-field"
                      style={{ height: "38px", fontSize: "13px", fontWeight: 650 }}
                      placeholder="z. B. 500"
                    />
                    <select
                      value={manualUnit}
                      onChange={(e) => setManualUnit(e.target.value)}
                      className="search-field"
                      style={{ height: "38px", fontSize: "12px" }}
                    >
                      <option value="g">Gramm (g)</option>
                      <option value="kg">Kilogramm (kg)</option>
                      <option value="ml">Milliliter (ml)</option>
                      <option value="l">Liter (l)</option>
                      <option value="Stk.">Stück (Stk.)</option>
                      <option value="Packung">Packung</option>
                      <option value="Dose">Dose</option>
                      <option value="Glas">Glas</option>
                      <option value="Bund">Bund</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Macros Container */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 750, color: "#334155" }}>
                    Nährwerte pro 100g / 100ml
                  </span>
                  {manualName.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const match = findFoodNutrition(manualName, manualCategory);
                        setDetectedNutrition(match);
                        setManualCalories(match.calories);
                        setManualProtein(match.protein);
                        setManualCarbs(match.carbs);
                        setManualFat(match.fat);
                        setIsMacroAutoFilled(true);
                      }}
                      style={{
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        color: "#047857",
                        borderRadius: "7px",
                        padding: "3px 8px",
                        fontSize: "10.5px",
                        fontWeight: 750,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Nährwerte aus BLS/USDA-Datenbank neu zuweisen"
                    >
                      <Sparkles size={12} />
                      Makros ermitteln
                    </button>
                  )}
                </div>

                {detectedNutrition && (
                  <div
                    style={{
                      marginBottom: "10px",
                      padding: "8px 10px",
                      borderRadius: "9px",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      fontSize: "11px",
                      color: "#166534",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>
                      <strong style={{ color: "#14532d" }}>{detectedNutrition.name}:</strong> {detectedNutrition.calories} kcal · {detectedNutrition.protein}g Protein · {detectedNutrition.carbs}g Carbs · {detectedNutrition.fat}g Fett
                    </span>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 750,
                        color: "#15803d",
                        background: "#dcfce7",
                        padding: "1px 5px",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                      }}
                    >
                      {detectedNutrition.source === "bls" || detectedNutrition.source === "usda" ? "BLS/USDA" : "Erkannt"}
                    </span>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
                  <div>
                    <label style={{ fontSize: "9.5px", fontWeight: 700, color: "#64748b", display: "block", textAlign: "center", marginBottom: "3px" }}>
                      KCAL
                    </label>
                    <input
                      type="number"
                      placeholder="Kcal"
                      value={manualCalories}
                      onChange={(e) => {
                        setIsMacroAutoFilled(false);
                        setManualCalories(e.target.value === "" ? "" : Number(e.target.value));
                      }}
                      className="search-field"
                      style={{ fontSize: "11.5px", height: "36px", textAlign: "center", width: "100%", fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "9.5px", fontWeight: 700, color: "#059669", display: "block", textAlign: "center", marginBottom: "3px" }}>
                      PROT (g)
                    </label>
                    <input
                      type="number"
                      placeholder="Prot"
                      value={manualProtein}
                      onChange={(e) => {
                        setIsMacroAutoFilled(false);
                        setManualProtein(e.target.value === "" ? "" : Number(e.target.value));
                      }}
                      className="search-field"
                      style={{ fontSize: "11.5px", height: "36px", textAlign: "center", width: "100%", fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "9.5px", fontWeight: 700, color: "#d97706", display: "block", textAlign: "center", marginBottom: "3px" }}>
                      CARB (g)
                    </label>
                    <input
                      type="number"
                      placeholder="Carb"
                      value={manualCarbs}
                      onChange={(e) => {
                        setIsMacroAutoFilled(false);
                        setManualCarbs(e.target.value === "" ? "" : Number(e.target.value));
                      }}
                      className="search-field"
                      style={{ fontSize: "11.5px", height: "36px", textAlign: "center", width: "100%", fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "9.5px", fontWeight: 700, color: "#64748b", display: "block", textAlign: "center", marginBottom: "3px" }}>
                      FETT (g)
                    </label>
                    <input
                      type="number"
                      placeholder="Fett"
                      value={manualFat}
                      onChange={(e) => {
                        setIsMacroAutoFilled(false);
                        setManualFat(e.target.value === "" ? "" : Number(e.target.value));
                      }}
                      className="search-field"
                      style={{ fontSize: "11.5px", height: "36px", textAlign: "center", width: "100%", fontWeight: 600 }}
                    />
                  </div>
                </div>
              </div>

              {(() => {
                const numAmount = Number(manualAmountStr);
                const isAmountValid = manualIsUnlimited || (manualAmountStr.trim() !== "" && !isNaN(numAmount) && numAmount > 0);
                const canSubmit = Boolean(manualName.trim() && isAmountValid);
                return (
                  <button
                    type="submit"
                    className="primary-button generate-button"
                    disabled={!canSubmit}
                    style={{
                      height: "46px",
                      borderRadius: "12px",
                      fontSize: "13px",
                      marginTop: "4px",
                      opacity: canSubmit ? 1 : 0.5,
                      cursor: canSubmit ? "pointer" : "not-allowed",
                    }}
                  >
                    {!manualName.trim()
                      ? "Name des Lebensmittels eingeben"
                      : !isAmountValid
                      ? "Bitte Menge angeben"
                      : "In Vorrat speichern"}
                  </button>
                );
              })()}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
