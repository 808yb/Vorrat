import { GoogleGenAI } from "@google/genai";
import { getFoodTone } from "../components/FoodIcons";

export interface ParsedReceiptFoodItem {
  id: string;
  name: string;
  quantity: string;
  amount: number;
  total: number;
  unit: string;
  price: number;
  category: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl";
  selected: boolean;
  tone: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

/**
 * Intelligent Receipt OCR & Text Analysis with Gemini Vision / AI
 */
export async function analyzeReceiptWithGemini(params: {
  imageBase64?: string;
  mimeType?: string;
  text?: string;
}): Promise<ParsedReceiptFoodItem[]> {
  const apiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
    "";

  if (!apiKey) {
    if (params.text && params.text.trim().length > 0) {
      return parseReceiptFallback(params.text);
    }
    throw new Error("Kein Gemini API-Schlüssel gefunden. Bitte erstelle einen Key in Google AI Studio.");
  }

  const promptText = `Du bist ein professioneller OCR- & Kassenbon-Analyst für deutsche Supermärkte (Rewe, Edeka, Aldi, Lidl, Kaufland, Netto, Penny, dm, Alnatura).
Analysiere diesen Kassenbon (Foto oder Text) und extrahiere alle Lebensmittel und Getränke.

Regeln:
1. Extrahiere ALLE Lebensmittel und Getränke als einzelne Positionen.
2. Ignoriere Non-Food-Artikel (wie Leergut/Pfand, Einkaufstüten, Tabak, Zeitschriften, Drogerie-Artikel ohne Lebensmittelbezug).
3. Bereinige kryptische Kassenbon-Abkürzungen in lesbare, saubere Produktnamen (z.B. "JA! BASM REIS 1KG" -> "Ja! Basmati Reis", "BIO FREIL EI 10" -> "Bio Freiland-Eier", "KIKKOM SOJA 150" -> "Kikkoman Sojasauce", "TK ERBSEN 450" -> "TK Erbsen").
4. Ordne passende Mengen ("amount"), Einheiten ("unit": "g" | "ml" | "Stk."), Einzel-/Gesamtpreise in Euro ("price") und die passende Vorratskategorie ("category": "Kühl" | "Trocken" | "Saucen" | "Tiefkühl") zu.

Antworte AUSSCHLIESSLICH als valides JSON in folgendem Schema ohne Markdown-Backticks:
{
  "items": [
    {
      "name": "Klarer Produktname",
      "amount": 500,
      "unit": "g",
      "price": 1.99,
      "category": "Trocken"
    }
  ]
}`;

  // 1. Try with GoogleGenAI SDK (Primary)
  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];

    if (params.imageBase64) {
      const cleanBase64 = params.imageBase64.replace(/^data:[^;]+;base64,/, "");
      contents.push({
        inlineData: {
          mimeType: params.mimeType || "image/jpeg",
          data: cleanBase64,
        },
      });
    }

    if (params.text) {
      contents.push({
        text: `Kassenbon-Textinhalt:\n${params.text}`,
      });
    }

    contents.push(promptText);

    const modelsToTry = ["gemini-3.8-flash", "gemini-flash-lite-latest", "gemini-3.5-flash-lite"];
    let rawText = "";

    for (const model of modelsToTry) {
      try {
        const resp = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        });
        rawText = resp.text?.trim() || "";
        if (rawText) break;
      } catch (mErr) {
        console.warn(`[Receipt OCR] Fehler mit Modell ${model}:`, mErr);
      }
    }

    if (rawText) {
      const cleanJson = rawText.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        return parsed.items.map((item: any, idx: number) => {
          const tone = getFoodTone(item.name || "", item.category);
          const amount = Number(item.amount) || (item.unit === "Stk." ? 1 : 500);
          const unit = item.unit || "g";
          return {
            id: `receipt-item-${Date.now()}-${idx}`,
            name: String(item.name || "Lebensmittel"),
            quantity: `${amount} ${unit}`,
            amount,
            total: amount,
            unit,
            price: Number(item.price) || 1.99,
            category: (item.category as any) || "Trocken",
            selected: true,
            tone,
            caloriesPer100g: 180,
            proteinPer100g: 6.5,
            carbsPer100g: 25.0,
            fatPer100g: 2.0,
          };
        });
      }
    }
  } catch (err) {
    console.error("[Receipt OCR] SDK Analyse fehlgeschlagen:", err);
  }

  // Fallback to text parsing only if text was provided
  if (params.text && params.text.trim().length > 0) {
    return parseReceiptFallback(params.text);
  }

  return [];
}

/**
 * Fallback regex parser for offline / manual text input
 */
export function parseReceiptFallback(rawText: string): ParsedReceiptFoodItem[] {
  const lines = rawText.split("\n");
  const items: ParsedReceiptFoodItem[] = [];

  const blacklist = [
    "summe",
    "gesamt",
    "total",
    "kartenzahlung",
    "bar",
    "rückgeld",
    "eur",
    "mwst",
    "pfand",
    "leergut",
    "filiale",
    "tüte",
    "tragetasche",
    "stk",
    "rabatt",
    "datum",
    "uhrzeit",
    "kasse",
    "bon-nr",
    "terminal",
    "beleg",
  ];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("-") || trimmed.startsWith("=")) return;

    const lower = trimmed.toLowerCase();
    if (blacklist.some((word) => lower.startsWith(word) || lower === word)) return;

    // Match price at the end e.g. "1,99 B" or "1.99"
    const priceMatch = trimmed.match(/(\d+[.,]\d{2})\s*[A-Za-z]?$/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(",", ".")) : 1.99;

    let name = trimmed.replace(/(\d+[.,]\d{2})\s*[A-Za-z]?$/, "").trim();
    name = name.replace(/[*_#]/g, "").trim();
    if (name.length < 2) return;

    // Determine category
    let category: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl" = "Trocken";
    let unit = "g";
    let amount = 500;

    const nameLower = name.toLowerCase();
    if (nameLower.includes("tk") || nameLower.includes("eis") || nameLower.includes("tiefkühl")) {
      category = "Tiefkühl";
      amount = 450;
    } else if (nameLower.includes("öl") || nameLower.includes("sauce") || nameLower.includes("soße") || nameLower.includes("essig")) {
      category = "Saucen";
      unit = "ml";
      amount = 250;
    } else if (nameLower.includes("milch") || nameLower.includes("joghurt") || nameLower.includes("ei") || nameLower.includes("käse") || nameLower.includes("butter")) {
      category = "Kühl";
      if (nameLower.includes("milch")) {
        unit = "ml";
        amount = 1000;
      } else if (nameLower.includes("ei")) {
        unit = "Stk.";
        amount = 10;
      } else if (nameLower.includes("butter")) {
        amount = 250;
      }
    }

    // Parse package size if present (e.g. 1kg, 500g, 150ml, 10er)
    const qtyMatch = nameLower.match(/(\d+)\s*(kg|g|ml|l|er|stk)/i);
    if (qtyMatch) {
      const val = parseInt(qtyMatch[1], 10);
      const u = qtyMatch[2].toLowerCase();
      if (u === "kg") {
        amount = val * 1000;
        unit = "g";
      } else if (u === "l") {
        amount = val * 1000;
        unit = "ml";
      } else if (u === "ml") {
        amount = val;
        unit = "ml";
      } else if (u === "g") {
        amount = val;
        unit = "g";
      } else if (u === "er" || u === "stk") {
        amount = val;
        unit = "Stk.";
      }
    }

    const tone = getFoodTone(name, category);

    items.push({
      id: `fallback-${Date.now()}-${idx}`,
      name,
      quantity: `${amount} ${unit}`,
      amount,
      total: amount,
      unit,
      price,
      category,
      selected: true,
      tone,
      caloriesPer100g: 180,
      proteinPer100g: 6.0,
      carbsPer100g: 25.0,
      fatPer100g: 2.0,
    });
  });

  return items;
}
