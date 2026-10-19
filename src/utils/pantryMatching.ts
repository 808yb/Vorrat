import { type CatalogRecipe } from "../data/recipeCatalog";
import { getSafeIngredientsList } from "./recipeHelpers";

export interface IngredientMatch {
  name: string;
  amount: string;
  optional?: boolean;
  matchedByAlternative?: string;
}

export interface RecipePantryBreakdown {
  inStock: IngredientMatch[];
  missing: IngredientMatch[];
  all: IngredientMatch[];
  matchPercentage: number;
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

export interface MatchedPantryResult {
  pantryItem: { name: string; amount?: number; unit?: string; isUnlimited?: boolean };
  matchedByAlternative?: string;
}

/**
 * Finds the matching pantry item for any recipe ingredient,
 * intelligently supporting alternatives (e.g. "Butter oder Öl", "Milch oder Wasser")
 * and culinary equivalents (e.g. Sonnenblumenöl <-> Öl, Kirschtomaten <-> Cherrytomaten).
 */
export function findMatchingPantryItem(
  ingredientName: string,
  pantry: Array<{ name: string; amount?: number; unit?: string; isUnlimited?: boolean }>
): MatchedPantryResult | null {
  if (!ingredientName || !pantry || pantry.length === 0) return null;

  const ingLower = ingredientName.toLowerCase();

  // Water is always unlimited
  if (ingLower.includes("wasser") || ingLower.includes("water") || ingLower.includes("leitung")) {
    return {
      pantryItem: { name: "Leitungswasser", amount: 999999, unit: "ml", isUnlimited: true },
      matchedByAlternative: undefined,
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

    // Check if candidate is water
    if (candNorm.includes("wasser") || candNorm.includes("water") || candNorm.includes("leitung")) {
      return {
        pantryItem: { name: "Leitungswasser", amount: 999999, unit: "ml", isUnlimited: true },
        matchedByAlternative: undefined,
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
          matchedByAlternative: spiceItem.name,
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
      return {
        pantryItem: matched,
        matchedByAlternative: !isExact ? matched.name : undefined,
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
    const match = findMatchingPantryItem(ing.name, pantry);

    if (match) {
      inStock.push({
        ...ing,
        matchedByAlternative: match.matchedByAlternative,
      });
    } else {
      missing.push(ing);
    }
  }

  const matchPercentage =
    allIngredients.length > 0 ? Math.round((inStock.length / allIngredients.length) * 100) : 100;

  return { inStock, missing, all: allIngredients, matchPercentage };
}
