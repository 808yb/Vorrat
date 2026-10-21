import { type CatalogRecipe } from "../data/recipeCatalog";
import { getSafeIngredientsList } from "./recipeHelpers";
import { STORAGE_KEYS } from "../constants/storage";

export interface AlternativeOverride {
  mode: "missing" | "pantry" | "custom";
  pantryItemName?: string;
  customName?: string;
}

export interface IngredientMatch {
  name: string;
  amount: string;
  optional?: boolean;
  matchedByAlternative?: string;
  isAlternative?: boolean;
  matchedPantryItemName?: string;
}

export interface RecipePantryBreakdown {
  inStock: IngredientMatch[];
  missing: IngredientMatch[];
  all: IngredientMatch[];
  matchPercentage: number;
}

let inMemoryOverrides: Record<string, AlternativeOverride> = {};

/**
 * Cleans alternative strings removing any debug artefacts, arrows (↳, →),
 * raw slashes, double parentheses, or cut-off texts.
 */
export function cleanAlternativeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/[↳→]/g, "")
    .replace(/\b(?:debug|undefined|null)\b/gi, "")
    .replace(/[\/\\|]+/g, " ")
    .replace(/\(\(+/g, "(")
    .replace(/\)\)+/g, ")")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Formats a clean, calm alternative hint for display: e.g. "Vorhanden (Rapsöl)"
 * Guarantees no double brackets or broken layout strings.
 */
export function formatAlternativeHint(matchedPantryName: string): string {
  const cleanName = cleanAlternativeText(matchedPantryName).replace(/^\(+|\)+$/g, "").trim();
  if (!cleanName) return "Vorhanden";
  return `Vorhanden (${cleanName})`;
}

/**
 * Retrieves all stored alternative overrides from localStorage (or in-memory in test environments).
 */
export function getAlternativeOverrides(): Record<string, AlternativeOverride> {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEYS.ALTERNATIVE_OVERRIDES);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    }
    return inMemoryOverrides;
  } catch {
    return inMemoryOverrides;
  }
}

/**
 * Generates the lookup key for a recipe ingredient override.
 */
export function getAlternativeOverrideKey(recipeId: string | undefined, ingredientName: string): string {
  const rId = (recipeId || "global").trim().toLowerCase();
  const ingNorm = normalizeIngredientName(ingredientName);
  return `${rId}:::${ingNorm}`;
}

/**
 * Gets a specific override for a recipe ingredient if set by the user.
 */
export function getAlternativeOverride(recipeId: string | undefined, ingredientName: string): AlternativeOverride | null {
  const all = getAlternativeOverrides();
  const key = getAlternativeOverrideKey(recipeId, ingredientName);
  if (all[key]) return all[key];
  const globalKey = getAlternativeOverrideKey("global", ingredientName);
  return all[globalKey] || null;
}

/**
 * Saves or deletes a user override for a recipe ingredient alternative.
 */
export function setAlternativeOverride(
  recipeId: string | undefined,
  ingredientName: string,
  override: AlternativeOverride | null
): void {
  try {
    const all = getAlternativeOverrides();
    const key = getAlternativeOverrideKey(recipeId, ingredientName);
    if (override === null) {
      delete all[key];
      delete inMemoryOverrides[key];
    } else {
      all[key] = override;
      inMemoryOverrides[key] = override;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ALTERNATIVE_OVERRIDES, JSON.stringify(all));
    }
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(
        new CustomEvent("vorrat_alternative_override_changed", {
          detail: { recipeId, ingredientName, override },
        })
      );
    }
  } catch (err) {
    console.error("Fehler beim Speichern des Alternativen-Overrides:", err);
  }
}

// Culinary equivalence groups: Items in the same array can substitute for one another
const EQUIVALENCE_GROUPS: string[][] = [
  // Fresh tomatoes
  ["kirschtomate", "kirschtomaten", "cherrytomate", "cherrytomaten", "cocktailtomate", "cocktailtomaten", "rispentomate", "rispentomaten", "strauchtomate", "strauchtomaten", "tomate", "tomaten", "cherry-kirschtomaten"],
  // Canned / Processed tomatoes
  ["gehackte tomaten", "passierte tomaten", "dosentomaten", "stückige tomaten", "polpa", "tomatensauce", "tomatenmark", "pelati"],
  // Cooking oils
  ["öl", "speiseöl", "pflanzenöl", "bratöl", "frittieröl", "olivenöl", "sonnenblumenöl", "rapsöl", "keimöl", "sesamöl", "distelöl", "kokosöl", "erdnussöl"],
  // Butter & Margarine
  ["butter", "margarine", "pflanzenbutter", "butterreinfett", "markenbutter", "süßrahmbutter", "sauerrahmbutter"],
  // Mayonnaise & Remoulade
  ["mayo", "mayonnaise", "salatmayo", "salatmayonnaise", "remoulade", "aioli", "miracel whip", "pommes-sauce", "pommessauce", "trüffelmayo"],
  // Onions & Alliums
  ["zwiebel", "zwiebeln", "schalotte", "schalotten", "frühlingszwiebel", "frühlingszwiebeln", "lauch", "porree", "gemüsezwiebel", "rote zwiebel"],
  // Milk & Plant milk
  ["milch", "hafermilch", "sojamilch", "mandelmilch", "kuhmilch", "vollmilch", "fettarme milch", "pflanzendrink"],
  // Cream / Sahne / Frischkäse
  ["sahne", "schlagsahne", "kochcreme", "hafersahne", "sojasahne", "creme fraiche", "crème fraîche", "schmand", "sauerrahm", "frischkäse"],
  // Hard cheese / Parmesan
  ["parmesan", "grana padano", "pecorino", "hartkäse"],
  // Grated / Melting cheese
  ["geriebener käse", "streukäse", "gouda", "mozzarella", "pizzakäse", "emmentaler", "cheddar"],
  // Rice varieties
  ["basmatireis", "jasminreis", "langkornreis", "reis", "parboiled reis", "naturreis", "sushi-reis", "basmati reis"],
  // Pasta varieties
  ["pasta", "nudeln", "spaghetti", "penne", "fusilli", "tagliatelle", "macaroni", "rigatoni", "calamarata", "paccheri"],
  // Minced meat
  ["hackfleisch", "rinderhack", "gemischtes hack", "tatar", "hackfleisch gemischt", "schweinehack"],
  // Poultry
  ["hähnchen", "hähnchenbrust", "hähnchenbrustfilet", "huhn", "geflügel", "putenbrust", "pute", "hähnchenschnitzel", "minuten-schnitzel"],
  // Sweetener / Sugar
  ["zucker", "rohrzucker", "brauner zucker", "puderzucker", "agavendicksaft", "ahornsirup", "honig"],
  // Flour
  ["mehl", "weizenmehl", "dinkelmehl"],
  // Vinegar
  ["essig", "balsamico", "aceto balsamico", "weißweinessig", "apfelessig", "rotweinessig"],
  // Soy sauce
  ["sojasauce", "sojasoße", "shoyu", "tamari", "kikkoman"],
  // Eggs
  ["ei", "eier", "bio eier", "hühnerei", "hühnereier"],
  // Peas
  ["erbsen", "erbse", "tk-erbsen", "junge erbsen", "tiefkühlerbsen"],
  // Salt
  ["salz", "meersalz", "speisesalz", "jodsalz", "steinsalz", "grobes salz", "fleur de sel"],
  // Pepper
  ["pfeffer", "schwarzer pfeffer", "bunter pfeffer", "pfefferkörner", "gemahlener pfeffer", "weißer pfeffer"],
  // Paprika
  ["paprika", "paprikapulver", "paprika edelsüß", "paprika rosenscharf", "paprikapulver edelsüß", "paprika geräuchert", "pimentón"],
  // Garlic
  ["knoblauch", "knoblauchzehe", "knoblauchzehen", "knoblauchpulver", "knoblauchgranulat"],
  // Onion powder / Onions
  ["zwiebelpulver", "zwiebelgranulat", "getrocknete zwiebeln"],
  // Chili
  ["chili", "chiliflocken", "chilipulver", "cayennepfeffer", "chilisauce"],
  // Herbs / Oregano
  ["oregano", "italienische kräuter", "kräuter der provence", "thymian", "basilikum", "rosmarin"],
  // Cumin
  ["kreuzkümmel", "cumin", "kumin"],
];

export function areCulinaryEquivalents(ingA: string, ingB: string): boolean {
  if (!ingA || !ingB) return false;
  if (ingA === ingB) return true;

  const matchesGroupItem = (str: string, item: string): boolean => {
    if (str === item) return true;
    if (item.length <= 4) {
      const words = str.split(/\s+/);
      return words.includes(item) || str === item;
    }
    const regex = new RegExp(`(^|\\s|-)${item}($|\\s|-)`, "i");
    if (regex.test(str)) return true;
    if (str.endsWith(item) || str.startsWith(item) || str.includes(item)) return true;
    return false;
  };

  for (const group of EQUIVALENCE_GROUPS) {
    const hasA = group.some((item) => matchesGroupItem(ingA, item));
    const hasB = group.some((item) => matchesGroupItem(ingB, item));
    if (hasA && hasB) {
      return true;
    }
  }
  return false;
}

export const normalizeIngredientName = (str: string): string =>
  str
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\s+zum\s+(?:anbraten|braten|frittieren|kochen|backen|garnieren|verfeinern|dünsten|schmoren|servieren)\b/gi, "")
    .replace(/\s+für\s+(?:die|das|den)\s+(?:sauce|soße|marinade|panade|dressing|glasur|garnitur)\b/gi, "")
    .replace(/\s+nach\s+bedarf\b/gi, "")
    .replace(/\s+nach\s+geschmack\b/gi, "")
    .replace(/bio\s+/g, "")
    .replace(/tk\s*[-]?/g, "")
    .replace(/frisch[e|er|es]?\s+/g, "")
    .replace(/kalt[e|er|es]?\s+/g, "")
    .replace(/warme[s]?\s+/g, "")
    .replace(/fein[e|er|es]?\s+/g, "")
    .replace(/reine[s]?\s+/g, "")
    .replace(/geröstete[s]?\s+/g, "")
    .replace(/stark[e|er|es]?\s+/g, "")
    .replace(/gehackt[e|er|es]?\s+/g, "")
    .replace(/gewürfelt[e|er|es]?\s+/g, "")
    .replace(/passiert[e|er|es]?\s+/g, "")
    .replace(/stückig[e|er|es]?\s+/g, "")
    .replace(/geschält[e|er|es]?\s+/g, "")
    .replace(/geschnitten[e|er|es]?\s+/g, "")
    .replace(/gerieben[e|er|es]?\s+/g, "")
    .replace(/deutsche[r|s]?\s+/g, "")
    .replace(/marken\s*/g, "")
    .replace(/soße/g, "sauce")
    .replace(/frühlingszwiebeln/g, "frühlingszwiebel")
    .trim();

/**
 * Determines whether a secondary "Aus Vorrat: {matchedPantryName}" hint line should be shown.
 * Suppresses the hint if the pantry name already obviously contains or matches the recipe ingredient name
 * (e.g. "Salz" vs "Speisesalz", "Schwarzer Pfeffer" vs "Pfeffer", "Zitrone" vs "Zitrone Bio", "Mehl" vs "Weizenmehl").
 */
export function shouldShowAlternativeHint(recipeIngName?: string, matchedPantryName?: string): boolean {
  if (!recipeIngName || !matchedPantryName) return false;
  const r = recipeIngName.toLowerCase().trim();
  const p = matchedPantryName.toLowerCase().trim();
  if (r === p) return false;

  const normR = normalizeIngredientName(r);
  const normP = normalizeIngredientName(p);
  if (normR === normP) return false;

  const rClean = r.replace(/[^a-zäöüß0-9]/gi, "");
  const pClean = p.replace(/[^a-zäöüß0-9]/gi, "");
  if (rClean === pClean) return false;

  // Direct substring / prefix / suffix matches
  if (pClean.includes(rClean) || rClean.includes(pClean)) {
    return false;
  }

  // Also check if normalized strings contain each other
  const normRClean = normR.replace(/[^a-zäöüß0-9]/gi, "");
  const normPClean = normP.replace(/[^a-zäöüß0-9]/gi, "");
  if (normPClean.includes(normRClean) || normRClean.includes(normPClean)) {
    return false;
  }

  return true;
}

/**
 * Checks if a string specifically refers to drinking or tap water.
 * Excludes culinary liquids like Gurkenwasser, Rosenwasser, Kirschwasser, Kokoswasser, etc.
 */
export function isDrinkingWater(name: string): boolean {
  if (!name) return false;
  const clean = name.trim().toLowerCase().replace(/\(.*?\)/g, "").trim();

  // Explicit non-tap water culinary products
  if (
    clean.includes("gurke") ||
    clean.includes("rose") ||
    clean.includes("kirsch") ||
    clean.includes("koko") ||
    clean.includes("blüte") ||
    clean.includes("reiswasser") ||
    clean.includes("tonic") ||
    clean.includes("soda") ||
    clean.includes("melisse") ||
    clean.includes("gesicht")
  ) {
    return false;
  }

  // Exact drinking water keywords & natural phrases
  return /^(?:(?:kaltes|warmes|heißes|kochendes|lauwarmes|stilles|sprudelndes|frisches|etwas)\s+)?(?:leitungs[ -]?wasser|trink[ -]?wasser|hahn[ -]?wasser|mineral[ -]?wasser|sprudel[ -]?wasser|wasser|tap[ -]?water|water)$/i.test(
    clean
  );
}

export interface MatchedPantryResult {
  pantryItem: { name: string; amount?: number; unit?: string; isUnlimited?: boolean };
  matchedByAlternative?: string;
  isAlternative?: boolean;
}

/**
 * Finds the matching pantry item for any recipe ingredient,
 * intelligently supporting alternatives (e.g. "Butter oder Öl", "Milch oder Wasser"),
 * culinary equivalents (e.g. Sonnenblumenöl <-> Öl, Kirschtomaten <-> Cherrytomaten),
 * and user-configured alternative overrides.
 */
export function findMatchingPantryItem(
  ingredientName: string,
  pantry: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>,
  recipeId?: string
): MatchedPantryResult | null {
  if (!ingredientName || !pantry || pantry.length === 0) return null;

  // Check user-configured override for this specific recipe ingredient
  const override = getAlternativeOverride(recipeId, ingredientName);
  if (override) {
    if (override.mode === "missing") {
      return null;
    }
    if (override.mode === "pantry" && override.pantryItemName) {
      const targetPantry = pantry.find(
        (p) =>
          normalizeIngredientName(p.name) === normalizeIngredientName(override.pantryItemName!) ||
          p.name.toLowerCase() === override.pantryItemName!.toLowerCase()
      );
      if (targetPantry) {
        return {
          pantryItem: targetPantry,
          matchedByAlternative: cleanAlternativeText(targetPantry.name),
          isAlternative: true,
        };
      }
    }
    if (override.mode === "custom" && override.customName) {
      return {
        pantryItem: { name: override.customName, amount: 9999, unit: "g", isUnlimited: true },
        matchedByAlternative: cleanAlternativeText(override.customName),
        isAlternative: true,
      };
    }
  }

  // Water is always unlimited only if it is actually plain drinking/tap water
  if (isDrinkingWater(ingredientName)) {
    return {
      pantryItem: { name: "Leitungswasser", amount: 999999, unit: "ml", isUnlimited: true },
      matchedByAlternative: undefined,
      isAlternative: false,
    };
  }

  // 1. Split ingredient into alternatives if phrased with " oder ", " / ", " bzw. "
  // e.g. "Butter oder Öl" -> ["Butter", "Öl"]
  // e.g. "Milch oder Wasser (für Cremigkeit)" -> ["Milch", "Wasser"]
  const rawParts = ingredientName
    .replace(/\(.*?\)/g, "")
    .split(/\s+(?:oder|\/|bzw\.)\s+|\s*\/\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const candidateNames = rawParts.length > 0 ? rawParts : [ingredientName];

  for (const candidate of candidateNames) {
    const candNorm = normalizeIngredientName(candidate);
    if (!candNorm) continue;

    // Check if candidate is drinking water
    if (isDrinkingWater(candidate) || isDrinkingWater(candNorm)) {
      return {
        pantryItem: { name: "Leitungswasser", amount: 999999, unit: "ml", isUnlimited: true },
        matchedByAlternative: undefined,
        isAlternative: false,
      };
    }

    // Generic spices or seasoning fallback: matches if user has any basic spice in pantry
    if (
      candNorm === "gewürze" ||
      candNorm === "gewürz" ||
      candNorm === "gewürzmischung" ||
      candNorm === "kräuter & gewürze" ||
      candNorm === "kräuter und gewürze" ||
      candNorm === "trockengewürze"
    ) {
      const spiceItem = pantry.find((p) => {
        const pNorm = normalizeIngredientName(p.name);
        return (
          pNorm.includes("salz") ||
          pNorm.includes("pfeffer") ||
          pNorm.includes("paprika") ||
          pNorm.includes("gewürz") ||
          pNorm.includes("kräuter") ||
          (p as any).category?.toLowerCase().includes("gewürz")
        );
      });
      if (spiceItem) {
        return {
          pantryItem: spiceItem,
          matchedByAlternative: cleanAlternativeText(spiceItem.name),
          isAlternative: true,
        };
      }
    }

    // Direct / whole-word / compound match
    let matched = pantry.find((p) => {
      const pNorm = normalizeIngredientName(p.name);
      if (!pNorm) return false;
      if (pNorm === candNorm) return true;

      const pWords = pNorm.split(/\s+/);
      const candWords = candNorm.split(/\s+/);
      if (pWords.length === 1 && candWords.includes(pNorm)) return true;
      if (candWords.length === 1 && pWords.includes(candNorm)) return true;

      // Suffix matching (e.g. "sonnenblumenöl" ends with "öl", "markenbutter" ends with "butter")
      if (pNorm.endsWith(candNorm) || candNorm.endsWith(pNorm)) return true;

      // Compound matching
      if (candNorm.length >= 4 && pNorm.includes(candNorm)) return true;
      if (pNorm.length >= 4 && candNorm.includes(pNorm)) return true;

      return false;
    });

    // Smart culinary equivalence matching (e.g. Sonnenblumenöl <-> Öl/Olivenöl, Kirschtomaten <-> Cherrytomaten)
    if (!matched) {
      matched = pantry.find((p) => {
        const pNorm = normalizeIngredientName(p.name);
        return areCulinaryEquivalents(candNorm, pNorm);
      });
    }

    if (matched) {
      const isExact = normalizeIngredientName(matched.name) === normalizeIngredientName(ingredientName);
      const cleanAlt = !isExact ? cleanAlternativeText(matched.name) : undefined;
      return {
        pantryItem: matched,
        matchedByAlternative: cleanAlt,
        isAlternative: !isExact,
      };
    }
  }

  return null;
}

export function getRecipePantryBreakdown(
  recipe: CatalogRecipe,
  pantry: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>,
  servings: number
): RecipePantryBreakdown {
  const allIngredients = typeof recipe?.ingredientsList === "function"
    ? recipe.ingredientsList(servings)
    : getSafeIngredientsList(recipe, servings);

  const inStock: IngredientMatch[] = [];
  const missing: IngredientMatch[] = [];

  for (const ing of allIngredients) {
    const match = findMatchingPantryItem(ing.name, pantry, recipe?.id);

    if (match) {
      const isAlt = Boolean(
        match.isAlternative ||
        (match.matchedByAlternative && normalizeIngredientName(match.matchedByAlternative) !== normalizeIngredientName(ing.name))
      );
      inStock.push({
        ...ing,
        matchedByAlternative: isAlt ? cleanAlternativeText(match.matchedByAlternative || match.pantryItem.name) : undefined,
        isAlternative: isAlt,
        matchedPantryItemName: match.pantryItem.name,
      });
    } else {
      missing.push(ing);
    }
  }

  const matchPercentage =
    allIngredients.length > 0 ? Math.round((inStock.length / allIngredients.length) * 100) : 100;

  return { inStock, missing, all: allIngredients, matchPercentage };
}

