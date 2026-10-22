import { callGeminiProxy, extractTextFromGeminiResponse } from './geminiProxy';
import { isEggIngredientName } from "./recipeHelpers";
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
 * Determines realistic expiration dates from receipt items without barcode scanning:
 * - Fresh meat, poultry, fish, minced meat: 3 days (Akut)
 * - Fresh salad & fresh herbs: 4 days (Dringend)
 * - Fresh vegetables, fruit, fresh baked goods, buttermilk: 6-7 days (~1 Woche)
 * - Fridge items, cream cheese, cheese, eggs, potatoes: 14-21 days (~2-3 Wochen)
 * - Drinks, canned food, syrup, sweets, tea, oat milk (unopened), cornstarch: 180 days (~6 Monate)
 * - Spices & Seasoning basics: 365 days (~1 Jahr) + isUnlimited: true
 */
export function calculateEstimatedMhd(name: string, category: string = "Trocken", baseDate: Date = new Date()): EstimatedMhdResult {
  const lower = name.toLowerCase().trim();
  let days = 14;
  let hint = "Kühlregal / Vorrat (~2 Wochen)";
  let isUrgent = false;

  // 1. Spices & Seasoning basics: 365 days
  if (
    category === "Gewürze" ||
    lower.includes("gewürz") ||
    lower.includes("gewuerz") ||
    lower.includes("paprikapulver") ||
    lower.includes("oregano") ||
    lower.includes("knoblauch granuliert") ||
    lower.includes("knoblauchpulver") ||
    lower.includes("zwiebelpulver") ||
    lower.includes("zimt") ||
    lower.includes("curry") ||
    lower.includes("salz") ||
    lower.includes("pfeffer") ||
    lower.includes("muskat") ||
    lower.includes("kreuzkümmel") ||
    lower.includes("cumin") ||
    lower.includes("backpulver") ||
    lower.includes("vanilleextrakt")
  ) {
    days = 365;
    hint = "Gewürze & Basics (~1 Jahr)";
    isUrgent = false;
  }
  // 2. Fresh meat, poultry, fish, minced meat (Akut: 3 Tage)
  else if (
    lower.includes("hähn") ||
    lower.includes("haehn") ||
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
    hint = "Akut verzehren (Frischfleisch/Geflügel, 3 Tage)";
    isUrgent = true;
  }
  // 3. Fresh salad & fresh herbs (Dringend: 4 Tage)
  else if (
    lower.includes("salat") ||
    lower.includes("pflück") ||
    lower.includes("pflueck") ||
    lower.includes("rucola") ||
    lower.includes("feldsalat") ||
    lower.includes("beeren") ||
    lower.includes("erdbeer") ||
    lower.includes("himbeer") ||
    lower.includes("blaubeer") ||
    lower.includes("heidelbeer") ||
    lower.includes("kräuter") ||
    lower.includes("kraeuter") ||
    lower.includes("petersilie") ||
    lower.includes("basilikum") ||
    lower.includes("schnittlauch") ||
    lower.includes("dill") ||
    lower.includes("koriander")
  ) {
    days = 4;
    hint = "Schnell verbrauchen (Salat/Kräuter, 4 Tage)";
    isUrgent = true;
  }
  // 4. Fresh vegetables, fruit, fresh baked goods, buttermilk (6-7 Tage)
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
    lower.includes("blumenkohl") ||
    lower.includes("möhre") ||
    lower.includes("karotte") ||
    lower.includes("banane") ||
    lower.includes("apfel") ||
    lower.includes("traube") ||
    lower.includes("zitrone") ||
    lower.includes("limette") ||
    lower.includes("brioche") ||
    lower.includes("brötchen") ||
    lower.includes("broetchen") ||
    lower.includes("brot") ||
    lower.includes("toast") ||
    lower.includes("wrap") ||
    lower.includes("buttermilch") ||
    lower.includes("gemüse") ||
    lower.includes("gemuese")
  ) {
    days = 7;
    hint = "Frischware / Backwaren (~1 Woche)";
    isUrgent = false;
  }
  // 5. Frozen goods (Tiefkühl: 180 Tage)
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
  // 6. Chilled goods, cream cheese, cheese, eggs, potatoes (14-21 Tage)
  else if (
    category === "Kühl" ||
    lower.includes("frischkäse") ||
    lower.includes("frischkaese") ||
    lower.includes("käse") ||
    lower.includes("kaese") ||
    lower.includes("joghurt") ||
    lower.includes("quark") ||
    lower.includes("butter") ||
    lower.includes("sahne") ||
    lower.includes("schmand") ||
    lower.includes("kartoffel") ||
    isEggIngredientName(lower) ||
    lower.includes("tofu") ||
    lower.includes("hummus")
  ) {
    days = 14;
    hint = "Kühlregal / Kartoffeln (~2 Wochen)";
    isUrgent = false;
  }
  // 7. Beverages, sodas, energy drinks (365 Tage)
  else if (
    category === "Getränke" ||
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
  // 8. Dry staples (cereals, pasta, rice, oats, flour, lentils: 240 Tage)
  else if (
    category === "Trocken" ||
    lower.includes("hafer") ||
    lower.includes("reis") ||
    lower.includes("pasta") ||
    lower.includes("nudel") ||
    lower.includes("spaghetti") ||
    lower.includes("mehl") ||
    lower.includes("müsli") ||
    lower.includes("muesli") ||
    lower.includes("linsen")
  ) {
    days = 240;
    hint = "Trockenvorrat (~8 Monate)";
    isUrgent = false;
  }
  // 9. Canned food, syrup, sweets, tea, oat milk (unopened), cornstarch: 180 Tage
  else {
    days = 180;
    hint = "Lange haltbar (~6 Monate)";
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

/**
 * Filter out Pfand, Rabatte, Drogerie, Hygiene & Haushaltspapier from receipt lines.
 */
export function isNonFoodReceiptLine(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (!lower) return true;

  const blacklistPatterns = [
    // Pfand & Leergut
    /\bpfand\b/i,
    /0[.,]25\s*\*\s*b/i,
    /0[.,]25\s*eur/i,
    /\bleergut\b/i,
    /\beinwegpfand\b/i,
    /\bmehrwegpfand\b/i,
    /\bdosenpfand\b/i,
    // Rabatte & Aktionen
    /\brabatt\b/i,
    /\blidl\s*plus\b/i,
    /\bpreisvorteil\b/i,
    /\bcoupon\b/i,
    /\baktionspreis\b/i,
    /\bgespart\b/i,
    /\bvorteil\b/i,
    // Drogerie & Körperpflege
    /\bshowergel\b/i,
    /\bduschgel\b/i,
    /\bshampoo\b/i,
    /\bhaarpflege\b/i,
    /\bspülung\b/i,
    /\bzahnpasta\b/i,
    /\bzahncreme\b/i,
    /\bseife\b/i,
    /\bdeo(?:dorant)?\b/i,
    /\bbodylotion\b/i,
    /\bcreme\b/i,
    /\btampons\b/i,
    /\bbinden\b/i,
    /\bwindeln\b/i,
    /\btaschentücher\b/i,
    /\bwattepads\b/i,
    /\brasierer\b/i,
    /\bduschbad\b/i,
    // Haushalt & Papier
    /\bküchentücher\b/i,
    /\bküchenrolle\b/i,
    /\bhaushaltsrolle\b/i,
    /\btoilettenpapier\b/i,
    /\bklopapier\b/i,
    /\bmüllbeutel\b/i,
    /\bmüllsäcke\b/i,
    /\balufolie\b/i,
    /\bbackpapier\b/i,
    /\bspülmittel\b/i,
    /\bspülbalsam\b/i,
    /\bspülmaschinentabs\b/i,
    /\bwaschmittel\b/i,
    /\bweichspüler\b/i,
    /\bschwamm\b/i,
    /\breiniger\b/i,
    /\ballzweckreiniger\b/i,
    /\bwc-reiniger\b/i,
    /\btabs\b/i,
    // Kassenbon-Metadaten & Bezahlzeilen
    /\bsumme\b/i,
    /\bgesamt\b/i,
    /\btotal\b/i,
    /\bkartenzahlung\b/i,
    /\bbar\b/i,
    /\brückgeld\b/i,
    /\bmwst\b/i,
    /\bfiliale\b/i,
    /\btragetasche\b/i,
    /\btüte\b/i,
    /\bpapiertragetasche\b/i,
    /\beinkaufstasche\b/i,
    /\bdatum\b/i,
    /\buhrzeit\b/i,
    /\bkasse\b/i,
    /\bbon-nr\b/i,
    /\bterminal\b/i,
    /\bbeleg\b/i,
    /\bzu zahlen\b/i,
    /\bkarte\b/i,
    /\beur\/kg\b/i,
    /\btabak\b/i,
    /\bzigaretten\b/i,
    /\bbatterien\b/i,
    /\bfeuerzeug\b/i,
    /\bzeitung\b/i,
    /\bzeitschrift\b/i,
  ];

  return blacklistPatterns.some((pattern) => pattern.test(lower));
}

export interface DecodedReceiptItem {
  cleanName: string;
  defaultAmount: number;
  defaultUnit: string;
  category: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl" | "Getränke" | "Gewürze";
  isUnlimited?: boolean;
}

/**
 * Intelligent Supermarket Abbreviation Decoder & Standard Package Sizer
 */
export function decodeReceiptItemName(rawName: string): DecodedReceiptItem {
  let name = rawName
    .replace(/^[*_#\s]+/, "")
    .replace(/[*_#\s]+$/, "")
    .trim();

  // Strip brand prefixes like "G&G ", "GUT & GÜNSTIG ", "JA! ", "K-CLASSIC ", "MILBONA "
  name = name.replace(/^(?:G&G|GUT\s*&\s*GÜNSTIG|JA!|JA\s+|K-CLASSIC|MILBONA|BIO\s+|EDEN\s+|EDEKA\s+|REWE\s+BESTE\s+WAHL)\s+/i, "").trim();

  const lower = name.toLowerCase();

  // 1. Gönrgy / Energy Drinks
  if (lower.includes("goen") || lower.includes("gönrgy") || lower.includes("gonrgy")) {
    return {
      cleanName: "Gönrgy Energy Drink (0,5L)",
      defaultAmount: 500,
      defaultUnit: "ml",
      category: "Getränke",
    };
  }

  // 2. Hähnchen Minutenschnitzel / Geflügel (Standard: 400g)
  if (
    lower.includes("hähn") ||
    lower.includes("haehn") ||
    lower.includes("minutenschnitz") ||
    lower.includes("minuten-schnitz")
  ) {
    return {
      cleanName: "Hähnchen-Minutenschnitzel",
      defaultAmount: 400,
      defaultUnit: "g",
      category: "Kühl",
    };
  }

  // 3. Paprika Mix (Standard: 500g)
  if (lower.includes("paprika") && (lower.includes("mix") || lower.includes("ampel") || lower.includes("trio"))) {
    return {
      cleanName: "Paprika Mix (Gemüse, 500g)",
      defaultAmount: 500,
      defaultUnit: "g",
      category: "Kühl",
    };
  }

  // 4. Frischkäse (Standard: 200g)
  if (lower.includes("frischkäse") || lower.includes("frischkaese")) {
    return {
      cleanName: "Frischkäse",
      defaultAmount: 200,
      defaultUnit: "g",
      category: "Kühl",
    };
  }

  // 5. Kartoffeln / Halloween Kartoffeln (Standard: 1500g)
  if (lower.includes("kartoffel") && !lower.includes("gitter") && !lower.includes("tk") && !lower.includes("pommes")) {
    return {
      cleanName: "Kartoffeln",
      defaultAmount: 1500,
      defaultUnit: "g",
      category: "Kühl",
    };
  }

  // 6. Petersilie / Kräuter (Standard: 1 Bund)
  if (lower.includes("petersilie")) {
    return {
      cleanName: "Petersilie",
      defaultAmount: 1,
      defaultUnit: "Bund",
      category: "Kühl",
    };
  }

  // 7. Pflücksalat (Standard: 150g)
  if (lower.includes("pflück") || lower.includes("pflueck") || (lower.includes("salat") && lower.includes("mix"))) {
    return {
      cleanName: "Pflücksalat",
      defaultAmount: 150,
      defaultUnit: "g",
      category: "Kühl",
    };
  }

  // 8. Brioche Brötchen / Burger Buns (Standard: 4 Stk.)
  if (lower.includes("brioche")) {
    return {
      cleanName: "Brioche Brötchen",
      defaultAmount: 4,
      defaultUnit: "Stk.",
      category: "Kühl",
    };
  }

  // 9. Reine Buttermilch (Standard: 500ml)
  if (lower.includes("buttermilch")) {
    return {
      cleanName: "Reine Buttermilch",
      defaultAmount: 500,
      defaultUnit: "ml",
      category: "Kühl",
    };
  }

  // 10. Oatly / Hafermilch (ungeöffnet) (Standard: 1000ml)
  if (lower.includes("oatly") || lower.includes("hafermilch") || lower.includes("haferdrink")) {
    return {
      cleanName: "Oatly Hafermilch (ungeöffnet)",
      defaultAmount: 1000,
      defaultUnit: "ml",
      category: "Getränke",
    };
  }

  // 11. More Zerup / Zerup Sirup (Standard: 65ml)
  if (lower.includes("zerup") || lower.includes("more zerup")) {
    return {
      cleanName: "More Zerup Sirup",
      defaultAmount: 65,
      defaultUnit: "ml",
      category: "Saucen",
    };
  }

  // 12. Gewürzgurken / Cornichons (Standard: 350g)
  if (lower.includes("gewürzgurke") || lower.includes("gewuerzgurke") || lower.includes("cornichon")) {
    return {
      cleanName: "Gewürzgurken",
      defaultAmount: 350,
      defaultUnit: "g",
      category: "Saucen",
    };
  }

  // 13. Spices: Knoblauch granuliert, Paprikapulver, Oregano, etc. (Standard: 50g, unlimited)
  if (
    lower.includes("granuliert") ||
    lower.includes("paprikapulver") ||
    lower.includes("oregano") ||
    lower.includes("curry") ||
    lower.includes("zimt") ||
    lower.includes("pfeffer") ||
    (lower.includes("knoblauch") && (lower.includes("pulver") || lower.includes("gran")))
  ) {
    let cleanSpice = name;
    if (lower.includes("knoblauch")) cleanSpice = "Knoblauch granuliert";
    else if (lower.includes("paprika")) cleanSpice = "Paprikapulver edelsüß";
    else if (lower.includes("oregano")) cleanSpice = "Oregano";
    return {
      cleanName: cleanSpice,
      defaultAmount: 50,
      defaultUnit: "g",
      category: "Gewürze",
      isUnlimited: true,
    };
  }

  // Default clean up of dot abbreviations (e.g. "Hähn.Brust." -> "Hähnchenbrust")
  const cleaned = name
    .replace(/Bröt\./i, "Brötchen")
    .replace(/Hähn\./i, "Hähnchen-")
    .replace(/Minutenschnitz\./i, "Minutenschnitzel")
    .replace(/\s+/g, " ")
    .trim();

  return {
    cleanName: cleaned,
    defaultAmount: 500,
    defaultUnit: "g",
    category: "Trocken",
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
  category: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl" | "Getränke" | "Gewürze";
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
  isUnlimited?: boolean;
}

export type ReceiptParsedItem = ParsedReceiptFoodItem;

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

  const promptText = `Du bist ein hochpräziser OCR- & Kassenbon-Experte für deutsche Supermärkte (Rewe, Edeka, Aldi, Lidl, Kaufland, Netto, Penny, dm).
Analysiere diesen Kassenbon (Foto oder Text) und extrahiere ALLE Lebensmittel und Getränke.

STRIKTE REGELN:
1. NON-FOOD & METADATEN HERAUSFILTERN:
   Ignoriere Pfand (PFAND, 0,25*B, Leergut), Rabatte (Lidl Plus Rabatt, Coupon, Preisvorteil), Drogerie/Bad (Duschgel, Shampoo, Zahnpasta), Haushaltspapier/Putzmittel (Küchentücher, Toilettenpapier, Müllbeutel, Spülmittel) und Kassenbon-Summen.
2. ABKÜRZUNGEN ENTSCHLÜSSELN & ECHTE PRODUKTNAMEN SETZEN:
   - Entferne Handelsmarken-Kürzel wie G&G, JA!, K-CLASSIC, MILBONA.
   - "GOEN.FUNDARI.0,5L" -> "Gönrgy Energy Drink (0,5L)"
   - "Hähn.Minutenschnitz." -> "Hähnchen-Minutenschnitzel"
   - "G&G PAPRIKA MIX" -> "Paprika Mix (Gemüse, 500g)"
   - "G&G FRISCHKAESE" -> "Frischkäse"
   - "Halloween Kartoffeln" -> "Kartoffeln"
   - "Petersilie glatt" -> "Petersilie"
   - "BriocheBröt." -> "Brioche Brötchen"
3. STANDARD-PACKUNGSGRÖSSEN & MULTIPLIKATOREN:
   - Achte auf Multiplikatoren ("1,69 x 2" -> verdopple die Menge).
   - Setze realistische Standardpackungen: Hähnchen/Minutenschnitzel = 400g, Salat = 150g, Frischkäse = 200g, Paprika Mix = 500g, Kartoffeln = 1500g, Petersilie = 1 Bund.
4. KATEGORIEN:
   "Kühl" | "Trocken" | "Saucen" | "Tiefkühl" | "Getränke" | "Gewürze".
5. PFLICHT-MHD ("shelfLifeDays"):
   - Frisches Fleisch/Fisch/Geflügel: 3 Tage
   - Frischer Salat & frische Kräuter: 4 Tage
   - Frisches Gemüse, Obst, frische Backwaren, Buttermilch: 7 Tage
   - Kühlregal, Frischkäse, Käse, Eier, Kartoffeln: 14 Tage
   - Getränke, Konserven, Sirup, Hafermilch, Speisestärke: 180 Tage
   - Gewürze: 365 Tage

Antworte AUSSCHLIESSLICH als valides JSON in folgendem Schema ohne Markdown-Backticks:
{
  "items": [
    {
      "name": "Hähnchen-Minutenschnitzel",
      "amount": 400,
      "unit": "g",
      "price": 3.49,
      "category": "Kühl",
      "shelfLifeDays": 3
    }
  ]
}`;

  // Primary: route through the secure server-side proxy
  try {
    let rawText = "";

    if (params.imageBase64) {
      const cleanBase64 = params.imageBase64.replace(/^data:[^;]+;base64,/, "");
      try {
        const resp = await callGeminiProxy({
          model: "gemini-3.8-flash",
          contents: params.text
            ? `Kassenbon-Textinhalt:\n${params.text}\n\n${promptText}`
            : promptText,
          config: { responseMimeType: "application/json", temperature: 0.2 },
          inlineData: { data: cleanBase64, mimeType: params.mimeType || "image/jpeg" },
        });
        rawText = extractTextFromGeminiResponse(resp) ?? "";
      } catch (err) {
        console.warn("[Receipt OCR] Proxy-Call mit Foto fehlgeschlagen:", err);
      }
    } else {
      try {
        const textPrompt = `Kassenbon-Textinhalt:\n${params.text}\n\n${promptText}`;
        const resp = await callGeminiProxy({
          model: "gemini-3.8-flash",
          contents: textPrompt,
          config: { responseMimeType: "application/json", temperature: 0.2 },
        });
        rawText = extractTextFromGeminiResponse(resp) ?? "";
      } catch (err) {
        console.warn("[Receipt OCR] Proxy-Call mit Text fehlgeschlagen:", err);
      }
    }

    if (rawText) {
      const cleanJson = rawText.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
        return parsed.items
          .filter((item: any) => !isNonFoodReceiptLine(String(item.name || "")))
          .map((item: any, idx: number) => {
            const decoded = decodeReceiptItemName(String(item.name || "Lebensmittel"));
            const finalName = item.name && item.name.length > 2 && !item.name.includes(".") ? item.name : decoded.cleanName;
            const category = (item.category as any) || decoded.category;
            const amount = Number(item.amount) || decoded.defaultAmount;
            const unit = item.unit || decoded.defaultUnit;
            const mhdEstimate = calculateEstimatedMhd(finalName, category);
            const tone = getFoodTone(finalName, category);
            const nutrition = findFoodNutrition(finalName, category);

            return {
              id: `receipt-item-${Date.now()}-${idx}`,
              name: finalName,
              quantity: `${amount} ${unit}`,
              amount,
              total: amount,
              unit,
              price: Number(item.price) || 1.99,
              category,
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
              isUnlimited: decoded.isUnlimited || category === "Gewürze",
            };
          });
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

    // 2. Blacklist filter for non-food, Pfand, Rabatte, Drogerie & summary rows
    if (isNonFoodReceiptLine(trimmed)) return;

    // 3. Match price at the end e.g. "1,99 B" or "1.99" (genuine product lines always end with a price)
    const priceMatch = trimmed.match(/(\d+[.,]\d{2})\s*[A-Za-z]?$/);
    if (!priceMatch) return;
    const price = parseFloat(priceMatch[1].replace(",", "."));

    let namePart = trimmed.replace(/(\d+[.,]\d{2})\s*[A-Za-z]?$/, "").trim();
    namePart = namePart.replace(/[*_#]/g, "").trim();

    // Check for multiplier like "1,59 x 2" or "2 x 1,59"
    let multiplier = 1;
    const multMatch = namePart.match(/(\d+[.,]\d{2})\s*x\s*(\d+)/i) || namePart.match(/^(\d+)\s*x\s*(\d+[.,]\d{2})/i);
    if (multMatch) {
      if (multMatch[2] && multMatch[2].length <= 2) {
        multiplier = parseInt(multMatch[2], 10) || 1;
      } else if (multMatch[1] && multMatch[1].length <= 2) {
        multiplier = parseInt(multMatch[1], 10) || 1;
      }
      namePart = namePart.replace(/\d+[.,]\d{2}\s*x\s*\d+/i, "").replace(/\d+\s*x\s*\d+[.,]\d{2}/i, "").trim();
    }

    if (namePart.length < 2) return;

    // Strip leading line counter e.g. "1 JA! BASMATI REIS" -> "JA! BASMATI REIS"
    namePart = namePart.replace(/^\d+\s+(?=[A-Za-zÄÖÜäöü])/, "");

    // Decode supermarket abbreviation and find standard sizes
    const decoded = decodeReceiptItemName(namePart);
    let cleanName = decoded.cleanName;
    let category = decoded.category;
    let unit = decoded.defaultUnit;
    let amount = decoded.defaultAmount;

    // Check if line specifies an explicit quantity (e.g. 500g, 1kg, 250ml, 10er)
    const qtyMatch = namePart.match(/(\d+)\s*(kg|g|ml|l|bund|stk|er)\b/i);
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
      } else if (u === "bund") {
        amount = val;
        unit = "Bund";
      } else if (u === "stk" || u === "er") {
        amount = val;
        unit = "Stk.";
      }
    } else if (isEggIngredientName(cleanName)) {
      amount = 10;
      unit = "Stk.";
    }

    // Apply multiplier to quantity
    if (multiplier > 1) {
      if (unit === "Stk." || unit === "Bund") {
        amount = multiplier;
      } else {
        amount = amount * multiplier;
      }
    }

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
      price: price * multiplier,
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
      isUnlimited: decoded.isUnlimited || category === "Gewürze",
    });
  });

  return items;
}
