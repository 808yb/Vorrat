import { callGeminiProxy, extractTextFromGeminiResponse } from './geminiProxy';
import { type CatalogRecipe, type RecipeStep, type RecipeCategory } from '../data/recipeCatalog';
import { findMatchingPantryItem } from './pantryMatching';
import { decomposeCompositeIngredients, getRecipeCategory } from './recipeHelpers';
import { STORAGE_KEYS } from '../constants/storage';

// High-resolution food images from Unsplash (matching common dishes)
export const FOOD_IMAGE_PRESETS: Record<string, string> = {
  calamarata: "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80",
  kirschtomate: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80",
  kirschtomaten: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80",
  cherrytomate: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80",
  cherrytomaten: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80",
  frischkäse: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80",
  geschnetzeltes: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  primavera: "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80",
  asia: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
  kimbap: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80",
  gimbap: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80",
  mochi: "https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=800&q=80",
  bibimbap: "https://images.unsplash.com/photo-1553163147-622ab57be1c7?auto=format&fit=crop&w=800&q=80",
  gyoza: "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=800&q=80",
  bao: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80",
  tiramisu: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80",
  dessert: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
  kuchen: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
  pancake: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=800&q=80",
  pfannkuchen: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=800&q=80",
  lasagne: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=800&q=80",
  ramen: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
  nudel: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
  "fried rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80",
  gebratener: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80",
  bowl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
  teriyaki: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
  omelett: "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=800&q=80",
  rührei: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80",
  penne: "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80",
  spaghetti: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
  bolognese: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
  alfredo: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80",
  carbonara: "https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=800&q=80",
  curry: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=800&q=80",
  wok: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
  pfanne: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
  hafer: "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?auto=format&fit=crop&w=800&q=80",
  porridge: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=800&q=80",
  supp: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80",
  hähnchen: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80",
  huhn: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80",
  chicken: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80",
  geflügel: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80",
  fleisch: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  rind: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
  hackfleisch: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
  schnitzel: "https://images.unsplash.com/photo-1599921841143-819065a55cc6?auto=format&fit=crop&w=800&q=80",
  speck: "https://images.unsplash.com/photo-1528607929212-2636ec44253e?auto=format&fit=crop&w=800&q=80",
  salat: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
  pizza: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
  tacos: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80",
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  shakshuka: "https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=800&q=80",
  udon: "https://images.unsplash.com/photo-1618841557871-b4664fbf0cb3?auto=format&fit=crop&w=800&q=80",
  sushi: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80",
  reis: "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=800&q=80",
};

export function resolveRecipeFoodImage(title: string, keywords?: string): string {
  const query = `${title || ""} ${keywords || ""}`.toLowerCase();
  for (const [key, url] of Object.entries(FOOD_IMAGE_PRESETS)) {
    if (query.includes(key)) {
      return url;
    }
  }
  // Delicious versatile gourmet food photography default
  return "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80";
}

export interface RawGeminiIngredient {
  name: string;
  baseAmountPerPortion: number;
  unit: string;
  optional?: boolean;
}

interface RawGeminiRecipe {
  title: string;
  subtitle: string;
  category?: RecipeCategory;
  time: string;
  difficulty: "Einfach" | "Mittel" | "Super Einfach";
  baseCal: number;
  baseProt: number;
  baseCarb: number;
  baseCost: number;
  chefTip: string;
  imageUrl?: string;
  imageKeywords?: string;
  tone?: "mint" | "sage" | "amber";
  ingredients: RawGeminiIngredient[];
  steps: Array<{
    stepNumber: number;
    title: string;
    instruction: string;
    duration?: string;
    tag?: string;
  }>;
}

/**
 * Intelligently extracts authentic ingredients from dish title & subtitle
 * if an AI recipe was saved without explicit rawIngredients array.
 */
export function extractIngredientsFromDishText(title: string, subtitle: string = ""): RawGeminiIngredient[] {
  const text = `${title} ${subtitle}`.toLowerCase();
  const list: RawGeminiIngredient[] = [];

  // Pasta / Calamarata / Nudeln / Reis
  if (text.includes("calamarata")) {
    list.push({ name: "Calamarata Pasta", baseAmountPerPortion: 100, unit: "g" });
  } else if (text.includes("penne")) {
    list.push({ name: "Penne Rigate", baseAmountPerPortion: 100, unit: "g" });
  } else if (text.includes("spaghetti")) {
    list.push({ name: "Spaghetti", baseAmountPerPortion: 100, unit: "g" });
  } else if (text.includes("pasta") || text.includes("nudel") || text.includes("ramen")) {
    list.push({ name: "Pasta / Nudeln", baseAmountPerPortion: 100, unit: "g" });
  } else if (text.includes("reis") || text.includes("rice")) {
    list.push({ name: "Basmati Reis", baseAmountPerPortion: 80, unit: "g" });
  }

  // Protein: Chicken / Hähnchen / Beef / Egg
  if (text.includes("hähnchen") || text.includes("chicken") || text.includes("huhn") || text.includes("geflügel")) {
    list.push({ name: "Hähnchenbrustfilet", baseAmountPerPortion: 125, unit: "g" });
  } else if (text.includes("rind") || text.includes("geschnetzelt") || text.includes("fleisch")) {
    list.push({ name: "Rindfleischstreifen", baseAmountPerPortion: 125, unit: "g" });
  } else if (text.includes("hackfleisch") || text.includes("bolognese")) {
    list.push({ name: "Rinderhackfleisch", baseAmountPerPortion: 120, unit: "g" });
  } else if (text.includes("ei") || text.includes("eier") || text.includes("shakshuka") || text.includes("omelett") || text.includes("rührei")) {
    list.push({ name: "Bio Eier", baseAmountPerPortion: 2, unit: "Stk." });
  }

  // Veggies & Sauces
  if (text.includes("kirschtomate") || text.includes("cherrytomate") || text.includes("tomate")) {
    list.push({ name: "Cherry-Kirschtomaten", baseAmountPerPortion: 100, unit: "g" });
  }
  if (text.includes("frischkäse")) {
    list.push({ name: "Frischkäse (Kräuter)", baseAmountPerPortion: 60, unit: "g" });
  } else if (text.includes("sahne") || text.includes("cremig") || text.includes("alfredo")) {
    list.push({ name: "Kochsahne / Frischkäse", baseAmountPerPortion: 80, unit: "ml" });
  }
  if (text.includes("erbsen") || text.includes("primavera")) {
    list.push({ name: "Junge Erbsen (TK)", baseAmountPerPortion: 50, unit: "g" });
  }
  if (text.includes("soja") || text.includes("teriyaki") || text.includes("asia") || text.includes("wok")) {
    list.push({ name: "Sojasauce", baseAmountPerPortion: 15, unit: "ml" });
  }
  if (text.includes("zwiebel") || text.includes("lauch") || text.includes("frühlingszwiebel")) {
    list.push({ name: "Frühlingszwiebeln / Zwiebel", baseAmountPerPortion: 1, unit: "Stk." });
  }

  // Fallbacks if nothing matched
  if (list.length === 0) {
    list.push(
      { name: "Hauptzutat nach Rezept", baseAmountPerPortion: 100, unit: "g" },
      { name: "Sauce / Würzöl", baseAmountPerPortion: 30, unit: "ml" },
      { name: "Frische Kräuter & Gewürze", baseAmountPerPortion: 1, unit: "Prise", optional: true }
    );
  } else {
    list.push({ name: "Olivenöl / Gewürze", baseAmountPerPortion: 10, unit: "ml", optional: true });
  }

  return list;
}

/**
 * Rehydrates a single custom recipe JSON object restoring callable methods, images, and steps.
 */
export function rehydrateCustomRecipe(item: any): CatalogRecipe {
  const title = item.title || "Leckeres Rezept";
  let rawIngredients: RawGeminiIngredient[] = Array.isArray(item.rawIngredients) && item.rawIngredients.length > 0
    ? item.rawIngredients
    : Array.isArray(item.ingredients) && item.ingredients.length > 0
    ? item.ingredients.map((ing: any) => ({
        name: ing.name || String(ing),
        baseAmountPerPortion: Number(ing.baseAmountPerPortion) || 100,
        unit: ing.unit || "g",
        optional: Boolean(ing.optional),
      }))
    : typeof item.ingredientsList === "function"
    ? (() => {
        try {
          const list = item.ingredientsList(1);
          if (Array.isArray(list) && list.length > 0) {
            return list.map((ing: any) => {
              const match = String(ing.amount || "").trim().match(/^([\d.,]+)\s*(.*)$/);
              const amountNum = match ? parseFloat(match[1].replace(",", ".")) : 100;
              const unitStr = match && match[2] ? match[2].trim() : "g";
              return {
                name: ing.name,
                baseAmountPerPortion: isNaN(amountNum) ? 100 : amountNum,
                unit: unitStr || "g",
                optional: Boolean(ing.optional),
              };
            });
          }
        } catch {}
        return [];
      })()
    : [];

  // If ingredients are still empty, reconstruct from title and subtitle
  if (rawIngredients.length === 0) {
    rawIngredients = extractIngredientsFromDishText(title, item.subtitle || "");
  }

  const verifiedImg = typeof item.verifiedImageUrl === "string" && item.verifiedImageUrl.startsWith("http") && !item.verifiedImageUrl.includes("example.com")
    ? item.verifiedImageUrl.trim()
    : "";
  const rawImage = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  const validCandidate = verifiedImg || (rawImage && /^(?:https?:\/\/|data:image\/)/i.test(rawImage) && !rawImage.includes("example.com") ? rawImage : "");
  const imageUrl = validCandidate || resolveRecipeFoodImage(title, item.imageKeywords);

  const steps: RecipeStep[] =
    Array.isArray(item.steps) && item.steps.length > 0
      ? item.steps.map((st: any, idx: number) => ({
          stepNumber: Number(st.stepNumber) || idx + 1,
          title: st.title || `Schritt ${idx + 1}`,
          instruction: st.instruction || "Zutaten wie gewünscht zubereiten.",
          duration: st.duration || "4 Min.",
          tag: st.tag || "Kochen",
        }))
      : [
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

  return {
    ...item,
    id: item.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    subtitle: item.subtitle || "Frisch kreiert mit deiner AI",
    category: item.category || getRecipeCategory({ title, subtitle: item.subtitle, mealType: item.mealType }),
    source: item.source || (item.sourceUrl ? "Importiert" : "KI-Rezept"),
    sourceUrl: item.sourceUrl && /^https?:\/\//i.test(item.sourceUrl) && !item.sourceUrl.includes("example.com") ? item.sourceUrl : undefined,
    videoUrl: item.videoUrl && /^https?:\/\//i.test(item.videoUrl) && !item.videoUrl.includes("example.com") ? item.videoUrl : undefined,
    time: item.time || "20 Min.",
    difficulty: item.difficulty || "Einfach",
    baseCal: Math.round(Number(item.baseCal) || 400),
    baseProt: Math.round(Number(item.baseProt) || 18),
    baseCarb: Math.round(Number(item.baseCarb) || 45),
    baseCost: Number(item.baseCost) || 2.5,
    tone: item.tone || "mint",
    chefTip: item.chefTip || "Frisch zubereitet schmeckt es am besten!",
    imageUrl,
    isAiGenerated: true,
    matchScore: Number(item.matchScore) || 95,
    optional: item.optional || "Nach Wunsch anpassen",
    rawIngredients,
    ingredients: rawIngredients,
    steps,
    available: (s: number) => {
      if (rawIngredients.length > 0) {
        return rawIngredients
          .slice(0, 3)
          .map((ing) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
          .join(" · ");
      }
      return "Zutaten vorhanden";
    },
    ingredientsList: (s: number) => {
      if (rawIngredients.length > 0) {
        return rawIngredients.map((ing) => ({
          name: ing.name,
          amount: `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit}`,
          optional: Boolean(ing.optional),
        }));
      }
      return extractIngredientsFromDishText(title, item.subtitle || "").map((ing) => ({
        name: ing.name,
        amount: `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit}`,
        optional: Boolean(ing.optional),
      }));
    },
  };
}

export function isFakeGeneratedRecipe(item: any): boolean {
  const t = String(item?.title || "").trim();
  return (
    t.startsWith("Cremige One-Pot Pasta nach ") ||
    t.startsWith("Knusprige Vital-Bowl nach ") ||
    t.startsWith("Warmer Apfel-Zimt-Crumble nach ")
  );
}

export function isTitleSimilar(a: string, b: string): boolean {
  const normA = a.toLowerCase().replace(/[^a-z0-9äöüß]/gi, " ").replace(/\s+/g, " ").trim();
  const normB = b.toLowerCase().replace(/[^a-z0-9äöüß]/gi, " ").replace(/\s+/g, " ").trim();
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    if (minLen / maxLen >= 0.8) return true;
  }

  const wordsA = new Set(normA.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(normB.split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return false;

  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }
  const similarity = (2 * common) / (wordsA.size + wordsB.size);
  return similarity >= 0.85;
}

export function getStoredCustomRecipes(): CatalogRecipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_RECIPES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Automatically purge old fake fallback recipes
    const cleaned = parsed.filter((item) => !isFakeGeneratedRecipe(item));
    if (cleaned.length !== parsed.length) {
      try {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(cleaned));
      } catch {}
    }

    return cleaned.map(rehydrateCustomRecipe);
  } catch {
    return [];
  }
}

export function saveCustomRecipe(recipe: CatalogRecipe, rawIngredients: RawGeminiIngredient[]): void {
  try {
    const existing = getStoredCustomRecipes();
    const serializable = {
      ...recipe,
      rawIngredients,
      // Ensure functions are omitted in JSON without errors
    };
    const next = [serializable, ...existing.filter((r) => r.id !== recipe.id)];
    localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(next));
  } catch (err) {
    console.error("Fehler beim Speichern des Rezepts im localStorage:", err);
  }
}

/**
 * Löscht ein benutzerdefiniertes / gescraptes Rezept permanent aus dem localStorage.
 */
export function deleteStoredCustomRecipe(recipeId: string): CatalogRecipe[] {
  try {
    const existing = getStoredCustomRecipes();
    const next = existing.filter((r) => r.id !== recipeId);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(next));
    markRecipeAsDeleted(recipeId);
    return next;
  } catch (err) {
    console.error("Fehler beim Löschen des Rezepts im localStorage:", err);
    return [];
  }
}

/**
 * Gibt alle IDs von Rezepten zurück, die vom Nutzer manuell gelöscht wurden.
 */
export function getDeletedRecipeIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_RECIPES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Merkt sich die ID eines gelöschten Rezepts dauerhaft im localStorage.
 */
export function markRecipeAsDeleted(recipeId: string): void {
  try {
    const current = getDeletedRecipeIds();
    if (!current.includes(recipeId)) {
      const next = [...current, recipeId];
      localStorage.setItem(STORAGE_KEYS.DELETED_RECIPES, JSON.stringify(next));
    }
  } catch {}
}

/**
 * Returns the local dev API key (VITE_GEMINI_API_KEY) for guard checks.
 * In production the key lives on the server – this returns "" there.
 * Real API calls must go through callGeminiProxy().
 */
export function getGeminiApiKey(): string {
  if (!import.meta.env?.DEV) return "proxy";
  const raw = (
    import.meta.env?.VITE_GEMINI_API_KEY ||
    (import.meta.env as any)?.GEMINI_API_KEY ||
    ""
  ).trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1).trim();
  }
  return raw || "proxy";
}

export async function generateRecipeWithGemini(
  userQuery: string,
  pantry: Array<{ name: string; amount: number; unit: string; isUnlimited?: boolean }>,
  _servings: number = 2
): Promise<CatalogRecipe> {
  const apiKey = getGeminiApiKey();

  const pantrySummary = pantry
    .map((p) => `- ${p.name}: ${p.isUnlimited ? "unbegrenzt" : `${p.amount} ${p.unit}`}`)
    .join("\n");

  const prompt = `Du bist ein erfahrener Chefkoch und smarter Ernährungsberater in einer Anti-Food-Waste App.
Der Nutzer möchte ein Rezept erstellen oder suchen mit folgendem Wunsch: "${userQuery}".

Der aktuelle Vorrat des Nutzers:
${pantrySummary}

Erstelle ein genau darauf abgestimmtes, köstliches Rezept auf Deutsch.
Regeln:
1. Wenn der Nutzer nach einem bestimmten Gericht sucht (z. B. "Tiramisu", "Pizza", "Lasagne", "Pancakes", "Sushi", "Ramen", "Burger"):
   Erstelle IMMER das ECHTE, klassische Original-Rezept für dieses Gericht!
   Verbiege das Gericht NIEMALS unpassend auf den Vorrat (z. B. auf keinen Fall Reis oder Gemüse in Tiramisu oder Pfannkuchen mischen!).
2. Nutze vorhandene Zutaten aus dem Vorrat. Erkenne dabei intelligente kulinarische Alternativen & Synonyme:
   - Tomaten: Cherrytomaten, Kirschtomaten, Cocktailtomaten und Tomaten sind austauschbar. Ebenso gehackte Tomaten, passierte Tomaten und Dosentomaten.
   - Speiseöle: Olivenöl, Sonnenblumenöl, Rapsöl und Pflanzenöl können flexibel als Brat- oder Kochöl eingesetzt werden.
   - Zwiebeln: Zwiebeln, Schalotten und Frühlingszwiebeln können gegenseitig substituiert werden.
   - Milch: Kuhmilch, Hafermilch und Sojamilch sind austauschbar.
   - Käse: Gouda, Mozzarella und Reibekäse sind zum Überbacken austauschbar.
   Wenn eine solche Alternative im Vorrat liegt, verwende sie direkt im Rezept, statt die Zutat unnötig als fehlend einzustufen.
3. Essenzielle Hauptzutaten, die im Vorrat und bei Alternativen wirklich fehlen (z. B. Mascarpone & Löffelbiskuits bei Tiramisu), führe ehrlich auf, damit die App sie auf die Einkaufsliste setzen kann.
4. Nährwerte (baseCal, baseProt, baseCarb) und Kosten (baseCost) MÜSSEN EXAKT PRO 1 PORTION berechnet werden!
5. Führe 3 bis 5 präzise Zubereitungsschritte auf mit Zeitangaben.
6. Gib für jede Zutat die Basismenge pro 1 Portion als Zahl ('baseAmountPerPortion') und Einheit ('unit') an.
7. Gib 'imageKeywords' auf Englisch an (z. B. "tiramisu dessert mascarpone" oder "ramen noodles egg").
8. GEWÜRZE NIEMALS ZUSAMMENFASSEN: Jedes Gewürz muss ein einzelner Zutateneintrag im "ingredients"-Array sein (z. B. "Paprikapulver edelsüß", "Knoblauchpulver", "Salz", "Schwarzer Pfeffer"). NIEMALS "Gewürze (A, B, C)" oder "Salz & Pfeffer" als einen einzigen Eintrag ausgeben.
9. ERFINDE NIEMALS LINKS ODER URLS: Gib KEINE erfundenen Video-Links, Web-URLs, Quellen-Links oder Dummy-URLs im JSON aus. Alle Medien- und Video-Suchen werden von der App verlässlich und garantiert selbst generiert.

Antworte STRIKT als valides JSON nach diesem Schema (OHNE Markdown, kein \`\`\`json):
{
  "title": "Gerichtsname",
  "subtitle": "Knackige Kurzbeschreibung",
  "category": "Hauptgericht",
  "time": "z.B. 18 Min.",
  "difficulty": "Einfach",
  "baseCal": 450,
  "baseProt": 22,
  "baseCarb": 48,
  "baseCost": 2.20,
  "chefTip": "Hilfreicher Küchen-Tipp",
  "imageKeywords": "tiramisu dessert",
  "tone": "mint",
  "ingredients": [
    {
      "name": "Zutatenname",
      "baseAmountPerPortion": 100,
      "unit": "g",
      "optional": false
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Schritt-Titel",
      "instruction": "Anweisung...",
      "duration": "3 Min.",
      "tag": "Vorbereitung"
    }
  ]
}`;

function buildSmartFallbackRecipe(
  query: string,
  _pantry: Array<{ name: string; amount: number; unit: string; isUnlimited?: boolean }>
): RawGeminiRecipe {
  const q = query.toLowerCase();

  if (q.includes("kimbap") || q.includes("gimbap")) {
    return {
      title: "Authentisches Koreanisches Kimbap",
      subtitle: "Klassische Seetang-Reisrollen mit Karotten, Spinat, Ei & Sesamöl",
      time: "35 Min.",
      difficulty: "Mittel",
      baseCal: 430,
      baseProt: 15,
      baseCarb: 64,
      baseCost: 2.80,
      chefTip: "Die fertig gerollte Kimbap-Rolle mit reinem Sesamöl einpinseln und mit geröstetem Sesam bestreuen vor dem Schneiden.",
      imageKeywords: "kimbap korean sushi roll",
      tone: "mint",
      ingredients: [
        { name: "Kurzkornreis (Sushi-Reis)", baseAmountPerPortion: 80, unit: "g", optional: false },
        { name: "Nori-Algenblätter", baseAmountPerPortion: 1, unit: "Stk.", optional: false },
        { name: "Karotte", baseAmountPerPortion: 40, unit: "g", optional: false },
        { name: "Frischer Spinat", baseAmountPerPortion: 50, unit: "g", optional: false },
        { name: "Eingelegter Rettich (Danmuji)", baseAmountPerPortion: 30, unit: "g", optional: false },
        { name: "Eier", baseAmountPerPortion: 1, unit: "Stk.", optional: false },
        { name: "Geröstetes Sesamöl", baseAmountPerPortion: 5, unit: "ml", optional: false },
        { name: "Sesamsamen", baseAmountPerPortion: 5, unit: "g", optional: true },
      ],
      steps: [
        { stepNumber: 1, title: "Reis kochen & würzen", instruction: "Kurzkornreis gar dämpfen und noch warm mit etwas Sesamöl und einer Prise Salz locker vermengen.", duration: "18 Min.", tag: "Basis" },
        { stepNumber: 2, title: "Gemüse & Omelett vorbereiten", instruction: "Karotten in feine Streifen schneiden und kurz anbraten. Spinat blanchieren, ausdrücken und mit Sesamöl würzen. Ei zu einem flachen Omelett braten und in Streifen schneiden.", duration: "10 Min.", tag: "Prep" },
        { stepNumber: 3, title: "Kimbap rollen", instruction: "Ein Nori-Blatt auf die Bambusmatte legen. Den Reis gleichmäßig bis auf 2 cm Rand verteilen. Gemüsestreifen mittig anordnen und straff einrollen.", duration: "4 Min.", tag: "Rollen" },
        { stepNumber: 4, title: "Schneiden & anrichten", instruction: "Die Rolle mit feinem Sesamöl einreiben und mit einem scharfen, feuchten Messer in mundgerechte Scheiben schneiden.", duration: "3 Min.", tag: "Finish" },
      ],
    };
  }

  if (q.includes("mochi") || q.includes("daifuku")) {
    return {
      title: "Japanische Daifuku Mochi",
      subtitle: "Zarte, weiche Reiskuchen mit süßer roter Bohnenpaste (Anko)",
      time: "25 Min.",
      difficulty: "Mittel",
      baseCal: 260,
      baseProt: 5,
      baseCarb: 56,
      baseCost: 1.90,
      chefTip: "Großzügig mit Speisestärke arbeiten – Klebreisteig klebt extrem, lässt sich mit Stärke aber perfekt formen.",
      imageKeywords: "mochi daifuku japanese sweet dessert",
      tone: "mint",
      ingredients: [
        { name: "Klebreismehl (Shiratamako/Mochiko)", baseAmountPerPortion: 60, unit: "g", optional: false },
        { name: "Süße rote Bohnenpaste (Anko)", baseAmountPerPortion: 50, unit: "g", optional: false },
        { name: "Zucker", baseAmountPerPortion: 25, unit: "g", optional: false },
        { name: "Wasser", baseAmountPerPortion: 70, unit: "ml", optional: false },
        { name: "Speisestärke (zum Bestäuben)", baseAmountPerPortion: 20, unit: "g", optional: false },
      ],
      steps: [
        { stepNumber: 1, title: "Bohnenpaste portionieren", instruction: "Die rote Bohnenpaste in kleine, gleichmäßige Kugeln rollen und beiseitestellen.", duration: "4 Min.", tag: "Füllung" },
        { stepNumber: 2, title: "Klebreisteig garen", instruction: "Klebreismehl mit Zucker und Wasser glatt rühren. Abgedeckt in der Mikrowelle bei 800W ca. 2 Min. erhitzen, durchrühren, und nochmals 1 Min. erhitzen bis er glänzend und zäh ist.", duration: "5 Min.", tag: "Teig" },
        { stepNumber: 3, title: "Flachdrücken & teilen", instruction: "Arbeitsfläche dick mit Speisestärke bestreuen. Den heißen Teig daraufgeben, ebenfalls mit Stärke bestäuben und in flache Kreise teilen.", duration: "10 Min.", tag: "Formen" },
        { stepNumber: 4, title: "Füllen & verschließen", instruction: "Jeweils eine Bohnenkugel in die Mitte setzen, den Teig darüber vorsichtig verschließen und die Naht festdrücken.", duration: "6 Min.", tag: "Finish" },
      ],
    };
  }

  if (q.includes("tiramisu")) {
    return {
      title: "Klassisches Italienisches Tiramisu",
      subtitle: "Luftiges Schichtdessert mit Mascarpone, Espresso & Löffelbiskuits",
      time: "20 Min. + Kühlen",
      difficulty: "Einfach",
      baseCal: 420,
      baseProt: 8,
      baseCarb: 38,
      baseCost: 2.80,
      chefTip: "Die Löffelbiskuits nur ganz kurz (1 Sekunde) in den kalten Espresso tauchen, damit sie schön saftig bleiben und nicht zerfallen.",
      imageKeywords: "tiramisu dessert mascarpone",
      tone: "amber",
      ingredients: [
        { name: "Mascarpone", baseAmountPerPortion: 125, unit: "g", optional: false },
        { name: "Löffelbiskuits", baseAmountPerPortion: 50, unit: "g", optional: false },
        { name: "Espresso (stark)", baseAmountPerPortion: 60, unit: "ml", optional: false },
        { name: "Eier (frisch)", baseAmountPerPortion: 1, unit: "Stk.", optional: false },
        { name: "Zucker", baseAmountPerPortion: 30, unit: "g", optional: false },
        { name: "Kakaopulver", baseAmountPerPortion: 5, unit: "g", optional: true },
      ],
      steps: [
        { stepNumber: 1, title: "Espresso kochen", instruction: "Starken Espresso aufbrühen und vollständig abkühlen lassen.", duration: "5 Min.", tag: "Aroma" },
        { stepNumber: 2, title: "Mascarponecreme", instruction: "Eigelb mit Zucker cremig weiß aufschlagen, Mascarpone vorsichtig unterheben bis eine samtige Creme entsteht.", duration: "6 Min.", tag: "Creme" },
        { stepNumber: 3, title: "Schichten", instruction: "Löffelbiskuits kurz in kalten Espresso tauchen, in die Form schichten und mit Mascarponecreme bestreichen. Vorgang wiederholen.", duration: "5 Min.", tag: "Schichten" },
        { stepNumber: 4, title: "Kühlen & vollenden", instruction: "Mindestens 2 Stunden kalt stellen und vor dem Servieren mit feinem Kakaopulver bestäuben.", duration: "4 Min.", tag: "Finish" },
      ],
    };
  }

  if (q.includes("pancake") || q.includes("pfannkuchen")) {
    return {
      title: "Fluffige Buttermilch-Pancakes",
      subtitle: "Goldbraune, luftige Pfannkuchen mit Ahornsirup & Butter",
      time: "15 Min.",
      difficulty: "Super Einfach",
      baseCal: 380,
      baseProt: 11,
      baseCarb: 52,
      baseCost: 1.60,
      chefTip: "Den Teig nach dem Verrühren 5 Minuten ruhen lassen – so werden die Pancakes besonders dick und fluffig.",
      imageKeywords: "pancakes butter syrup",
      tone: "amber",
      ingredients: [
        { name: "Mehl", baseAmountPerPortion: 75, unit: "g", optional: false },
        { name: "Milch oder Buttermilch", baseAmountPerPortion: 100, unit: "ml", optional: false },
        { name: "Ei", baseAmountPerPortion: 1, unit: "Stk.", optional: false },
        { name: "Backpulver", baseAmountPerPortion: 3, unit: "g", optional: false },
        { name: "Butter", baseAmountPerPortion: 15, unit: "g", optional: false },
        { name: "Ahornsirup", baseAmountPerPortion: 20, unit: "ml", optional: true },
      ],
      steps: [
        { stepNumber: 1, title: "Teig anrühren", instruction: "Mehl mit Backpulver mischen. Milch, Ei und geschmolzene Butter kurz unterrühren.", duration: "4 Min.", tag: "Teig" },
        { stepNumber: 2, title: "Ausbacken", instruction: "In einer beschichteten Pfanne bei mittlerer Hitze von beiden Seiten goldbraun ausbacken.", duration: "8 Min.", tag: "Braten" },
        { stepNumber: 3, title: "Servieren", instruction: "Stapeln und warm mit Ahornsirup und einem Stückchen Butter servieren.", duration: "3 Min.", tag: "Genuss" },
      ],
    };
  }

  if (q.includes("lasagne")) {
    return {
      title: "Klassische Lasagne Al Forno",
      subtitle: "Herzhafte geschichtete Pasta mit Rinder-Ragù & cremiger Béchamel",
      time: "35 Min.",
      difficulty: "Mittel",
      baseCal: 580,
      baseProt: 32,
      baseCarb: 48,
      baseCost: 3.20,
      chefTip: "Die letzte Schicht Béchamel großzügig mit geriebenem Mozzarella bedecken für eine perfekte Kruste.",
      imageKeywords: "lasagne pasta bolognese",
      tone: "amber",
      ingredients: [
        { name: "Lasagneplatten", baseAmountPerPortion: 60, unit: "g", optional: false },
        { name: "Hackfleisch", baseAmountPerPortion: 120, unit: "g", optional: false },
        { name: "Tomatensauce", baseAmountPerPortion: 120, unit: "ml", optional: false },
        { name: "Béchamelsauce", baseAmountPerPortion: 80, unit: "ml", optional: false },
        { name: "Geriebener Käse", baseAmountPerPortion: 40, unit: "g", optional: false },
      ],
      steps: [
        { stepNumber: 1, title: "Ragù ansetzen", instruction: "Hackfleisch anbraten, würzen und mit Tomatensauce einköcheln.", duration: "10 Min.", tag: "Ragù" },
        { stepNumber: 2, title: "Schichten", instruction: "Abwechselnd Sauce, Lasagneplatten und Béchamel in die Form schichten.", duration: "5 Min.", tag: "Schichten" },
        { stepNumber: 3, title: "Überbacken", instruction: "Mit Käse bestreuen und im Ofen bei 200 °C goldbraun gratinieren.", duration: "20 Min.", tag: "Ofen" },
      ],
    };
  }

  if (q.includes("ramen") || q.includes("nudel") || q.includes("suppe")) {
    return {
      title: "Würzige Vorrats-Ramen mit Ei & Frühlingslauch",
      subtitle: "Japanische Nudelsuppe mit aromatischer Brühe & wachsweichem Ei",
      time: "15 Min.",
      difficulty: "Einfach",
      baseCal: 460,
      baseProt: 21,
      baseCarb: 54,
      baseCost: 2.30,
      chefTip: "Das Ei exakt 6,5 Minuten kochen und in Eiswasser abschrecken für ein cremiges Eigelb.",
      imageKeywords: "ramen noodles egg soup",
      tone: "mint",
      ingredients: [
        { name: "Ramen-Nudeln", baseAmountPerPortion: 90, unit: "g", optional: false },
        { name: "Eier", baseAmountPerPortion: 1, unit: "Stk.", optional: false },
        { name: "Sojasauce", baseAmountPerPortion: 20, unit: "ml", optional: false },
        { name: "Gemüsebrühe", baseAmountPerPortion: 350, unit: "ml", optional: false },
        { name: "Frühlingszwiebeln", baseAmountPerPortion: 20, unit: "g", optional: true },
        { name: "Sesamöl", baseAmountPerPortion: 5, unit: "ml", optional: true },
      ],
      steps: [
        { stepNumber: 1, title: "Brühe ansetzen", instruction: "Gemüsebrühe mit Sojasauce und einem Spritzer Sesamöl in einem Topf aufkochen.", duration: "4 Min.", tag: "Basis" },
        { stepNumber: 2, title: "Ei kochen", instruction: "Ei in kochendem Wasser ca. 6–7 Min. kochen, danach kalt abschrecken und pellen.", duration: "7 Min.", tag: "Protein" },
        { stepNumber: 3, title: "Nudeln garen", instruction: "Ramen-Nudeln direkt in die siedende Brühe geben und 3–4 Min. bissfest garen.", duration: "4 Min.", tag: "Hauptteil" },
        { stepNumber: 4, title: "Anrichten", instruction: "Nudeln und Brühe in eine Schale füllen, halbiertes Ei und geschnittene Frühlingszwiebeln auflegen.", duration: "2 Min.", tag: "Finish" },
      ],
    };
  }

  if (q.includes("curry") || q.includes("wok")) {
    return {
      title: "Cremiges Vorrats-Curry mit Reis",
      subtitle: "Aromatisches Gemüse-Curry mit Kokosmilch und Basmatireis",
      time: "20 Min.",
      difficulty: "Einfach",
      baseCal: 520,
      baseProt: 18,
      baseCarb: 62,
      baseCost: 2.60,
      chefTip: "Currypaste kurz im heißen Öl anrösten, um die ätherischen Aromen voll zu entfalten.",
      imageKeywords: "curry bowl rice",
      tone: "amber",
      ingredients: [
        { name: "Basmatireis", baseAmountPerPortion: 75, unit: "g", optional: false },
        { name: "Kokosmilch", baseAmountPerPortion: 150, unit: "ml", optional: false },
        { name: "Currypaste", baseAmountPerPortion: 15, unit: "g", optional: false },
        { name: "Gemüse (Karotten/Paprika)", baseAmountPerPortion: 120, unit: "g", optional: false },
        { name: "Koriander", baseAmountPerPortion: 5, unit: "g", optional: true },
      ],
      steps: [
        { stepNumber: 1, title: "Reis kochen", instruction: "Reis gründlich waschen und nach Packungsanleitung gar dämpfen.", duration: "12 Min.", tag: "Beilage" },
        { stepNumber: 2, title: "Curry anbraten", instruction: "Gemüse in mundgerechte Stücke schneiden und mit Currypaste kurz in etwas Öl anbraten.", duration: "4 Min.", tag: "Wok" },
        { stepNumber: 3, title: "Ablöschen & köcheln", instruction: "Mit Kokosmilch ablöschen und 6-8 Minuten sanft köcheln lassen.", duration: "8 Min.", tag: "Sauce" },
        { stepNumber: 4, title: "Servieren", instruction: "Reis mit warmem Curry anrichten und garnieren.", duration: "2 Min.", tag: "Finish" },
      ],
    };
  }

  if (q.includes("pasta") || q.includes("spaghetti") || q.includes("penne")) {
    return {
      title: "Mediterrane Pasta Al Gusto",
      subtitle: "Würzige Pasta mit aromatischem Knoblauch-Olivenöl-Sößchen",
      time: "14 Min.",
      difficulty: "Super Einfach",
      baseCal: 480,
      baseProt: 16,
      baseCarb: 68,
      baseCost: 1.90,
      chefTip: "Etwas Nudelkochwasser vor dem Abgießen aufheben – bindet die Sauce perfekt!",
      imageKeywords: "pasta spaghetti penne",
      tone: "sage",
      ingredients: [
        { name: "Pasta", baseAmountPerPortion: 100, unit: "g", optional: false },
        { name: "Olivenöl", baseAmountPerPortion: 15, unit: "ml", optional: false },
        { name: "Knoblauch", baseAmountPerPortion: 1, unit: "Zehe", optional: false },
        { name: "Geriebener Käse", baseAmountPerPortion: 25, unit: "g", optional: false },
        { name: "Chiliflocken", baseAmountPerPortion: 1, unit: "Prise", optional: true },
      ],
      steps: [
        { stepNumber: 1, title: "Pasta kochen", instruction: "Reichlich Salzwasser aufkochen und die Pasta al dente garen.", duration: "9 Min.", tag: "Kochen" },
        { stepNumber: 2, title: "Knoblauch anschwitzen", instruction: "Knoblauch fein hacken und in mildem Olivenöl leicht golden dünsten.", duration: "3 Min.", tag: "Aroma" },
        { stepNumber: 3, title: "Vermengen", instruction: "Pasta mit 2 EL Nudelwasser und Knoblauchöl schwenken, mit Käse bestreuen.", duration: "2 Min.", tag: "Finish" },
      ],
    };
  }

  const capitalQuery = query.charAt(0).toUpperCase() + query.slice(1);
  return {
    title: `Hausgemachtes ${capitalQuery}`,
    subtitle: `Frisch zubereitetes ${capitalQuery} nach traditioneller Art`,
    time: "20 Min.",
    difficulty: "Einfach",
    baseCal: 450,
    baseProt: 20,
    baseCarb: 45,
    baseCost: 2.50,
    chefTip: "Frische Gewürze und schonende Zubereitung bringen den besten Eigengeschmack hervor.",
    imageKeywords: query,
    tone: "mint",
    ingredients: [
      { name: `${capitalQuery}-Grundzutaten`, baseAmountPerPortion: 120, unit: "g", optional: false },
      { name: "Frisches Gemüse & Kräuter", baseAmountPerPortion: 100, unit: "g", optional: false },
      { name: "Hochwertiges Öl & Meersalz", baseAmountPerPortion: 15, unit: "ml", optional: false },
    ],
    steps: [
      { stepNumber: 1, title: "Vorbereitung & Mise en Place", instruction: `Frische Zutaten für ${capitalQuery} abmessen, waschen und mundgerecht zuschneiden.`, duration: "5 Min.", tag: "Prep" },
      { stepNumber: 2, title: "Garen & Aromen verbinden", instruction: `Die Zutaten bei moderater Hitze dünsten oder anbraten und mit ausgewählten Gewürzen abschmecken.`, duration: "10 Min.", tag: "Kochen" },
      { stepNumber: 3, title: "Finalisieren & Servieren", instruction: `Mit frischen Kräutern verfeinern und warm servieren.`, duration: "5 Min.", tag: "Genuss" },
    ],
  };
}

/**
 * Calls the Gemini API via the secure server-side proxy with a model cascade.
 * The API key is NEVER read in the browser here – it lives in api/gemini.ts.
 */
async function callGeminiCascade(_apiKey: string, prompt: string): Promise<RawGeminiRecipe | null> {
  try {
    const data = await callGeminiProxy({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json", temperature: 0.7 },
    });

    const rawText = extractTextFromGeminiResponse(data);
    if (!rawText) return null;

    const cleanJson = rawText.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const parsed: RawGeminiRecipe = JSON.parse(cleanJson);
    if (parsed && parsed.title && Array.isArray(parsed.ingredients) && Array.isArray(parsed.steps)) {
      return parsed;
    }
  } catch (err) {
    console.warn("[Gemini Cascade] API-Call fehlgeschlagen:", err);
  }

  return null;
}

  let parsed: RawGeminiRecipe | null = await callGeminiCascade(apiKey, prompt);

  if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients)) {
    parsed = buildSmartFallbackRecipe(userQuery, pantry);
  }

  parsed.ingredients = decomposeCompositeIngredients(parsed.ingredients);

  const recipeId = `ai-${Date.now()}`;
  const imageUrl = resolveRecipeFoodImage(parsed.title, parsed.imageKeywords);

  // Honest pantry comparison using culinary equivalents & alternatives
  const inStockIngredients = parsed.ingredients.filter((ing) =>
    findMatchingPantryItem(ing.name, pantry as any) !== null
  );
  const missingIngredients = parsed.ingredients.filter((ing) => !inStockIngredients.includes(ing));
  const calculatedMatchScore = Math.round(
    (inStockIngredients.length / Math.max(1, parsed.ingredients.length)) * 100
  );

  const newRecipe: CatalogRecipe = {
    id: recipeId,
    title: parsed.title,
    subtitle: parsed.subtitle || "Frisch kreiert mit deiner AI",
    category: parsed.category || getRecipeCategory({ title: parsed.title, subtitle: parsed.subtitle }),
    time: parsed.time || "20 Min.",
    difficulty: parsed.difficulty || "Einfach",
    baseCal: Math.round(Number(parsed.baseCal) || 400),
    baseProt: Math.round(Number(parsed.baseProt) || 20),
    baseCarb: Math.round(Number(parsed.baseCarb) || 45),
    baseCost: Number(parsed.baseCost) || 2.5,
    tone: parsed.tone || "mint",
    chefTip: parsed.chefTip || "Frisch zubereitet schmeckt es am besten!",
    imageUrl,
    isAiGenerated: true,
    matchScore: calculatedMatchScore,
    rawIngredients: parsed.ingredients,
    ingredients: parsed.ingredients,
    optional:
      missingIngredients.length > 0
        ? `Fehlt: ${missingIngredients.map((m) => m.name).slice(0, 3).join(", ")}`
        : "Alles im Vorrat vorhanden",
    available: (s: number) => {
      if (inStockIngredients.length > 0) {
        return inStockIngredients
          .slice(0, 3)
          .map((ing) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
          .join(" · ");
      }
      return parsed.ingredients
        .slice(0, 3)
        .map((ing) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
        .join(" · ");
    },
    ingredientsList: (s: number) => {
      return parsed.ingredients.map((ing) => ({
        name: ing.name,
        amount: `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit}`,
        optional: Boolean(ing.optional),
      }));
    },
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.map((st, idx) => ({
          stepNumber: st.stepNumber || idx + 1,
          title: st.title || `Schritt ${idx + 1}`,
          instruction: st.instruction || "",
          duration: st.duration || "3 Min.",
          tag: st.tag || "Kochen",
        }))
      : [],
  };

  // Persist into localStorage so user keeps it permanently
  saveCustomRecipe(newRecipe, parsed.ingredients);

  return newRecipe;
}

function extractMeaningfulTextFromHtml(html: string, baseUrl: string): string {
  const parts: string[] = [];

  // 1. JSON-LD scripts (often contain Recipe metadata schema.org/Recipe)
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      parts.push("JSON-LD: " + JSON.stringify(parsed));
    } catch {
      parts.push("JSON-LD (raw): " + match[1].slice(0, 3000));
    }
  }

  // 2. Structured Recipe Cards / Articles / Grid-Items
  const cardRegex = /<(?:article|div|li)[^>]*class=["'][^"']*(?:recipe|card|entry|post|grid-item|item)[^"']*["'][^>]*>([\s\S]*?)<\/(?:article|div|li)>/gi;
  let cardCount = 0;
  while ((match = cardRegex.exec(html)) !== null && cardCount < 30) {
    const cardHtml = match[1];

    // Find title in h1-h4 or link
    const titleMatch = cardHtml.match(/<(?:h[1-4]|a)[^>]*>([\s\S]*?)<\/(?:h[1-4]|a)>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

    // Find link
    const linkMatch = cardHtml.match(/<a\s+[^>]*href=["']([^"']+)["']/i);
    let linkUrl = "";
    if (linkMatch && linkMatch[1] && !linkMatch[1].startsWith("#") && !linkMatch[1].startsWith("javascript:")) {
      try {
        linkUrl = new URL(linkMatch[1], baseUrl).href;
      } catch {}
    }

    // Find image (src, data-src, data-lazy-src, srcset)
    let imageUrl = "";
    const imgMatch = cardHtml.match(/<img\s+[^>]*?(?:src|data-src|data-lazy-src|srcset)=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      const rawImg = imgMatch[1].split(",")[0].trim().split(" ")[0].trim();
      if (rawImg && !rawImg.startsWith("data:") && !rawImg.endsWith(".svg")) {
        try {
          imageUrl = new URL(rawImg, baseUrl).href;
        } catch {}
      }
    }

    if (title && (linkUrl || imageUrl)) {
      parts.push(`REZEPT-KARTE:\n- Titel: ${title}\n- Link: ${linkUrl || baseUrl}\n- Bild: ${imageUrl || "kein Bild"}`);
      cardCount++;
    }
  }

  // 3. Standalone Headings
  if (cardCount === 0) {
    const headingRegex = /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi;
    while ((match = headingRegex.exec(html)) !== null) {
      const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text.length > 3 && text.length < 150) {
        parts.push(`TITEL: ${text}`);
      }
    }
  }

  // 4. Links & Images list
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let linkCount = 0;
  while ((match = linkRegex.exec(html)) !== null && linkCount < 50) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > 5 && text.length < 100 && !href.startsWith("#") && !href.startsWith("javascript:")) {
      try {
        const fullUrl = new URL(href, baseUrl).toString();
        parts.push(`LINK: [${text}](${fullUrl})`);
        linkCount++;
      } catch {}
    }
  }

  return parts.join("\n\n");
}

/**
 * 1. ECHTES WEB-FETCHING & PAGINIERUNGS-ERKENNUNG
 * Ruft den Inhalt einer Rezept-Webseite mit Paginierung ab.
 * Primär: Eigener Serverless Endpoint /api/scrape (5 MB Stream, SSRF- & CORS-geschützt)
 * Fallback: r.jina.ai (CORS-frei, sauberes Markdown mit Bildern & Links)
 */
export async function fetchWebsiteContent(
  url: string,
  page: number = 1
): Promise<{ content: string; nextPageUrl?: string; cards?: DiscoveredRecipeCard[]; recipe?: any }> {
  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  // Guard: NIEMALS Paginierung an eine Bild-URL oder ungültige URL anhängen!
  const cleanTargetLower = targetUrl.split("?")[0].toLowerCase().replace(/\/$/, "");
  if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js)$/i.test(cleanTargetLower)) {
    return { content: "", nextPageUrl: undefined, cards: [] };
  }

  // Intelligenter Aufbau der Paginierungs-URL wenn page > 1
  if (page > 1) {
    if (/\/page\/\d+/i.test(targetUrl)) {
      targetUrl = targetUrl.replace(/\/page\/\d+/i, `/page/${page}`);
    } else if (/[?&](page|p|seite)=\d+/i.test(targetUrl)) {
      targetUrl = targetUrl.replace(/([?&](page|p|seite)=)\d+/i, `$1${page}`);
    } else {
      try {
        const urlObj = new URL(targetUrl);
        if (urlObj.search) {
          urlObj.searchParams.set("page", String(page));
          targetUrl = urlObj.toString();
        } else {
          const cleanPath = urlObj.pathname.replace(/\/$/, "");
          targetUrl = `${urlObj.origin}${cleanPath}/page/${page}/`;
        }
      } catch {
        targetUrl = targetUrl.includes("?") ? `${targetUrl}&page=${page}` : `${targetUrl}?page=${page}`;
      }
    }
  }

  let textContent = "";

  // 0. Primärer Scraper: Eigener Serverless Endpoint POST /api/scrape (bis zu 5 MB)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: targetUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        let assembledText = "";
        if (Array.isArray(data.jsonLdRecipes) && data.jsonLdRecipes.length > 0) {
          assembledText += `=== SCHEMA.ORG REZEPT-DATEN (JSON-LD) ===\n${JSON.stringify(data.jsonLdRecipes, null, 2)}\n\n`;
        }
        if (data.title) {
          assembledText += `Titel: ${data.title}\n`;
        }
        if (data.ogDescription) {
          assembledText += `Beschreibung: ${data.ogDescription}\n\n`;
        }
        if (Array.isArray(data.recipeLinks) && data.recipeLinks.length > 0) {
          assembledText += `\n=== ENTDECKTE REZEPT-LINKS (${data.recipeLinks.length}) ===\n`;
          for (const l of data.recipeLinks) {
            assembledText += `[![${l.title}](${l.imageUrl || ""})](${l.url}) ### [${l.title}](${l.url})\n`;
          }
          assembledText += `\n`;
        }
        if (data.textContent) {
          assembledText += data.textContent;
        }

        const rawCardList = Array.isArray(data.cards) && data.cards.length > 0
          ? data.cards
          : Array.isArray(data.recipeLinks)
          ? data.recipeLinks
          : [];

        const discoveredCards: DiscoveredRecipeCard[] = rawCardList
          .filter((l: any) => l.title && (l.url || l.recipeUrl))
          .map((l: any) => ({
            title: String(l.title).trim(),
            recipeUrl: String(l.url || l.recipeUrl).trim(),
            imageUrl: l.imageUrl ? String(l.imageUrl).trim() : "",
          }));

        if (assembledText.length > 80 || discoveredCards.length > 0 || data.recipe) {
          return {
            content: assembledText.slice(0, 45000),
            nextPageUrl: data.nextPageUrl,
            cards: discoveredCards,
            recipe: data.recipe,
          };
        }
      }
    }
  } catch {
    // Weiter zum Fallback wenn /api/scrape temporär fehlschlägt
  }

  // 1. Fallback: r.jina.ai (mit X-With-Images-Summary & X-With-Links-Summary)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;
    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        "Accept": "text/markdown, text/plain, */*",
        "X-With-Images-Summary": "true",
        "X-With-Links-Summary": "true",
        "X-No-Cache": "true",
      },
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const txt = await res.text();
      if (txt && txt.length > 150) {
        textContent = txt;
      }
    }
  } catch (err) {
    // Weiter zum Fallback
  }

  // Falls leer, Basis-String bereitstellen
  if (!textContent) {
    textContent = `Webseite: ${targetUrl}\n(Inhalt konnte nicht direkt geladen werden)`;
  }

  // Suche nach nächster Paginierungs-URL für page + 1
  let nextPageUrl: string | undefined;
  const nextPageNum = page + 1;
  const nextRegexes = [
    new RegExp(`rel=["']next["'][^>]*href=["']([^"']+)["']`, "i"),
    new RegExp(`href=["']([^"']+)["'][^>]*rel=["']next["']`, "i"),
    new RegExp(`href=["']([^"']*(?:/page/${nextPageNum}/?|[?&](?:page|p|seite)=${nextPageNum}[^"']*))["']`, "i"),
    new RegExp(`\\[[^\\]]*(?:Weiter|Nächste|Next|${nextPageNum})[^\\]]*\\]\\(([^)\\s]+)\\)`, "i"),
    new RegExp(`\\[[^\\]]*\\]\\(([^)\\s]*(?:/page/${nextPageNum}/?|[?&](?:page|p|seite)=${nextPageNum}[^)\\s]*))\\)`, "i"),
  ];

  for (const reg of nextRegexes) {
    const m = textContent.match(reg);
    if (m && m[1]) {
      const foundUrl = m[1].trim();
      try {
        const candidateUrl = new URL(foundUrl, targetUrl).toString();
        const candLower = candidateUrl.toLowerCase();
        if (
          !candLower.includes("/wp-content/") &&
          !candLower.includes("/uploads/") &&
          !candLower.includes("/assets/") &&
          !candLower.includes("/static/") &&
          !candLower.includes("/images/") &&
          !candLower.includes("/media/") &&
          !candLower.includes("/feed/") &&
          !candLower.includes("/wp-json/") &&
          !/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js)$/i.test(candLower.split("?")[0])
        ) {
          nextPageUrl = candidateUrl;
          break;
        }
      } catch {}
    }
  }

  const content = textContent.slice(0, 45000);
  return { content, nextPageUrl };
}

export interface DiscoveredRecipeCard {
  title: string;
  imageUrl: string;
  recipeUrl: string;
}

export interface ScrapePageResult {
  recipes: CatalogRecipe[];
  nextPageUrl?: string;
  hasMorePages: boolean;
  pageNumber: number;
}

export interface ScrapeSinglePageOptions {
  onProgress?: (statusText: string) => void;
  onBatchLoaded?: (batchRecipes: CatalogRecipe[], pageNumber: number) => void;
  onBatchRecipesFound?: (batchRecipes: CatalogRecipe[], pageNumber: number) => void;
  shouldStop?: () => boolean;
}

export interface ScrapeWebsiteOptions {
  startPage?: number;
  pagesToScan?: number;
  maxPages?: number;
  autoCrawlAll?: boolean;
  existingTitles?: string[];
  existingUrls?: string[];
  onProgress?: (info: {
    currentPage: number;
    maxPages: number;
    foundRecipesCount: number;
    statusText: string;
  }) => void;
  onPageScraped?: (recipesOnPage: CatalogRecipe[], pageNum: number, hasMorePages: boolean) => void;
  onBatchLoaded?: (batchRecipes: CatalogRecipe[], pageNum: number) => void;
  onBatchRecipesFound?: (batchRecipes: CatalogRecipe[], pageNum: number) => void;
  shouldStop?: () => boolean;
}

/**
 * Phase A: Extrahiert alle Rezeptkarten (Titel, Bild-URL, Link) von einer Übersichtsseite
 */
export function extractRecipeCardsFromListing(content: string, _baseUrl: string): DiscoveredRecipeCard[] {
  const cards: DiscoveredRecipeCard[] = [];
  const seenUrls = new Set<string>();

  const isExcluded = (url: string, title: string) => {
    const u = url.toLowerCase();
    const t = title.toLowerCase().trim();
    if (!u.startsWith("http")) return true;

    // Guard: NIEMALS Bild-URLs oder Datei-Downloads als Rezeptkarte erfassen!
    const cleanUrlPath = u.split("?")[0].replace(/\/$/, "");
    if (/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js|ico|woff|woff2|ttf|eot)$/i.test(cleanUrlPath)) {
      return true;
    }

    if (_baseUrl) {
      try {
        const baseHost = new URL(_baseUrl).hostname.toLowerCase();
        const candHost = new URL(url).hostname.toLowerCase();
        const getRoot = (h: string) => {
          const parts = h.split(".");
          return parts.length >= 2 ? parts.slice(-2).join(".") : h;
        };
        if (candHost !== baseHost && getRoot(candHost) !== getRoot(baseHost)) {
          return true; // Externe Domain / CDN
        }
        if (
          candHost.includes("cloudinary.com") ||
          candHost.includes("ctfassets.net") ||
          candHost.includes("wp.com") ||
          candHost.includes("pinimg.com")
        ) {
          return true;
        }
      } catch {
        return true;
      }
    }

    // Reine Kategorie- oder Schlagwort-Archivseiten ausschließen (z. B. /category/dinner/ oder /tag/quick/page/2/)
    // Aber echte Rezept-Beiträge (z. B. /category/dinner/pasta/) zulassen!
    if (/\/(?:category|kategorie|tag|schlagwort|meal-type)\/[^/]+(?:\/page\/\d+)?\/?$/i.test(cleanUrlPath)) {
      return true;
    }

    if (
      u.includes("/author/") ||
      u.includes("/about") ||
      u.includes("/ueber-uns") ||
      u.includes("/contact") ||
      u.includes("/kontakt") ||
      u.includes("/privacy") ||
      u.includes("/datenschutz") ||
      u.includes("/terms") ||
      u.includes("/agb") ||
      u.includes("/shop") ||
      u.includes("/store") ||
      u.includes("/cookbook") ||
      u.includes("/wp-content/") ||
      u.includes("/wp-admin/") ||
      u.includes("/wp-json/") ||
      u.includes("/wp-includes/") ||
      u.includes("/uploads/") ||
      u.includes("/assets/") ||
      u.includes("/static/") ||
      u.includes("/images/") ||
      u.includes("/media/") ||
      u.includes("/feed/") ||
      u.includes("/cart") ||
      u.includes("/checkout") ||
      u.includes("/comment") ||
      u.includes("/lifestyle/") ||
      u.includes("what-i-eat") ||
      u.includes("what-i-ate") ||
      u.includes("grocery-haul") ||
      u.includes("vlog")
    ) {
      return true;
    }
    if (u.endsWith("#wp--skip-link--target") || u.endsWith("#content")) return true;
    if (
      t.includes("what i eat") ||
      t.includes("what i ate") ||
      t.includes("was ich esse") ||
      t.includes("was ich gegessen") ||
      t.includes("grocery haul") ||
      t.includes("food haul") ||
      t.includes("day in the life") ||
      t.includes("morning routine") ||
      t.includes("weekly vlog") ||
      t.includes("q&a") ||
      t.includes("favorites of the month") ||
      t.includes("roundup")
    ) {
      return true;
    }
    if (
      [
        "appetizer",
        "breakfast",
        "dessert",
        "dinner",
        "drinks",
        "main course",
        "restaurant remakes",
        "sauce",
        "side dish",
        "snack",
        "soup",
        "recipes",
        "home",
        "search",
        "skip to content",
      ].includes(t)
    ) {
      return true;
    }
    return false;
  };

  // Pattern 1 (z.B. Moribyan / Foodblogs):
  // [![Image N](imgUrl)](recipeUrl) followed by ### [Title](recipeUrl) oder [Title](recipeUrl)
  const regex1 = /\[\!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)\]\((https?:\/\/[^\s\)]+)\)\s*(?:###|\*\*|##)?\s*\[([^\]]+)\]\(\2\)/gi;
  let m: RegExpExecArray | null;
  while ((m = regex1.exec(content)) !== null) {
    const imageUrl = m[1].trim();
    const recipeUrl = m[2].trim();
    const title = m[3].trim();
    const cleanUrl = recipeUrl.replace(/\/$/, "");
    if (!isExcluded(recipeUrl, title) && !seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      cards.push({ title, imageUrl, recipeUrl });
    }
  }

  // Pattern 2: Category badge followed by image link and recipe title link
  const regex2 = /\[\!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)\]\((https?:\/\/[^\s\)]+)\)[\s\S]{0,120}?\[([^\]]+)\]\(\2\)/gi;
  while ((m = regex2.exec(content)) !== null) {
    const imageUrl = m[1].trim();
    const recipeUrl = m[2].trim();
    const title = m[3].trim();
    const cleanUrl = recipeUrl.replace(/\/$/, "");
    if (!isExcluded(recipeUrl, title) && !seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      cards.push({ title, imageUrl, recipeUrl });
    }
  }

  // Pattern 3: Standard-Markdown: ### [Title](recipeUrl) gefolgt von ![Title](imgUrl)
  const regex3 = /###\s*\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)[\s\S]{0,180}?\!\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)/gi;
  while ((m = regex3.exec(content)) !== null) {
    const title = m[1].trim();
    const recipeUrl = m[2].trim();
    const imageUrl = m[3].trim();
    const cleanUrl = recipeUrl.replace(/\/$/, "");
    if (!isExcluded(recipeUrl, title) && !seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      cards.push({ title, imageUrl, recipeUrl });
    }
  }

  // Pattern 4: HTML-Tags <a href="recipeUrl">...<img src="imgUrl">...<h3>Title</h3>
  const htmlRegex = /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>[\s\S]*?<img\s+[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>[\s\S]*?<(?:h2|h3|h4|span|div)[^>]*>([^<]+)<\/(?:h2|h3|h4|span|div)>/gi;
  while ((m = htmlRegex.exec(content)) !== null) {
    const recipeUrl = m[1].trim();
    const imageUrl = m[2].trim();
    const title = m[3].trim();
    const cleanUrl = recipeUrl.replace(/\/$/, "");
    if (!isExcluded(recipeUrl, title) && !seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      cards.push({ title, imageUrl, recipeUrl });
    }
  }

  // Pattern 5: Markdown-Links zu Rezepten: [Rezepttitel](recipeUrl)
  const regex5 = /\[([^\]]{4,})\]\((https?:\/\/[^\s\)]+)\)/gi;
  while ((m = regex5.exec(content)) !== null) {
    const title = m[1].replace(/<[^>]+>/g, "").trim();
    const recipeUrl = m[2].trim();
    const cleanUrl = recipeUrl.replace(/\/$/, "");
    if (!isExcluded(recipeUrl, title) && !seenUrls.has(cleanUrl)) {
      const isPath =
        /\/(?:rezept|rezepte|recipe|recipes|gerichte)\//i.test(cleanUrl) ||
        /-[a-z0-9]+-(?:rezept|recipe)\/?$/i.test(cleanUrl);
      if (isPath) {
        seenUrls.add(cleanUrl);
        cards.push({ title, imageUrl: "", recipeUrl });
      }
    }
  }

  return cards;
}

export interface ExtractedInstructionStep {
  sectionTitle?: string;
  text: string;
}

export interface RecipeSubpageDetails {
  title: string;
  imageUrl: string;
  verifiedImageUrl?: string;
  ogImage?: string;
  jsonLdImage?: string;
  recipeUrl: string;
  recipeIngredient: string[];
  recipeInstructions: ExtractedInstructionStep[];
  rawSteps?: ExtractedInstructionStep[];
  totalTime?: string;
  rawText?: string;
}

function extractJsonLdFromHtml(html: string): any | null {
  const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : (parsed["@graph"] || [parsed]);
      for (const item of items) {
        const type = item["@type"];
        const isRecipe = type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
        if (isRecipe) {
          return item;
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Rekursive Extraktion von Zubereitungsschritten aus Schema.org JSON-LD.
 * Löst den kritischen Bug auf Foodblogs (WP Recipe Maker, Tasty Recipes, Mediavine),
 * bei dem `recipeInstructions` aus `HowToSection`-Objekten mit verschachtelten
 * `itemListElement`-Schritten besteht.
 */
export function extractInstructionsFromJsonLd(
  instructions: any,
  currentSectionTitle?: string
): ExtractedInstructionStep[] {
  if (!instructions) return [];

  // Plain String (ggf. mehrzeilig)
  if (typeof instructions === "string") {
    const clean = instructions.trim();
    if (!clean) return [];
    if (clean.includes("\n")) {
      return clean
        .split(/\r?\n+/)
        .map((s) => s.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((s) => s.length > 5)
        .map((text) => ({ sectionTitle: currentSectionTitle, text }));
    }
    return [{ sectionTitle: currentSectionTitle, text: clean }];
  }

  // Einzelnes Objekt
  if (!Array.isArray(instructions)) {
    if (typeof instructions === "object") {
      return extractInstructionsFromJsonLd([instructions], currentSectionTitle);
    }
    return [];
  }

  const result: ExtractedInstructionStep[] = [];

  for (const step of instructions) {
    if (!step) continue;

    if (typeof step === "string") {
      const clean = step.trim();
      if (clean) {
        result.push({ sectionTitle: currentSectionTitle, text: clean });
      }
      continue;
    }

    if (typeof step === "object") {
      const typeStr = Array.isArray(step["@type"])
        ? step["@type"].join(" ")
        : String(step["@type"] || "");

      const isSection =
        /HowToSection/i.test(typeStr) ||
        (Array.isArray(step.itemListElement) && step.itemListElement.length > 0 && !step.text);

      if (isSection) {
        const rawSectionName =
          (typeof step.name === "string" ? step.name.trim() : "") ||
          (typeof step.title === "string" ? step.title.trim() : "");
        const sectionName = rawSectionName || currentSectionTitle;

        if (Array.isArray(step.itemListElement)) {
          result.push(...extractInstructionsFromJsonLd(step.itemListElement, sectionName));
        }
        continue;
      }

      // Step-Objekt (HowToStep etc.)
      const rawStepText =
        (typeof step.text === "string" ? step.text.trim() : "") ||
        (typeof step.description === "string" ? step.description.trim() : "") ||
        (typeof step.name === "string" ? step.name.trim() : "");

      const stepText = rawStepText.trim();
      const rawStepName = typeof step.name === "string" ? step.name.trim() : "";

      if (stepText) {
        let finalText = stepText;
        if (
          rawStepName &&
          rawStepName !== stepText &&
          !stepText.toLowerCase().startsWith(rawStepName.toLowerCase()) &&
          rawStepName.length < 60
        ) {
          finalText = `${rawStepName}: ${stepText}`;
        }
        result.push({
          sectionTitle: currentSectionTitle,
          text: finalText,
        });
      } else if (Array.isArray(step.itemListElement)) {
        result.push(...extractInstructionsFromJsonLd(step.itemListElement, currentSectionTitle));
      }
    }
  }

  return result;
}

/**
 * Phase B: Ruft die Unterseite eines Rezepts ab und extrahiert JSON-LD Schema.org / Print / Markdown
 */
export async function fetchRecipeSubpageDetails(
  card: DiscoveredRecipeCard
): Promise<RecipeSubpageDetails> {
  const result: RecipeSubpageDetails = {
    title: card.title,
    imageUrl: card.imageUrl,
    recipeUrl: card.recipeUrl,
    recipeIngredient: [],
    recipeInstructions: [],
    rawSteps: [],
  };

  // 0. Primärer Abruf über unseren eigenen /api/scrape Endpoint (POST, CORS-frei, 5 MB Limit)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: card.recipeUrl }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data?.success) {
        // Server-side direkt extrahiertes Recipe-Objekt mit Vorrang übernehmen
        if (data.recipe) {
          if (data.recipe.title) result.title = data.recipe.title;
          if (data.recipe.imageUrl) {
            result.imageUrl = data.recipe.imageUrl;
            result.verifiedImageUrl = data.recipe.imageUrl;
            result.jsonLdImage = data.recipe.imageUrl;
          }
          if (Array.isArray(data.recipe.ingredients) && data.recipe.ingredients.length > 0) {
            result.recipeIngredient = data.recipe.ingredients.map((i: any) => String(i).trim());
          }
          if (Array.isArray(data.recipe.steps) && data.recipe.steps.length > 0) {
            result.recipeInstructions = data.recipe.steps;
            result.rawSteps = data.recipe.steps;
          }
          if (data.recipe.totalTime || data.recipe.prepTime) {
            result.totalTime = String(data.recipe.totalTime || data.recipe.prepTime);
          }
          if (result.recipeIngredient.length > 0) {
            return result;
          }
        }

        // Punkt 3: Verified Image aus JSON-LD, og:image oder twitter:image
        if (data.ogImage) {
          result.ogImage = data.ogImage;
        }
        if (data.verifiedImageUrl) {
          result.verifiedImageUrl = data.verifiedImageUrl;
          result.imageUrl = data.verifiedImageUrl;
        } else if (data.ogImage) {
          result.imageUrl = data.ogImage;
        }

        // Punkt 4: Vollständige unverkürzte Original-Schritte
        if (Array.isArray(data.rawSteps) && data.rawSteps.length > 0) {
          result.rawSteps = data.rawSteps;
          result.recipeInstructions = data.rawSteps;
        }

        if (Array.isArray(data.jsonLdRecipes) && data.jsonLdRecipes.length > 0) {
          const recipeLd = data.jsonLdRecipes[0];
          if (Array.isArray(recipeLd.recipeIngredient) && recipeLd.recipeIngredient.length > 0) {
            result.recipeIngredient = recipeLd.recipeIngredient.map((i: any) => String(i).trim());
          }
          if (Array.isArray(recipeLd.extractedInstructions) && recipeLd.extractedInstructions.length > 0) {
            result.recipeInstructions = recipeLd.extractedInstructions;
            result.rawSteps = recipeLd.extractedInstructions;
          } else if (recipeLd.recipeInstructions) {
            const parsedSteps = extractInstructionsFromJsonLd(recipeLd.recipeInstructions);
            result.recipeInstructions = parsedSteps;
            result.rawSteps = parsedSteps;
          }
          if (recipeLd.totalTime) {
            result.totalTime = String(recipeLd.totalTime);
          }
          if (recipeLd.verifiedImageUrl) {
            result.jsonLdImage = recipeLd.verifiedImageUrl;
            result.verifiedImageUrl = recipeLd.verifiedImageUrl;
            result.imageUrl = recipeLd.verifiedImageUrl;
          }
          if (result.recipeIngredient.length > 0) {
            return result;
          }
        }

        // Stufe 3: Fallback für Seiten ohne Schema.org JSON-LD (articleText / mainText)
        if (data.articleText || data.textContent) {
          const snippet = (data.articleText || data.textContent || "").slice(0, 10000);
          if (snippet.length > 100) {
            result.rawText = snippet;
          }
          if (data.ogImage && (!result.imageUrl || result.imageUrl.includes("example.com"))) {
            result.imageUrl = data.ogImage;
          }
        }

        if (result.recipeIngredient.length > 0) {
          return result;
        }
      }
    }
  } catch {}

  const slug = card.recipeUrl.replace(/\/$/, "").split("/").pop();

  // 1. WordPress Print-URL (wprm_print) via Jina Reader (enthält direkt die exakte Rezeptkarte!)
  if (slug && !slug.includes("?") && !slug.includes("page")) {
    try {
      const urlObj = new URL(card.recipeUrl);
      const wprmPrintUrl = `${urlObj.origin}/wprm_print/${slug}`;
      const jinaPrint = `https://r.jina.ai/${wprmPrintUrl}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(jinaPrint, {
        signal: controller.signal,
        headers: { "Accept": "text/markdown, text/plain, */*", "X-No-Cache": "true" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const printText = await res.text();
        if (
          printText &&
          printText.length > 300 &&
          (printText.includes("▢") ||
            printText.toLowerCase().includes("ingredient") ||
            printText.toLowerCase().includes("instruction") ||
            printText.includes("cup") ||
            printText.includes("tablespoon"))
        ) {
          result.rawText = printText.slice(0, 8000);
          return result;
        }
      }
    } catch {}
  }

  // 2. Fallback: Jina Reader für die reguläre Unterseite
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const jinaUrl = `https://r.jina.ai/${card.recipeUrl}`;
    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: { "Accept": "text/markdown, text/plain, */*", "X-No-Cache": "true" },
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const txt = await res.text();
      if (txt && txt.length > 200) {
        result.rawText = txt.slice(0, 9000);
      }
    }
  } catch {}

  return result;
}

// ── Hilfsfunktionen für Sprach- und Zeiterkennung ─────────────────────────────
export function isGermanRecipeText(title: string, steps?: ExtractedInstructionStep[]): boolean {
  const combined = `${title} ${(steps || []).map((s) => s.text).join(" ")}`.toLowerCase();
  const deWords = [" und ", " mit ", " die ", " der ", " das ", " in ", " für ", " bei ", " auf ", " den ", " dem ", " zutat", " schritt", " backen", " kochen", " erhitzen", " schneiden", " pfanne", " ofen", " minuten", " prise", " teig", " soße", " sauce", " servieren", " esslöffel", " teelöffel"];
  const enWords = [" and ", " with ", " the ", " in ", " for ", " at ", " on ", " of ", " to ", " ingredient", " step", " bake", " cook", " heat", " cut", " pan", " oven", " minutes", " dough", " sauce", " serve", " bowl", " skillet", " tablespoon", " teaspoon", " cup"];

  let deScore = 0;
  for (const w of deWords) {
    if (combined.includes(w)) deScore++;
  }
  let enScore = 0;
  for (const w of enWords) {
    if (combined.includes(w)) enScore++;
  }
  return deScore >= enScore;
}

export function extractStepDuration(text: string): string {
  const match = text.match(/(\d+(?:[.,]\d+)?(?:\s*-\s*\d+)?)\s*(?:minuten|minute|min\.?|minutes|mins?|std\.?|stunden|hours?|hrs?)/i);
  return match ? match[0].trim() : "5 Min.";
}

/**
 * Parst unstrukturierte Zutatentexte aus JSON-LD (z.B. "2 cups flour", "150g Zucker", "1 TL Salz")
 * in strukturierte RawGeminiIngredient-Objekte als sichere Basis für CatalogRecipe.
 */
export function parseRawIngredientStrings(lines: string[]): RawGeminiIngredient[] {
  return lines.map((line) => {
    const clean = String(line || "").replace(/^[▢•\-\*\s]+/, "").trim();
    const match = clean.match(/^([\d\/\.,\s¼½¾⅓⅔⅛⅜⅝⅞]+)?\s*(g|kg|ml|l|tl|el|tbsp|tsp|cup|cups|oz|lb|prise|stk\.?|stück|bund|dose|dosen|zehe|zehen)?\s*(?:of\s+)?(.*)$/i);
    let amount = 100;
    let unit = "g";
    let name = clean;
    if (match) {
      if (match[1]) {
        const numStr = match[1].trim();
        if (numStr === "½") amount = 0.5;
        else if (numStr === "¼") amount = 0.25;
        else if (numStr === "¾") amount = 0.75;
        else if (numStr.includes("/")) {
          const [num, den] = numStr.split("/").map(Number);
          if (den) amount = num / den;
        } else {
          amount = parseFloat(numStr.replace(",", ".")) || 100;
        }
      }
      if (match[2]) {
        unit = match[2];
      }
      if (match[3] && match[3].trim()) {
        name = match[3].trim();
      }
    }
    return {
      name: name || clean,
      baseAmountPerPortion: amount,
      unit,
      optional: false,
    };
  });
}

/**
 * Robuster JSON-Repair- und Extraktions-Helper:
 * 1. Entfernt Markdown-Backticks und Whitespace
 * 2. Bereinigt Trailing-Commas vor '}' und ']'
 * 3. Falls JSON am Ende abgeschnitten wurde (z.B. SyntaxError bei Position 7802 durch Token-Limit),
 *    rettet er alle bis dahin vollständig geschlossenen { ... } Rezept-Objekte aus dem Array.
 */
export function repairAndExtractJsonRecipes(text: string): any[] {
  if (!text || typeof text !== "string") return [];

  // 1. Markdown-Backticks entfernen
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  if (!cleaned) return [];

  // 2. Erster Versuch: Direktes JSON.parse
  try {
    const parsed = JSON.parse(cleaned);
    const list = Array.isArray(parsed?.recipes) ? parsed.recipes : Array.isArray(parsed) ? parsed : [];
    if (list.length > 0) return list;
  } catch {}

  // 3. Zweiter Versuch: Trailing Commas bereinigen
  const sanitizedTrailing = cleaned.replace(/,\s*([}\]])/g, "$1");
  try {
    const parsed = JSON.parse(sanitizedTrailing);
    const list = Array.isArray(parsed?.recipes) ? parsed.recipes : Array.isArray(parsed) ? parsed : [];
    if (list.length > 0) return list;
  } catch {}

  // 4. Dritter Versuch: Falls das JSON am Ende abgeschnitten wurde, rette alle vollständig geschlossenen Rezept-Objekte
  try {
    const recipes: any[] = [];
    const arrayMatch = sanitizedTrailing.match(/"recipes"\s*:\s*\[|^\s*\[/);
    if (!arrayMatch) return [];

    const startIndex = (arrayMatch.index ?? 0) + arrayMatch[0].length;
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let currentObjectStart = -1;

    for (let i = startIndex; i < sanitizedTrailing.length; i++) {
      const char = sanitizedTrailing[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (char === "\\") {
        escapeNext = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (char === "{") {
        if (depth === 0) {
          currentObjectStart = i;
        }
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0 && currentObjectStart !== -1) {
          const candidateJson = sanitizedTrailing
            .slice(currentObjectStart, i + 1)
            .replace(/,\s*([}\]])/g, "$1")
            .trim();
          try {
            const obj = JSON.parse(candidateJson);
            if (obj && (obj.title || obj.name)) {
              recipes.push(obj);
            }
          } catch {}
          currentObjectStart = -1;
        }
      }
    }

    if (recipes.length > 0) {
      console.info(`[JSON-Repair] ${recipes.length} vollständige Rezepte aus abgeschnittenem JSON gerettet.`);
      return recipes;
    }
  } catch (err) {
    console.warn("[JSON-Repair] Fehler beim Retten geschlossener Objekte:", err);
  }

  return [];
}

/**
 * Konvertiert rohe Rezeptdaten von Gemini / Web-Scraper in ein vollständiges CatalogRecipe.
 * Fix Bug A: Wenn verifiedImageUrl oder eine gültige http(s)://-URL da ist, wird diese fest übernommen
 * und niemals durch resolveRecipeFoodImage überschrieben!
 * Fallback: Wenn Gemini fehlschlägt, aber JSON-LD vorliegt, wird das Rezept direkt daraus erzeugt!
 */
export function convertRawToCatalogRecipe(
  item: any,
  originalCard: DiscoveredRecipeCard | { recipeUrl?: string; imageUrl?: string; verifiedImageUrl?: string; title?: string } = {},
  sourceName: string = "Portal",
  pantry: any[] = [],
  context: { timestamp?: number; pageNumber?: number; batchIdx?: number; index?: number } = {}
): CatalogRecipe {
  const origCardAny = originalCard as any;
  const title = (item.title || originalCard.title || "").trim();

  // Punkt 3: Verified Image mit höchster Priorität behandeln (JSON-LD verified, og:image, jsonLdImage, Card Image)
  const verifiedImg =
    (typeof origCardAny.verifiedImageUrl === "string" && origCardAny.verifiedImageUrl.startsWith("http") && !origCardAny.verifiedImageUrl.includes("example.com"))
      ? origCardAny.verifiedImageUrl.trim()
      : (typeof origCardAny.ogImage === "string" && origCardAny.ogImage.startsWith("http") && !origCardAny.ogImage.includes("example.com"))
      ? origCardAny.ogImage.trim()
      : (typeof origCardAny.jsonLdImage === "string" && origCardAny.jsonLdImage.startsWith("http") && !origCardAny.jsonLdImage.includes("example.com"))
      ? origCardAny.jsonLdImage.trim()
      : (typeof item.verifiedImageUrl === "string" && item.verifiedImageUrl.startsWith("http") && !item.verifiedImageUrl.includes("example.com"))
      ? item.verifiedImageUrl.trim()
      : "";

  const itemImg = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  const cardImg = typeof originalCard.imageUrl === "string" ? originalCard.imageUrl.trim() : "";
  const isValidImg = (url: string) => /^(?:https?:\/\/|data:image\/)/i.test(url) && !url.includes("example.com");
  const validCandidate = verifiedImg || (isValidImg(cardImg) ? cardImg : isValidImg(itemImg) ? itemImg : "");

  const imageUrl = validCandidate || resolveRecipeFoodImage(title, item.imageKeywords);

  const sourceUrl =
    item.sourceUrl && typeof item.sourceUrl === "string" && /^https?:\/\//i.test(item.sourceUrl.trim())
      ? item.sourceUrl.trim()
      : originalCard.recipeUrl;

  let ingredientListCandidates = Array.isArray(item.ingredients) && item.ingredients.length > 0
    ? item.ingredients
    : undefined;

  // Fallback auf echte JSON-LD Zutatentexte falls Gemini keine Zutaten geliefert hat
  if (!ingredientListCandidates && Array.isArray(origCardAny.recipeIngredient) && origCardAny.recipeIngredient.length > 0) {
    ingredientListCandidates = parseRawIngredientStrings(origCardAny.recipeIngredient);
  }

  const decompIngredients: RawGeminiIngredient[] = decomposeCompositeIngredients(
    ingredientListCandidates && ingredientListCandidates.length > 0
      ? ingredientListCandidates
      : extractIngredientsFromDishText(title, item.subtitle || "")
  ).map((ing: any) => ({
    name: String(ing.name || "").trim(),
    baseAmountPerPortion: Number(ing.baseAmountPerPortion) || 100,
    unit: String(ing.unit || "g"),
    optional: Boolean(ing.optional),
  }));

  const inStock = decompIngredients.filter((ing: any) =>
    findMatchingPantryItem(ing.name, pantry as any) !== null
  );
  const matchScore = Math.round(
    (inStock.length / Math.max(1, decompIngredients.length)) * 100
  );

  const timestamp = context.timestamp || Date.now();
  const pageNumber = context.pageNumber || 1;
  const batchIdx = context.batchIdx || 1;
  const idx = context.index || 1;
  const safeSlug = sourceName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "portal";
  const recipeId = item.id || `scraped-${safeSlug}-${timestamp}-${pageNumber}-${batchIdx}-${idx}`;

  const cardRawSteps = origCardAny.rawSteps && origCardAny.rawSteps.length > 0
    ? origCardAny.rawSteps
    : origCardAny.recipeInstructions;

  const stepsSource = (Array.isArray(item.steps) && item.steps.length > 0)
    ? item.steps
    : (Array.isArray(cardRawSteps) && cardRawSteps.length > 0)
    ? cardRawSteps.map((st: any, sIdx: number) => ({
        stepNumber: sIdx + 1,
        title: st.sectionTitle || `Schritt ${sIdx + 1}`,
        instruction: st.text || "",
        duration: extractStepDuration(st.text || ""),
        tag: st.sectionTitle || "Zubereitung",
      }))
    : [];

  return {
    id: recipeId,
    title,
    subtitle: item.subtitle || `Rezept von ${sourceName}`,
    category: item.category || getRecipeCategory({ title, subtitle: item.subtitle }),
    source: sourceName,
    sourceUrl,
    time: item.time || origCardAny.totalTime || "25 Min.",
    difficulty: item.difficulty || "Einfach",
    baseCal: Math.round(Number(item.baseCal) || 450),
    baseProt: Math.round(Number(item.baseProt) || 20),
    baseCarb: Math.round(Number(item.baseCarb) || 48),
    baseCost: Number(item.baseCost) || 2.5,
    tone: item.tone || "mint",
    chefTip: item.chefTip || "Frisch zubereitet schmeckt es am besten!",
    imageUrl,
    verifiedImageUrl: verifiedImg || (isValidImg(validCandidate) ? validCandidate : undefined),
    isAiGenerated: true,
    matchScore,
    mealType: item.mealType || "dinner",
    equipment: Array.isArray(item.equipment) ? item.equipment : ["pan"],
    rawIngredients: decompIngredients,
    ingredients: decompIngredients,
    optional: item.optional || "Nach Belieben abschmecken",
    available: (s: number) => {
      if (inStock.length > 0) {
        return inStock
          .slice(0, 3)
          .map((ing: any) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
          .join(" · ");
      }
      return decompIngredients
        .slice(0, 3)
        .map((ing: any) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
        .join(" · ");
    },
    ingredientsList: (s: number) => {
      return decompIngredients.map((ing: any) => ({
        name: ing.name,
        amount: `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit}`,
        optional: Boolean(ing.optional),
      }));
    },
    steps: stepsSource.length > 0
      ? stepsSource.map((st: any, sIdx: number) => ({
          stepNumber: st.stepNumber || sIdx + 1,
          title: st.title || `Schritt ${sIdx + 1}`,
          instruction: st.instruction || "",
          duration: st.duration || "4 Min.",
          tag: st.tag || "Kochen",
        }))
      : [
          {
            stepNumber: 1,
            title: "Zutaten vorbereiten",
            instruction: "Alle Zutaten abmessen, waschen und schneiden.",
            duration: "5 Min.",
            tag: "Vorbereitung",
          },
          {
            stepNumber: 2,
            title: "Zubereiten",
            instruction: "Die Zutaten nach Rezept garen und miteinander vermengen.",
            duration: "15 Min.",
            tag: "Kochen",
          },
          {
            stepNumber: 3,
            title: "Abschmecken & Servieren",
            instruction: "Mit Kräutern und Gewürzen abschmecken und warm anrichten.",
            duration: "3 Min.",
            tag: "Finish",
          },
        ],
  };
}

/**
 * Übergibt ein Batch von 2 Unterseiten-Rezeptdaten an Gemini, um echte Zutaten und Schritte zu strukturieren.
 * Enforce Point 4: Keine Zusammenfassungen! 1:1 Erhalt aller Schritte.
 */
async function processBatchWithGemini(
  batch: RecipeSubpageDetails[],
  sourceName: string,
  pageNumber: number,
  batchIdx: number,
  pantry: any[] = []
): Promise<CatalogRecipe[]> {

  const batchPayload = batch.map((item, idx) => {
    const rawSteps = item.rawSteps && item.rawSteps.length > 0 ? item.rawSteps : item.recipeInstructions;
    return {
      index: idx + 1,
      title: item.title,
      imageUrl: item.verifiedImageUrl || item.imageUrl,
      verifiedImageUrl: item.verifiedImageUrl,
      sourceUrl: item.recipeUrl,
      totalTime: item.totalTime,
      recipeIngredient: item.recipeIngredient && item.recipeIngredient.length > 0 ? item.recipeIngredient : undefined,
      rawSteps: rawSteps && rawSteps.length > 0 ? rawSteps : undefined,
      recipeInstructions: rawSteps && rawSteps.length > 0 ? rawSteps : undefined,
      contentSnippet: (!item.recipeIngredient || item.recipeIngredient.length === 0) ? item.rawText?.slice(0, 8000) : undefined,
    };
  });

  const prompt = `Du bist ein erstklassiger Küchenchef und Rezept-Strukturierer für eine moderne Koch-App.
Hier sind ${batch.length} echte Rezepte von «${sourceName}» (Seite ${pageNumber}), deren echte Unterseiten-Daten (Zutaten & Zubereitung) wir gerade abgerufen haben.

Rezept-Rohdaten:
${JSON.stringify(batchPayload, null, 2)}

ANWEISUNGEN:
1. Behalte "sourceUrl" und "imageUrl" von jedem Rezept ZU 100% UNVERÄNDERT bei!
2. Rechne die echten Zutaten ("recipeIngredient" bzw. aus dem Text) exakt in das Format {"name": "...", "baseAmountPerPortion": number, "unit": "g"|"ml"|"Stk."|"TL"|"EL", "optional": boolean} für EINE Basisportion um.
   - WICHTIG: Gewürze NIEMALS zusammenfassen! Jedes Gewürz (z.B. Paprikapulver, Pfeffer, Salz, Knoblauch, Zimt, Vanille) MUSS ein einzelner Zutateneintrag im Array sein!
3. ZUBEREITUNGSSCHRITTE ("steps"):
   STRIKTE REGEL: Fasse NIEMALS mehrere Zubereitungsschritte zu einem Schritt zusammen! Wenn das Original-Rezept 11 Schritte hat, MUSS dein JSON-Array "steps" exakt 11 Schritte enthalten – mit JEDEM Detail, jeder Zeitangabe und jedem Tipp aus dem Originaltext, sauber ins Deutsche übersetzt!
   - Kürze oder vereinfache die Zubereitungsschritte der Webseite NIEMALS! Übernimm ALLE detaillierten Schritte, Garzeiten, Temperaturen und Mengenangaben vollständig und detailliert aus dem Original-Rezept. Wenn das Original auf Englisch ist, übersetze jeden Schritt Detail für Detail ins Deutsche.
   - Übernimm vorhandene "sectionTitle" (z. B. "MAKE THE CINNAMON SUGAR FILLING" -> "Zimt-Zucker-Füllung zubereiten", "MAKE THE ICING" -> "Guss anrühren", "COOK THE PANCAKES" -> "Pancakes backen") als "tag" und/oder im "title" des jeweiligen Schritts.
   - Erstelle für JEDEN einzelnen Schritt des Originals ein eigenes Step-Objekt im Format:
     {"stepNumber": number, "title": string, "instruction": string, "duration": string, "tag": string}.
   - NIEMALS zusammenfassen oder auf 3 Mini-Sätze verkürzen! Alle Detailanweisungen, Minutenangaben, Pfannen-/Ofen-Temperaturen, Konsistenz-Hinweise (z.B. "10 Minuten bei Raumtemperatur ruhen lassen...") und Tipps müssen 1:1 vollständig erhalten bleiben!
4. Falls das Original auf Englisch ist (z. B. "Pumpkin Cinnamon Roll Pancakes"), übersetze Titel, Teaser, Zutaten und Zubereitungsschritte sauber und appetitlich ins Deutsche (z. B. "Kürbis-Zimtschnecken-Pancakes").
5. Berechne realistische Nährwerte pro 1 Portion ("baseCal", "baseProt", "baseCarb", "baseCost").
6. Ordne die passende Kategorie zu ("category": "Hauptgericht" | "Frühstück" | "Snack" | "Dessert" | "Backen").

Antworte AUSSCHLIESSLICH als gültiges JSON:
{
  "recipes": [
    {
      "title": "Deutscher Rezeptname",
      "subtitle": "Appetitliche Kurzbeschreibung",
      "category": "Hauptgericht",
      "time": "25 Min.",
      "difficulty": "Einfach",
      "baseCal": 450,
      "baseProt": 25,
      "baseCarb": 50,
      "baseCost": 2.80,
      "chefTip": "Hilfreicher Profi-Tipp",
      "imageUrl": "echte URL unverändert",
      "sourceUrl": "echte URL unverändert",
      "imageKeywords": "pancakes, cinnamon",
      "tone": "mint",
      "mealType": "dinner",
      "equipment": ["pan"],
      "ingredients": [
        {
          "name": "Zutat",
          "baseAmountPerPortion": 100,
          "unit": "g",
          "optional": false
        }
      ],
      "steps": [
        {
          "stepNumber": 1,
          "title": "Vorbereitung",
          "instruction": "Vollständige, detaillierte Originalanweisung mit allen Mengenangaben...",
          "duration": "5 Min.",
          "tag": "Vorbereitung"
        },
        {
          "stepNumber": 2,
          "title": "Kochen / Backen",
          "instruction": "Exakte Garzeit, Temperaturangabe und detaillierte Vorgehensweise...",
          "duration": "10 Min.",
          "tag": "Kochen"
        }
      ]
    }
  ]
}`;

  let rawList: any[] = [];

  try {
    const data = await callGeminiProxy({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
      },
    });

    const responseText = extractTextFromGeminiResponse(data) ?? "";
    rawList = repairAndExtractJsonRecipes(responseText);
  } catch (err) {
    console.warn("[Batch Gemini] Fehler bei KI-Strukturierung:", err);
  }

  const timestamp = Date.now();
  const recipes: CatalogRecipe[] = [];

  for (let i = 0; i < batch.length; i++) {
    const originalCard = batch[i];
    const item = rawList[i] || {};
    const title = (item.title || originalCard.title || "").trim();
    if (!title) continue;

    const rawSteps = originalCard.rawSteps && originalCard.rawSteps.length > 0
      ? originalCard.rawSteps
      : originalCard.recipeInstructions;

    // Punkt 4 Umsetzung:
    // A) Wenn das Rezept bereits auf Deutsch ist und rawSteps.length >= 3 hat:
    // 1:1 DIREKTE Übernahme aller Schritte (Gemini nur für Zutaten/Nährwerte verwendet!)
    if (rawSteps && rawSteps.length >= 3 && isGermanRecipeText(originalCard.title, rawSteps)) {
      item.steps = rawSteps.map((s, sIdx) => ({
        stepNumber: sIdx + 1,
        title: s.sectionTitle || `Schritt ${sIdx + 1}`,
        instruction: s.text,
        duration: extractStepDuration(s.text),
        tag: s.sectionTitle || "Zubereitung",
      }));
    } else if (rawSteps && rawSteps.length > 0) {
      // B) Harter Code-Guard für englische / übersetzte Rezepte:
      // Wenn Gemini Schritte zusammengefasst hat (geminiSteps.length < rawSteps.length),
      // rekonstruieren wir GARANTIERT alle rawSteps.length Schritte!
      const geminiSteps = Array.isArray(item.steps) ? item.steps : [];
      if (geminiSteps.length < rawSteps.length) {
        item.steps = rawSteps.map((raw, sIdx) => {
          const gStep = geminiSteps[sIdx];
          const hasMatchingInstruction = geminiSteps.length === rawSteps.length && gStep?.instruction;
          return {
            stepNumber: sIdx + 1,
            title: raw.sectionTitle || gStep?.title || `Schritt ${sIdx + 1}`,
            instruction: hasMatchingInstruction ? gStep.instruction : (gStep?.instruction || raw.text),
            duration: gStep?.duration || extractStepDuration(raw.text),
            tag: raw.sectionTitle || gStep?.tag || "Zubereitung",
          };
        });
      }
    }

    if (originalCard.verifiedImageUrl) {
      item.verifiedImageUrl = originalCard.verifiedImageUrl;
    }

    const recipe = convertRawToCatalogRecipe(
      item,
      originalCard,
      sourceName,
      pantry,
      { timestamp, pageNumber, batchIdx, index: i + 1 }
    );

    // Harte Bild-Zuweisung: Echtes Bild aus Unterseite oder Karte MUSS immer Vorrang haben
    const authenticImg =
      originalCard.verifiedImageUrl ||
      originalCard.ogImage ||
      originalCard.jsonLdImage ||
      (originalCard.imageUrl && !originalCard.imageUrl.includes("example.com") ? originalCard.imageUrl : "");

    if (authenticImg && /^https?:\/\//i.test(authenticImg)) {
      recipe.imageUrl = authenticImg;
      recipe.verifiedImageUrl = authenticImg;
      (recipe as any).image = authenticImg;
    }

    recipes.push(recipe);
  }

  return recipes;
}

/**
 * 2-Phasen-Scanner für eine einzelne Übersichtsseite:
 * Phase A: Rezeptkarten finden
 * Phase B: Unterseiten / JSON-LD / Print abrufen und in 3–4er Batches mit Gemini strukturieren
 */
export async function scrapeSinglePageFromWebsiteWithGemini(
  pageUrl: string,
  sourceName: string,
  pageNumber: number,
  existingTitlesSet: Set<string>,
  existingUrlsSet: Set<string>,
  pantry: any[] = [],
  options?: ScrapeSinglePageOptions
): Promise<ScrapePageResult> {
  const pageData = await fetchWebsiteContent(pageUrl, pageNumber);

  if (!pageData.content || pageData.content.length < 80) {
    return {
      recipes: [],
      nextPageUrl: pageData.nextPageUrl,
      hasMorePages: Boolean(pageData.nextPageUrl),
      pageNumber,
    };
  }

  // Phase A: Alle Rezeptkarten auf der Übersichtsseite finden
  let cards: DiscoveredRecipeCard[] = [];
  if (Array.isArray(pageData.cards) && pageData.cards.length > 0) {
    cards.push(...pageData.cards);
  }
  const extractedFromText = extractRecipeCardsFromListing(pageData.content, pageUrl);
  for (const c of extractedFromText) {
    const clean = c.recipeUrl.toLowerCase().trim().replace(/\/$/, "");
    if (!cards.some((existing) => existing.recipeUrl.toLowerCase().trim().replace(/\/$/, "") === clean)) {
      cards.push(c);
    }
  }

  // Fallback mit Gemini, falls Regex weniger als 2 Karten gefunden hat
  if (cards.length < 2) {
    try {
      const cardPrompt = `Analysiere den folgenden Webseiteninhalt von «${sourceName}» (${pageUrl}, Seite ${pageNumber}).
Extrahiere alle Rezeptkarten als JSON:
{
  "cards": [
    {
      "title": "Originaler Rezepttitel",
      "imageUrl": "echte Bild-URL aus dem Quelltext",
      "recipeUrl": "echte URL zur Rezept-Detailseite"
    }
  ]
}
Webseiteninhalt:
"""
${pageData.content.slice(0, 20000)}
"""`;

      const resp = await callGeminiProxy({
        model: "gemini-3.5-flash-lite",
        contents: cardPrompt,
        config: { temperature: 0.1, responseMimeType: "application/json" },
      });
      const txt = extractTextFromGeminiResponse(resp) ?? "";
      const cleaned = txt.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed?.cards) && parsed.cards.length > 0) {
        cards = parsed.cards.filter((c: any) => c.title && c.recipeUrl && /^https?:\/\//i.test(c.recipeUrl));
      }
    } catch {}
  }

  // Filter already existing cards
  const newCards = cards.filter((card) => {
    const lowerTitle = card.title.toLowerCase().trim();
    const cleanUrl = card.recipeUrl.toLowerCase().trim().replace(/\/$/, "");
    if (existingTitlesSet.has(lowerTitle)) return false;
    if (existingUrlsSet.has(cleanUrl)) return false;
    for (const exTitle of existingTitlesSet) {
      if (isTitleSimilar(lowerTitle, exTitle)) return false;
    }
    return true;
  });

  const pageRecipes: CatalogRecipe[] = [];

  if (newCards.length === 0) {
    const hasMore = Boolean(pageData.nextPageUrl) || (cards.length > 0 && pageNumber < 50);
    return {
      recipes: [],
      nextPageUrl: pageData.nextPageUrl,
      hasMorePages: hasMore,
      pageNumber,
    };
  }

  // Phase B: Unterseiten in Batches von max 2 Karten abrufen und verarbeiten (hohe Detailtiefe & schnelle Live-Updates)
  const BATCH_SIZE = 2;
  let processedCount = 0;

  for (let b = 0; b < newCards.length; b += BATCH_SIZE) {
    if (options?.shouldStop?.()) break;

    const currentBatchCards = newCards.slice(b, b + BATCH_SIZE);
    processedCount = Math.min(newCards.length, b + currentBatchCards.length);

    options?.onProgress?.(
      `⏳ Seite ${pageNumber}: ${newCards.length} Rezeptkarten gefunden – lade Rezept-Details (${processedCount}/${newCards.length})...`
    );

    // 1. Echte Unterseiten gedrosselt abrufen (max 2 Karten mit 150ms Pause dazwischen)
    const subpageDetailsList: RecipeSubpageDetails[] = [];
    for (let i = 0; i < currentBatchCards.length; i++) {
      if (options?.shouldStop?.()) break;
      if (i > 0) {
        await new Promise((res) => setTimeout(res, 150));
      }
      subpageDetailsList.push(await fetchRecipeSubpageDetails(currentBatchCards[i]));
    }

    if (options?.shouldStop?.()) break;

    // 2. Batch durch Gemini strukturieren & übersetzen
    const batchRecipes = await processBatchWithGemini(
      subpageDetailsList,
      sourceName,
      pageNumber,
      Math.floor(b / BATCH_SIZE) + 1,
      pantry
    );

    // Filter duplicates and record
    const uniqueBatch: CatalogRecipe[] = [];
    for (const r of batchRecipes) {
      const lower = r.title.toLowerCase().trim();
      const rawU = (r.sourceUrl || "").toLowerCase().trim().replace(/\/$/, "");
      if (existingTitlesSet.has(lower)) continue;
      if (rawU && existingUrlsSet.has(rawU)) continue;

      existingTitlesSet.add(lower);
      if (rawU) existingUrlsSet.add(rawU);
      uniqueBatch.push(r);
    }

    if (uniqueBatch.length > 0) {
      pageRecipes.push(...uniqueBatch);
      // Sofortiges Live-Callback für dieses Batch
      options?.onBatchLoaded?.(uniqueBatch, pageNumber);
      options?.onBatchRecipesFound?.(uniqueBatch, pageNumber);
    }
  }

  const hasMorePages = Boolean(pageData.nextPageUrl) || (cards.length > 0 && pageNumber < 50);

  return {
    recipes: pageRecipes,
    nextPageUrl: pageData.nextPageUrl,
    hasMorePages,
    pageNumber,
  };
}

/**
 * 2. VOLLAUTOMATISCHER REKURSIVER CRAWLER
 * Läuft Seite für Seite durch, feuert onBatchLoaded nach jedem 3-4er Batch und onPageScraped nach jeder Seite.
 * Bricht bei shouldStop() oder Ende der Seiten ab.
 * KEINE Fake-Rezepte!
 */
export async function scrapeRecipesFromWebsiteWithGemini(
  url: string,
  sourceName: string,
  pantry: any[] = [],
  options?: ScrapeWebsiteOptions
): Promise<{ recipes: CatalogRecipe[]; lastPageScanned: number }> {
  const startPage = Math.max(1, options?.startPage ?? 1);
  const autoCrawlAll = options?.autoCrawlAll ?? true;
  const maxPagesToVisit = options?.maxPages != null
    ? Math.max(1, options.maxPages)
    : (autoCrawlAll ? 30 : Math.max(1, options?.pagesToScan ?? 2));

  const existingTitles = (options?.existingTitles ?? []).map((t) => t.toLowerCase().trim());
  const existingTitlesSet = new Set(existingTitles);
  const existingUrls = (options?.existingUrls ?? []).map((u) => u.toLowerCase().trim().replace(/\/$/, ""));
  const existingUrlsSet = new Set(existingUrls);

  const allDiscoveredRecipes: CatalogRecipe[] = [];
  let currentTargetUrl = url.trim();
  let lastPageScanned = startPage - 1;

  for (let pageIdx = 0; pageIdx < maxPagesToVisit; pageIdx++) {
    if (options?.shouldStop?.()) break;

    const currentPageNum = startPage + pageIdx;

    if (options?.onProgress) {
      options.onProgress({
        currentPage: currentPageNum,
        maxPages: startPage + maxPagesToVisit - 1,
        foundRecipesCount: allDiscoveredRecipes.length,
        statusText: `Scanne Webseite (Seite ${currentPageNum})... Bisher ${allDiscoveredRecipes.length} Rezepte gefunden.`,
      });
    }

    try {
      const pageResult = await scrapeSinglePageFromWebsiteWithGemini(
        currentTargetUrl,
        sourceName,
        currentPageNum,
        existingTitlesSet,
        existingUrlsSet,
        pantry,
        {
          onProgress: (statusText) => {
            options?.onProgress?.({
              currentPage: currentPageNum,
              maxPages: startPage + maxPagesToVisit - 1,
              foundRecipesCount: allDiscoveredRecipes.length,
              statusText,
            });
          },
          onBatchLoaded: (batch, pNum) => {
            allDiscoveredRecipes.push(...batch);
            options?.onBatchLoaded?.(batch, pNum);
            options?.onBatchRecipesFound?.(batch, pNum);

            // Sofort im localStorage sichern
            try {
              const stored = getStoredCustomRecipes();
              const nextStored = [
                ...batch,
                ...stored.filter((r) => !batch.some((nr) => nr.id === r.id)),
              ];
              localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(nextStored));
            } catch {}
          },
          shouldStop: options?.shouldStop,
        }
      );

      if (options?.shouldStop?.()) break;

      lastPageScanned = currentPageNum;

      if (pageResult.recipes.length > 0) {
        options?.onPageScraped?.(pageResult.recipes, currentPageNum, pageResult.hasMorePages);
      }

      // Ende erreicht wenn keine Folgeseite mehr vorhanden ist
      if (!pageResult.hasMorePages) {
        break;
      }

      if (pageResult.nextPageUrl) {
        const parsedNext = new URL(pageResult.nextPageUrl);
        const cleanNextPath = parsedNext.pathname.toLowerCase().replace(/\/$/, "");
        if (
          !/\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js)$/i.test(cleanNextPath) &&
          !cleanNextPath.includes("/cookbook") &&
          !cleanNextPath.includes("/shop") &&
          !cleanNextPath.includes("/wp-content/") &&
          !cleanNextPath.includes("/uploads/") &&
          !cleanNextPath.includes("/assets/") &&
          !cleanNextPath.includes("/static/") &&
          !cleanNextPath.includes("/images/") &&
          !cleanNextPath.includes("/media/") &&
          !cleanNextPath.includes("/feed/") &&
          !cleanNextPath.includes("/wp-json/")
        ) {
          currentTargetUrl = pageResult.nextPageUrl;
        } else {
          break;
        }
      } else {
        // Fallback: Wenn URL ein /page/N/ Muster enthält oder Parameter
        try {
          const parsed = new URL(currentTargetUrl);
          const cleanPath = parsed.pathname.toLowerCase().replace(/\/$/, "");
          if (
            /\.(jpg|jpeg|png|webp|gif|svg|pdf|css|js)$/i.test(cleanPath) ||
            cleanPath.includes("/wp-content/") ||
            cleanPath.includes("/uploads/") ||
            cleanPath.includes("/assets/") ||
            cleanPath.includes("/static/") ||
            cleanPath.includes("/images/") ||
            cleanPath.includes("/media/") ||
            cleanPath.includes("/feed/") ||
            cleanPath.includes("/wp-json/")
          ) {
            break; // Stop immediately, niemals /page/2/ an Bild anhängen!
          }
          if (parsed.pathname.match(/\/page\/\d+/)) {
            parsed.pathname = parsed.pathname.replace(/\/page\/\d+/, `/page/${currentPageNum + 1}`);
            currentTargetUrl = parsed.toString();
          } else if (parsed.searchParams.has("page")) {
            parsed.searchParams.set("page", String(currentPageNum + 1));
            currentTargetUrl = parsed.toString();
          } else if (pageResult.recipes.length > 0 && currentPageNum < maxPagesToVisit) {
            currentTargetUrl = `${parsed.origin}${cleanPath}/page/${currentPageNum + 1}/`;
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    } catch (err) {
      console.warn(`Fehler beim Scannen von Seite ${currentPageNum}:`, err);
      break;
    }
  }

  // KEINE Fake-Rezepte! Wenn nichts gefunden wurde, geben wir ehrlich das leere Array zurück.
  return { recipes: allDiscoveredRecipes, lastPageScanned: Math.max(startPage, lastPageScanned) };
}

export async function importRecipeFromTextOrUrlWithGemini(
  content: string,
  pantryItems: Array<{ name: string; amount?: number }>
): Promise<{ recipe: CatalogRecipe; missingIngredients: RawGeminiIngredient[]; rawIngredients: RawGeminiIngredient[] }> {
  const isUrl = /^https?:\/\//i.test(content.trim());
  let contentToAnalyze = content.trim();
  let sourceDomain = "Importiert";
  let extractedImageUrl: string | undefined;

  let fetchedRecipe: any;
  if (isUrl) {
    try {
      sourceDomain = new URL(content.trim()).hostname.replace(/^www\./, "");
    } catch {
      sourceDomain = "Web-Rezept";
    }

    try {
      const fetched = await fetchWebsiteContent(content.trim(), 1);
      if (fetched.content && fetched.content.length > 80) {
        contentToAnalyze = fetched.content;
      }
      if (fetched.cards && fetched.cards.length > 0 && fetched.cards[0].imageUrl) {
        extractedImageUrl = fetched.cards[0].imageUrl;
      }
      if (fetched.recipe) {
        fetchedRecipe = fetched.recipe;
        if (fetchedRecipe.imageUrl) {
          extractedImageUrl = fetchedRecipe.imageUrl;
        }
      }
    } catch {}
  }

  const prompt = `Du bist ein Rezept-Extraktor. Analysiere diesen Rezept-Inhalt (${isUrl ? "Weblink" : "Text/Social-Media Caption/Notiz"}) und extrahiere daraus ein strukturiertes Rezept für EINE PORTION (Basisportionierung).

WICHTIGE REGELN:
- Fasse Gewürze NIEMALS zusammen! Jedes Gewürz (z.B. "Paprikapulver edelsüß", "Knoblauchpulver", "Salz", "Schwarzer Pfeffer") MUSS als separater Eintrag im "ingredients"-Array aufgeführt werden.
- NIEMALS "Gewürze (Paprika, Knoblauch, Salz)" oder "Salz & Pfeffer" in einer einzigen Zeile bündeln!
- ERFINDE NIEMALS LINKS ODER URLS: Gib keine fiktiven Quellen-Links, Website-URLs oder Video-URLs aus.
- ZUBEREITUNGSSCHRITTE: Kürze oder vereinfache die Zubereitungsschritte der Webseite NIEMALS! Übernimm ALLE detaillierten Schritte, Garzeiten, Temperaturen und Mengenangaben vollständig und detailliert aus dem Original-Rezept. Wenn das Original auf Englisch ist, übersetze jeden Schritt Detail für Detail ins Deutsche.

Inhalt zum Extrahieren:
"""
${contentToAnalyze.slice(0, 45000)}
"""

Antworte AUSSCHLIESSLICH mit gültigem JSON im folgenden Schema ohne Markdown-Formatierung:
{
  "title": "Prägnanter Rezeptname",
  "subtitle": "Kurze, appetitliche Beschreibung (1 Satz)",
  "category": "Hauptgericht" | "Frühstück" | "Snack" | "Dessert" | "Backen",
  "time": "Zubereitungszeit (z.B. 20 Min.)",
  "difficulty": "Einfach" | "Mittel",
  "baseCal": 450,
  "baseProt": 25,
  "baseCarb": 50,
  "baseCost": 2.80,
  "chefTip": "Praktischer Profi-Tipp",
  "imageUrl": "echte Bild-URL falls im Text/JSON-LD vorhanden, sonst leer",
  "imageKeywords": "z.B. pasta, curry, salad, pizza",
  "tone": "mint" | "sage" | "amber",
  "ingredients": [
    {
      "name": "Zutatenname (z.B. Spaghetti, Olivenöl, Knoblauch)",
      "baseAmountPerPortion": 100,
      "unit": "g" | "ml" | "Stk." | "TL" | "EL",
      "optional": false
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Vorbereiten",
      "instruction": "Detaillierte Anweisung für diesen Schritt mit allen Zeiten und Temperaturen.",
      "duration": "5 Min.",
      "tag": "Vorbereitung"
    }
  ]
}`;

  let parsed: RawGeminiRecipe;
  try {
    const data = await callGeminiProxy({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: { temperature: 0.2, responseMimeType: "application/json" },
    });

    const responseText = extractTextFromGeminiResponse(data) ?? "";
    const cleaned = responseText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (geminiErr) {
    if (fetchedRecipe && (fetchedRecipe.ingredients?.length || fetchedRecipe.steps?.length)) {
      const parsedIngredients = parseRawIngredientStrings(fetchedRecipe.ingredients || []);
      const parsedSteps = (fetchedRecipe.steps || []).map((s: any, idx: number) => ({
        stepNumber: idx + 1,
        title: s.sectionTitle || `Schritt ${idx + 1}`,
        instruction: s.text || s.instruction || "",
        duration: extractStepDuration(s.text || s.instruction || ""),
        tag: s.sectionTitle || "Zubereitung",
      }));
      parsed = {
        title: fetchedRecipe.title || "Original-Rezept",
        subtitle: "Direkt aus der Quelle importiert",
        category: getRecipeCategory({ title: fetchedRecipe.title }),
        time: fetchedRecipe.totalTime || fetchedRecipe.prepTime || "25 Min.",
        difficulty: "Einfach",
        baseCal: 450,
        baseProt: 20,
        baseCarb: 48,
        baseCost: 2.5,
        chefTip: "Frisch zubereitet schmeckt es am besten!",
        imageUrl: fetchedRecipe.imageUrl || extractedImageUrl || "",
        ingredients: parsedIngredients,
        steps: parsedSteps,
      };
    } else {
      throw geminiErr;
    }
  }

  parsed.ingredients = decomposeCompositeIngredients(parsed.ingredients);

  const recipeId = "imported-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const rawCandidateImg = (parsed as any).imageUrl || extractedImageUrl || "";
  const imageUrl =
    rawCandidateImg && /^https?:\/\//i.test(rawCandidateImg) && !rawCandidateImg.includes("example.com")
      ? rawCandidateImg.trim()
      : resolveRecipeFoodImage(parsed.title, parsed.imageKeywords);

  const inStockIngredients = parsed.ingredients.filter((ing) =>
    findMatchingPantryItem(ing.name, pantryItems as any) !== null
  );

  const missingIngredients = parsed.ingredients.filter((ing) => !inStockIngredients.includes(ing));
  const calculatedMatchScore = Math.round(
    (inStockIngredients.length / Math.max(1, parsed.ingredients.length)) * 100
  );

  if (!sourceDomain || sourceDomain === "Importiert") {
    if (isUrl) {
      try {
        sourceDomain = new URL(content.trim()).hostname.replace(/^www\./, "");
      } catch {
        sourceDomain = "Web-Rezept";
      }
    }
  }

  const recipe: CatalogRecipe = {
    id: recipeId,
    title: parsed.title,
    subtitle: parsed.subtitle || "Aus dem Web / Social Media importiert",
    category: parsed.category || getRecipeCategory({ title: parsed.title, subtitle: parsed.subtitle }),
    source: sourceDomain,
    sourceUrl: isUrl ? content.trim() : undefined,
    time: parsed.time || "20 Min.",
    difficulty: parsed.difficulty || "Einfach",
    baseCal: Math.round(Number(parsed.baseCal) || 450),
    baseProt: Math.round(Number(parsed.baseProt) || 20),
    baseCarb: Math.round(Number(parsed.baseCarb) || 45),
    baseCost: Number(parsed.baseCost) || 2.5,
    tone: parsed.tone || "mint",
    chefTip: parsed.chefTip || "Frisch zubereitet schmeckt es am besten!",
    imageUrl,
    isAiGenerated: true,
    matchScore: calculatedMatchScore,
    rawIngredients: parsed.ingredients,
    ingredients: parsed.ingredients,
    optional:
      missingIngredients.length > 0
        ? `Fehlt: ${missingIngredients.map((m) => m.name).slice(0, 3).join(", ")}`
        : "Alles im Vorrat vorhanden",
    available: (s: number) => {
      if (inStockIngredients.length > 0) {
        return inStockIngredients
          .slice(0, 3)
          .map((ing) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
          .join(" · ");
      }
      return parsed.ingredients
        .slice(0, 3)
        .map((ing) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
        .join(" · ");
    },
    ingredientsList: (s: number) => {
      return parsed.ingredients.map((ing) => ({
        name: ing.name,
        amount: `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit}`,
        optional: Boolean(ing.optional),
      }));
    },
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.map((st, idx) => ({
          stepNumber: st.stepNumber || idx + 1,
          title: st.title || `Schritt ${idx + 1}`,
          instruction: st.instruction || "",
          duration: st.duration || "3 Min.",
          tag: st.tag || "Kochen",
        }))
      : [],
  };

  saveCustomRecipe(recipe, parsed.ingredients);

  return {
    recipe,
    missingIngredients,
    rawIngredients: parsed.ingredients,
  };
}

/**
 * Multimodal Video Recipe Extraction (TikTok, Instagram Reels, MP4, WebM)
 * Uses Gemini 3.8 Flash to analyze video frames, on-screen text overlays, and audio track.
 */
export async function importRecipeFromVideoWithGemini(
  file: File,
  pantryItems: Array<{ name: string; amount?: number }>
): Promise<{ recipe: CatalogRecipe; missingIngredients: RawGeminiIngredient[]; rawIngredients: RawGeminiIngredient[] }> {
  // Check file size (browsers support up to ~25MB in inline data base64)
  if (file.size > 26 * 1024 * 1024) {
    throw new Error("Das Video ist über 25 MB groß. Bitte wähle einen kürzeren Clip oder komprimiere das Video leicht für die Analyse.");
  }

  // Convert File to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const prompt = `Du bist ein erstklassiger KI-Chefkoch und multimodaler Video-Rezept-Analyst.
Analysiere dieses Kochvideo (Reel, TikTok oder Video-Clip) ganzheitlich:
1. Visuelle Erkennung: Welche Zutaten werden im Video vorbereitet, geschnitten, gewürzt, in Pfannen/Töpfe gegeben oder angerichtet? Achte genau auf Texteinblendungen im Bild.
2. Tonspur & Sprache: Welche Zutaten, Mengen, Gewürze oder Garzeiten werden im Video erwähnt oder erklärt?
3. Extrahiere daraus ein strukturiertes Rezept für EINE PORTION (Basisportionierung).
4. Schätze realistische Nährwerte (Kalorien, Protein, Kohlenhydrate) und erstelle eine klare Schritt-für-Schritt-Anleitung.

WICHTIGE REGEL FÜR GEWÜRZE & ZUTATEN:
- Fasse Gewürze NIEMALS zusammen! Jedes Gewürz (z.B. "Paprikapulver edelsüß", "Knoblauchpulver", "Salz", "Schwarzer Pfeffer") MUSS als separater Eintrag im "ingredients"-Array aufgeführt werden.
- NIEMALS "Gewürze (Paprika, Knoblauch, Salz)" oder "Salz & Pfeffer" in einer einzigen Zeile bündeln!
- ERFINDE NIEMALS LINKS ODER URLS: Gib keine fiktiven Quellen-Links, Website-URLs oder Video-URLs aus.

Antworte AUSSCHLIESSLICH mit gültigem JSON im folgenden Schema ohne Markdown-Formatierung:
{
  "title": "Prägnanter, ansprechender Rezeptname",
  "subtitle": "Kurze, appetitliche Beschreibung (1 Satz)",
  "category": "Hauptgericht" | "Frühstück" | "Snack" | "Dessert" | "Backen",
  "time": "Zubereitungszeit (z.B. 15 Min.)",
  "difficulty": "Einfach" | "Mittel",
  "baseCal": 480,
  "baseProt": 28,
  "baseCarb": 45,
  "baseCost": 3.20,
  "chefTip": "Praktischer Profi-Tipp aus dem Video",
  "imageKeywords": "z.B. wrap, chicken, tacos, bowl, pasta",
  "tone": "mint" | "sage" | "amber",
  "ingredients": [
    {
      "name": "Zutatenname (z.B. Hähnchenbrust, Tortilla Wraps, Avocado)",
      "baseAmountPerPortion": 150,
      "unit": "g" | "ml" | "Stk." | "TL" | "EL",
      "optional": false
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Vorbereitung",
      "instruction": "Detaillierte Anweisung für diesen Schritt.",
      "duration": "4 Min.",
      "tag": "Prep"
    }
  ]
}`;

  const mimeType = file.type || "video/mp4";

  const data = await callGeminiProxy({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: { temperature: 0.2, responseMimeType: "application/json" },
    inlineData: { data: base64Data, mimeType },
  });

  const responseText = extractTextFromGeminiResponse(data) ?? "";
  const cleaned = responseText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed: RawGeminiRecipe = JSON.parse(cleaned);
  parsed.ingredients = decomposeCompositeIngredients(parsed.ingredients);

  const recipeId = "video-recipe-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const imageUrl = resolveRecipeFoodImage(parsed.title, parsed.imageKeywords);

  const inStockIngredients = parsed.ingredients.filter((ing) =>
    findMatchingPantryItem(ing.name, pantryItems as any) !== null
  );

  const missingIngredients = parsed.ingredients.filter((ing) => !inStockIngredients.includes(ing));
  const calculatedMatchScore = Math.round(
    (inStockIngredients.length / Math.max(1, parsed.ingredients.length)) * 100
  );

  const recipe: CatalogRecipe = {
    id: recipeId,
    title: parsed.title,
    subtitle: parsed.subtitle || "Aus Video / Reel analysiert",
    category: parsed.category || getRecipeCategory({ title: parsed.title, subtitle: parsed.subtitle }),
    source: "Video / Reel",
    time: parsed.time || "20 Min.",
    difficulty: parsed.difficulty || "Einfach",
    baseCal: Math.round(Number(parsed.baseCal) || 450),
    baseProt: Math.round(Number(parsed.baseProt) || 20),
    baseCarb: Math.round(Number(parsed.baseCarb) || 45),
    baseCost: Number(parsed.baseCost) || 2.5,
    tone: parsed.tone || "mint",
    chefTip: parsed.chefTip || "Frisch zubereitet schmeckt es am besten!",
    imageUrl,
    isAiGenerated: true,
    matchScore: calculatedMatchScore,
    rawIngredients: parsed.ingredients,
    ingredients: parsed.ingredients,
    optional:
      missingIngredients.length > 0
        ? `Fehlt: ${missingIngredients.map((m) => m.name).slice(0, 3).join(", ")}`
        : "Alles im Vorrat vorhanden",
    available: (s: number) => {
      if (inStockIngredients.length > 0) {
        return inStockIngredients
          .slice(0, 3)
          .map((ing) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
          .join(" · ");
      }
      return parsed.ingredients
        .slice(0, 3)
        .map((ing) => `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit} ${ing.name}`)
        .join(" · ");
    },
    ingredientsList: (s: number) => {
      return parsed.ingredients.map((ing) => ({
        name: ing.name,
        amount: `${Math.round(ing.baseAmountPerPortion * s)} ${ing.unit}`,
        optional: Boolean(ing.optional),
      }));
    },
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.map((st, idx) => ({
          stepNumber: st.stepNumber || idx + 1,
          title: st.title || `Schritt ${idx + 1}`,
          instruction: st.instruction || "",
          duration: st.duration || "3 Min.",
          tag: st.tag || "Kochen",
        }))
      : [],
  };

  saveCustomRecipe(recipe, parsed.ingredients);

  return {
    recipe,
    missingIngredients,
    rawIngredients: parsed.ingredients,
  };
}

export interface AskRecipeContext {
  recipeTitle: string;
  stepNumber?: number;
  stepTitle?: string;
  stepInstruction?: string;
  ingredientsSummary?: string;
  servings?: number;
  pantrySummary?: string;
}

export async function askAboutRecipeWithGemini(
  question: string,
  context: AskRecipeContext
): Promise<string> {
  const q = question.trim().toLowerCase();

  // 1. Try Gemini AI first if API key is present
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    const prompt = `Du bist ein erfahrener, sympathischer Küchenchef in einer smarten Koch-App.
Der Nutzer kocht gerade folgendes Rezept:
- Gericht: "${context.recipeTitle}"
- Aktueller Schritt (${context.stepNumber ? `Schritt ${context.stepNumber}` : "Aktuell"}): "${context.stepTitle || "Zubereitung"}"
- Anweisung: "${context.stepInstruction || "Zutaten zubereiten"}"
- Zutaten (für ${context.servings || 2} Personen): ${context.ingredientsSummary || "Standardzutaten"}
${context.pantrySummary ? `- Vorrat des Nutzers: ${context.pantrySummary}` : ""}

Frage des Nutzers:
"${question}"

ANWEISUNG AN DICH ALS CHEFKOCH:
1. Antworte sofort direkt und praxisnah auf Deutsch. Maximal 2 bis 4 kurze Sätze.
2. Wenn der Nutzer nach Gewürz vs. Pesto fragt (z. B. Basilikum): Kläre auf, was das Original meint (z. B. frische Blätter oder getrocknetes Gewürz) und wie Pesto stattdessen dosiert werden kann (z. B. 1–2 TL Pesto, Salz dann reduzieren).
3. Wenn nach Alternativen für Pasta / Nudeln gefragt wird (z. B. andere Nudelarten wie Penne, Rigatoni, Paccheri oder Spaghetti statt Calamarata): Beantworte direkt welche Nudelformen ideal passen (z. B. kurze Röhrennudeln für cremige Saucen) und worauf man achten soll (al dente Kochzeit laut Packung).
4. Wenn nach Alternativen für Zutaten gefragt wird: Nenne konkrete Vorrats-Substituten.
5. Wenn nach Hitze, Garzeit oder Konsistenz gefragt wird: Gib präzise Herd-Stufen oder Minuten an.
6. Kein langes Vorgeplänkel, direkt die Lösung für die Küche.`;

    try {
      const resp = await callGeminiProxy({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
        config: { temperature: 0.3 },
      });

      const text = extractTextFromGeminiResponse(resp);
      if (text) return text;
    } catch (err) {
      console.warn("[askAboutRecipeWithGemini] Proxy-Anfrage fehlgeschlagen:", err);
    }
  }

  // 2. Intelligent culinary rule-based fallback (for offline or key issues)
  if (q.includes("basilikum") || q.includes("pesto") || q.includes("gewürz") || q.includes("gewurz")) {
    return "Im Rezept ist standardmäßig frisches Basilikum (oder alternativ getrocknetes Basilikum-Gewürz) gemeint. Wenn du Basilikum-Pesto da hast, kannst du wunderbar 1–2 TL Pesto unterrühren – das verleiht eine herrlich aromatische, nussige Note. Reduziere dann etwas das zusätzliche Salz, da Pesto bereits gewürzt ist!";
  }

  if (q.includes("nudel") || q.includes("pasta") || q.includes("calamarata") || q.includes("penne") || q.includes("spaghetti") || q.includes("rigatoni") || q.includes("fusilli") || q.includes("teigwaren")) {
    return "Na klar, du kannst problemlos auch eine andere Nudelsorte verwenden! Für cremige Saucen wie hier passen kurze Röhren- oder Spiralnudeln wie Penne Rigate, Rigatoni, Paccheri oder Fusilli besonders gut, weil die Sauce perfekt haften bleibt. Aber auch Spaghetti oder Tagliatelle funktionieren wunderbar – halte dich einfach an die Kochzeit auf der Packung für 'al dente'.";
  }

  if (q.includes("ersatz") || q.includes("ersetzen") || q.includes("alternative") || q.includes("kein") || q.includes("fehlt") || q.includes("austauschen")) {
    return "Kein Problem: Sahne kannst du durch Milch mit 1 TL Butter oder etwas Frischkäse ersetzen; frische Zwiebeln durch Schalotten oder Lauch; Tomaten durch passierte Tomaten oder Paprika. Das Gericht gelingt trotzdem hervorragend!";
  }

  if (q.includes("hitze") || q.includes("temperatur") || q.includes("stufe") || q.includes("anbraten") || q.includes("kochen") || q.includes("herd")) {
    return "Für das Anbraten (z. B. Fleisch oder Zwiebeln) wähle mittlere bis hohe Hitze (Stufe 7 von 9), um Röstaromen zu bekommen. Sobald Sauce oder Flüssigkeit dazukommt, auf kleine Hitze (Stufe 3–4) herunterschalten und sanft ziehen lassen.";
  }

  if (q.includes("dauer") || q.includes("lange") || q.includes("zeit") || q.includes("wann fertig") || q.includes("gar")) {
    return `Orientier dich an ca. ${context.stepInstruction?.match(/\d+\s*Min/)?.[0] || "3-5 Minuten"}. Das Gericht ist fertig, wenn die Textur cremig ist und alles heiß durchgezogen ist.`;
  }

  return `Für «${context.recipeTitle}» bei Schritt «${context.stepTitle || "Zubereitung"}»: Halte die Hitze moderat und schmecke zwischendurch mit einer Prise Salz und Pfeffer ab. Die Zutaten verbinden sich am besten, wenn du sie bei sanfter Hitze 1–2 Minuten durchziehen lässt!`;
}


