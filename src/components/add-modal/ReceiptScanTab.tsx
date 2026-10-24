import React from "react";
import { Receipt, Sparkles } from "lucide-react";
import { ProductMark, getFoodTone } from "../FoodIcons";
import {
  analyzeReceiptWithGemini,
  calculateEstimatedMhd,
  type ParsedReceiptFoodItem,
} from "../../utils/receiptOcr";
import { findMatchingPantryItem } from "../../utils/pantryMatching";

export interface ReceiptScanTabProps {
  groceries?: Array<{ id: number | string; name: string; category?: string; [key: string]: any }>;
  onAddProduct: (item: any) => void;
  onImportReceipt?: (importedItems: any[]) => void;
  onAddItems?: (importedItems: any[]) => void;
  onNotify?: (message: string) => void;
  onClose: () => void;
}

export const ReceiptScanTab: React.FC<ReceiptScanTabProps> = ({
  groceries,
  onAddProduct,
  onImportReceipt,
  onAddItems,
  onNotify,
  onClose,
}) => {
  const [receiptImage, setReceiptImage] = React.useState<string | null>(null);
  const [receiptItems, setReceiptItems] = React.useState<ParsedReceiptFoodItem[]>([]);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = React.useState(false);
  const [receiptUploadSuccess, setReceiptUploadSuccess] = React.useState(false);
  const [receiptError, setReceiptError] = React.useState<string | null>(null);

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

  const handleProcessImage = async (file: File) => {
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
        setReceiptUploadSuccess(false);
        const msg = err instanceof Error ? err.message : "Fehler bei der Bon-Analyse.";
        setReceiptError(msg);
      } finally {
        setIsAnalyzingReceipt(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    const selected = receiptItems.filter((i) => i.selected && i.amount > 0);
    const convertedItems = selected.map((item) => ({
      name: item.name,
      category: item.category,
      amount: item.amount,
      total: item.total || item.amount,
      unit: item.unit || "Stk.",
      price: item.price,
      tone: item.tone || getFoodTone(item.name, item.category),
      minAmount: Math.round(item.amount * 0.3),
      caloriesPer100g: item.caloriesPer100g,
      proteinPer100g: item.proteinPer100g,
      carbsPer100g: item.carbsPer100g,
      fatPer100g: item.fatPer100g,
      mhd: item.mhd,
    }));

    const importFn = onImportReceipt || onAddItems;
    if (importFn) {
      importFn(convertedItems);
    } else {
      convertedItems.forEach((item) => onAddProduct(item));
      if (onNotify) {
        onNotify(`${selected.length} Lebensmittel vom Kassenbon mit Auto-MHD hinzugefügt!`);
      }
    }
    onClose();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "11px 10px",
            background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
            color: "#ffffff",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 750,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
            textAlign: "center",
          }}
        >
          <span>📸</span>
          <span>Bon fotografieren</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleProcessImage(file);
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
          <span>📁</span>
          <span>Foto hochladen</span>
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleProcessImage(file);
            }}
          />
        </label>
      </div>

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
          <strong style={{ fontSize: "13px", color: "#065f46", display: "block" }}>
            Gemini Vision OCR analysiert deinen Kassenbon...
          </strong>
          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#047857" }}>
            Lese Produkte, Mengen und Preise aus dem Beleg ein...
          </p>
        </div>
      )}

      {receiptError && !isAnalyzingReceipt && (
        <div style={{ fontSize: "11.5px", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: "12px" }}>
          <strong>Erkennung fehlgeschlagen: </strong>{receiptError}
        </div>
      )}

      {receiptItems.length === 0 && !isAnalyzingReceipt && (
        <div style={{ textAlign: "center", padding: "24px 16px", background: "#f8fafc", borderRadius: "16px", border: "1px dashed #cbd5e1" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: "#f4f7f5", border: "1px solid #eaece9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
            <Receipt className="w-6 h-6 text-slate-700" />
          </div>
          <h4 style={{ margin: "0 0 4px", fontSize: "13.5px", fontWeight: 750, color: "#0f172a" }}>
            Kassenbon automatisch scannen & analysieren
          </h4>
          <p style={{ margin: "0 0 14px", fontSize: "11px", color: "#64748b", lineHeight: 1.4, maxWidth: "300px", marginInline: "auto" }}>
            Mache ein Foto von deinem Einkaufszettel. Die KI erkennt Lebensmittel, Preise und berechnet das <strong>MHD automatisch</strong>.
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" /> Echten Lidl-Bon testen (11 Artikel)
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
            <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#334155" }}>
              Erkannte Positionen ({receiptItems.filter((i) => i.selected).length}/{receiptItems.length})
            </span>
            <button
              type="button"
              onClick={() => {
                const allSelected = receiptItems.every((i) => i.selected);
                setReceiptItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
              }}
              style={{ background: "transparent", border: "none", color: "#059669", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
            >
              {receiptItems.every((i) => i.selected) ? "Alle abwählen" : "Alle auswählen"}
            </button>
          </div>

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
                      <strong style={{ fontSize: "12.5px", color: "#0f172a" }}>{item.name}</strong>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", color: "#475569" }}>{item.amount} {item.unit}</span>
                        {item.mhd && (
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "6px", background: isAkut ? "#fef2f2" : "#ecfdf5", color: isAkut ? "#b91c1c" : "#047857" }}>
                            MHD: {item.mhd.split("-").reverse().join(".")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {item.price && (
                    <span style={{ fontSize: "11.5px", fontWeight: 750, color: "#059669" }}>
                      {item.price.toFixed(2).replace(".", ",")} €
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {receiptItems.filter((i) => i.selected).length > 0 && (
            <button
              type="button"
              className="primary-button"
              style={{ height: "46px", borderRadius: "12px", fontSize: "13px", marginTop: "4px" }}
              onClick={handleSubmit}
            >
              {receiptItems.filter((i) => i.selected).length} Positionen in den Vorrat übernehmen
            </button>
          )}
        </>
      )}
    </div>
  );
};
