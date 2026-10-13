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

  const nutriments = product.nutriments || {};
  const calories = Math.round(
    nutriments["energy-kcal_100g"] ||
    nutriments["energy-kcal"] ||
    (nutriments["energy_100g"] ? nutriments["energy_100g"] / 4.184 : 180)
  );

  const protein = Math.round((nutriments.proteins_100g ?? 6.0) * 10) / 10;
  const carbs = Math.round((nutriments.carbohydrates_100g ?? 25.0) * 10) / 10;
  const fat = Math.round((nutriments.fat_100g ?? 3.5) * 10) / 10;

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
    calories: Math.max(10, calories),
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

  // 2. Try online Open Food Facts APIs with timeout
  const candidateUrls = [
    `/api/off/api/v2/product/${cleanCode}.json`,
    `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`,
    `https://de.openfoodfacts.org/api/v2/product/${cleanCode}.json`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetchWithTimeout(url, 3500);

      // If HTTP 404, product is definitely not in Open Food Facts
      if (res.status === 404) {
        break; // Stop querying, proceed to fallback/not-found
      }

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
      // Continue to next endpoint or fallback
    }
  }

  // 3. Fallback for valid barcode format: Smart generic template so user is NEVER blocked
  if (/^\d{8,14}$/.test(cleanCode)) {
    const fallbackProduct: OFFProduct = {
      code: cleanCode,
      name: `Neuer Artikel (${cleanCode.slice(-4)})`,
      brand: "Eigenmarke / EAN",
      category: "Trocken",
      amount: 500,
      total: 500,
      unit: "g",
      tone: "rice",
      nutriScore: "A",
      calories: 220,
      protein: 7.5,
      carbs: 40.0,
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
 * Robust Name Search:
 * 1. Matches local database items instantly.
 * 2. Queries Open Food Facts live search with timeout.
 * 3. Merges results, eliminating duplicates.
 */
export async function searchProductsInOFF(query: string): Promise<OFFProduct[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // 1. Local results
  const localMatches: OFFProduct[] = Object.values(LOCAL_OFF_DATABASE).filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );

  // 2. Online search attempt
  let onlineMatches: OFFProduct[] = [];
  const searchUrls = [
    `/api/off/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6`,
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6`,
    `https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6`,
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

  // Merge unique by name or code
  const combined = [...localMatches];
  for (const onl of onlineMatches) {
    if (!combined.some((c) => c.code === onl.code || c.name.toLowerCase() === onl.name.toLowerCase())) {
      combined.push(onl);
    }
  }

  // If still completely empty, generate a helpful instant suggestion
  if (combined.length === 0 && query.trim().length >= 2) {
    const { category, tone } = mapOffCategoriesToApp("", query);
    combined.push({
      code: `GEN-${Date.now()}`,
      name: query.trim(),
      brand: "Neu eingeben",
      category,
      amount: category === "Saucen" ? 250 : 500,
      total: category === "Saucen" ? 250 : 500,
      unit: category === "Saucen" ? "ml" : "g",
      tone,
      nutriScore: "A",
      calories: 180,
      protein: 6.0,
      carbs: 30.0,
      fat: 2.5,
      isCustom: true,
    });
  }

  return combined;
}
