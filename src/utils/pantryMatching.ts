import { type CatalogRecipe } from "../data/recipeCatalog";
import { getSafeIngredientsList } from "./recipeHelpers";
import { STORAGE_KEYS } from "../constants/storage";

export interface AlternativeOverride {
  mode: "missing" | "pantry" | "custom";
  pantryItemName?: string;
  customName?: string;
}

export type IngredientKind = "vegetable" | "spice" | "herb" | "other";

export interface IngredientMatch {
  name: string;
  amount: string;
  optional?: boolean;
  matchedByAlternative?: string;
  isAlternative?: boolean;
  matchedPantryItemName?: string;
  kind?: IngredientKind;
  ambiguousTag?: "Gemüse" | "Gewürz" | null;
  isSpice?: boolean;
}

export interface RecipePantryBreakdown {
  inStock: IngredientMatch[];
  missing: IngredientMatch[];
  all: IngredientMatch[];
  matchPercentage: number;
}

let inMemoryOverrides: Record<string, AlternativeOverride> = {};

/**
 * Classifies an ingredient as fresh vegetable, spice, herb, or other.
 * Strictly separates produce from ground/powdered/dried spices.
 */
export function getIngredientKind(
  name: string,
  unit?: string,
  category?: string,
  amount?: number | string
): IngredientKind {
  if (!name) return "other";
  const norm = name.toLowerCase().trim();
  const cat = (category || "").toLowerCase().trim();
  const u = (unit || "").toLowerCase().trim();

  let numAmount = 0;
  if (typeof amount === "number") {
    numAmount = amount;
  } else if (typeof amount === "string") {
    const m = amount.match(/^(\d+(?:[.,]\d+)?)/);
    if (m) numAmount = parseFloat(m[1].replace(",", "."));
  }

  // 1. Spices check (powder, ground, flakes, seeds, etc.)
  const hasSpiceKeywords =
    norm.includes("pulver") ||
    norm.includes("edelsüß") ||
    norm.includes("edelsuess") ||
    norm.includes("rosenscharf") ||
    norm.includes("gemahlen") ||
    norm.includes("granulat") ||
    norm.includes("gerebelt") ||
    norm.includes("flocken") ||
    norm.includes("körner") ||
    norm.includes("koerner") ||
    norm.includes("gewürz") ||
    norm.includes("gewuerz") ||
    norm.includes("curry") ||
    norm.includes("kurkuma") ||
    norm.includes("kreuzkümmel") ||
    norm.includes("cumin") ||
    norm.includes("kumin") ||
    norm.includes("zimt") ||
    norm.includes("muskat") ||
    norm.includes("cayenne") ||
    norm.includes("piment") ||
    norm.includes("oregano") ||
    norm.includes("lorbeer") ||
    norm.includes("kardamom") ||
    norm.includes("anissamen");

  const spiceRegex =
    /(?:^|[^a-zäöüß])(?:pulver|edelsüß|edelsuess|rosenscharf|gemahlen|gewürz|gewuerz|gewürzmischung|flocken|körner|koerner|trocken|gerebelt|salz|pfeffer|curry|kurkuma|kreuzkümmel|cumin|kumin|zimt|muskat|muskatnuss|cayenne|granulat|oregano|lorbeer|kardamom|nelken|anissamen|paprikapulver|knoblauchpulver|zwiebelpulver|chilipulver|chiliflocken|senfkörner|piment|pimentón)(?:[^a-zäöüß]|$)/i;

  const isSmallSpiceAmount =
    u === "tl" ||
    u === "el" ||
    u === "prise" ||
    u === "msp." ||
    u === "msp" ||
    u === "messerspitze" ||
    (u === "g" && numAmount > 0 && numAmount < 60);

  const isSpiceByCategory =
    (cat.includes("gewürz") || cat.includes("saucen")) && isSmallSpiceAmount;

  if (hasSpiceKeywords || spiceRegex.test(norm) || isSpiceByCategory) {
    return "spice";
  }

  // 2. Fresh Herbs
  const herbRegex =
    /\b(?:frische[s]?\s+kräuter|petersilie|schnittlauch|dill|basilikum|rosmarin|thymian|koriandergrün|minze|salbei)\b/i;
  if (herbRegex.test(norm)) {
    return "herb";
  }

  // 3. Fresh Vegetables
  const vegCategory =
    cat.includes("gemüse") ||
    cat.includes("obst & gemüse") ||
    cat.includes("frisch") ||
    cat.includes("kühl");

  const vegUnits =
    ["stk.", "stk", "knolle", "zehe", "zehen", "bund", "kopf", "köpfe", "schote", "schoten", "stange", "stangen"].includes(u) ||
    (u === "g" && numAmount >= 80);

  const vegAdditions =
    /\b(?:gemüse|frisch|frische[s|r]?|schote[n]?|rot|gelb|grün|spitzpaprika|rispe[n]?|staudensellerie)\b/i.test(norm);

  const vegNames =
    /\b(?:paprika|tomate|tomaten|gurke|gurken|zucchini|aubergine|karotte|karotten|möhre|möhren|kartoffel|kartoffeln|zwiebel|zwiebeln|frühlingszwiebel|frühlingszwiebeln|schalotte|schalotten|knoblauch|knoblauchzehe|knoblauchzehen|lauch|porree|chili|chilischote|brokkoli|blumenkohl|spinat|blattspinat|pilze|champignons|kürbis|sellerie|radieschen|rote bete|spargel|fenchel|kohlrabi|chinakohl|weißkohl|rotkohl|wirsing|erbsen|zuckerschoten)\b/i.test(norm);

  if (vegNames && (vegUnits || vegCategory || vegAdditions || (!cat.includes("gewürz") && !hasSpiceKeywords))) {
    return "vegetable";
  }

  if (cat.includes("gemüse")) {
    return "vegetable";
  }

  return "other";
}

/**
 * Detects whether an ingredient is a pantry spice or basic kitchen staple:
 * (category "Gewürze", getIngredientKind === "spice", or staple spices/powders).
 * These items are treated as "Immer da / Vorrats-Glas", never warn about partial grams,
 * and are never deducted when cooking.
 */
export function isSpiceOrKitchenBasic(name: string, category?: string): boolean {
  if (!name) return false;
  const c = (category || "").toLowerCase();
  if (c.includes("gewürz") || c.includes("gewuerz")) return true;
  const kind = getIngredientKind(name, undefined, category);
  if (kind === "spice") return true;

  const norm = name.toLowerCase().trim();
  const basicKeywords = [
    "salz",
    "pfeffer",
    "oregano",
    "paprikapulver",
    "knoblauch granuliert",
    "knoblauchpulver",
    "zwiebelpulver",
    "zimt",
    "curry",
    "kurkuma",
    "speisestärke",
    "backpulver",
    "essig",
    "kreuzkümmel",
    "cumin",
    "kumin",
    "thymian getrocknet",
    "rosmarin getrocknet",
    "muskat",
    "muskatnuss",
    "chili flocken",
    "chiliflocken",
    "chilipulver",
    "cayenne",
    "lorbeer",
    "vanilleextrakt",
    "kardamom",
    "senfkörner",
    "piment",
  ];
  return basicKeywords.some((b) => norm.includes(b));
}

/**
 * Checks compatibility between recipe requirement and pantry item.
 * Strictly prevents fresh vegetables from ever matching powdered spices or vice versa.
 */
export function isCategoryCompatible(
  recipeIng: { name: string; amount?: string; unit?: string; category?: string },
  pantryItem: { name: string; amount?: number; unit?: string; category?: string }
): boolean {
  const recKind = getIngredientKind(recipeIng.name, recipeIng.unit, recipeIng.category, recipeIng.amount);
  const pKind = getIngredientKind(pantryItem.name, pantryItem.unit, pantryItem.category, pantryItem.amount);

  // 1. NEVER match vegetable with spice
  if (recKind === "vegetable" && pKind === "spice") return false;
  if (recKind === "spice" && pKind === "vegetable") return false;

  const rLower = recipeIng.name.toLowerCase();
  const pLower = pantryItem.name.toLowerCase();

  // 2. Critical Doppelgänger Rules
  // Paprika (Vegetable vs Spice)
  const rIsPaprikaVeg = rLower.includes("paprika") && recKind === "vegetable";
  const pIsPaprikaSpice =
    pLower.includes("paprika") &&
    (pKind === "spice" ||
      pLower.includes("pulver") ||
      pLower.includes("edelsüß") ||
      pLower.includes("rosenscharf") ||
      pLower.includes("scharf") ||
      pLower.includes("geräuchert"));
  if (rIsPaprikaVeg && pIsPaprikaSpice) return false;

  const rIsPaprikaSpice =
    rLower.includes("paprika") &&
    (recKind === "spice" ||
      rLower.includes("pulver") ||
      rLower.includes("edelsüß") ||
      rLower.includes("rosenscharf") ||
      rLower.includes("scharf"));
  const pIsPaprikaVeg = pLower.includes("paprika") && pKind === "vegetable";
  if (rIsPaprikaSpice && pIsPaprikaVeg) return false;

  // Garlic (Fresh vs Powder/Granulate)
  const rIsGarlicFresh = rLower.includes("knoblauch") && !rLower.includes("pulver") && !rLower.includes("granulat");
  const pIsGarlicSpice =
    pLower.includes("knoblauch") &&
    (pLower.includes("pulver") || pLower.includes("granulat") || pKind === "spice");
  if (rIsGarlicFresh && pIsGarlicSpice) return false;
  if (!rIsGarlicFresh && pIsGarlicSpice && pKind === "vegetable") return false;

  // Onion (Fresh vs Powder/Granulate/Fried)
  const rIsOnionFresh =
    (rLower.includes("zwiebel") || rLower.includes("schalotte") || rLower.includes("lauch")) &&
    !rLower.includes("pulver") &&
    !rLower.includes("granulat") &&
    !rLower.includes("röst");
  const pIsOnionSpice =
    pLower.includes("zwiebel") &&
    (pLower.includes("pulver") || pLower.includes("granulat") || pLower.includes("röst") || pKind === "spice");
  if (rIsOnionFresh && pIsOnionSpice) return false;

  // Chili (Fresh vs Powder/Flakes/Cayenne)
  const rIsChiliFresh =
    (rLower.includes("chili") || rLower.includes("peperoni")) &&
    !rLower.includes("pulver") &&
    !rLower.includes("flocken") &&
    !rLower.includes("cayenne");
  const pIsChiliSpice =
    (pLower.includes("chili") || pLower.includes("cayenne")) &&
    (pLower.includes("pulver") || pLower.includes("flocken") || pLower.includes("cayenne") || pKind === "spice");
  if (rIsChiliFresh && pIsChiliSpice) return false;

  // Tomato (Fresh vs Paste/Dried)
  const rIsTomatoFresh =
    rLower.includes("tomate") && !rLower.includes("mark") && !rLower.includes("getrocknet") && !rLower.includes("paste");
  const pIsTomatoPasteOrDried =
    pLower.includes("tomate") && (pLower.includes("mark") || pLower.includes("getrocknet") || pLower.includes("paste"));
  if (rIsTomatoFresh && pIsTomatoPasteOrDried) return false;

  return true;
}

/**
 * Returns a visible badge label "Gemüse" or "Gewürz" for ambiguous foods that could be confused.
 */
export function getAmbiguousIngredientTag(
  name: string,
  unit?: string,
  category?: string
): "Gemüse" | "Gewürz" | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const kind = getIngredientKind(name, unit, category);

  const isAmbiguous =
    lower.includes("paprika") ||
    lower.includes("knoblauch") ||
    lower.includes("zwiebel") ||
    lower.includes("chili") ||
    lower.includes("ingwer") ||
    lower.includes("tomate") ||
    lower.includes("curry") ||
    lower.includes("kümmel");

  if (!isAmbiguous) return null;
  if (kind === "vegetable") return "Gemüse";
  if (kind === "spice") return "Gewürz";
  return null;
}

// Culinary equivalence groups: Items in the same array can substitute for one another
const EQUIVALENCE_GROUPS: string[][] = [
  // Fresh tomatoes (Vegetables)
  ["kirschtomate", "kirschtomaten", "cherrytomate", "cherrytomaten", "cocktailtomate", "cocktailtomaten", "rispentomate", "rispentomaten", "strauchtomate", "strauchtomaten", "tomate", "tomaten", "cherry-kirschtomaten"],
  // Canned / Processed tomatoes
  ["gehackte tomaten", "passierte tomaten", "dosentomaten", "stückige tomaten", "polpa", "tomatensauce", "tomatenmark", "pelati"],
  // Cooking oils
  ["öl", "speiseöl", "pflanzenöl", "bratöl", "frittieröl", "olivenöl", "sonnenblumenöl", "rapsöl", "keimöl", "sesamöl", "distelöl", "kokosöl", "erdnussöl"],
  // Butter & Margarine
  ["butter", "margarine", "pflanzenbutter", "butterreinfett", "markenbutter", "süßrahmbutter", "sauerrahmbutter"],
  // Mayonnaise & Remoulade
  ["mayo", "mayonnaise", "salatmayo", "salatmayonnaise", "remoulade", "aioli", "miracel whip", "pommes-sauce", "pommessauce", "trüffelmayo"],
  // Fresh Onions & Alliums (Vegetables)
  ["zwiebel", "zwiebeln", "rote zwiebel", "rote zwiebeln", "gemüsezwiebel", "gemüsezwiebeln", "schalotte", "schalotten", "frühlingszwiebel", "frühlingszwiebeln", "lauch", "porree"],
  // Onion Spices & Processed
  ["zwiebelpulver", "zwiebelgranulat", "getrocknete zwiebeln"],
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
  // Fresh Paprika (Vegetable)
  ["paprika", "rote paprika", "gelbe paprika", "grüne paprika", "spitzpaprika", "paprikaschote", "paprikaschoten", "gemüsepaprika", "paprika rot", "paprika gelb", "paprika grün"],
  // Paprika Spices (Spice/Powder)
  ["paprikapulver", "paprika edelsüß", "paprika rosenscharf", "paprikapulver edelsüß", "paprika geräuchert", "pimentón", "paprikapulver scharf", "paprika scharf"],
  // Fresh Garlic (Vegetable)
  ["knoblauch", "knoblauchzehe", "knoblauchzehen", "frischer knoblauch", "knoblauchknolle"],
  // Garlic Spices (Spice/Powder)
  ["knoblauchpulver", "knoblauchgranulat"],
  // Fresh Chili (Vegetable)
  ["chili", "chilischote", "chilischoten", "rote chili", "grüne chili", "peperoni", "frische chili"],
  // Chili Spices
  ["chiliflocken", "chilipulver", "cayennepfeffer"],
  // Herbs / Oregano
  ["oregano", "italienische kräuter", "kräuter der provence", "thymian", "basilikum", "rosmarin"],
  // Cumin
  ["kreuzkümmel", "cumin", "kumin"],
];

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
 * strict vegetable vs spice compatibility checks,
 * and user-configured alternative overrides.
 */
export function findMatchingPantryItem(
  ingredientName: string,
  pantry: Array<{ name: string; amount?: number; unit?: string; category?: string; isUnlimited?: boolean }>,
  recipeId?: string,
  recipeIngAmount?: string,
  recipe?: CatalogRecipe
): MatchedPantryResult | null {
  if (!ingredientName || !pantry || pantry.length === 0) return null;

  // 1. Check recipe.alternativeOverrides first (highest priority)
  const normIngName = normalizeIngredientName(ingredientName);
  const directOverride =
    (recipe as any)?.alternativeOverrides?.[ingredientName] ||
    (recipe as any)?.alternativeOverrides?.[normIngName];

  if (directOverride) {
    if (directOverride === "NONE" || directOverride === "missing") {
      return null;
    }
    const target = pantry.find(
      (p) =>
        normalizeIngredientName(p.name) === normalizeIngredientName(directOverride) ||
        p.name.toLowerCase().trim() === directOverride.toLowerCase().trim()
    );
    if (target) {
      return {
        pantryItem: target,
        matchedByAlternative: cleanAlternativeText(target.name),
        isAlternative: true,
      };
    }
  }

  // 2. Check user-configured override stored in localStorage / memory
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

  // 3. Water is always unlimited only if it is actually plain drinking/tap water
  if (isDrinkingWater(ingredientName)) {
    return {
      pantryItem: { name: "Leitungswasser", amount: 999999, unit: "ml", isUnlimited: true },
      matchedByAlternative: undefined,
      isAlternative: false,
    };
  }

  // 4. Split ingredient into alternatives if phrased with " oder ", " / ", " bzw. "
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

    // Generic spices or seasoning fallback: matches ONLY basic spices, NEVER fresh vegetables!
    if (
      candNorm === "gewürze" ||
      candNorm === "gewürz" ||
      candNorm === "gewürzmischung" ||
      candNorm === "kräuter & gewürze" ||
      candNorm === "kräuter und gewürze" ||
      candNorm === "trockengewürze"
    ) {
      const spiceItem = pantry.find((p) => {
        const pKind = getIngredientKind(p.name, p.unit, p.category);
        if (pKind === "vegetable") return false; // Strictly refuse fresh vegetables for "gewürze"
        const pNorm = normalizeIngredientName(p.name);
        return (
          pKind === "spice" ||
          pNorm.includes("salz") ||
          pNorm.includes("pfeffer") ||
          pNorm.includes("paprikapulver") ||
          pNorm.includes("gewürz") ||
          pNorm.includes("curry") ||
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

    // Direct / whole-word / compound match with strict category compatibility
    let matched = pantry.find((p) => {
      // Hard check: vegetable vs spice barrier
      if (!isCategoryCompatible({ name: candidate, amount: recipeIngAmount }, p)) {
        return false;
      }

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
        if (!isCategoryCompatible({ name: candidate, amount: recipeIngAmount }, p)) {
          return false;
        }
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
  pantry: Array<{ name: string; amount?: number; unit?: string; category?: string; isUnlimited?: boolean }>,
  servings: number
): RecipePantryBreakdown {
  const allIngredients = typeof recipe?.ingredientsList === "function"
    ? recipe.ingredientsList(servings)
    : getSafeIngredientsList(recipe, servings);

  const inStock: IngredientMatch[] = [];
  const missing: IngredientMatch[] = [];

  for (const ing of allIngredients) {
    const match = findMatchingPantryItem(ing.name, pantry, recipe?.id, ing.amount, recipe);
    const ingKind = getIngredientKind(ing.name, undefined, undefined, ing.amount);
    const ambTag = getAmbiguousIngredientTag(ing.name, undefined, undefined);

    const isSpice = isSpiceOrKitchenBasic(ing.name) || (match ? isSpiceOrKitchenBasic(match.pantryItem.name, (match.pantryItem as any).category) : false);

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
        kind: ingKind,
        ambiguousTag: ambTag,
        isSpice,
      });
    } else {
      missing.push({
        ...ing,
        kind: ingKind,
        ambiguousTag: ambTag,
        isSpice,
      });
    }
  }

  const matchPercentage =
    allIngredients.length > 0 ? Math.round((inStock.length / allIngredients.length) * 100) : 100;

  return { inStock, missing, all: allIngredients, matchPercentage };
}

/**
 * Parses numeric amount and trailing unit string from an ingredient spec like "150 g", "1.5 kg", "2 Stk."
 */
export function parseIngredientAmountAndUnit(amountStr: string | number): { amount: number; unit: string } {
  if (typeof amountStr === "number") {
    return { amount: amountStr, unit: "" };
  }
  const clean = String(amountStr || "").trim();
  const match = clean.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) {
    return { amount: 0, unit: "" };
  }
  const amount = parseFloat(match[1].replace(",", "."));
  const unit = match[2]?.trim() || "";
  return { amount, unit };
}

/**
 * Deducts recipe ingredient amounts from pantry inventory with safe unit conversions (kg <-> g, l <-> ml, EL/TL -> ml/g)
 * and protection for bulk packaging (Packung, Glas, Flasche, Dose).
 *
 * Example: 1 kg Reis minus 150 g -> 0.85 kg (instead of 0).
 */
export function deductIngredientFromPantryAmount(
  pantryAmount: number,
  pantryUnit: string = "",
  deductAmount: number,
  deductUnit: string = ""
): number {
  if (!deductAmount || deductAmount <= 0) return pantryAmount;
  if (!pantryAmount || pantryAmount <= 0) return 0;

  const pUnit = (pantryUnit || "").toLowerCase().trim();
  const dUnit = (deductUnit || "").toLowerCase().trim();

  // If units match directly or deductUnit is omitted
  if (pUnit === dUnit || !dUnit) {
    return Math.max(0, Number((pantryAmount - deductAmount).toFixed(3)));
  }

  // Normalized unit definitions
  const getMassGrams = (amount: number, unit: string): number | null => {
    switch (unit) {
      case "kg":
      case "kilogramm":
        return amount * 1000;
      case "g":
      case "gramm":
        return amount;
      case "mg":
      case "milligramm":
        return amount * 0.001;
      default:
        return null;
    }
  };

  const getVolumeMl = (amount: number, unit: string): number | null => {
    switch (unit) {
      case "l":
      case "liter":
        return amount * 1000;
      case "dl":
      case "deziliter":
        return amount * 100;
      case "cl":
      case "zentiliter":
        return amount * 10;
      case "ml":
      case "milliliter":
        return amount;
      default:
        return null;
    }
  };

  const isMassUnit = (u: string) => getMassGrams(1, u) !== null;
  const isVolumeUnit = (u: string) => getVolumeMl(1, u) !== null;

  const isEl = (u: string) => u === "el" || u === "esslöffel" || u === "essloeffel";
  const isTl = (u: string) => u === "tl" || u === "teelöffel" || u === "teeloeffel";
  const isPrise = (u: string) => u === "prise" || u === "prisen";
  const isBulkContainer = (u: string) =>
    u === "packung" ||
    u === "pkg." ||
    u === "pkg" ||
    u === "pck." ||
    u === "glas" ||
    u === "gläser" ||
    u === "glaeser" ||
    u === "dose" ||
    u === "dosen" ||
    u === "flasche" ||
    u === "flaschen" ||
    u === "fl.";

  const isPiece = (u: string) =>
    u === "stk" ||
    u === "stk." ||
    u === "st" ||
    u === "stück" ||
    u === "stueck" ||
    u === "portion" ||
    u === "portionen" ||
    u === "zehe" ||
    u === "zehen" ||
    u === "knolle" ||
    u === "knollen" ||
    u === "bund" ||
    u === "stange" ||
    u === "stangen" ||
    u === "scheibe" ||
    u === "scheiben" ||
    u === "blatt" ||
    u === "blätter" ||
    u === "zweig" ||
    u === "zweige";

  // Bulk containers: If pantry unit is Packung, Glas, Dose, Flasche without exact weight,
  // do NOT deduct guessed percentages when recipes ask for grams or ml. Preserve pantry amount!
  if (isBulkContainer(pUnit) && !isBulkContainer(dUnit)) {
    return pantryAmount;
  }

  // 1. Pure Mass conversion (kg, g, mg)
  const pMassGrams = getMassGrams(pantryAmount, pUnit);
  const dMassGrams = getMassGrams(deductAmount, dUnit);
  if (pMassGrams !== null && dMassGrams !== null) {
    const remainingGrams = Math.max(0, pMassGrams - dMassGrams);
    if (pUnit === "kg" || pUnit === "kilogramm") {
      return Number((remainingGrams / 1000).toFixed(4));
    }
    if (pUnit === "mg" || pUnit === "milligramm") {
      return Number((remainingGrams * 1000).toFixed(2));
    }
    return Number(remainingGrams.toFixed(3));
  }

  // 2. Pure Volume conversion (l, dl, cl, ml)
  const pVolumeMl = getVolumeMl(pantryAmount, pUnit);
  const dVolumeMl = getVolumeMl(deductAmount, dUnit);
  if (pVolumeMl !== null && dVolumeMl !== null) {
    const remainingMl = Math.max(0, pVolumeMl - dVolumeMl);
    if (pUnit === "l" || pUnit === "liter") {
      return Number((remainingMl / 1000).toFixed(4));
    }
    if (pUnit === "dl" || pUnit === "deziliter") {
      return Number((remainingMl / 100).toFixed(3));
    }
    if (pUnit === "cl" || pUnit === "zentiliter") {
      return Number((remainingMl / 10).toFixed(3));
    }
    return Number(remainingMl.toFixed(3));
  }

  // 3. Spoons / Prise to mass or volume
  let spoonEquivalent = 0;
  if (isEl(dUnit)) {
    spoonEquivalent = deductAmount * 15; // 15g or 15ml
  } else if (isTl(dUnit)) {
    spoonEquivalent = deductAmount * 5; // 5g or 5ml
  } else if (isPrise(dUnit)) {
    spoonEquivalent = deductAmount * 1; // 1g or 1ml
  }

  if (spoonEquivalent > 0) {
    if (pMassGrams !== null) {
      const remainingGrams = Math.max(0, pMassGrams - spoonEquivalent);
      if (pUnit === "kg" || pUnit === "kilogramm") {
        return Number((remainingGrams / 1000).toFixed(4));
      }
      return Number(remainingGrams.toFixed(3));
    }
    if (pVolumeMl !== null) {
      const remainingMl = Math.max(0, pVolumeMl - spoonEquivalent);
      if (pUnit === "l" || pUnit === "liter") {
        return Number((remainingMl / 1000).toFixed(4));
      }
      return Number(remainingMl.toFixed(3));
    }
  }

  // 4. Piece vs Piece
  if (isPiece(pUnit) && isPiece(dUnit)) {
    return Math.max(0, Number((pantryAmount - deductAmount).toFixed(3)));
  }

  // 5. Incompatible dimensions check (Mass vs Volume, Piece vs Mass/Volume)
  if (
    (isMassUnit(pUnit) && isVolumeUnit(dUnit)) ||
    (isVolumeUnit(pUnit) && isMassUnit(dUnit)) ||
    (isPiece(pUnit) && (isMassUnit(dUnit) || isVolumeUnit(dUnit))) ||
    ((isMassUnit(pUnit) || isVolumeUnit(pUnit)) && isPiece(dUnit))
  ) {
    return pantryAmount;
  }

  // If neither unit is known or recognized as compatible, preserve pantryAmount safely
  return pantryAmount;
}



