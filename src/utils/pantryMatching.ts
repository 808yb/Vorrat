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
  ["kirschtomate", "kirschtomaten", "cherrytomate", "cherrytomaten", "cocktailtomate", "cocktailtomaten", "rispentomate", "rispentomaten", "strauchtomate", "strauchtomaten", "tomate", "tomaten"],
  // Canned / Processed tomatoes
  ["gehackte tomaten", "passierte tomaten", "dosentomaten", "stückige tomaten", "polpa", "tomatensauce", "tomatenmark", "pelati"],
  // Cooking oils
  ["olivenöl", "sonnenblumenöl", "rapsöl", "pflanzenöl", "bratöl", "speiseöl", "keimöl", "sesamöl"],
  // Butter & Margarine
  ["butter", "margarine", "pflanzenbutter", "butterreinfett"],
  // Onions & Alliums
  ["zwiebel", "zwiebeln", "schalotte", "schalotten", "frühlingszwiebel", "frühlingszwiebeln", "lauch", "porree", "gemüsezwiebel", "rote zwiebel"],
  // Milk & Plant milk
  ["milch", "hafermilch", "sojamilch", "mandelmilch", "kuhmilch", "vollmilch", "fettarme milch"],
  // Cream / Sahne
  ["sahne", "schlagsahne", "kochcreme", "hafersahne", "sojasahne", "creme fraiche", "crème fraîche", "schmand", "sauerrahm"],
  // Hard cheese / Parmesan
  ["parmesan", "grana padano", "pecorino", "hartkäse"],
  // Grated / Melting cheese
  ["geriebener käse", "streukäse", "gouda", "mozzarella", "pizzakäse", "emmentaler", "cheddar"],
  // Rice varieties
  ["basmatireis", "jasminreis", "langkornreis", "reis", "parboiled reis", "naturreis", "sushi-reis"],
  // Pasta varieties
  ["pasta", "nudeln", "spaghetti", "penne", "fusilli", "tagliatelle", "macaroni", "rigatoni"],
  // Minced meat
  ["hackfleisch", "rinderhack", "gemischtes hack", "tatar", "hack"],
  // Poultry
  ["hähnchen", "hähnchenbrust", "hähnchenbrustfilet", "huhn", "geflügel", "putenbrust", "pute"],
  // Sweetener / Sugar
  ["zucker", "rohrzucker", "brauner zucker", "puderzucker", "agavendicksaft", "ahornsirup", "honig"],
  // Flour
  ["mehl", "weizenmehl", "dinkelmehl"],
  // Vinegar
  ["essig", "balsamico", "aceto balsamico", "weißweinessig", "apfelessig", "rotweinessig"],
  // Soy sauce
  ["sojasauce", "sojasoße", "shoyu", "tamari"],
  // Eggs
  ["ei", "eier", "bio eier", "hühnerei", "hühnereier"],
];

function areCulinaryEquivalents(ingA: string, ingB: string): boolean {
  for (const group of EQUIVALENCE_GROUPS) {
    const hasA = group.some((item) => ingA.includes(item) || item.includes(ingA));
    const hasB = group.some((item) => ingB.includes(item) || item.includes(ingB));
    if (hasA && hasB) {
      return true;
    }
  }
  return false;
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

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/bio\s+/g, "")
      .replace(/tk\s*[-]?/g, "")
      .replace(/frisch[e|er|es]?\s+/g, "")
      .replace(/kalt[e|er|es]?\s+/g, "")
      .replace(/warme[s]?\s+/g, "")
      .replace(/fein[e|er|es]?\s+/g, "")
      .replace(/reine[s]?\s+/g, "")
      .replace(/geröstete[s]?\s+/g, "")
      .replace(/stark[e|er|es]?\s+/g, "")
      .replace(/soße/g, "sauce")
      .replace(/frühlingszwiebeln/g, "frühlingszwiebel")
      .trim();

  for (const ing of allIngredients) {
    const ingNorm = normalize(ing.name);

    // 1. Direct or substring matching
    let matchedPantry = pantry.find((p) => {
      const pNorm = normalize(p.name);
      if (pNorm === ingNorm) return true;
      if (ingNorm.length >= 3 && pNorm.includes(ingNorm)) return true;
      if (pNorm.length >= 3 && ingNorm.includes(pNorm)) return true;
      return false;
    });

    // 2. Smart culinary equivalence matching (e.g. Cherrytomaten <-> Kirschtomaten, Olivenöl <-> Sonnenblumenöl)
    if (!matchedPantry) {
      matchedPantry = pantry.find((p) => {
        const pNorm = normalize(p.name);
        return areCulinaryEquivalents(ingNorm, pNorm);
      });
    }

    if (matchedPantry) {
      inStock.push({
        ...ing,
        matchedByAlternative:
          normalize(matchedPantry.name) !== ingNorm ? matchedPantry.name : undefined,
      });
    } else {
      missing.push(ing);
    }
  }

  const matchPercentage =
    allIngredients.length > 0 ? Math.round((inStock.length / allIngredients.length) * 100) : 100;

  return { inStock, missing, all: allIngredients, matchPercentage };
}
