import React, { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { ProductMark, getFoodTone } from "../FoodIcons";
import { lookupBarcodeFromOFF, type OFFProduct } from "../../utils/openFoodFacts";
import { reportWarning, reportUserError } from "../../utils/logger";
import type { ScannedMultiItem } from "../UnifiedAddModal";

export interface BarcodeScanTabProps {
  onAddProduct: (item: any) => void;
  onAddItems?: (importedItems: any[]) => void;
  onNotify?: (message: string) => void;
  onClose: () => void;
}

export const BarcodeScanTab: React.FC<BarcodeScanTabProps> = ({
  onAddProduct,
  onAddItems,
  onNotify,
  onClose,
}) => {
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [multiScannedItems, setMultiScannedItems] = useState<ScannedMultiItem[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });

  const stopCamera = () => {
    try {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        codeReaderRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      reportWarning("BarcodeScanTab.stopCamera", err);
    }
    setIsLiveCameraActive(false);
    setIsTorchOn(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleBarcodeRecognized = async (barcode: string) => {
    const now = Date.now();
    if (lastScannedRef.current.code === barcode && now - lastScannedRef.current.time < 2000) {
      return;
    }
    lastScannedRef.current = { code: barcode, time: now };

    const tempId = `scan-${Date.now()}`;
    const placeholder: ScannedMultiItem = {
      id: tempId,
      barcode,
      name: `Barcode ${barcode}`,
      brand: "",
      amount: 1,
      total: 1,
      unit: "Stk.",
      category: "Kühl",
      tone: "egg",
      nutriScore: "?",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      isLoading: true,
    };
    setMultiScannedItems((prev) => [placeholder, ...prev]);

    try {
      const res = await lookupBarcodeFromOFF(barcode);
      if (res.success && res.product) {
        const p = res.product;
        setMultiScannedItems((prev) =>
          prev.map((item) =>
            item.id === tempId
              ? {
                  ...item,
                  name: p.name || item.name,
                  brand: p.brand || "",
                  amount: p.amount || 1,
                  total: p.amount || 1,
                  unit: p.unit || "Stk.",
                  category: p.category || "Kühl",
                  tone: getFoodTone(p.name || "", p.category),
                  nutriScore: p.nutriScore || "?",
                  calories: p.calories || 0,
                  protein: p.protein || 0,
                  carbs: p.carbs || 0,
                  fat: p.fat || 0,
                  isLoading: false,
                }
              : item
          )
        );
        if (onNotify) onNotify(`✓ ${p.name || barcode} erfasst!`);
      } else {
        setMultiScannedItems((prev) =>
          prev.map((item) => (item.id === tempId ? { ...item, isLoading: false } : item))
        );
      }
    } catch (err) {
      reportWarning("BarcodeScanTab.lookupBarcode", err);
      setMultiScannedItems((prev) =>
        prev.map((item) => (item.id === tempId ? { ...item, isLoading: false } : item))
      );
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      codeReaderRef.current = reader;
      setIsLiveCameraActive(true);

      if (videoRef.current) {
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;

        await reader.decodeFromConstraints(
          {
            audio: false,
            video: { facingMode: { ideal: "environment" } },
          },
          videoRef.current,
          (result) => {
            if (result) {
              handleBarcodeRecognized(result.getText());
            }
          }
        );
      }
    } catch (err: any) {
      const errorMsg = err?.message || "Kamera-Zugriff verweigert.";
      setCameraError(errorMsg);
      reportUserError("BarcodeScanTab.startCamera", "Kamera-Zugriff fehlgeschlagen.", err);
      setIsLiveCameraActive(false);
    }
  };

  const handleApplyAll = () => {
    const mapped = multiScannedItems.map((item) => ({
      name: item.name,
      category: item.category,
      amount: item.amount,
      total: item.total || item.amount,
      unit: item.unit,
      tone: item.tone,
      caloriesPer100g: item.calories,
      proteinPer100g: item.protein,
      carbsPer100g: item.carbs,
      fatPer100g: item.fat,
    }));
    if (onAddItems) {
      onAddItems(mapped);
    } else {
      mapped.forEach((item) => onAddProduct(item));
    }
    if (onNotify) {
      onNotify(`${multiScannedItems.length} Produkte in den Vorrat übernommen!`);
    }
    stopCamera();
    onClose();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ position: "relative", borderRadius: "16px", overflow: "hidden", background: "#0f172a", minHeight: "220px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <video
          ref={videoRef}
          style={{
            width: "100%",
            height: "220px",
            objectFit: "cover",
            display: isLiveCameraActive ? "block" : "none",
          }}
          playsInline
          muted
        />

        {!isLiveCameraActive && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <p style={{ color: "#cbd5e1", fontSize: "12px", marginBottom: "12px" }}>
              Kamera für schnellen Mehrfach-Scan starten
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="primary-button"
              style={{ background: "#059669", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "10px", fontWeight: 700, cursor: "pointer" }}
            >
              Kamera starten
            </button>
          </div>
        )}

        {isLiveCameraActive && (
          <button
            type="button"
            onClick={stopCamera}
            style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "8px", padding: "4px 8px", fontSize: "11px", cursor: "pointer" }}
          >
            Stopp
          </button>
        )}
      </div>

      {cameraError && (
        <div style={{ fontSize: "11.5px", color: "#b91c1c", background: "#fef2f2", padding: "8px 12px", borderRadius: "8px" }}>
          {cameraError}
        </div>
      )}

      {/* Manual barcode input */}
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          placeholder="Barcode manuell eintippen..."
          style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "12px" }}
        />
        <button
          type="button"
          onClick={() => {
            if (barcodeInput.trim()) {
              handleBarcodeRecognized(barcodeInput.trim());
              setBarcodeInput("");
            }
          }}
          style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 650, cursor: "pointer" }}
        >
          Suchen
        </button>
      </div>

      {/* Scanned Items Tray */}
      {multiScannedItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", fontWeight: 750, color: "#334155" }}>
              Gescannte Artikel ({multiScannedItems.length})
            </span>
            <button
              type="button"
              onClick={() => setMultiScannedItems([])}
              style={{ background: "none", border: "none", color: "#dc2626", fontSize: "11px", cursor: "pointer" }}
            >
              Leeren
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
            {multiScannedItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ProductMark tone={item.tone} name={item.name} category={item.category} compact />
                  <div>
                    <strong style={{ fontSize: "12px", color: "#0f172a", display: "block" }}>{item.name}</strong>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>{item.amount} {item.unit}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMultiScannedItems((prev) => prev.filter((i) => i.id !== item.id))}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={handleApplyAll}
            style={{ height: "42px", borderRadius: "10px", fontSize: "12.5px" }}
          >
            Alle ({multiScannedItems.length}) in den Vorrat übernehmen
          </button>
        </div>
      )}
    </div>
  );
};
