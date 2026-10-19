import type { CatalogRecipe, RecipeStep } from "../data/recipeCatalog";
import { resolveRecipeFoodImage } from "./geminiRecipes";

export interface SafeIngredientItem {
  name: string;
  amount: string;
  optional?: boolean;
}

const COMPOSITE_REGEX = /^(?:gewürze?|gewürzmischung(?:en)?|kräuter\s*(?:&|und)\s*gewürze?|trockengewürze?|beliebige\s*gewürze?|gewürze\s*nach\s*(?:wahl|belieben)|speisegewürze?)\s*(?:[\(:]\s*(?:z\.?\s*b\.?\s*)?|\s*-\s*)(.*?)\)?$/i;

const SALT_PEPPER_REGEX = /^(?:eine\s+prise\s+|prise\s+)?salz\s+(?:&|und|\/)\s+(?:schwarzer\s+)?pfeffer$/i;

/**
 * Normalizes individual spice names into clean, recognizable pantry grocery terms.
 */
export function cleanSpiceName(name: string): string {
  const cleaned = name.trim().replace(/^[-*•]\s*/, "").replace(/[.)]+$/, "").trim();
  const lower = cleaned.toLowerCase();

  if (lower === "pfeffer" || lower === "schwarzer pfeffer") return "Schwarzer Pfeffer";
  if (lower === "salz" || lower === "meersalz") return "Salz";
  if (lower === "paprika" || lower === "paprika edelsüß" || lower === "paprikapulver edelsüß") return "Paprikapulver edelsüß";
  if (lower === "paprika rosenscharf") return "Paprikapulver rosenscharf";
  if (lower === "paprika geräuchert" || lower === "pimenton" || lower === "pimentón") return "Geräuchertes Paprikapulver";
  if (lower === "knoblauch" || lower === "knoblauchpulver") return "Knoblauchpulver";
  if (lower === "zwiebel" || lower === "zwiebelpulver") return "Zwiebelpulver";
  if (lower === "oregano") return "Getrockneter Oregano";
  if (lower === "basilikum") return "Basilikum";
  if (lower === "thymian") return "Thymian";
  if (lower === "rosmarin") return "Rosmarin";
  if (lower === "chili" || lower === "chiliflocken" || lower === "cayennepfeffer") return "Chiliflocken";
  if (lower === "kreuzkümmel" || lower === "cumin") return "Kreuzkümmel (Cumin)";
  if (lower === "curry" || lower === "currypulver") return "Currypulver";
  if (lower === "kurkuma") return "Kurkuma";
  if (lower === "ingwer" || lower === "ingwerpulver") return "Ingwerpulver";
  if (lower === "senfmehl") return "Senfmehl";
  if (lower === "muskat" || lower === "muskatnuss") return "Muskatnuss";

  return cleaned;
}

/**
 * Decomposes composite spice or multi-ingredient lines into distinct individual ingredients.
 * For example:
 * "Gewürze (Paprika edelsüß, Knoblauchpulver, Senfmehl, Salz, Pfeffer)" with 3 TL
 * ->
 * 1. "Paprikapulver edelsüß" (0.6 TL)
 * 2. "Knoblauchpulver" (0.6 TL)
 * 3. "Senfmehl" (0.6 TL)
 * 4. "Salz" (0.6 TL)
 * 5. "Schwarzer Pfeffer" (0.6 TL)
 */
export function decomposeCompositeIngredients<T extends { name: string; [key: string]: any }>(
  items: T[]
): T[] {
  if (!Array.isArray(items) || items.length === 0) return items;

  const result: T[] = [];

  for (const item of items) {
    if (!item || !item.name) {
      result.push(item);
      continue;
    }

    const rawName = item.name.trim();

    // Check salt & pepper shorthand
    if (SALT_PEPPER_REGEX.test(rawName)) {
      const isBaseAmount = typeof item.baseAmountPerPortion === "number";
      const portion = isBaseAmount ? Math.max(0.5, item.baseAmountPerPortion / 2) : undefined;
      result.push({
        ...item,
        name: "Salz",
        baseAmountPerPortion: portion,
        amount: isBaseAmount ? undefined : "1 Prise",
      });
      result.push({
        ...item,
        name: "Schwarzer Pfeffer",
        baseAmountPerPortion: portion,
        amount: isBaseAmount ? undefined : "1 Prise",
      });
      continue;
    }

    // Check composite spice regex e.g. "Gewürze (Paprika edelsüß, Knoblauchpulver, Salz)"
    const match = rawName.match(COMPOSITE_REGEX);
    if (!match || !match[1]) {
      result.push(item);
      continue;
    }

    const insideContent = match[1];
    const parts = insideContent
      .split(/[,;+]|\s+(?:und|sowie|&)\s+/i)
      .map((p) => p.trim().replace(/^[-*•]\s*/, "").replace(/[.)]+$/, "").trim())
      .filter((p) => p.length > 0 && !/^(?:etwas|je|nach\s+geschmack|nach\s+bedarf|optional|beliebig)$/i.test(p));

    if (parts.length <= 1) {
      const singleName = cleanSpiceName(parts[0] || insideContent);
      result.push({
        ...item,
        name: singleName,
      });
      continue;
    }

    const isBaseAmount = typeof item.baseAmountPerPortion === "number";
    const totalAmount = isBaseAmount ? item.baseAmountPerPortion : 1;
    const unit = item.unit || "TL";

    const divided = isBaseAmount
      ? Math.max(0.5, Math.round((totalAmount / parts.length) * 10) / 10)
      : undefined;

    let stringAmountUnit = "TL";
    let stringAmountVal = 1;
    if (typeof item.amount === "string") {
      const matchStr = item.amount.match(/^([\d.,]+)\s*(\w+)?/);
      if (matchStr) {
        stringAmountVal = parseFloat(matchStr[1].replace(",", ".")) || 1;
        stringAmountUnit = matchStr[2] || "TL";
      }
    } else if (typeof item.quantity === "string") {
      const matchStr = item.quantity.match(/^([\d.,]+)\s*(\w+)?/);
      if (matchStr) {
        stringAmountVal = parseFloat(matchStr[1].replace(",", ".")) || 1;
        stringAmountUnit = matchStr[2] || "TL";
      }
    }
    const dividedStringVal = Math.max(0.5, Math.round((stringAmountVal / parts.length) * 10) / 10);

    for (const part of parts) {
      const partAmountMatch = part.match(/^([\d.,]+)\s*(TL|EL|g|ml|Prise[n]?|Stk\.?)\s+(.*)$/i);
      let partName = part;
      let partVal = divided;
      let partUnit = unit;
      let partAmountStr: string | undefined = undefined;

      if (partAmountMatch) {
        partVal = parseFloat(partAmountMatch[1].replace(",", ".")) || divided;
        partUnit = partAmountMatch[2];
        partName = partAmountMatch[3];
        partAmountStr = `${partAmountMatch[1]} ${partAmountMatch[2]}`;
      }

      const cleanedName = cleanSpiceName(partName);

      const newItem: any = {
        ...item,
        name: cleanedName,
      };

      if (isBaseAmount) {
        newItem.baseAmountPerPortion = partVal;
        newItem.unit = partUnit;
      }
      if (typeof item.amount === "string") {
        newItem.amount = partAmountStr || `${dividedStringVal} ${stringAmountUnit}`;
      }
      if (typeof item.quantity === "string") {
        newItem.quantity = partAmountStr || `${dividedStringVal} ${stringAmountUnit}`;
      }

      result.push(newItem as T);
    }
  }

  return result;
}

/**
 * Safely extracts the ingredient list for any recipe (CatalogRecipe, AI-generated, or plain JSON from localStorage/cloud).
 * Never throws "recipe.ingredientsList is not a function".
 */
export function getSafeIngredientsList(
  recipe: Partial<CatalogRecipe> | any | null | undefined,
  servings: number = 2
): SafeIngredientItem[] {
  if (!recipe) return [];

  const extractList = (): SafeIngredientItem[] => {
    // 1. If dynamic function exists and is callable
    if (typeof recipe.ingredientsList === "function") {
      try {
        const result = recipe.ingredientsList(servings);
        if (Array.isArray(result) && result.length > 0) {
          return result;
        }
      } catch (err) {
        console.warn("[recipeHelpers] Error calling recipe.ingredientsList:", err);
      }
    }

    // 2. If rawIngredients array is stored (e.g. from Gemini AI generation)
    if (Array.isArray(recipe.rawIngredients) && recipe.rawIngredients.length > 0) {
      return recipe.rawIngredients.map((ing: any) => ({
        name: ing.name || "Zutat",
        amount: `${Math.round((Number(ing.baseAmountPerPortion) || 100) * servings)} ${ing.unit || "g"}`,
        optional: Boolean(ing.optional),
      }));
    }

    // 3. If ingredients array exists (raw Gemini recipe schema)
    if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
      return recipe.ingredients.map((ing: any) => ({
        name: ing.name || (typeof ing === "string" ? ing : "Zutat"),
        amount: ing.baseAmountPerPortion
          ? `${Math.round((Number(ing.baseAmountPerPortion) || 100) * servings)} ${ing.unit || "g"}`
          : ing.amount || "nach Bedarf",
        optional: Boolean(ing.optional),
      }));
    }

    // 4. Default smart fallback ingredients based on recipe title and subtitle
    const title = (recipe.title || "").toLowerCase();
    const sub = (recipe.subtitle || "").toLowerCase();
    const fullText = `${title} ${sub}`;

    const customList: SafeIngredientItem[] = [];

    // Pasta / Calamarata / Nudeln / Reis
    if (fullText.includes("calamarata")) {
      customList.push({ name: "Calamarata Pasta", amount: `${100 * servings} g` });
    } else if (fullText.includes("penne")) {
      customList.push({ name: "Penne Rigate", amount: `${90 * servings} g` });
    } else if (fullText.includes("spaghetti")) {
      customList.push({ name: "Spaghetti", amount: `${90 * servings} g` });
    } else if (fullText.includes("pasta") || fullText.includes("nudel") || fullText.includes("ramen")) {
      customList.push({ name: "Pasta / Nudeln", amount: `${90 * servings} g` });
    } else if (fullText.includes("reis") || fullText.includes("rice")) {
      customList.push({ name: "Basmati Reis", amount: `${80 * servings} g` });
    }

    // Protein: Chicken / Hähnchen / Beef / Egg
    if (fullText.includes("hähnchen") || fullText.includes("chicken") || fullText.includes("huhn") || fullText.includes("geflügel")) {
      customList.push({ name: "Hähnchenbrustfilet", amount: `${125 * servings} g` });
    } else if (fullText.includes("rind") || fullText.includes("geschnetzelt") || fullText.includes("fleisch")) {
      customList.push({ name: "Rindfleischstreifen", amount: `${125 * servings} g` });
    } else if (fullText.includes("hackfleisch") || fullText.includes("bolognese")) {
      customList.push({ name: "Rinderhackfleisch", amount: `${120 * servings} g` });
    } else if (fullText.includes("ei") || fullText.includes("eier") || fullText.includes("shakshuka") || fullText.includes("omelett") || fullText.includes("rührei")) {
      customList.push({ name: "Bio Eier", amount: `${2 * servings} Stk.` });
    }

    // Veggies & Sauces
    if (fullText.includes("kirschtomate") || fullText.includes("cherrytomate") || fullText.includes("tomate")) {
      customList.push({ name: "Cherry-Kirschtomaten", amount: `${100 * servings} g` });
    }
    if (fullText.includes("frischkäse")) {
      customList.push({ name: "Frischkäse (Kräuter)", amount: `${60 * servings} g` });
    } else if (fullText.includes("sahne") || fullText.includes("cremig") || fullText.includes("alfredo")) {
      customList.push({ name: "Kochsahne / Frischkäse", amount: `${80 * servings} ml` });
    }
    if (fullText.includes("erbsen") || fullText.includes("primavera")) {
      customList.push({ name: "Junge Erbsen (TK)", amount: `${50 * servings} g` });
    }
    if (fullText.includes("soja") || fullText.includes("teriyaki") || fullText.includes("asia") || fullText.includes("wok")) {
      customList.push({ name: "Sojasauce", amount: `${15 * servings} ml` });
    }
    if (fullText.includes("zwiebel") || fullText.includes("lauch") || fullText.includes("frühlingszwiebel")) {
      customList.push({ name: "Frühlingszwiebeln / Zwiebel", amount: `${1 * servings} Stk.` });
    }

    if (customList.length > 0) {
      customList.push({ name: "Olivenöl / Gewürze", amount: `${10 * servings} ml`, optional: true });
      return customList;
    }

    return [
      { name: "Hauptzutat nach Rezept", amount: `${100 * servings} g` },
      { name: "Würzige Sauce oder Öl", amount: `${25 * servings} ml` },
      { name: "Frische Kräuter & Gewürze", amount: "nach Geschmack", optional: true },
    ];
  };

  return decomposeCompositeIngredients(extractList());
}

/**
 * Safely extracts the formatted available string for preview badges.
 */
export function getSafeAvailable(
  recipe: Partial<CatalogRecipe> | any | null | undefined,
  servings: number = 2
): string {
  if (!recipe) return "Zutaten vorhanden";

  if (typeof recipe.available === "function") {
    try {
      return recipe.available(servings);
    } catch {}
  }

  const list = getSafeIngredientsList(recipe, servings);
  if (list.length > 0) {
    return list.slice(0, 3).map((ing) => `${ing.amount} ${ing.name}`).join(" · ");
  }

  return "Frische Vorrats-Zutaten";
}

/**
 * Safely extracts preparation steps for any recipe.
 * Guaranteed to return at least 1 valid step with stepNumber, title, and instruction.
 */
export function getSafeSteps(
  recipe: Partial<CatalogRecipe> | any | null | undefined
): RecipeStep[] {
  if (recipe && Array.isArray(recipe.steps) && recipe.steps.length > 0) {
    return recipe.steps.map((st: any, idx: number) => ({
      stepNumber: Number(st.stepNumber) || idx + 1,
      title: st.title || `Schritt ${idx + 1}`,
      instruction: st.instruction || "Zutaten wie gewünscht zubereiten.",
      duration: st.duration || "4 Min.",
      tag: st.tag || "Kochen",
    }));
  }

  return [
    {
      stepNumber: 1,
      title: "Zutaten vorbereiten",
      instruction: "Alle Zutaten abmessen, waschen und mundgerecht bereitstellen.",
      duration: "3 Min.",
      tag: "Vorbereitung",
    },
    {
      stepNumber: 2,
      title: "Zubereitung & Garen",
      instruction: "Die Komponenten in Pfanne oder Topf auf mittlerer Hitze garen und gut vermengen.",
      duration: "10 Min.",
      tag: "Kochen",
    },
    {
      stepNumber: 3,
      title: "Abschmecken & Servieren",
      instruction: "Mit Kräutern und Gewürzen nach Belieben abschmecken und frisch anrichten.",
      duration: "2 Min.",
      tag: "Finish",
    },
  ];
}

/**
 * Rehydrates a serialized recipe (e.g. from localStorage or Supabase cloud sync)
 * restoring dynamic methods and providing foolproof fallbacks for images and steps.
 */
export function rehydrateRecipe(item: any): CatalogRecipe {
  const title = item.title || "Leckeres Gericht";
  const decomposedRaw = decomposeCompositeIngredients(
    Array.isArray(item.rawIngredients)
      ? item.rawIngredients
      : Array.isArray(item.ingredients)
      ? item.ingredients
      : []
  );

  const rawIngredients: Array<{ name: string; baseAmountPerPortion: number; unit: string; optional?: boolean }> =
    decomposedRaw.map((ing: any) => ({
      name: ing.name || "Zutat",
      baseAmountPerPortion: Number(ing.baseAmountPerPortion) || 1,
      unit: ing.unit || "TL",
      optional: Boolean(ing.optional),
    }));

  const imageUrl = item.imageUrl || resolveRecipeFoodImage(title, item.imageKeywords);

  return {
    id: item.id || `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    subtitle: item.subtitle || "Frisch kreiert für deinen Vorrat",
    time: item.time || "20 Min.",
    difficulty: item.difficulty || "Einfach",
    baseCal: Math.round(Number(item.baseCal) || 400),
    baseProt: Math.round(Number(item.baseProt) || 18),
    baseCarb: Math.round(Number(item.baseCarb) || 42),
    baseCost: Number(item.baseCost) || 2.2,
    tone: item.tone || "mint",
    chefTip: item.chefTip || "Frisch zubereitet schmeckt es am besten!",
    imageUrl,
    isAiGenerated: Boolean(item.isAiGenerated),
    matchScore: Number(item.matchScore) || 95,
    optional: item.optional || "Nach Wunsch verfeinern",
    rawIngredients,
    ingredients: rawIngredients,
    steps: getSafeSteps(item),
    available: (s: number) => getSafeAvailable({ ...item, rawIngredients }, s),
    ingredientsList: (s: number) => getSafeIngredientsList({ ...item, rawIngredients }, s),
  };
}

export interface MealTimeSlot {
  slotId: number; // 0 = Morgen (05:00 - 11:30), 1 = Mittag (11:30 - 17:30), 2 = Abend (17:30 - 05:00)
  title: string;
  badge: string;
  shortLabel: string;
}

/**
 * Returns the current time-of-day slot to rotate the TinderSwipe deck 3 times a day:
 * Morning (breakfast/fast lunch), Midday (hearty lunch), Evening (dinner/comfort).
 */
export function getCurrentMealTimeSlot(): MealTimeSlot {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeDec = hour + minute / 60;

  if (timeDec >= 5.0 && timeDec < 11.5) {
    return {
      slotId: 0,
      title: "Morgen & Schneller Lunch",
      badge: "Morgens",
      shortLabel: "Morgen-Küche",
    };
  } else if (timeDec >= 11.5 && timeDec < 17.5) {
    return {
      slotId: 1,
      title: "Mittag & Nachmittag",
      badge: "Mittags",
      shortLabel: "Mittagstisch",
    };
  } else {
    return {
      slotId: 2,
      title: "Abendessen & Feierabend",
      badge: "Abends",
      shortLabel: "Abendessen",
    };
  }
}
