import { callGeminiProxy, extractTextFromGeminiResponse } from './geminiProxy';
import { getFoodTone } from "../components/FoodIcons";
import { findFoodNutrition } from "../data/foodNutritionDatabase";

export interface EstimatedMhdResult {
  mhd: string; // YYYY-MM-DD
  shelfLifeDays: number;
  freshnessHint: string;
  isUrgent: boolean;
}

/**
 * Intelligent Shelf-Life Matrix & Freshness Heuristic
 * Determines realistic expiration dates from receipt items without barcode scanning.
 */
export function calculateEstimatedMhd(name: string, category: string, baseDate: Date = new Date()): EstimatedMhdResult {
  const lower = name.toLowerCase().trim();
  let days = 14;
  let hint = "Kühlregal (~2 Wochen)";
  let isUrgent = false;

  // 1. Fresh meat, poultry, fish, minced meat (Akut)
  if (
    lower.includes("hähn") ||
    lower.includes("minuten") ||
    lower.includes("schnitz") ||
    lower.includes("filet") ||
    lower.includes("geflügel") ||
    lower.includes("hack") ||
    lower.includes("fleisch") ||
    lower.includes("rinder") ||
    lower.includes("lachs") ||
    lower.includes("fisch") ||
    lower.includes("steak") ||
    lower.includes("bratwurst") ||
    lower.includes("pute") ||
    lower.includes("mett")
  ) {
    days = 3;
    hint = "Akut verzehren (Frischfleisch/Geflügel)";
    isUrgent = true;
  }
  // 2. Leafy greens, salads, berries, fresh herbs (Dringend)
  else if (
    lower.includes("salat") ||
    lower.includes("pflück") ||
    lower.includes("rucola") ||
    lower.includes("feld") ||
    lower.includes("beeren") ||
    lower.includes("erdbeer") ||
    lower.includes("himbeer") ||
    lower.includes("blaubeer") ||
    lower.includes("heidelbeer") ||
    lower.includes("kräuter") ||
    lower.includes("basilikum")
  ) {
    days = 4;
    hint = "Schnell verbrauchen (Salat/Beeren)";
    isUrgent = true;
  }
  // 3. Fresh vegetables & fruits (Frischgemüse & Obst)
  else if (
    lower.includes("paprika") ||
    lower.includes("gurke") ||
    lower.includes("tomate") ||
    lower.includes("avocado") ||
    lower.includes("pilz") ||
    lower.includes("champignon") ||
    lower.includes("zucchini") ||
    lower.includes("aubergine") ||
    lower.includes("brokkoli") ||
    lower.includes("möhre") ||
    lower.includes("karotte") ||
    lower.includes("banane") ||
    lower.includes("apfel") ||
    lower.includes("traube") ||
    lower.includes("zitrone") ||
    lower.includes("limette") ||
    lower.includes("obst") ||
    lower.includes("gemüse")
  ) {
    days = 7;
    hint = "Frischware (~1 Woche)";
    isUrgent = false;
  }
  // 4. Dairy, yogurt, cheese, deli, chilled items
  else if (
    category === "Kühl" ||
    lower.includes("joghurt") ||
    lower.includes("milch") ||
    lower.includes("quark") ||
    lower.includes("käse") ||
    lower.includes("butter") ||
    lower.includes("sahne") ||
    lower.includes("frischkäse") ||
    lower.includes("schmand") ||
    lower.includes("tofu") ||
    lower.includes("hummus")
  ) {
    days = 14;
    hint = "Kühlregal (~2 Wochen)";
    isUrgent = false;
  }
  // 5. Fresh bread, wraps, bakery
  else if (
    lower.includes("wrap") ||
    lower.includes("tortilla") ||
    lower.includes("toast") ||
    lower.includes("brot") ||
    lower.includes("brötchen") ||
    lower.includes("pita")
  ) {
    days = 28;
    hint = "Backware (~4 Wochen)";
    isUrgent = false;
  }
  // 6. Frozen goods (Tiefkühl)
  else if (
    category === "Tiefkühl" ||
    lower.includes("tk") ||
    lower.includes("tiefkühl") ||
    lower.includes("eis") ||
    lower.includes("kartoffel-gitter") ||
    lower.includes("pommes") ||
    lower.includes("pizza")
  ) {
    days = 180;
    hint = "Tiefkühl (~6 Monate)";
    isUrgent = false;
  }
  // 7. Canned, jars, pickled, long-lasting shelf items
  else if (
    lower.includes("cornichon") ||
    lower.includes("gurkenglas") ||
    lower.includes("konserve") ||
    lower.includes("dose") ||
    lower.includes("bohne") ||
    lower.includes("mais") ||
    lower.includes("kichererbse")
  ) {
    days = 240;
    hint = "Konserve/Glas (~8 Monate)";
    isUrgent = false;
  }
  // 8. Dry staples (cereals, pasta, rice, oats, flour)
  else if (
    category === "Trocken" ||
    lower.includes("hafer") ||
    lower.includes("reis") ||
    lower.includes("pasta") ||
    lower.includes("nudel") ||
    lower.includes("spaghetti") ||
    lower.includes("mehl") ||
    lower.includes("müsli") ||
    lower.includes("linsen")
  ) {
    days = 240;
    hint = "Trockenvorrat (~8 Monate)";
    isUrgent = false;
  }
  // 9. Beverages, sodas, energy drinks
  else if (
    lower.includes("monster") ||
    lower.includes("pepsi") ||
    lower.includes("cola") ||
    lower.includes("energy") ||
    lower.includes("wasser") ||
    lower.includes("saft") ||
    lower.includes("fanta") ||
    lower.includes("sprite")
  ) {
    days = 365;
    hint = "Getränk (~1 Jahr)";
    isUrgent = false;
  }
  // 10. Sauces & spices
  else if (category === "Saucen" || lower.includes("sauce") || lower.includes("soße") || lower.includes("öl")) {
    days = 180;
    hint = "Saucen & Gewürze (~6 Monate)";
    isUrgent = false;
  }

  const targetDate = new Date(baseDate);
  targetDate.setDate(targetDate.getDate() + days);
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
  const dd = String(targetDate.getDate()).padStart(2, "0");

  return {
    mhd: `${yyyy}-${mm}-${dd}`,
    shelfLifeDays: days,
    freshnessHint: hint,
    isUrgent,
  };
}

export interface ParsedReceiptFoodItem {
  id: string;
  name: string;
  quantity: string;
  amount: number;
  total: number;
  unit: string;
  price: number;
  category: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl" | "Getränke";
  selected: boolean;
  tone: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  mhd?: string;
  shelfLifeDays?: number;
  freshnessHint?: string;
  isUrgent?: boolean;
}

/**
 * Intelligent Receipt OCR & Text Analysis with Gemini Vision / AI
 */
export async function analyzeReceiptWithGemini(params: {
  imageBase64?: string;
  mimeType?: string;
  text?: string;
}): Promise<ParsedReceiptFoodItem[]> {
  if (!params.imageBase64 && (!params.text || params.text.trim().length === 0)) {
    throw new Error("Kein Bild und kein Text übergeben – bitte Kassenbon-Foto oder Text eingeben.");
  }

  const promptText = `Du bist ein professioneller OCR- & Kassenbon-Analyst für deutsche Supermärkte (Rewe, Edeka, Aldi, Lidl, Kaufland, Netto, Penny, dm, Alnatura).
Analysiere diesen Kassenbon (Foto oder Text) und extrahiere alle Lebensmittel und Getränke.

Regeln:
1. Extrahiere ALLE Lebensmittel und Getränke als einzelne Positionen.
2. Ignoriere Non-Food-Artikel (wie Leergut/Pfand, Einkaufstüten, Rabatte, Tabak, Drogerie-Artikel ohne Lebensmittelbezug).
3. Bereinige kryptische Kassenbon-Abkürzungen in lesbare, saubere Produktnamen:
   - "Hähn.Minutenschnitz." -> "Hähnchen Minutenschnitzel"
   - "Paprika rot 0,210 kg" -> "Paprika rot" (Menge: 210, Einheit: "g")
   - "Pflücksalat" -> "Pflücksalat"
   - "Kartoffel-Gitter" -> "Kartoffel-Gitter (TK)"
   - "Monster White Zero" -> "Monster Energy White Zero"
   - "Haferflocken Zart" -> "Haferflocken Zart"
   - "Cornichons scharf" -> "Cornichons scharf"
   - "Tortilla Wraps Weiz." -> "Tortilla Wraps"
4. Ordne passende Mengen ("amount"), Einheiten ("unit": "g" | "ml" | "Stk."), Einzelpreise in Euro ("price") und die passende Vorratskategorie ("category": "Kühl" | "Trocken" | "Saucen" | "Tiefkühl" | "Getränke") zu.
5. Schätze für jedes Produkt die realistische Resthaltbarkeit in Tagen ab Kaufdatum ("shelfLifeDays", z.B. 3 für frisches Geflügel, 4 für Blattsalat, 7 für Gemüse/Gurke, 14 für Joghurt, 180 für TK, 240 für Haferflocken/Konserven).

Antworte AUSSCHLIESSLICH als valides JSON in folgendem Schema ohne Markdown-Backticks:
{
  "items": [
    {
      "name": "Klarer Produktname",
      "amount": 500,
      "unit": "g",
      "price": 1.99,
      "category": "Trocken",
      "shelfLifeDays": 240
    }
  ]
}`;

  // Primary: route through the secure server-side proxy
  try {
    // Build a contents array for the proxy
    const contents: unknown[] = [];

    if (params.imageBase64) {
      const cleanBase64 = params.imageBase64.replace(/^data:[^;]+;base64,/, "");
      const modelsToTry = ["gemini-3.8-flash", "gemini-flash-lite-latest", "gemini-3.5-flash-lite"];
      let rawText = "";

      for (const model of modelsToTry) {
        try {
          const resp = await callGeminiProxy({
            model,
            contents: params.text
              ? `Kassenbon-Textinhalt:\n${params.text}\n\n${promptText}`
              : promptText,
            config: { responseMimeType: "application/json", temperature: 0.2 },
            inlineData: { data: cleanBase64, mimeType: params.mimeType || "image/jpeg" },
          });
          rawText = extractTextFromGeminiResponse(resp) ?? "";
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
            const mhdEstimate = calculateEstimatedMhd(item.name || "", item.category || "Trocken");
            const nutrition = findFoodNutrition(item.name || "", item.category);

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
              caloriesPer100g: nutrition.calories,
              proteinPer100g: nutrition.protein,
              carbsPer100g: nutrition.carbs,
              fatPer100g: nutrition.fat,
              mhd: mhdEstimate.mhd,
              shelfLifeDays: item.shelfLifeDays || mhdEstimate.shelfLifeDays,
              freshnessHint: mhdEstimate.freshnessHint,
              isUrgent: mhdEstimate.isUrgent,
            };
          });
        }
      }
    } else {
      // Text-only mode: use a simple model cascade through the proxy
      const modelsToTry = ["gemini-3.8-flash", "gemini-flash-lite-latest", "gemini-3.5-flash-lite"];
      let rawText = "";

      for (const model of modelsToTry) {
        try {
          const textPrompt = params.text
            ? `Kassenbon-Textinhalt:\n${params.text}\n\n${promptText}`
            : promptText;
          const resp = await callGeminiProxy({
            model,
            contents: textPrompt,
            config: { responseMimeType: "application/json", temperature: 0.2 },
          });
          rawText = extractTextFromGeminiResponse(resp) ?? "";
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
            const mhdEstimate = calculateEstimatedMhd(item.name || "", item.category || "Trocken");
            const nutrition = findFoodNutrition(item.name || "", item.category);

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
              caloriesPer100g: nutrition.calories,
              proteinPer100g: nutrition.protein,
              carbsPer100g: nutrition.carbs,
              fatPer100g: nutrition.fat,
              mhd: mhdEstimate.mhd,
              shelfLifeDays: item.shelfLifeDays || mhdEstimate.shelfLifeDays,
              freshnessHint: mhdEstimate.freshnessHint,
              isUrgent: mhdEstimate.isUrgent,
            };
          });
        }
      }
    }
  } catch (err) {
    console.error("[Receipt OCR] Proxy-Analyse fehlgeschlagen:", err);
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
    "lidl plus",
    "datum",
    "uhrzeit",
    "kasse",
    "bon-nr",
    "terminal",
    "beleg",
    "vogelwoog",
    "kaiserslautern",
    "zu zahlen",
    "karte",
    "preisvorteil",
    "gespart",
    "eur/kg",
  ];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("-") || trimmed.startsWith("=")) return;

    // 1. Check if line is a pure weight subline like "0,210 kg x 2,99 EUR/kg"
    const weightSubMatch = trimmed.match(/(\d+[.,]\d{1,3})\s*kg\s*x/i);
    if (weightSubMatch && items.length > 0) {
      const kgVal = parseFloat(weightSubMatch[1].replace(",", "."));
      const last = items[items.length - 1];
      const gVal = Math.round(kgVal * 1000);
      last.amount = gVal;
      last.total = gVal;
      last.unit = "g";
      last.quantity = `${gVal} g`;
      return;
    }

    // 2. Blacklist filter for non-food and summary rows
    const lower = trimmed.toLowerCase();
    if (blacklist.some((word) => lower.includes(word))) return;

    // 3. Match price at the end e.g. "1,99 B" or "1.99" (genuine product lines always end with a price)
    const priceMatch = trimmed.match(/(\d+[.,]\d{2})\s*[A-Za-z]?$/);
    if (!priceMatch) return;
    const price = parseFloat(priceMatch[1].replace(",", "."));

    let name = trimmed.replace(/(\d+[.,]\d{2})\s*[A-Za-z]?$/, "").trim();
    name = name.replace(/[*_#]/g, "").trim();

    // Check for multiplier like "1,59 x 2"
    let multiplier = 1;
    const multMatch = name.match(/(\d+[.,]\d{2})\s*x\s*(\d+)/i);
    if (multMatch) {
      multiplier = parseInt(multMatch[2], 10) || 1;
      name = name.replace(/\d+[.,]\d{2}\s*x\s*\d+/i, "").trim();
    }

    if (name.length < 2) return;

    // Determine category
    let category: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl" | "Getränke" = "Trocken";
    let unit = "g";
    let amount = 500;

    const nameLower = name.toLowerCase();
    if (
      nameLower.includes("monster") ||
      nameLower.includes("pepsi") ||
      nameLower.includes("cola") ||
      nameLower.includes("wasser") ||
      nameLower.includes("saft")
    ) {
      category = "Getränke";
      unit = multiplier > 1 ? "Stk." : "ml";
      amount = multiplier > 1 ? multiplier : 500;
    } else if (nameLower.includes("tk") || nameLower.includes("eis") || nameLower.includes("tiefkühl") || nameLower.includes("kartoffel-gitter") || nameLower.includes("erbsen")) {
      category = "Tiefkühl";
      amount = 450;
    } else if (nameLower.includes("öl") || nameLower.includes("sauce") || nameLower.includes("soße") || nameLower.includes("essig") || nameLower.includes("cornichon")) {
      category = "Saucen";
      unit = nameLower.includes("cornichon") ? "g" : "ml";
      amount = nameLower.includes("cornichon") ? 350 : 250;
    } else if (
      nameLower.includes("milch") ||
      nameLower.includes("joghurt") ||
      nameLower.includes("ei") ||
      nameLower.includes("käse") ||
      nameLower.includes("butter") ||
      nameLower.includes("hähn") ||
      nameLower.includes("schnitz") ||
      nameLower.includes("fleisch") ||
      nameLower.includes("salat")
    ) {
      category = "Kühl";
      if (nameLower.includes("milch")) {
        unit = "ml";
        amount = 1000;
      } else if (nameLower.includes("ei")) {
        unit = "Stk.";
        amount = 10;
      } else if (nameLower.includes("butter")) {
        amount = 250;
      } else if (nameLower.includes("hähn") || nameLower.includes("schnitz")) {
        amount = 400;
      } else if (nameLower.includes("salat")) {
        amount = 150;
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

    // If multiplier was present (e.g. 2x Monster)
    if (multiplier > 1 && unit === "Stk.") {
      amount = multiplier;
    }

    // Clean name
    const cleanName = name
      .replace(/\s+/g, " ")
      .trim();

    const mhdEstimate = calculateEstimatedMhd(cleanName, category);
    const tone = getFoodTone(cleanName, category);
    const nutrition = findFoodNutrition(cleanName, category);

    items.push({
      id: `fallback-${Date.now()}-${idx}`,
      name: cleanName,
      quantity: `${amount} ${unit}`,
      amount,
      total: amount,
      unit,
      price,
      category,
      selected: true,
      tone,
      caloriesPer100g: nutrition.calories,
      proteinPer100g: nutrition.protein,
      carbsPer100g: nutrition.carbs,
      fatPer100g: nutrition.fat,
      mhd: mhdEstimate.mhd,
      shelfLifeDays: mhdEstimate.shelfLifeDays,
      freshnessHint: mhdEstimate.freshnessHint,
      isUrgent: mhdEstimate.isUrgent,
    });
  });

  return items;
}
