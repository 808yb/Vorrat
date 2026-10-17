import { Receipt, Sparkles } from "lucide-react";
import React, { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { ProductMark, getFoodTone } from "./FoodIcons";
import { lookupBarcodeFromOFF, searchProductsInOFF, type OFFProduct } from "../utils/openFoodFacts";
import {
  analyzeReceiptWithGemini,
  parseReceiptFallback,
  calculateEstimatedMhd,
  type ParsedReceiptFoodItem,
} from "../utils/receiptOcr";

export type AddMode = "menu" | "camera" | "receipt" | "database" | "manual";

interface UnifiedAddModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  onImportReceipt: () => void;
  onNotify?: (msg: string) => void;
}

export function UnifiedAddModal({
  isOpen,
  onClose,
  onAddProduct,
  onImportReceipt,
  onNotify,
}: UnifiedAddModalProps) {
  const [activeMode, setActiveMode] = useState<AddMode>("menu");

  // Camera & Barcode State
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningLoading, setIsScanningLoading] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState("");
  const [scannedProduct, setScannedProduct] = useState<OFFProduct | null>(null);
  const [scanAmountStr, setScanAmountStr] = useState("500");
  const [scanUnit, setScanUnit] = useState("g");
  const [scanCategory, setScanCategory] = useState("Kühl");
  const [scanMhd, setScanMhd] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Database Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OFFProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSearchCode, setSelectedSearchCode] = useState<string | null>(null);
  const [searchAmountStr, setSearchAmountStr] = useState("500");
  const [searchUnit, setSearchUnit] = useState("g");
  const [searchCategory, setSearchCategory] = useState("Kühl");
  const [searchMhd, setSearchMhd] = useState("");

  // Receipt OCR State
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<ParsedReceiptFoodItem[]>([]);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [receiptRawText, setReceiptRawText] = useState("");
  const [receiptUploadSuccess, setReceiptUploadSuccess] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const handleLoadDemoReceipt = () => {
    const rawDemo = [
      { name: "Ja! Basmati Reis (1kg)", quantity: "1000 g", amount: 1000, total: 1000, unit: "g", price: 1.99, category: "Trocken" as const, tone: "rice", caloriesPer100g: 355, proteinPer100g: 8.5, carbsPer100g: 78.0, fatPer100g: 0.9 },
      { name: "Bio Freiland-Eier (10er)", quantity: "10 Stk.", amount: 10, total: 10, unit: "Stk.", price: 3.29, category: "Kühl" as const, tone: "egg", caloriesPer100g: 140, proteinPer100g: 13.0, carbsPer100g: 0.7, fatPer100g: 9.8 },
      { name: "Kikkoman Sojasauce (150ml)", quantity: "150 ml", amount: 150, total: 150, unit: "ml", price: 2.49, category: "Saucen" as const, tone: "sauce", caloriesPer100g: 77, proteinPer100g: 10.0, carbsPer100g: 3.2, fatPer100g: 0.1 },
      { name: "TK Bio Erbsen (450g)", quantity: "450 g", amount: 450, total: 450, unit: "g", price: 2.19, category: "Tiefkühl" as const, tone: "peas", caloriesPer100g: 81, proteinPer100g: 5.4, carbsPer100g: 14.4, fatPer100g: 0.4 },
    ];
    const demoItems: ParsedReceiptFoodItem[] = rawDemo.map((item, idx) => {
      const estimate = calculateEstimatedMhd(item.name, item.category);
      return {
        ...item,
        id: `demo-${idx + 1}`,
        selected: true,
        mhd: estimate.mhd,
        shelfLifeDays: estimate.shelfLifeDays,
        freshnessHint: estimate.freshnessHint,
        isUrgent: estimate.isUrgent,
      };
    });
    setReceiptItems(demoItems);
    setReceiptUploadSuccess(true);
    setReceiptError(null);
    if (onNotify) onNotify("Demo-Kassenbon geladen (4 Positionen mit Auto-MHD)");
  };

  const handleLoadLidlReceipt = () => {
    const rawLidl = [
      { name: "Paprika rot", quantity: "210 g", amount: 210, total: 210, unit: "g", price: 0.63, category: "Kühl" as const, tone: "pepper" },
      { name: "Pflücksalat", quantity: "150 g", amount: 150, total: 150, unit: "g", price: 1.59, category: "Kühl" as const, tone: "salad" },
      { name: "Gurken", quantity: "1 Stk.", amount: 1, total: 1, unit: "Stk.", price: 0.79, category: "Kühl" as const, tone: "cucumber" },
      { name: "Kartoffel-Gitter (TK)", quantity: "600 g", amount: 600, total: 600, unit: "g", price: 1.89, category: "Tiefkühl" as const, tone: "potato" },
      { name: "Joghurt mild 1,5%", quantity: "500 g", amount: 500, total: 500, unit: "g", price: 0.79, category: "Kühl" as const, tone: "yogurt" },
      { name: "Haferflocken Zart", quantity: "500 g", amount: 500, total: 500, unit: "g", price: 0.69, category: "Trocken" as const, tone: "oats" },
      { name: "Cornichons scharf", quantity: "350 g", amount: 350, total: 350, unit: "g", price: 0.99, category: "Saucen" as const, tone: "sauce" },
      { name: "Monster White Zero", quantity: "2 Stk.", amount: 2, total: 2, unit: "Stk.", price: 3.18, category: "Getränke" as const, tone: "drink" },
      { name: "Pepsi Zero Zucker", quantity: "2 Stk.", amount: 2, total: 2, unit: "Stk.", price: 2.98, category: "Getränke" as const, tone: "drink" },
      { name: "Tortilla Wraps Weiz.", quantity: "370 g", amount: 370, total: 370, unit: "g", price: 1.19, category: "Trocken" as const, tone: "bread" },
      { name: "Hähn.Minutenschnitz.", quantity: "400 g", amount: 400, total: 400, unit: "g", price: 4.99, category: "Kühl" as const, tone: "chicken" },
    ];
    const items: ParsedReceiptFoodItem[] = rawLidl.map((item, idx) => {
      const estimate = calculateEstimatedMhd(item.name, item.category);
      return {
        id: `lidl-demo-${idx + 1}`,
        name: item.name,
        quantity: item.quantity,
        amount: item.amount,
        total: item.total,
        unit: item.unit,
        price: item.price,
        category: item.category,
        selected: true,
        tone: item.tone,
        caloriesPer100g: 150,
        proteinPer100g: 8.0,
        carbsPer100g: 15.0,
        fatPer100g: 2.0,
        mhd: estimate.mhd,
        shelfLifeDays: estimate.shelfLifeDays,
        freshnessHint: estimate.freshnessHint,
        isUrgent: estimate.isUrgent,
      };
    });
    setReceiptItems(items);
    setReceiptUploadSuccess(true);
    setReceiptError(null);
    if (onNotify) onNotify("Lidl-Bon geladen (11 Artikel mit Auto-MHD & Frische-Ampel)");
  };

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

  // Stop camera helper
  const stopLiveCamera = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch {}
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsLiveCameraActive(false);
    setIsTorchOn(false);
  };

  // Reset all state when closing or switching
  const handleClose = () => {
    stopLiveCamera();
    setActiveMode("menu");
    setScannedProduct(null);
    setSelectedSearchCode(null);
    setSearchQuery("");
    setSearchResults([]);
    setBarcodeInput("");
    setScanStatusMessage("");
    onClose();
  };

  const handleBackToMenu = () => {
    stopLiveCamera();
    setActiveMode("menu");
    setScannedProduct(null);
    setSelectedSearchCode(null);
    setScanStatusMessage("");
  };

  useEffect(() => {
    return () => {
      stopLiveCamera();
    };
  }, []);

  // Quick scan items
  const testBarcodes = [
    { code: "4008400404127", name: "Ja! Basmati Reis (1kg)" },
    { code: "4056489312456", name: "Bio Freiland-Eier (10er)" },
    { code: "8715035110106", name: "Kikkoman Sojasauce (150ml)" },
    { code: "4008400290126", name: "Bio TK Kaisergemüse (750g)" },
    { code: "4014400900010", name: "Barilla Penne (500g)" },
    { code: "4008400300122", name: "Kölln Haferflocken (500g)" },
  ];

  // Lookup barcode handler
  const handlePerformBarcodeLookup = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;

    setIsScanningLoading(true);
    setScanStatusMessage("");
    setScannedProduct(null);

    try {
      const res = await lookupBarcodeFromOFF(clean);
      if (res.success && res.product) {
        setScannedProduct(res.product);
        setScanAmountStr(String(res.product.amount || 500));
        setScanUnit(res.product.unit || "g");
        setScanCategory(res.product.category || "Kühl");
        setScanMhd("");
        if (res.source === "generated") {
          setScanStatusMessage("Neuer Barcode erkannt · Vorlage für schnelles Hinzufügen bereit.");
        } else {
          setScanStatusMessage(`Treffer: ${res.product.name} (${res.product.brand})`);
        }
      } else {
        setScanStatusMessage(res.error || "Kein Artikel gefunden. Du kannst ihn manuell anlegen.");
      }
    } catch {
      setScanStatusMessage("Verbindungsproblem. Vorlage für schnelles Hinzufügen bereit.");
    } finally {
      setIsScanningLoading(false);
    }
  };

  // Start iOS live camera
  const startLiveCamera = async () => {
    setCameraError(null);
    setIsLiveCameraActive(true);

    try {
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      if (videoRef.current) {
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
      };

      await codeReaderRef.current.decodeFromConstraints(
        constraints,
        videoRef.current!,
        (result) => {
          if (result) {
            const scannedCode = result.getText();
            if ("vibrate" in navigator) {
              try {
                navigator.vibrate(60);
              } catch {}
            }
            stopLiveCamera();
            setBarcodeInput(scannedCode);
            handlePerformBarcodeLookup(scannedCode);
          }
        }
      );

      const stream = videoRef.current?.srcObject as MediaStream;
      if (stream) {
        const track = stream.getVideoTracks()[0];
        const capabilities = (track.getCapabilities?.() as any) || {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }
    } catch (err: any) {
      setIsLiveCameraActive(false);
      setCameraError(
        "Kamera konnte nicht geöffnet werden. Bitte nutze die Barcode-Eingabe oder Test-Barcodes."
      );
    }
  };

  const toggleTorch = async () => {
    if (!videoRef.current?.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !isTorchOn } as any],
      });
      setIsTorchOn(!isTorchOn);
    } catch {}
  };

  // File upload photo barcode
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanningLoading(true);
    setScanStatusMessage("");

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        try {
          if (!codeReaderRef.current) {
            codeReaderRef.current = new BrowserMultiFormatReader();
          }
          const result = await codeReaderRef.current.decodeFromImageUrl(dataUrl);
          if (result) {
            const code = result.getText();
            setBarcodeInput(code);
            handlePerformBarcodeLookup(code);
          }
        } catch {
          setScanStatusMessage("Barcode auf dem Foto nicht lesbar. Bitte näher heranhalten oder Code eingeben.");
        } finally {
          setIsScanningLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsScanningLoading(false);
      setScanStatusMessage("Fehler beim Verarbeiten des Fotos.");
    }
  };

  // Search DB handler
  const handleSearchDatabase = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      setSelectedSearchCode(null);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchProductsInOFF(q);
      setSearchResults(results);
      if (results.length > 0) {
        setSelectedSearchCode(results[0].code);
        setSearchAmountStr(String(results[0].amount || 500));
        setSearchUnit(results[0].unit || "g");
        setSearchCategory(results[0].category || "Kühl");
        setSearchMhd("");
      } else {
        setSelectedSearchCode(null);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (prod: OFFProduct) => {
    setSelectedSearchCode(prod.code);
    setSearchAmountStr(String(prod.amount || 500));
    setSearchUnit(prod.unit || "g");
    setSearchCategory(prod.category || "Kühl");
    setSearchMhd("");
  };

  // Add scanned / searched product to pantry with customizable unit, category and MHD
  const handleApplyOFFProduct = (
    prod: OFFProduct,
    amountToApply: number,
    customUnit?: string,
    customCategory?: string,
    customMhd?: string
  ) => {
    const finalUnit = customUnit || prod.unit || "g";
    const finalCategory = customCategory || prod.category || "Kühl";
    onAddProduct({
      name: prod.name,
      category: finalCategory,
      amount: amountToApply,
      total: (customUnit && customUnit !== prod.unit) ? amountToApply : (prod.total > amountToApply ? prod.total : amountToApply),
      unit: finalUnit,
      tone: prod.tone,
      minAmount: Math.round(amountToApply * 0.3),
      caloriesPer100g: prod.calories,
      proteinPer100g: prod.protein,
      carbsPer100g: prod.carbs,
      fatPer100g: prod.fat,
      mhd: customMhd ? (customMhd.trim() || undefined) : undefined,
    });
    if (onNotify) {
      onNotify(`+${prod.name} zum Vorrat hinzugefügt`);
    }
    handleClose();
  };

  // Manual Submit
  const handleManualSubmit = (e: React.FormEvent) => {
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

    onAddProduct({
      name: manualName.trim(),
      category: manualCategory,
      amount: parsedAmount,
      total: parsedTotal,
      unit: manualUnit,
      tone: detectedTone,
      minAmount: isUnlimited ? 0 : Math.round(parsedTotal * 0.3),
      caloriesPer100g: manualCalories !== "" ? Number(manualCalories) : 180,
      proteinPer100g: manualProtein !== "" ? Number(manualProtein) : 6.0,
      carbsPer100g: manualCarbs !== "" ? Number(manualCarbs) : 25.0,
      fatPer100g: manualFat !== "" ? Number(manualFat) : 3.0,
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
                {activeMode === "database" && "Datenbank-Suche"}
                {activeMode === "manual" && "Manuell eingeben"}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#64748b" }}>
                {activeMode === "menu" && "Wähle deine bevorzugte Eingabemethode"}
                {activeMode === "camera" && "EAN per Kamera, Foto oder Code scannen"}
                {activeMode === "receipt" && (receiptItems.length > 0 ? `Kassenzettel mit ${receiptItems.length} Positionen einbuchen` : "Kassenbon per Foto scannen")}
                {activeMode === "database" && "Open Food Facts Datenbank durchsuchen"}
                {activeMode === "manual" && "Name, Menge und Nährwerte selbst erfassen"}
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
              VIEW 1: MENU (Chooser: Kamera, Bon, DB, Manuell)
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
                    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
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

              {/* Option 3: Datenbank-Suche */}
              <button
                type="button"
                className="add-method-card"
                onClick={() => setActiveMode("database")}
              >
                <div className="add-method-icon database">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <div className="add-method-info">
                  <div className="add-method-top">
                    <h4>Datenbank-Suche (Open Food Facts)</h4>
                    <span className="add-badge purple">Produktsuche</span>
                  </div>
                  <p>Nach Lebensmittelname suchen – greift auf tausende verifizierte Markenartikel zu.</p>
                </div>
                <span className="add-method-arrow">→</span>
              </button>

              {/* Option 4: Manuelle Eingabe */}
              <button
                type="button"
                className="add-method-card"
                onClick={() => setActiveMode("manual")}
              >
                <div className="add-method-icon manual">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <div className="add-method-info">
                  <div className="add-method-top">
                    <h4>Manuell eingeben</h4>
                    <span className="add-badge amber">Freie Eingabe</span>
                  </div>
                  <p>Name, Menge, Einheit und Nährwerte selbst erfassen ohne Barcode.</p>
                </div>
                <span className="add-method-arrow">→</span>
              </button>
            </div>
          )}

          {/* ========================================================
              VIEW 2: CAMERA / BARCODE SCAN
              ======================================================== */}
          {activeMode === "camera" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Camera Viewfinder */}
              <div
                style={{
                  position: "relative",
                  height: "175px",
                  background: "#0f172a",
                  borderRadius: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  overflow: "hidden",
                  boxShadow: "inset 0 0 20px rgba(0,0,0,0.6)",
                }}
              >
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    position: "absolute",
                    inset: 0,
                    display: isLiveCameraActive ? "block" : "none",
                  }}
                />

                {isLiveCameraActive ? (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        left: "20px",
                        right: "20px",
                        height: "2px",
                        background: "#ef4444",
                        boxShadow: "0 0 10px #ef4444",
                        animation: "pulse 1.4s infinite",
                        zIndex: 2,
                      }}
                    />
                    <div
                      style={{
                        position: "relative",
                        zIndex: 3,
                        width: "180px",
                        height: "90px",
                        border: "2px solid rgba(52, 211, 153, 0.8)",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.45)",
                      }}
                    >
                      <span style={{ fontSize: "10px", color: "#a7f3d0", fontWeight: 700 }}>
                        Barcode zentrieren
                      </span>
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        display: "flex",
                        gap: "8px",
                        zIndex: 10,
                      }}
                    >
                      {hasTorch && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "10px",
                            background: isTorchOn ? "#059669" : "rgba(15, 23, 42, 0.8)",
                            color: "white",
                            border: "1px solid rgba(255,255,255,0.3)",
                            fontSize: "11px",
                            cursor: "pointer",
                          }}
                        >
                          {isTorchOn ? "Blitz Aus" : "Blitz An"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={stopLiveCamera}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "10px",
                          background: "#dc2626",
                          color: "white",
                          border: "none",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        Kamera stoppen
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "16px" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ margin: "0 auto 6px" }}>
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <strong style={{ fontSize: "13px", display: "block" }}>
                      Kamera-Scanner bereit
                    </strong>
                    <p style={{ margin: "4px 0 12px", fontSize: "11px", color: "#94a3b8" }}>
                      Live-Scan per Kamera oder Foto aus der Mediathek
                    </p>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={startLiveCamera}
                        style={{
                          padding: "8px 14px",
                          background: "#059669",
                          color: "white",
                          borderRadius: "10px",
                          border: "none",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Live-Kamera starten
                      </button>
                      <label
                        style={{
                          padding: "8px 14px",
                          background: "rgba(255,255,255,0.15)",
                          color: "white",
                          borderRadius: "10px",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-block",
                        }}
                      >
                        Foto wählen
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style={{ display: "none" }}
                          onChange={handlePhotoUpload}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {cameraError && (
                <div style={{ fontSize: "11px", color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: "10px" }}>
                  {cameraError}
                </div>
              )}

              {/* Manual Barcode Input */}
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="EAN-Nummer eingeben..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePerformBarcodeLookup(barcodeInput)}
                  className="search-field"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handlePerformBarcodeLookup(barcodeInput)}
                  disabled={isScanningLoading || !barcodeInput.trim()}
                  className="primary-button"
                  style={{ padding: "0 16px", height: "42px", borderRadius: "12px", fontSize: "12px" }}
                >
                  {isScanningLoading ? "Sucht..." : "Prüfen"}
                </button>
              </div>

              {/* Status Message */}
              {scanStatusMessage && (
                <div style={{ fontSize: "11px", color: "#047857", background: "#ecfdf5", padding: "8px 12px", borderRadius: "10px" }}>
                  {scanStatusMessage}
                </div>
              )}

              {/* Scanned Product Card Preview */}
              {scannedProduct && (
                <div className="product-match-preview-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <div>
                      <span style={{ fontSize: "10px", color: "#059669", fontWeight: 750, textTransform: "uppercase" }}>
                        Erkanntes Produkt
                      </span>
                      <h4 style={{ margin: "2px 0 0", fontSize: "14px", color: "#0f172a" }}>
                        {scannedProduct.name}
                      </h4>
                      <p style={{ margin: "1px 0 0", fontSize: "11px", color: "#64748b" }}>
                        {scannedProduct.brand} · Kategorie: {scannedProduct.category}
                      </p>
                    </div>
                    <span className="nutri-pill">
                      Nutri {scannedProduct.nutriScore}
                    </span>
                  </div>

                  <div className="preview-macros-grid">
                    <div>
                      <span>Kcal</span>
                      <strong>{scannedProduct.calories}</strong>
                    </div>
                    <div>
                      <span>Protein</span>
                      <strong>{scannedProduct.protein}g</strong>
                    </div>
                    <div>
                      <span>Carbs</span>
                      <strong>{scannedProduct.carbs}g</strong>
                    </div>
                    <div>
                      <span>Fett</span>
                      <strong>{scannedProduct.fat}g</strong>
                    </div>
                  </div>

                  {/* Upgraded Quantity, Unit, Category & MHD Configurator */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px", background: "#f8fafc", padding: "12px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "8px", alignItems: "center" }}>
                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 750, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                          Menge
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = Number(scanAmountStr) || 0;
                              const step = ["Stk.", "Bund", "Packung", "Dose", "Flasche"].includes(scanUnit) ? 1 : 50;
                              setScanAmountStr(String(Math.max(0, cur - step)));
                            }}
                            style={{ width: "30px", height: "34px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 700, cursor: "pointer", color: "#334155" }}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={scanAmountStr}
                            onChange={(e) => setScanAmountStr(e.target.value)}
                            placeholder="Menge"
                            className="search-field"
                            style={{ width: "100%", height: "34px", textAlign: "center", fontWeight: 700, fontSize: "13px" }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const cur = Number(scanAmountStr) || 0;
                              const step = ["Stk.", "Bund", "Packung", "Dose", "Flasche"].includes(scanUnit) ? 1 : 50;
                              setScanAmountStr(String(cur + step));
                            }}
                            style={{ width: "30px", height: "34px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 700, cursor: "pointer", color: "#334155" }}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 750, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                          Einheit
                        </label>
                        <select
                          value={scanUnit}
                          onChange={(e) => setScanUnit(e.target.value)}
                          className="search-field"
                          style={{ width: "100%", height: "34px", fontSize: "11.5px", padding: "0 6px", background: "#ffffff" }}
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

                      <div>
                        <label style={{ fontSize: "10px", fontWeight: 750, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                          Lagerort
                        </label>
                        <select
                          value={scanCategory}
                          onChange={(e) => setScanCategory(e.target.value)}
                          className="search-field"
                          style={{ width: "100%", height: "34px", fontSize: "11.5px", padding: "0 6px", background: "#ffffff" }}
                        >
                          <option value="Kühl">Kühlschrank</option>
                          <option value="Tiefkühl">Tiefkühl</option>
                          <option value="Trocken">Trockenvorrat</option>
                          <option value="Saucen">Saucen/Gewürze</option>
                          <option value="Getränke">Getränke</option>
                          <option value="Sonstiges">Sonstiges</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick amount chips */}
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>Schnellwahl:</span>
                      {(["Stk.", "Bund", "Packung", "Dose", "Flasche"].includes(scanUnit)
                        ? [1, 2, 3, 5, 10]
                        : ["kg", "l"].includes(scanUnit)
                        ? [1, 2, 5]
                        : [100, 250, 500, 1000]
                      ).map((chipVal) => (
                        <button
                          key={chipVal}
                          type="button"
                          onClick={() => setScanAmountStr(String(chipVal))}
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            border: scanAmountStr === String(chipVal) ? "1.5px solid #059669" : "1px solid #cbd5e1",
                            background: scanAmountStr === String(chipVal) ? "#ecfdf5" : "#ffffff",
                            color: scanAmountStr === String(chipVal) ? "#047857" : "#334155",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {chipVal}{scanUnit}
                        </button>
                      ))}
                    </div>

                    {/* Optional MHD */}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <label style={{ fontSize: "10px", fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                          Mindesthaltbarkeitsdatum (MHD)
                        </label>
                        {scanMhd && (
                          <button
                            type="button"
                            onClick={() => setScanMhd("")}
                            style={{ border: "none", background: "none", color: "#dc2626", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}
                          >
                            Entfernen
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="date"
                          value={scanMhd}
                          onChange={(e) => setScanMhd(e.target.value)}
                          className="search-field"
                          style={{ height: "32px", fontSize: "11px", padding: "0 8px", background: "#ffffff" }}
                        />
                        {[
                          { label: "+3 T.", days: 3 },
                          { label: "+7 T.", days: 7 },
                          { label: "+14 T.", days: 14 },
                          { label: "+6 M.", days: 180 },
                        ].map((btn) => (
                          <button
                            key={btn.label}
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + btn.days);
                              setScanMhd(d.toISOString().split("T")[0]);
                            }}
                            style={{ padding: "3px 7px", fontSize: "10.5px", fontWeight: 600, borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer", color: "#475569" }}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={!scanAmountStr.trim() || Number(scanAmountStr) <= 0}
                      style={{
                        height: "40px",
                        fontSize: "12.5px",
                        borderRadius: "10px",
                        opacity: (!scanAmountStr.trim() || Number(scanAmountStr) <= 0) ? 0.5 : 1,
                        cursor: (!scanAmountStr.trim() || Number(scanAmountStr) <= 0) ? "not-allowed" : "pointer",
                      }}
                      onClick={() => handleApplyOFFProduct(scannedProduct, Number(scanAmountStr), scanUnit, scanCategory, scanMhd)}
                    >
                      {Number(scanAmountStr) > 0 ? "In Vorrat übernehmen" : "Menge eingeben"}
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Test Barcodes */}
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569", display: "block", marginBottom: "6px" }}>
                  Häufige Test-Barcodes (1-Klick)
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {testBarcodes.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className="test-barcode-chip"
                      onClick={() => {
                        setBarcodeInput(item.code);
                        handlePerformBarcodeLookup(item.code);
                      }}
                    >
                      <span className="chip-name">{item.name}</span>
                      <span className="chip-code">{item.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 3: RECEIPT IMPORT (Echter Foto-Upload & Gemini AI OCR)
              ======================================================== */}
          {activeMode === "receipt" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Receipt Action Buttons (Foto aufnehmen oder Datei wählen) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "11px 10px",
                    background: "#059669",
                    color: "white",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 750,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
                    textAlign: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Bon fotografieren</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsAnalyzingReceipt(true);
                      setReceiptError(null);
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const dataUrl = ev.target?.result as string;
                        setReceiptImage(dataUrl);
                        try {
                          const items = await analyzeReceiptWithGemini({
                            imageBase64: dataUrl,
                            mimeType: file.type || "image/jpeg",
                          });
                          if (items.length > 0) {
                            setReceiptItems(items);
                            setReceiptUploadSuccess(true);
                            if (onNotify) onNotify(`${items.length} Lebensmittel auf dem Bon erkannt!`);
                          } else {
                            setReceiptUploadSuccess(false);
                            setReceiptError("Keine Lebensmittel auf dem Bild erkannt. Bitte stelle sicher, dass der Kassenbon gut beleuchtet und scharf ist.");
                          }
                        } catch (err: unknown) {
                          console.error("Receipt OCR error:", err);
                          setReceiptUploadSuccess(false);
                          const msg = err instanceof Error ? err.message : "Fehler bei der Bon-Analyse.";
                          setReceiptError(msg);
                        } finally {
                          setIsAnalyzingReceipt(false);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "11px 10px",
                    background: "#f1f5f9",
                    color: "#334155",
                    borderRadius: "12px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Foto hochladen</span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsAnalyzingReceipt(true);
                      setReceiptError(null);
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const dataUrl = ev.target?.result as string;
                        setReceiptImage(dataUrl);
                        try {
                          const items = await analyzeReceiptWithGemini({
                            imageBase64: dataUrl,
                            mimeType: file.type || "image/jpeg",
                          });
                          if (items.length > 0) {
                            setReceiptItems(items);
                            setReceiptUploadSuccess(true);
                            if (onNotify) onNotify(`✓ ${items.length} Lebensmittel auf dem Bon erkannt!`);
                          } else {
                            setReceiptUploadSuccess(false);
                            setReceiptError("Keine Lebensmittel auf dem Bild erkannt. Bitte stelle sicher, dass der Kassenbon gut beleuchtet und scharf ist.");
                          }
                        } catch (err: unknown) {
                          console.error("Receipt OCR error:", err);
                          setReceiptUploadSuccess(false);
                          const msg = err instanceof Error ? err.message : "Fehler bei der Bon-Analyse.";
                          setReceiptError(msg);
                        } finally {
                          setIsAnalyzingReceipt(false);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>

              {/* Loading State during AI OCR */}
              {isAnalyzingReceipt && (
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    background: "#ecfdf5",
                    borderRadius: "14px",
                    border: "1px solid #a7f3d0",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      margin: "0 auto 8px",
                      border: "3px solid #10b981",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <strong style={{ fontSize: "13px", color: "#065f46", display: "block" }}>
                    Gemini Vision OCR analysiert deinen Kassenbon...
                  </strong>
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#047857" }}>
                    Lese Produkte, Mengen und Preise aus dem Beleg ein...
                  </p>
                </div>
              )}

              {/* Error Message */}
              {receiptError && !isAnalyzingReceipt && (
                <div style={{ fontSize: "11.5px", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: "12px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  
                  <div style={{ flex: 1 }}>
                    <strong style={{ display: "block", marginBottom: "2px" }}>Erkennung fehlgeschlagen</strong>
                    <span>{receiptError}</span>
                  </div>
                </div>
              )}

              {/* Receipt Image Thumbnail only if successfully scanned */}
              {receiptImage && !isAnalyzingReceipt && receiptUploadSuccess && receiptItems.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    background: "#ecfdf5",
                    borderRadius: "10px",
                    border: "1px solid #a7f3d0",
                  }}
                >
                  <img
                    src={receiptImage}
                    alt="Kassenbon"
                    style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "6px", border: "1px solid #10b981" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#065f46", display: "block" }}>
                      Kassenbon erfasst
                    </span>
                    <span style={{ fontSize: "10.5px", color: "#047857" }}>
                      {receiptItems.length} Positionen erfolgreich erkannt
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptImage(null);
                      setReceiptItems([]);
                      setReceiptUploadSuccess(false);
                      setReceiptError(null);
                    }}
                    style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer" }}
                  >
                    Entfernen
                  </button>
                </div>
              )}

              {/* Empty state when no receipt scanned yet */}
              {receiptItems.length === 0 && !isAnalyzingReceipt && (
                <div style={{ textAlign: "center", padding: "24px 16px", background: "#f8fafc", borderRadius: "16px", border: "1px dashed #cbd5e1" }}>
                  <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#f4f7f5", border: "1px solid #eaece9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", color: "#12151a" }}><Receipt className="w-6 h-6 text-slate-700" /></div>
                  <h4 style={{ margin: "0 0 4px", fontSize: "13.5px", fontWeight: 750, color: "#0f172a" }}>
                    Kassenbon automatisch scannen & analysieren
                  </h4>
                  <p style={{ margin: "0 0 14px", fontSize: "11px", color: "#64748b", lineHeight: 1.4, maxWidth: "300px", marginLeft: "auto", marginRight: "auto" }}>
                    Mache ein Foto von deinem Einkaufszettel. Die KI erkennt Lebensmittel, Preise und berechnet das <strong>MHD automatisch nach Lebensmittelklasse</strong>.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "340px", margin: "0 auto" }}>
                    <button
                      type="button"
                      onClick={handleLoadLidlReceipt}
                      style={{
                        background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                        border: "none",
                        borderRadius: "10px",
                        padding: "9px 16px",
                        fontSize: "12px",
                        fontWeight: 750,
                        color: "#ffffff",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}><Sparkles className="w-3.5 h-3.5" /> Echten Lidl-Bon testen (11 Artikel mit Auto-MHD)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadDemoReceipt}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "10px",
                        padding: "7px 14px",
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "#64748b",
                        cursor: "pointer",
                      }}
                    >
                      Standard-Bon testen (4 Artikel)
                    </button>
                  </div>
                </div>
              )}

              {/* Header summary of recognized items */}
              {receiptItems.length > 0 && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#f8fafc",
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#334155" }}>
                        Erkannte Positionen ({receiptItems.filter((i) => i.selected).length}/{receiptItems.length})
                      </span>
                      <span style={{ fontSize: "10px", color: "#059669", display: "block", marginTop: "1px" }}>
                        MHDs automatisch nach Frische-Klasse geschätzt
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected = receiptItems.every((i) => i.selected);
                        setReceiptItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#059669",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {receiptItems.every((i) => i.selected) ? "Alle abwählen" : "Alle auswählen"}
                    </button>
                  </div>

                  {/* Recognized Items Checklist */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px", maxHeight: "280px", overflowY: "auto" }}>
                    {receiptItems.map((item) => {
                      const isAkut = Boolean(item.isUrgent || (item.shelfLifeDays !== undefined && item.shelfLifeDays <= 4));
                      return (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "space-between",
                            padding: "9px 12px",
                            background: item.selected ? "#ffffff" : "#f8fafc",
                            border: item.selected ? (isAkut ? "1.5px solid #f87171" : "1.5px solid #10b981") : "1px solid #e2e8f0",
                            borderRadius: "12px",
                            opacity: item.selected ? 1 : 0.6,
                            transition: "all 150ms ease",
                          }}
                        >
                          <div
                            style={{ display: "flex", alignItems: "flex-start", gap: "9px", flex: 1, cursor: "pointer" }}
                            onClick={() => {
                              setReceiptItems((prev) =>
                                prev.map((i) => (i.id === item.id ? { ...i, selected: !i.selected } : i))
                              );
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => {}}
                              style={{ accentColor: "#059669", width: "16px", height: "16px", cursor: "pointer", marginTop: "3px" }}
                            />
                            <ProductMark tone={item.tone} name={item.name} category={item.category} compact />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <strong style={{ fontSize: "12.5px", color: "#0f172a" }}>
                                  {item.name}
                                </strong>
                                {isAkut && (
                                  <span style={{ fontSize: "9px", fontWeight: 800, background: "#fee2e2", color: "#dc2626", padding: "1px 6px", borderRadius: "4px" }}>
                                    Akut
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.amount === 0 ? "" : item.amount}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? 0 : Number(e.target.value);
                                      setReceiptItems((prev) =>
                                        prev.map((i) => (i.id === item.id ? { ...i, amount: val, total: Math.max(val, i.total) } : i))
                                      );
                                    }}
                                    placeholder="0"
                                    style={{
                                      width: "55px",
                                      height: "26px",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      textAlign: "center",
                                      borderRadius: "6px",
                                      border: "1px solid #cbd5e1",
                                      background: "#ffffff",
                                    }}
                                  />
                                  <select
                                    value={item.unit}
                                    onChange={(e) => {
                                      const newUnit = e.target.value;
                                      setReceiptItems((prev) =>
                                        prev.map((i) => (i.id === item.id ? { ...i, unit: newUnit } : i))
                                      );
                                    }}
                                    style={{
                                      height: "26px",
                                      fontSize: "11px",
                                      borderRadius: "6px",
                                      border: "1px solid #cbd5e1",
                                      background: "#ffffff",
                                      padding: "0 4px",
                                      fontWeight: 600,
                                    }}
                                  >
                                    <option value="g">g</option>
                                    <option value="ml">ml</option>
                                    <option value="Stk.">Stk.</option>
                                    <option value="Bund">Bund</option>
                                    <option value="Packung">Pkg.</option>
                                    <option value="Dose">Dose</option>
                                    <option value="Flasche">Fl.</option>
                                    <option value="kg">kg</option>
                                    <option value="l">l</option>
                                  </select>
                                  <select
                                    value={item.category}
                                    onChange={(e) => {
                                      const newCat = e.target.value;
                                      setReceiptItems((prev) =>
                                        prev.map((i) => (i.id === item.id ? { ...i, category: newCat as any } : i))
                                      );
                                    }}
                                    style={{
                                      height: "26px",
                                      fontSize: "10px",
                                      borderRadius: "6px",
                                      border: "1px solid #cbd5e1",
                                      background: "#ffffff",
                                      padding: "0 4px",
                                    }}
                                  >
                                    <option value="Kühl">Kühl</option>
                                    <option value="Tiefkühl">Tiefkühl</option>
                                    <option value="Trocken">Trocken</option>
                                    <option value="Saucen">Saucen</option>
                                    <option value="Getränke">Getränke</option>
                                    <option value="Sonstiges">Sonstiges</option>
                                  </select>
                                </div>
                                {item.mhd && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      padding: "1px 6px",
                                      borderRadius: "6px",
                                      background: isAkut ? "#fef2f2" : "#ecfdf5",
                                      color: isAkut ? "#b91c1c" : "#047857",
                                      border: isAkut ? "1px solid #fecaca" : "1px solid #a7f3d0",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                    }}
                                  >
                                    MHD: {item.mhd.split("-").reverse().join(".")}
                                    {item.shelfLifeDays !== undefined ? ` (~${item.shelfLifeDays} T.)` : ""}
                                  </span>
                                )}
                                {item.freshnessHint && (
                                  <span style={{ fontSize: "9.5px", color: isAkut ? "#dc2626" : "#64748b" }}>
                                    {item.freshnessHint}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0, marginLeft: "8px" }}>
                            <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#059669" }}>
                              {item.price ? `${item.price.toFixed(2).replace(".", ",")} €` : ""}
                            </span>
                            <input
                              type="date"
                              value={item.mhd || ""}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                setReceiptItems((prev) =>
                                  prev.map((i) => (i.id === item.id ? { ...i, mhd: newDate } : i))
                                );
                              }}
                              title="MHD manuell anpassen"
                              style={{
                                fontSize: "9.5px",
                                padding: "1px 4px",
                                border: "1px solid #cbd5e1",
                                borderRadius: "6px",
                                color: "#475569",
                                background: "#ffffff",
                                cursor: "pointer",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Confirm & Add Button */}
                  {receiptItems.filter((i) => i.selected).length > 0 && (
                    <button
                      type="button"
                      className="primary-button generate-button"
                      style={{ height: "46px", borderRadius: "12px", fontSize: "13px", marginTop: "4px" }}
                      onClick={() => {
                        const selected = receiptItems.filter((i) => i.selected && i.amount > 0);
                        selected.forEach((item) => {
                          onAddProduct({
                            name: item.name,
                            category: item.category,
                            amount: item.amount,
                            total: item.total,
                            unit: item.unit,
                            tone: item.tone,
                            minAmount: Math.round(item.amount * 0.3),
                            caloriesPer100g: item.caloriesPer100g,
                            proteinPer100g: item.proteinPer100g,
                            carbsPer100g: item.carbsPer100g,
                            fatPer100g: item.fatPer100g,
                            mhd: item.mhd,
                          });
                        });
                        if (onNotify) {
                          onNotify(`${selected.length} Lebensmittel vom Kassenbon mit Auto-MHD hinzugefügt!`);
                        }
                        handleClose();
                      }}
                    >
                      {receiptItems.filter((i) => i.selected && i.amount > 0).length} Positionen mit MHD in Vorrat übernehmen
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ========================================================
              VIEW 4: DATABASE SEARCH
              ======================================================== */}
          {activeMode === "database" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Lebensmittel suchen (z. B. Haferflocken, Reis, Milch)..."
                  value={searchQuery}
                  onChange={(e) => handleSearchDatabase(e.target.value)}
                  className="search-field"
                  style={{ flex: 1 }}
                />
              </div>

              {/* Quick suggestion chips */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["Basmati Reis", "Bio Eier", "Sojasauce", "Haferflocken", "Penne", "Milch", "Butter"].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="chip"
                    style={{ fontSize: "10.5px", padding: "4px 9px", height: "26px" }}
                    onClick={() => handleSearchDatabase(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {isSearching && (
                <div style={{ textAlign: "center", padding: "16px", fontSize: "11px", color: "#64748b" }}>
                  Suche in Open Food Facts...
                </div>
              )}

              {/* Search Results List with Active Configurator */}
              {(() => {
                const activeItem = searchResults.find((r) => r.code === selectedSearchCode) || (searchResults.length > 0 ? searchResults[0] : null);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
                    {/* Active Selected Item Configuration Card */}
                    {activeItem && (
                      <div
                        style={{
                          background: "#ffffff",
                          border: "2px solid #10b981",
                          borderRadius: "16px",
                          padding: "14px",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.08)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>{activeItem.name}</strong>
                              <span className="nutri-pill mini">Nutri {activeItem.nutriScore}</span>
                            </div>
                            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                              {activeItem.brand} · {activeItem.calories} kcal / 100g
                            </p>
                          </div>
                          <span style={{ fontSize: "10px", fontWeight: 800, background: "#ecfdf5", color: "#047857", padding: "2px 8px", borderRadius: "6px" }}>
                            Ausgewählt
                          </span>
                        </div>

                        {/* Amount, Unit & Category Controls */}
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "8px", alignItems: "center" }}>
                          <div>
                            <label style={{ fontSize: "10px", fontWeight: 750, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "3px" }}>
                              Menge
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = Number(searchAmountStr) || 0;
                                  const step = ["Stk.", "Bund", "Packung", "Dose", "Flasche"].includes(searchUnit) ? 1 : 50;
                                  setSearchAmountStr(String(Math.max(0, cur - step)));
                                }}
                                style={{ width: "28px", height: "34px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 700, cursor: "pointer", color: "#334155" }}
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={searchAmountStr}
                                onChange={(e) => setSearchAmountStr(e.target.value)}
                                placeholder="Menge"
                                className="search-field"
                                style={{ width: "100%", height: "34px", textAlign: "center", fontWeight: 700, fontSize: "13px" }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = Number(searchAmountStr) || 0;
                                  const step = ["Stk.", "Bund", "Packung", "Dose", "Flasche"].includes(searchUnit) ? 1 : 50;
                                  setSearchAmountStr(String(cur + step));
                                }}
                                style={{ width: "28px", height: "34px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 700, cursor: "pointer", color: "#334155" }}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: "10px", fontWeight: 750, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "3px" }}>
                              Einheit
                            </label>
                            <select
                              value={searchUnit}
                              onChange={(e) => setSearchUnit(e.target.value)}
                              className="search-field"
                              style={{ width: "100%", height: "34px", fontSize: "11.5px", padding: "0 6px", background: "#ffffff" }}
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

                          <div>
                            <label style={{ fontSize: "10px", fontWeight: 750, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "3px" }}>
                              Lagerort
                            </label>
                            <select
                              value={searchCategory}
                              onChange={(e) => setSearchCategory(e.target.value)}
                              className="search-field"
                              style={{ width: "100%", height: "34px", fontSize: "11.5px", padding: "0 6px", background: "#ffffff" }}
                            >
                              <option value="Kühl">Kühlschrank</option>
                              <option value="Tiefkühl">Tiefkühl</option>
                              <option value="Trocken">Trockenvorrat</option>
                              <option value="Saucen">Saucen/Gewürze</option>
                              <option value="Getränke">Getränke</option>
                              <option value="Sonstiges">Sonstiges</option>
                            </select>
                          </div>
                        </div>

                        {/* Quick amount chips */}
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>Schnellwahl:</span>
                          {(["Stk.", "Bund", "Packung", "Dose", "Flasche"].includes(searchUnit)
                            ? [1, 2, 3, 5, 10]
                            : ["kg", "l"].includes(searchUnit)
                            ? [1, 2, 5]
                            : [100, 250, 500, 1000]
                          ).map((chipVal) => (
                            <button
                              key={chipVal}
                              type="button"
                              onClick={() => setSearchAmountStr(String(chipVal))}
                              style={{
                                padding: "3px 8px",
                                borderRadius: "6px",
                                border: searchAmountStr === String(chipVal) ? "1.5px solid #059669" : "1px solid #cbd5e1",
                                background: searchAmountStr === String(chipVal) ? "#ecfdf5" : "#f8fafc",
                                color: searchAmountStr === String(chipVal) ? "#047857" : "#334155",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {chipVal}{searchUnit}
                            </button>
                          ))}
                        </div>

                        {/* Optional MHD */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                            <label style={{ fontSize: "10px", fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                              Mindesthaltbarkeitsdatum (MHD)
                            </label>
                            {searchMhd && (
                              <button
                                type="button"
                                onClick={() => setSearchMhd("")}
                                style={{ border: "none", background: "none", color: "#dc2626", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}
                              >
                                Entfernen
                              </button>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                            <input
                              type="date"
                              value={searchMhd}
                              onChange={(e) => setSearchMhd(e.target.value)}
                              className="search-field"
                              style={{ height: "30px", fontSize: "11px", padding: "0 6px", background: "#ffffff" }}
                            />
                            {[
                              { label: "+3 T.", days: 3 },
                              { label: "+7 T.", days: 7 },
                              { label: "+14 T.", days: 14 },
                              { label: "+6 M.", days: 180 },
                            ].map((btn) => (
                              <button
                                key={btn.label}
                                type="button"
                                onClick={() => {
                                  const d = new Date();
                                  d.setDate(d.getDate() + btn.days);
                                  setSearchMhd(d.toISOString().split("T")[0]);
                                }}
                                style={{ padding: "3px 7px", fontSize: "10.5px", fontWeight: 600, borderRadius: "6px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer", color: "#475569" }}
                              >
                                {btn.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="primary-button"
                          disabled={!searchAmountStr.trim() || Number(searchAmountStr) <= 0}
                          style={{
                            height: "40px",
                            fontSize: "12.5px",
                            borderRadius: "10px",
                            marginTop: "2px",
                            opacity: (!searchAmountStr.trim() || Number(searchAmountStr) <= 0) ? 0.5 : 1,
                            cursor: (!searchAmountStr.trim() || Number(searchAmountStr) <= 0) ? "not-allowed" : "pointer",
                          }}
                          onClick={() => handleApplyOFFProduct(activeItem, Number(searchAmountStr), searchUnit, searchCategory, searchMhd)}
                        >
                          {Number(searchAmountStr) > 0 ? `+ ${activeItem.name} (${searchAmountStr}${searchUnit}) in Vorrat` : "Bitte Menge angeben"}
                        </button>
                      </div>
                    )}

                    {/* Other search results in case multiple items matched */}
                    {searchResults.length > 1 && (
                      <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                          Weitere Treffer ({searchResults.length - 1}):
                        </span>
                        {searchResults
                          .filter((it) => it.code !== (activeItem ? activeItem.code : ""))
                          .map((item) => (
                            <div
                              key={item.code}
                              className="db-search-item-card"
                              style={{ cursor: "pointer" }}
                              onClick={() => handleSelectSearchResult(item)}
                            >
                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <strong style={{ fontSize: "12px", color: "#0f172a" }}>{item.name}</strong>
                                  <span className="nutri-pill mini">Nutri {item.nutriScore}</span>
                                </div>
                                <p style={{ margin: "2px 0 0", fontSize: "10.5px", color: "#64748b" }}>
                                  {item.brand} · Standard: {item.amount}{item.unit}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="chip"
                                style={{ height: "28px", padding: "0 10px", fontSize: "10.5px", borderRadius: "8px", border: "1px solid #10b981", color: "#047857", background: "#ecfdf5", fontWeight: 700 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectSearchResult(item);
                                }}
                              >
                                Anpassen & Übernehmen
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "12px" }}>
                  Keine Artikel für "{searchQuery}" gefunden. Du kannst das Produkt im Tab "Manuell eingeben" anlegen.
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              VIEW 5: MANUAL INPUT
              ======================================================== */}
          {activeMode === "manual" && (
            <form onSubmit={handleManualSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                Name des Lebensmittels *
                <input
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="z. B. Hafermilch, Tofu, Nudeln..."
                  className="search-field"
                  style={{ width: "100%", marginTop: "4px" }}
                />
              </label>

              {/* Dynamic Food Icon Preview */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 12px",
                  background: "#f8fafc",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <ProductMark tone={getFoodTone(manualName, manualCategory)} name={manualName} category={manualCategory} />
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 600, display: "block" }}>
                    Lebensmittel-Vorschau
                  </span>
                  <strong style={{ fontSize: "12px", color: "#0f172a" }}>
                    {manualName.trim() ? manualName.trim() : "Wird automatisch ermittelt"}
                  </strong>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                  Kategorie
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="search-field"
                    style={{ width: "100%", marginTop: "4px" }}
                  >
                    <option value="Kühl">Kühlschrank</option>
                    <option value="Tiefkühl">Tiefkühl</option>
                    <option value="Trocken">Trockenvorrat</option>
                    <option value="Saucen">Gewürze & Saucen</option>
                    <option value="Getränke">Getränke</option>
                    <option value="Sonstiges">Sonstiges</option>
                  </select>
                </label>

                <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                  Einheit
                  <select
                    value={manualUnit}
                    onChange={(e) => setManualUnit(e.target.value)}
                    className="search-field"
                    style={{ width: "100%", marginTop: "4px" }}
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
                </label>
              </div>

              {/* Unbegrenzt Checkbox */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  background: manualIsUnlimited ? "#ecfdf5" : "#f8fafc",
                  borderRadius: "12px",
                  border: manualIsUnlimited ? "1.5px solid #a7f3d0" : "1px solid #e2e8f0",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={manualIsUnlimited}
                  onChange={(e) => setManualIsUnlimited(e.target.checked)}
                  style={{ width: "18px", height: "18px", accentColor: "#059669", cursor: "pointer", flexShrink: 0 }}
                />
                <div>
                  <strong style={{ fontSize: "12px", color: "#0f172a", display: "block" }}>Unbegrenzt vorrätig</strong>
                  <span style={{ fontSize: "10.5px", color: "#64748b" }}>Für Grundvorräte wie Leitungswasser, Salz oder Gewürze</span>
                </div>
              </label>

              {manualIsUnlimited ? (
                <div
                  style={{
                    background: "#ecfdf5",
                    border: "1.5px solid #a7f3d0",
                    borderRadius: "12px",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <strong style={{ fontSize: "12px", color: "#047857" }}>∞ Immer vorrätig</strong>
                  <p style={{ margin: 0, fontSize: "11px", color: "#065f46", lineHeight: 1.45 }}>
                    Keine Füllstandsmessung nötig – dieser Artikel steht in allen Rezepten und Plänen unbegrenzt zur Verfügung.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                      Aktueller Vorrat
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Number(manualAmountStr) || 0;
                            const step = ["Stk.", "Bund", "Packung", "Dose", "Flasche"].includes(manualUnit) ? 1 : 50;
                            setManualAmountStr(String(Math.max(0, cur - step)));
                          }}
                          style={{ width: "28px", height: "36px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 700, cursor: "pointer", color: "#334155" }}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={manualAmountStr}
                          onChange={(e) => setManualAmountStr(e.target.value)}
                          placeholder="z. B. 250"
                          className="search-field"
                          style={{ width: "100%", height: "36px", textAlign: "center", fontWeight: 700 }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cur = Number(manualAmountStr) || 0;
                            const step = ["Stk.", "Bund", "Packung", "Dose", "Flasche"].includes(manualUnit) ? 1 : 50;
                            setManualAmountStr(String(cur + step));
                          }}
                          style={{ width: "28px", height: "36px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", fontWeight: 700, cursor: "pointer", color: "#334155" }}
                        >
                          +
                        </button>
                      </div>
                    </label>

                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                      Gesamtpackung
                      <input
                        type="number"
                        min="0"
                        value={manualTotalStr}
                        onChange={(e) => setManualTotalStr(e.target.value)}
                        placeholder="z. B. 500"
                        className="search-field"
                        style={{ width: "100%", height: "36px", marginTop: "4px" }}
                      />
                    </label>
                  </div>

                  {/* Quick amount chips */}
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>Schnellwahl:</span>
                    {(["Stk.", "Bund", "Packung", "Dose", "Flasche"].includes(manualUnit)
                      ? [1, 2, 3, 5, 10]
                      : ["kg", "l"].includes(manualUnit)
                      ? [1, 2, 5]
                      : [100, 250, 500, 1000]
                    ).map((chipVal) => (
                      <button
                        key={chipVal}
                        type="button"
                        onClick={() => setManualAmountStr(String(chipVal))}
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          border: manualAmountStr === String(chipVal) ? "1.5px solid #059669" : "1px solid #cbd5e1",
                          background: manualAmountStr === String(chipVal) ? "#ecfdf5" : "#f8fafc",
                          color: manualAmountStr === String(chipVal) ? "#047857" : "#334155",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {chipVal}{manualUnit}
                      </button>
                    ))}
                  </div>

                  {/* Optional MHD in Manual Mode */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <label style={{ fontSize: "10px", fontWeight: 750, color: "#475569", textTransform: "uppercase" }}>
                        Mindesthaltbarkeitsdatum (MHD)
                      </label>
                      {manualMhd && (
                        <button
                          type="button"
                          onClick={() => setManualMhd("")}
                          style={{ border: "none", background: "none", color: "#dc2626", fontSize: "10px", cursor: "pointer", fontWeight: 700 }}
                        >
                          Entfernen
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="date"
                        value={manualMhd}
                        onChange={(e) => setManualMhd(e.target.value)}
                        className="search-field"
                        style={{ height: "32px", fontSize: "11px", padding: "0 8px", background: "#ffffff" }}
                      />
                      {[
                        { label: "+3 T.", days: 3 },
                        { label: "+7 T.", days: 7 },
                        { label: "+14 T.", days: 14 },
                        { label: "+6 M.", days: 180 },
                      ].map((btn) => (
                        <button
                          key={btn.label}
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + btn.days);
                            setManualMhd(d.toISOString().split("T")[0]);
                          }}
                          style={{ padding: "3px 7px", fontSize: "10.5px", fontWeight: 600, borderRadius: "6px", border: "1px solid #cbd5e1", background: "#ffffff", cursor: "pointer", color: "#475569" }}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Nutrients */}
              <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Nährwerte pro 100g / 100ml (Optional)
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
                  <input
                    type="number"
                    placeholder="Kcal"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value === "" ? "" : Number(e.target.value))}
                    className="search-field"
                    style={{ fontSize: "11px", height: "34px", textAlign: "center" }}
                  />
                  <input
                    type="number"
                    placeholder="Prot (g)"
                    value={manualProtein}
                    onChange={(e) => setManualProtein(e.target.value === "" ? "" : Number(e.target.value))}
                    className="search-field"
                    style={{ fontSize: "11px", height: "34px", textAlign: "center" }}
                  />
                  <input
                    type="number"
                    placeholder="Carb (g)"
                    value={manualCarbs}
                    onChange={(e) => setManualCarbs(e.target.value === "" ? "" : Number(e.target.value))}
                    className="search-field"
                    style={{ fontSize: "11px", height: "34px", textAlign: "center" }}
                  />
                  <input
                    type="number"
                    placeholder="Fett (g)"
                    value={manualFat}
                    onChange={(e) => setManualFat(e.target.value === "" ? "" : Number(e.target.value))}
                    className="search-field"
                    style={{ fontSize: "11px", height: "34px", textAlign: "center" }}
                  />
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
