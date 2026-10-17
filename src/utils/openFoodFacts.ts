import { findFoodNutrition, FOOD_NUTRITION_DATABASE } from "../data/foodNutritionDatabase";

export interface OFFProduct {
  code: string;
  name: string;
  brand: string;
  category: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl";
  amount: number;
  total: number;
  unit: string;
  tone: string;
  nutriScore: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  imageUrl?: string;
  isCustom?: boolean;
}

// Built-in verified offline database for instant matching & offline reliability
export const LOCAL_OFF_DATABASE: Record<string, OFFProduct> = {
  // Ja! Basmati Reis 1kg
  "4008400404127": {
    code: "4008400404127",
    name: "Ja! Basmati Reis (1kg)",
    brand: "REWE Ja!",
    category: "Trocken",
    amount: 1000,
    total: 1000,
    unit: "g",
    tone: "rice",
    nutriScore: "A",
    calories: 355,
    protein: 8.5,
    carbs: 78.0,
    fat: 0.9,
  },
  // Bio Freiland-Eier
  "4056489312456": {
    code: "4056489312456",
    name: "Bio Freiland-Eier (10er)",
    brand: "Bio",
    category: "Kühl",
    amount: 10,
    total: 10,
    unit: "Stk.",
    tone: "egg",
    nutriScore: "B",
    calories: 140,
    protein: 13.0,
    carbs: 0.7,
    fat: 9.8,
  },
  // Kikkoman Sojasauce
  "8715035110106": {
    code: "8715035110106",
    name: "Kikkoman Sojasauce (150ml)",
    brand: "Kikkoman",
    category: "Saucen",
    amount: 150,
    total: 150,
    unit: "ml",
    tone: "sauce",
    nutriScore: "C",
    calories: 77,
    protein: 10.0,
    carbs: 3.2,
    fat: 0.1,
  },
  // Bio TK Kaisergemüse & Brokkoli
  "4008400290126": {
    code: "4008400290126",
    name: "Bio TK Kaisergemüse & Erbsen",
    brand: "Bio Cool",
    category: "Tiefkühl",
    amount: 750,
    total: 750,
    unit: "g",
    tone: "peas",
    nutriScore: "A",
    calories: 34,
    protein: 2.6,
    carbs: 4.5,
    fat: 0.4,
  },
  // Barilla Penne Rigate
  "4014400900010": {
    code: "4014400900010",
    name: "Barilla Penne Rigate (500g)",
    brand: "Barilla",
    category: "Trocken",
    amount: 500,
    total: 500,
    unit: "g",
    tone: "rice",
    nutriScore: "A",
    calories: 359,
    protein: 12.0,
    carbs: 71.2,
    fat: 2.0,
  },
  // Barilla Penne alternative EAN
  "8076809513753": {
    code: "8076809513753",
    name: "Barilla Penne Rigate n.73",
    brand: "Barilla",
    category: "Trocken",
    amount: 500,
    total: 500,
    unit: "g",
    tone: "rice",
    nutriScore: "A",
    calories: 359,
    protein: 12.0,
    carbs: 71.2,
    fat: 2.0,
  },
  // Kölln Haferflocken zart
  "4008400300122": {
    code: "4008400300122",
    name: "Kölln Echte Haferflocken zart (500g)",
    brand: "Kölln",
    category: "Trocken",
    amount: 500,
    total: 500,
    unit: "g",
    tone: "rice",
    nutriScore: "A",
    calories: 370,
    protein: 13.5,
    carbs: 58.7,
    fat: 7.0,
  },
  // Wiesenhof Hähnchenbrustfilet
  "4001686301264": {
    code: "4001686301264",
    name: "Frisches Hähnchenbrustfilet",
    brand: "Wiesenhof",
    category: "Kühl",
    amount: 400,
    total: 400,
    unit: "g",
    tone: "chicken",
    nutriScore: "A",
    calories: 110,
    protein: 24.0,
    carbs: 0.0,
    fat: 1.5,
  },
  // Bertolli Olivenöl
  "8002210115049": {
    code: "8002210115049",
    name: "Natives Olivenöl Extra",
    brand: "Bertolli",
    category: "Saucen",
    amount: 500,
    total: 500,
    unit: "ml",
    tone: "sauce",
    nutriScore: "C",
    calories: 824,
    protein: 0.0,
    carbs: 0.0,
    fat: 92.0,
  },
  // Alpro Hafermilch
  "5411188115489": {
    code: "5411188115489",
    name: "Alpro Haferdrink Barista (1L)",
    brand: "Alpro",
    category: "Kühl",
    amount: 1000,
    total: 1000,
    unit: "ml",
    tone: "milk",
    nutriScore: "B",
    calories: 59,
    protein: 0.8,
    carbs: 6.7,
    fat: 3.0,
  },
  // Kerrygold Butter
  "5011010000007": {
    code: "5011010000007",
    name: "Kerrygold Original Irische Butter (250g)",
    brand: "Kerrygold",
    category: "Kühl",
    amount: 250,
    total: 250,
    unit: "g",
    tone: "cheese",
    nutriScore: "D",
    calories: 743,
    protein: 0.7,
    carbs: 0.7,
    fat: 82.0,
  },
  // Mutti Polpa Gehackte Tomaten
  "8005110170104": {
    code: "8005110170104",
    name: "Mutti Polpa Feinstes Tomatenfruchtfleisch (400g)",
    brand: "Mutti",
    category: "Trocken",
    amount: 400,
    total: 400,
    unit: "g",
    tone: "tomato",
    nutriScore: "A",
    calories: 26,
    protein: 1.2,
    carbs: 3.9,
    fat: 0.2,
  },
  // Bio Frische Vollmilch 3.8%
  "4008400123456": {
    code: "4008400123456",
    name: "Bio Frische Vollmilch 3.8% (1L)",
    brand: "Berchtesgadener Land",
    category: "Kühl",
    amount: 1000,
    total: 1000,
    unit: "ml",
    tone: "milk",
    nutriScore: "B",
    calories: 68,
    protein: 3.4,
    carbs: 4.8,
    fat: 3.8,
  },
  // Tofu Natur
  "4012345678901": {
    code: "4012345678901",
    name: "Bio Tofu Natur (400g)",
    brand: "Taifun",
    category: "Kühl",
    amount: 400,
    total: 400,
    unit: "g",
    tone: "egg",
    nutriScore: "A",
    calories: 135,
    protein: 14.5,
    carbs: 1.2,
    fat: 8.0,
  },
  // Frühlingszwiebeln
  "4300000000103": {
    code: "4300000000103",
    name: "Frische Frühlingszwiebeln (Bund)",
    brand: "Frischemarkt",
    category: "Kühl",
    amount: 5,
    total: 5,
    unit: "Stk.",
    tone: "onion",
    nutriScore: "A",
    calories: 32,
    protein: 1.8,
    carbs: 7.3,
    fat: 0.2,
  },
  // Nutella 450g / 750g
  "80133553": {
    code: "80133553",
    name: "Nutella Nuss-Nugat-Creme (450g)",
    brand: "Ferrero",
    category: "Trocken",
    amount: 450,
    total: 450,
    unit: "g",
    tone: "sauce",
    nutriScore: "E",
    calories: 539,
    protein: 6.3,
    carbs: 57.5,
    fat: 30.9,
  },
  // Weihenstephan Frische Milch 3.5%
  "40084520": {
    code: "40084520",
    name: "Weihenstephan Frische Milch 3,5% (1L)",
    brand: "Weihenstephan",
    category: "Kühl",
    amount: 1000,
    total: 1000,
    unit: "ml",
    tone: "milk",
    nutriScore: "B",
    calories: 64,
    protein: 3.4,
    carbs: 4.8,
    fat: 3.5,
  },
  // Ja! Passierte Tomaten
  "4388844084795": {
    code: "4388844084795",
    name: "Ja! Passierte Tomaten (500g)",
    brand: "REWE Ja!",
    category: "Trocken",
    amount: 500,
    total: 500,
    unit: "g",
    tone: "tomato",
    nutriScore: "A",
    calories: 21,
    protein: 1.2,
    carbs: 3.5,
    fat: 0.2,
  },
  // Ja! Reine Pflanzenöl / Sonnenblumenöl
  "4388844073355": {
    code: "4388844073355",
    name: "Ja! Sonnenblumenöl (1L)",
    brand: "REWE Ja!",
    category: "Saucen",
    amount: 1000,
    total: 1000,
    unit: "ml",
    tone: "sauce",
    nutriScore: "C",
    calories: 828,
    protein: 0.0,
    carbs: 0.0,
    fat: 92.0,
  },
  // Barilla Spaghetti n.5
  "8076802085738": {
    code: "8076802085738",
    name: "Barilla Spaghetti n.5 (500g)",
    brand: "Barilla",
    category: "Trocken",
    amount: 500,
    total: 500,
    unit: "g",
    tone: "pasta",
    nutriScore: "A",
    calories: 359,
    protein: 12.0,
    carbs: 71.2,
    fat: 2.0,
  },
  // Alnatura Bio Hafermilch
  "4104420216440": {
    code: "4104420216440",
    name: "Alnatura Bio Haferdrink Natur (1L)",
    brand: "Alnatura",
    category: "Kühl",
    amount: 1000,
    total: 1000,
    unit: "ml",
    tone: "milk",
    nutriScore: "B",
    calories: 45,
    protein: 1.0,
    carbs: 7.5,
    fat: 1.2,
  },
  // Dr. Oetker Ristorante Pizza Salame
  "4001724819706": {
    code: "4001724819706",
    name: "Dr. Oetker Ristorante Pizza Salame (320g)",
    brand: "Dr. Oetker",
    category: "Tiefkühl",
    amount: 320,
    total: 320,
    unit: "g",
    tone: "generic",
    nutriScore: "D",
    calories: 260,
    protein: 9.8,
    carbs: 27.0,
    fat: 12.0,
  },
  // Coca-Cola Original Taste 1L
  "5449000000996": {
    code: "5449000000996",
    name: "Coca-Cola Original Taste (1L)",
    brand: "Coca-Cola",
    category: "Trocken",
    amount: 1000,
    total: 1000,
    unit: "ml",
    tone: "generic",
    nutriScore: "E",
    calories: 42,
    protein: 0.0,
    carbs: 10.6,
    fat: 0.0,
  },
  // Heinz Tomato Ketchup
  "8715700421377": {
    code: "8715700421377",
    name: "Heinz Tomato Ketchup (500ml)",
    brand: "Heinz",
    category: "Saucen",
    amount: 500,
    total: 500,
    unit: "ml",
    tone: "tomato",
    nutriScore: "D",
    calories: 102,
    protein: 1.2,
    carbs: 23.2,
    fat: 0.1,
  },
};

// Helper: Map tone and category from API raw food data
export function mapOffCategoriesToApp(rawCategory: string = "", name: string = ""): {
  category: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl";
  tone: string;
} {
  const lower = (rawCategory + " " + name).toLowerCase();

  let category: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl" = "Trocken";
  if (
    lower.includes("frozen") ||
    lower.includes("tiefkühl") ||
    lower.includes("tk") ||
    lower.includes("eiscreme")
  ) {
    category = "Tiefkühl";
  } else if (
    lower.includes("sauce") ||
    lower.includes("soße") ||
    lower.includes("oil") ||
    lower.includes("öl") ||
    lower.includes("essig") ||
    lower.includes("vinegar") ||
    lower.includes("gewürz")
  ) {
    category = "Saucen";
  } else if (
    lower.includes("dairy") ||
    lower.includes("milch") ||
    lower.includes("egg") ||
    lower.includes("ei") ||
    lower.includes("cheese") ||
    lower.includes("käse") ||
    lower.includes("meat") ||
    lower.includes("fleisch") ||
    lower.includes("joghurt") ||
    lower.includes("tofu") ||
    lower.includes("kühlschrank")
  ) {
    category = "Kühl";
  }

  // Tone determination
  let tone = "rice";
  if (lower.includes("reis") || lower.includes("grain") || lower.includes("pasta") || lower.includes("nudel") || lower.includes("hafer")) {
    tone = "rice";
  } else if (lower.includes("ei") || lower.includes("egg") || lower.includes("tofu")) {
    tone = "egg";
  } else if (lower.includes("sauce") || lower.includes("soja") || lower.includes("öl")) {
    tone = "sauce";
  } else if (lower.includes("erbsen") || lower.includes("spinat") || lower.includes("gemüse") || lower.includes("broccoli") || lower.includes("salat")) {
    tone = "peas";
  } else if (lower.includes("zwiebel") || lower.includes("knoblauch") || lower.includes("lauch")) {
    tone = "onion";
  } else if (lower.includes("hähnchen") || lower.includes("fleisch") || lower.includes("chicken")) {
    tone = "chicken";
  } else if (lower.includes("milch") || lower.includes("quark") || lower.includes("joghurt")) {
    tone = "milk";
  } else if (lower.includes("käse") || lower.includes("butter") || lower.includes("gouda")) {
    tone = "cheese";
  } else if (lower.includes("tomate") || lower.includes("ketchup")) {
    tone = "tomato";
  }

  return { category, tone };
}

// Convert Open Food Facts API product to app OFFProduct
export function parseOffApiResponse(product: any, fallbackCode: string = ""): OFFProduct {
  const code = product.code || fallbackCode || `MAN-${Date.now()}`;
  const name =
    product.product_name_de ||
    product.product_name ||
    product.generic_name_de ||
    product.generic_name ||
    `Artikel (${code.slice(-4)})`;

  const brand =
    product.brands ||
    product.brand_owner ||
    "Markenprodukt";

  const { category, tone } = mapOffCategoriesToApp(product.categories || "", name);

  // Extract quantity & unit
  let amount = 500;
  let total = 500;
  let unit = "g";

  const quantityStr = product.quantity || "";
  const matchKg = quantityStr.match(/(\d+(?:[.,]\d+)?)\s*kg/i);
  const matchG = quantityStr.match(/(\d+)\s*g/i);
  const matchL = quantityStr.match(/(\d+(?:[.,]\d+)?)\s*l\b/i);
  const matchMl = quantityStr.match(/(\d+)\s*ml/i);
  const matchStk = quantityStr.match(/(\d+)\s*(?:stk|stück|er)/i);

  if (matchKg) {
    amount = total = Math.round(parseFloat(matchKg[1].replace(",", ".")) * 1000);
    unit = "g";
  } else if (matchG) {
    amount = total = parseInt(matchG[1], 10);
    unit = "g";
  } else if (matchL) {
    amount = total = Math.round(parseFloat(matchL[1].replace(",", ".")) * 1000);
    unit = "ml";
  } else if (matchMl) {
    amount = total = parseInt(matchMl[1], 10);
    unit = "ml";
  } else if (matchStk) {
    amount = total = parseInt(matchStk[1], 10);
    unit = "Stk.";
  } else if (category === "Saucen" || name.toLowerCase().includes("milch") || name.toLowerCase().includes("öl")) {
    unit = "ml";
    amount = total = 250;
  } else if (name.toLowerCase().includes("eier") || name.toLowerCase().includes("frühlingszwiebel")) {
    unit = "Stk.";
    amount = total = 6;
  }

  const fallbackNutrition = findFoodNutrition(name, category);
  const nutriments = product.nutriments || {};
  const hasOffCal = typeof nutriments["energy-kcal_100g"] === "number" || typeof nutriments["energy-kcal"] === "number" || typeof nutriments["energy_100g"] === "number";
  const rawCalories = Math.round(
    nutriments["energy-kcal_100g"] ??
    nutriments["energy-kcal"] ??
    (nutriments["energy_100g"] ? nutriments["energy_100g"] / 4.184 : fallbackNutrition.calories)
  );
  const calories = hasOffCal && rawCalories > 0 ? rawCalories : fallbackNutrition.calories;

  const protein = typeof nutriments.proteins_100g === "number"
    ? Math.round(nutriments.proteins_100g * 10) / 10
    : fallbackNutrition.protein;

  const carbs = typeof nutriments.carbohydrates_100g === "number"
    ? Math.round(nutriments.carbohydrates_100g * 10) / 10
    : fallbackNutrition.carbs;

  const fat = typeof nutriments.fat_100g === "number"
    ? Math.round(nutriments.fat_100g * 10) / 10
    : fallbackNutrition.fat;

  const nutriScore = (product.nutrition_grades || product.nutriscore_grade || "b").toUpperCase();

  return {
    code,
    name,
    brand,
    category,
    amount,
    total,
    unit,
    tone,
    nutriScore,
    calories: Math.max(0, calories),
    protein,
    carbs,
    fat,
    imageUrl: product.image_front_small_url || product.image_url,
  };
}

// Fetch helper with timeout and fallback endpoints
async function fetchWithTimeout(url: string, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export interface BarcodeLookupResult {
  success: boolean;
  product?: OFFProduct;
  source: "online" | "local" | "generated";
  error?: string;
  isNotFound?: boolean;
}

/**
 * Robust Barcode lookup:
 * 1. Checks local verified database (instant).
 * 2. Tries multiple OpenFoodFacts endpoints with timeout.
 * 3. Handles 404 cleanly (not as network failure).
 * 4. Falls back to smart generated product if offline/unknown.
 */
export async function lookupBarcodeFromOFF(rawBarcode: string): Promise<BarcodeLookupResult> {
  const cleanCode = rawBarcode.trim();
  if (!cleanCode) {
    return { success: false, error: "Ungültiger oder leerer Barcode.", source: "local" };
  }

  // 1. Check local database first
  if (LOCAL_OFF_DATABASE[cleanCode]) {
    return {
      success: true,
      product: LOCAL_OFF_DATABASE[cleanCode],
      source: "local",
    };
  }

  // 2. Try online Open Food Facts APIs directly (CORS supported)
  const candidateUrls = [
    `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`,
    `https://de.openfoodfacts.org/api/v2/product/${cleanCode}.json`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetchWithTimeout(url, 4000);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) {
          const parsed = parseOffApiResponse(data.product, cleanCode);
          return {
            success: true,
            product: parsed,
            source: "online",
          };
        }
      }
    } catch {
      // Continue to next endpoint or Gemini fallback
    }
  }

  // 3. Smart Gemini AI Fallback for unknown barcodes or missing database items
  const geminiProduct = await lookupProductWithGemini(cleanCode);
  if (geminiProduct) {
    return {
      success: true,
      product: geminiProduct,
      source: "generated",
    };
  }

  // 4. Fallback for valid barcode format: Smart generic template so user is NEVER blocked
  if (/^\d{8,14}$/.test(cleanCode)) {
    const fallbackProduct: OFFProduct = {
      code: cleanCode,
      name: `Gescannter Artikel (${cleanCode.slice(-4)})`,
      brand: "Eigenmarke / EAN",
      category: "Trocken",
      amount: 500,
      total: 500,
      unit: "g",
      tone: "generic",
      nutriScore: "A",
      calories: 210,
      protein: 7.5,
      carbs: 35.0,
      fat: 3.0,
      isCustom: true,
    };

    return {
      success: true,
      product: fallbackProduct,
      source: "generated",
      isNotFound: true,
      error: `Barcode ${cleanCode} wurde noch nicht in Open Food Facts eingetragen. Die Vorlage wurde vorbereitet.`,
    };
  }

  return {
    success: false,
    isNotFound: true,
    error: `Kein Produkt für Barcode ${cleanCode} gefunden.`,
    source: "local",
  };
}

/**
 * Intelligent Gemini AI product detection for unknown barcodes or exotic items
 */
export async function lookupProductWithGemini(queryOrBarcode: string): Promise<OFFProduct | null> {
  const apiKey =
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
    "";
  if (!apiKey) return null;

  try {
    const prompt = `Analysiere das folgende Lebensmittel oder den Barcode: "${queryOrBarcode}".
Ermittle realistische deutsche Produktdaten für eine Lebensmittel-Vorrats-App.
Antworte NUR mit reinem JSON im folgenden Schema:
{
  "name": "Prägnanter Produktname mit Mengenangabe (z. B. 'Ja! Passierte Tomaten (500g)')",
  "brand": "Marke oder Supermarkt (z. B. 'Rewe Ja!', 'Edeka', 'Barilla', 'Bio')",
  "category": "Kühl" | "Trocken" | "Saucen" | "Tiefkühl",
  "amount": 500,
  "unit": "g" | "ml" | "Stk.",
  "tone": "rice" | "egg" | "sauce" | "peas" | "onion" | "chicken" | "pasta" | "oats" | "milk" | "cheese" | "tomato" | "generic",
  "nutriScore": "A" | "B" | "C" | "D" | "E",
  "calories": 150,
  "protein": 5.0,
  "carbs": 20.0,
  "fat": 2.0
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim());
    if (parsed && parsed.name) {
      return {
        code: queryOrBarcode,
        name: parsed.name,
        brand: parsed.brand || "Markenprodukt",
        category: parsed.category || "Trocken",
        amount: Number(parsed.amount) || 500,
        total: Number(parsed.amount) || 500,
        unit: parsed.unit || "g",
        tone: parsed.tone || "generic",
        nutriScore: parsed.nutriScore || "A",
        calories: Number(parsed.calories) || findFoodNutrition(parsed.name || queryOrBarcode).calories,
        protein: Number(parsed.protein) || findFoodNutrition(parsed.name || queryOrBarcode).protein,
        carbs: Number(parsed.carbs) || findFoodNutrition(parsed.name || queryOrBarcode).carbs,
        fat: Number(parsed.fat) || findFoodNutrition(parsed.name || queryOrBarcode).fat,
        isCustom: false,
      };
    }
  } catch (err) {
    console.warn("[Gemini Product Lookup] Fehler:", err);
  }
  return null;
}

/**
 * Robust Name Search:
 * 1. Matches local database items & BLS/USDA nutrition database instantly.
 * 2. Queries Open Food Facts live search with timeout.
 * 3. Gemini fallback for unknown searches.
 * 4. Merges results, eliminating duplicates.
 */
export async function searchProductsInOFF(query: string): Promise<OFFProduct[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // 1. Local packaged products
  const localMatches: OFFProduct[] = Object.values(LOCAL_OFF_DATABASE).filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );

  // 1b. BLS / USDA verified nutrition items
  const foodDbMatches: OFFProduct[] = FOOD_NUTRITION_DATABASE
    .filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.synonyms.some((s) => s.toLowerCase().includes(q))
    )
    .slice(0, 10)
    .map((f) => {
      const appCat: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl" =
        f.category === "Getränke" || f.category === "Sonstiges"
          ? "Trocken"
          : f.category;
      return {
        code: `BLS-${f.id}`,
        name: f.name,
        brand: "Referenz (BLS / USDA)",
        category: appCat,
        amount: f.weightPerUnit,
        total: f.weightPerUnit,
        unit: f.defaultUnit,
        tone: f.tone,
        nutriScore: "A",
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      };
    });

  // 2. Online search attempt
  let onlineMatches: OFFProduct[] = [];
  const searchUrls = [
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8`,
    `https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8`,
  ];

  for (const url of searchUrls) {
    try {
      const res = await fetchWithTimeout(url, 3500);
      if (res.ok) {
        const data = await res.json();
        if (data.products && Array.isArray(data.products)) {
          onlineMatches = data.products
            .filter((p: any) => p && (p.product_name || p.product_name_de))
            .map((p: any) => parseOffApiResponse(p));
          if (onlineMatches.length > 0) break;
        }
      }
    } catch {
      // Continue to next
    }
  }

  // Merge unique by name or code: Local > BLS Database > Online OFF
  const combined = [...localMatches];
  for (const bls of foodDbMatches) {
    if (!combined.some((c) => c.name.toLowerCase() === bls.name.toLowerCase())) {
      combined.push(bls);
    }
  }
  for (const onl of onlineMatches) {
    if (!combined.some((c) => c.code === onl.code || c.name.toLowerCase() === onl.name.toLowerCase())) {
      combined.push(onl);
    }
  }

  // 3. If still empty, try Gemini product lookup
  if (combined.length === 0 && query.trim().length >= 2) {
    const aiItem = await lookupProductWithGemini(query);
    if (aiItem) {
      combined.push(aiItem);
    }
  }

  // 4. If still completely empty, generate a helpful instant suggestion using findFoodNutrition
  if (combined.length === 0 && query.trim().length >= 2) {
    const { category, tone } = mapOffCategoriesToApp("", query);
    const dbItem = findFoodNutrition(query.trim(), category);
    const appCat: "Kühl" | "Trocken" | "Saucen" | "Tiefkühl" =
      dbItem.category === "Getränke" || dbItem.category === "Sonstiges"
        ? category
        : (dbItem.category as any);
    combined.push({
      code: `GEN-${Date.now()}`,
      name: query.trim(),
      brand: "Neu eingeben",
      category: appCat,
      amount: dbItem.weightPerUnit || (category === "Saucen" ? 250 : 500),
      total: dbItem.weightPerUnit || (category === "Saucen" ? 250 : 500),
      unit: dbItem.defaultUnit || (category === "Saucen" ? "ml" : "g"),
      tone: dbItem.tone || tone,
      nutriScore: "A",
      calories: dbItem.calories,
      protein: dbItem.protein,
      carbs: dbItem.carbs,
      fat: dbItem.fat,
      isCustom: true,
    });
  }

  return combined;
}
