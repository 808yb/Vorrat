import { GoogleGenAI } from '@google/genai';
import { type CatalogRecipe, type RecipeStep } from '../data/recipeCatalog';

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
  time: string;
  difficulty: "Einfach" | "Mittel" | "Super Einfach";
  baseCal: number;
  baseProt: number;
  baseCarb: number;
  baseCost: number;
  chefTip: string;
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

const STORAGE_CUSTOM_RECIPES_KEY = "forret_custom_recipes";

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
    : [];

  // If ingredients are still empty, reconstruct from title and subtitle
  if (rawIngredients.length === 0) {
    rawIngredients = extractIngredientsFromDishText(title, item.subtitle || "");
  }

  const imageUrl = item.imageUrl || resolveRecipeFoodImage(title, item.imageKeywords);

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

export function getStoredCustomRecipes(): CatalogRecipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_RECIPES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map(rehydrateCustomRecipe);
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
    localStorage.setItem(STORAGE_CUSTOM_RECIPES_KEY, JSON.stringify(next));
  } catch (err) {
    console.error("Fehler beim Speichern des Rezepts im localStorage:", err);
  }
}

export function getGeminiApiKey(): string {
  return (
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
    ""
  );
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

Antworte STRIKT als valides JSON nach diesem Schema (OHNE Markdown, kein \`\`\`json):
{
  "title": "Gerichtsname",
  "subtitle": "Knackige Kurzbeschreibung",
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

async function callGeminiCascade(apiKey: string, prompt: string): Promise<RawGeminiRecipe | null> {
  const models = [
    "gemini-3.8-flash",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
  ];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.7,
            },
          }),
        }
      );

      if (!res.ok) {
        console.warn(`[Gemini Cascade] ${model} antwortete mit ${res.status}: ${res.statusText}`);
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleanJson = rawText.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      const parsed: RawGeminiRecipe = JSON.parse(cleanJson);
      if (parsed && parsed.title && Array.isArray(parsed.ingredients) && Array.isArray(parsed.steps)) {
        console.info(`[Gemini Cascade] Erfolgreich geladen von Modell: ${model}`);
        return parsed;
      }
    } catch (err) {
      console.warn(`[Gemini Cascade] Fehler bei Modell ${model}:`, err);
    }
  }

  // Fallback to official SDK
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const text = response.text ? response.text.trim() : "";
    const cleanJson = text.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleanJson);
    if (parsed && parsed.title && Array.isArray(parsed.ingredients)) {
      return parsed;
    }
  } catch (sdkErr) {
    console.warn("[Gemini Cascade] SDK Fallback fehlgeschlagen:", sdkErr);
  }

  return null;
}

  let parsed: RawGeminiRecipe | null = await callGeminiCascade(apiKey, prompt);

  if (!parsed || !parsed.title || !Array.isArray(parsed.ingredients)) {
    parsed = buildSmartFallbackRecipe(userQuery, pantry);
  }

  const recipeId = `ai-${Date.now()}`;
  const imageUrl = resolveRecipeFoodImage(parsed.title, parsed.imageKeywords);

  // Honest pantry comparison
  const inStockIngredients = parsed.ingredients.filter((ing) =>
    pantry.some((p) => {
      const pLower = p.name.toLowerCase();
      const iLower = ing.name.toLowerCase();
      return pLower.includes(iLower) || iLower.includes(pLower);
    })
  );
  const missingIngredients = parsed.ingredients.filter((ing) => !inStockIngredients.includes(ing));
  const calculatedMatchScore = Math.round(
    (inStockIngredients.length / Math.max(1, parsed.ingredients.length)) * 100
  );

  const newRecipe: CatalogRecipe = {
    id: recipeId,
    title: parsed.title,
    subtitle: parsed.subtitle || "Frisch kreiert mit deiner AI",
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

export async function importRecipeFromTextOrUrlWithGemini(
  content: string,
  pantryItems: Array<{ name: string; amount?: number }>
): Promise<{ recipe: CatalogRecipe; missingIngredients: RawGeminiIngredient[]; rawIngredients: RawGeminiIngredient[] }> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Kein Gemini API-Schlüssel hinterlegt. Bitte erstelle einen Key in Google AI Studio.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const isUrl = /^https?:\/\//i.test(content.trim());

  const prompt = `Du bist ein Rezept-Extraktor. Analysiere diesen Rezept-Inhalt (${isUrl ? "Weblink" : "Text/Social-Media Caption/Notiz"}) und extrahiere daraus ein strukturiertes Rezept für EINE PORTION (Basisportionierung).

Inhalt zum Extrahieren:
"""
${content.trim().slice(0, 4000)}
"""

Antworte AUSSCHLIESSLICH mit gültigem JSON im folgenden Schema ohne Markdown-Formatierung:
{
  "title": "Prägnanter Rezeptname",
  "subtitle": "Kurze, appetitliche Beschreibung (1 Satz)",
  "time": "Zubereitungszeit (z.B. 20 Min.)",
  "difficulty": "Einfach" | "Mittel",
  "baseCal": 450,
  "baseProt": 25,
  "baseCarb": 50,
  "baseCost": 2.80,
  "chefTip": "Praktischer Profi-Tipp",
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
      "instruction": "Detaillierte Anweisung für diesen Schritt.",
      "duration": "5 Min.",
      "tag": "Vorbereitung"
    }
  ]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const responseText = response.text?.trim() || "";
  const cleaned = responseText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed: RawGeminiRecipe = JSON.parse(cleaned);

  const recipeId = "imported-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const imageUrl = resolveRecipeFoodImage(parsed.title, parsed.imageKeywords);

  const pantryNames = pantryItems.map((p) => p.name.toLowerCase().trim());
  const inStockIngredients = parsed.ingredients.filter((ing) => {
    const iLower = ing.name.toLowerCase().trim();
    return pantryNames.some((pLower) => pLower.includes(iLower) || iLower.includes(pLower));
  });

  const missingIngredients = parsed.ingredients.filter((ing) => !inStockIngredients.includes(ing));
  const calculatedMatchScore = Math.round(
    (inStockIngredients.length / Math.max(1, parsed.ingredients.length)) * 100
  );

  const recipe: CatalogRecipe = {
    id: recipeId,
    title: parsed.title,
    subtitle: parsed.subtitle || "Aus dem Web / Social Media importiert",
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

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Kein Gemini API-Schlüssel hinterlegt. Bitte erstelle einen Key in Google AI Studio.");
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

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Du bist ein erstklassiger KI-Chefkoch und multimodaler Video-Rezept-Analyst.
Analysiere dieses Kochvideo (Reel, TikTok oder Video-Clip) ganzheitlich:
1. Visuelle Erkennung: Welche Zutaten werden im Video vorbereitet, geschnitten, gewürzt, in Pfannen/Töpfe gegeben oder angerichtet? Achte genau auf Texteinblendungen im Bild.
2. Tonspur & Sprache: Welche Zutaten, Mengen, Gewürze oder Garzeiten werden im Video erwähnt oder erklärt?
3. Extrahiere daraus ein strukturiertes Rezept für EINE PORTION (Basisportionierung).
4. Schätze realistische Nährwerte (Kalorien, Protein, Kohlenhydrate) und erstelle eine klare Schritt-für-Schritt-Anleitung.

Antworte AUSSCHLIESSLICH mit gültigem JSON im folgenden Schema ohne Markdown-Formatierung:
{
  "title": "Prägnanter, ansprechender Rezeptname",
  "subtitle": "Kurze, appetitliche Beschreibung (1 Satz)",
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

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
      {
        text: prompt,
      },
    ],
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  const responseText = response.text?.trim() || "";
  const cleaned = responseText.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const parsed: RawGeminiRecipe = JSON.parse(cleaned);

  const recipeId = "video-recipe-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const imageUrl = resolveRecipeFoodImage(parsed.title, parsed.imageKeywords);

  const pantryNames = pantryItems.map((p) => p.name.toLowerCase().trim());
  const inStockIngredients = parsed.ingredients.filter((ing) => {
    const iLower = ing.name.toLowerCase().trim();
    return pantryNames.some((pLower) => pLower.includes(iLower) || iLower.includes(pLower));
  });

  const missingIngredients = parsed.ingredients.filter((ing) => !inStockIngredients.includes(ing));
  const calculatedMatchScore = Math.round(
    (inStockIngredients.length / Math.max(1, parsed.ingredients.length)) * 100
  );

  const recipe: CatalogRecipe = {
    id: recipeId,
    title: parsed.title,
    subtitle: parsed.subtitle || "Aus Video / Reel analysiert",
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

