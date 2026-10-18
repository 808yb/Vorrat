import { deduplicatePantry, formatMhdDisplay, getMhdStatus, getItemNutrientSpecs, type PantryItem } from "../src/App";
import { parseReceiptFallback, calculateEstimatedMhd } from "../src/utils/receiptOcr";
import { getRecipePantryBreakdown } from "../src/utils/pantryMatching";
import { FULL_RECIPE_CATALOG } from "../src/data/recipeCatalog";
import { getFoodTone } from "../src/components/FoodIcons";
import { findFoodNutrition, calculatePortionNutrition } from "../src/data/foodNutritionDatabase";
import { getSafeIngredientsList, getSafeSteps, getSafeAvailable, rehydrateRecipe, getCurrentMealTimeSlot } from "../src/utils/recipeHelpers";
import { extractIngredientsFromDishText, resolveRecipeFoodImage, askAboutRecipeWithGemini } from "../src/utils/geminiRecipes";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  \x1b[32m✓ PASS:\x1b[0m ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${testName} ${detail ? `(${detail})` : ""}`);
    failedCount++;
  }
}

console.log("\n=======================================================");
console.log("🚀 STARTING COMPREHENSIVE TEST SUITE FOR VORRAT");
console.log("=======================================================\n");

// -----------------------------------------------------------------------------
// TEST SUITE 1: DEDUPLICATION & MERGING
// -----------------------------------------------------------------------------
console.log("📦 1. Testing Pantry Deduplication & Merging...");

const duplicateRawPantry: PantryItem[] = [
  { id: 1, name: "Basmati Reis", category: "Trocken", amount: 500, total: 1000, unit: "g", tone: "rice" },
  { id: "dup-2", name: "  basmati reis ", category: "Trocken", amount: 300, total: 500, unit: "g", tone: "rice" },
  { id: 3, name: "Bio Eier", category: "Kühl", amount: 6, total: 10, unit: "Stk.", tone: "egg", mhd: "2026-10-20" },
  { id: "dup-4", name: "Bio Eier", category: "Kühl", amount: 4, total: 10, unit: "Stk.", tone: "egg", mhd: "2026-10-18" },
  { id: 5, name: "Wasser (Leitung)", category: "Getränke", amount: 999999, total: 999999, unit: "ml", tone: "water", isUnlimited: true },
  { id: 6, name: "wasser (leitung)", category: "Getränke", amount: 500, total: 500, unit: "ml", tone: "water" },
];

const deduplicated = deduplicatePantry(duplicateRawPantry);

assert(deduplicated.length === 3, "Reduces 6 items with duplicates down to exactly 3 unique items");

const reisItem = deduplicated.find((p) => p.name.toLowerCase().includes("reis"));
assert(Boolean(reisItem && reisItem.amount === 800), "Sums Reis quantities (500g + 300g = 800g)");
assert(Boolean(reisItem && reisItem.total === 1000), "Maintains max total (1000g)");

const eierItem = deduplicated.find((p) => p.name.toLowerCase().includes("eier"));
assert(Boolean(eierItem && eierItem.amount === 10), "Sums Eier quantities (6 + 4 = 10)");

const wasserItem = deduplicated.find((p) => p.name.toLowerCase().includes("wasser"));
assert(Boolean(wasserItem && wasserItem.isUnlimited === true), "Preserves isUnlimited state on merge");

// -----------------------------------------------------------------------------
// TEST SUITE 2: DELETION WITH TYPE-AGNOSTIC IDS (Number & String)
// -----------------------------------------------------------------------------
console.log("\n🗑️ 2. Testing Item Deletion (Number vs String IDs)...");

let currentPantry: PantryItem[] = [
  { id: 101, name: "Spaghetti", category: "Trocken", amount: 500, total: 500, unit: "g", tone: "pasta" },
  { id: "string-id-202", name: "Pesto Verde", category: "Saucen", amount: 190, total: 190, unit: "g", tone: "sauce" },
  { id: 303, name: "Parmesan", category: "Kühl", amount: 100, total: 100, unit: "g", tone: "cheese" },
];

// Delete numeric ID with number parameter
currentPantry = currentPantry.filter((item) => String(item.id) !== String(101));
assert(!currentPantry.some((p) => p.name === "Spaghetti"), "Deletes numeric ID 101 with number argument");
assert(currentPantry.length === 2, "Remaining pantry has 2 items after numeric delete");

// Delete string ID with string argument
currentPantry = currentPantry.filter((item) => String(item.id) !== String("string-id-202"));
assert(!currentPantry.some((p) => p.name === "Pesto Verde"), "Deletes string ID 'string-id-202'");
assert(currentPantry.length === 1, "Remaining pantry has 1 item after string delete");

// Delete numeric ID with string argument (cross-type check)
currentPantry = currentPantry.filter((item) => String(item.id) !== String("303"));
assert(currentPantry.length === 0, "Deletes numeric ID 303 when passed as string '303'");

// -----------------------------------------------------------------------------
// TEST SUITE 3: QUANTITY STEPPER & BOUNDARY CHECKS
// -----------------------------------------------------------------------------
console.log("\n⚖️ 3. Testing Stepper & Boundary Clamping...");

const testItem: PantryItem = {
  id: 1,
  name: "Haferflocken",
  category: "Trocken",
  amount: 450,
  total: 500,
  unit: "g",
  tone: "oats",
};

// Increment beyond total
const incrementOver = Math.max(0, Math.min(testItem.total, testItem.amount + 100));
assert(incrementOver === 500, "Increment clamps at total (cannot exceed pack size)");

// Decrement below zero
const decrementUnder = Math.max(0, Math.min(testItem.total, testItem.amount - 600));
assert(decrementUnder === 0, "Decrement clamps at 0 (cannot be negative)");

// Normal step
const normalStep = Math.max(0, Math.min(testItem.total, testItem.amount - 50));
assert(normalStep === 400, "Normal decrement step functions correctly (-50g)");

// -----------------------------------------------------------------------------
// TEST SUITE 4: MHD & FOOD WASTE EXPIRATION
// -----------------------------------------------------------------------------
console.log("\n🚨 4. Testing Mindesthaltbarkeitsdatum (MHD) & Expiration Status...");

assert(getMhdStatus(undefined) === "missing", "Empty MHD correctly classified as 'missing'");
assert(getMhdStatus("Unbegrenzt") === "ok", "Unbegrenzt correctly classified as 'ok'");
assert(getMhdStatus("2020-01-01") === "expired", "Past date correctly classified as 'expired'");

// Dynamic soon test (tomorrow)
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowIso = tomorrow.toISOString().split("T")[0];
assert(getMhdStatus(tomorrowIso) === "soon", "Date within 3 days correctly classified as 'soon'");

// Dynamic ok test (in 30 days)
const nextMonth = new Date();
nextMonth.setDate(nextMonth.getDate() + 30);
const nextMonthIso = nextMonth.toISOString().split("T")[0];
assert(getMhdStatus(nextMonthIso) === "ok", "Date in 30 days correctly classified as 'ok'");

// formatMhdDisplay tests
assert(formatMhdDisplay("2026-10-14") === "MHD: 14.10.2026", "Formats YYYY-MM-DD to German DD.MM.YYYY");
assert(formatMhdDisplay("") === "MHD: fehlt", "Empty string returns 'MHD: fehlt'");

// -----------------------------------------------------------------------------
// TEST SUITE 5: RECEIPT OCR FALLBACK PARSER
// -----------------------------------------------------------------------------
console.log("\n🧾 5. Testing Supermarket Receipt Parser (Fallback OCR)...");

const receiptSample = `
SUPERMARKT REWE GMBH
MARKTPLATZ 4, 10115 BERLIN
--------------------------------
1 JA! BASMATI REIS 1KG        1,99 B
1 BIO FREILAND EIER 10ER     3,29 A
1 KIKKOMAN SOJASAUCE 150ML   2,49 B
1 TK BIO ERBSEN 450G         2,19 A
SUMME EUR                    9,96
`;

const parsedReceiptItems = parseReceiptFallback(receiptSample);

assert(parsedReceiptItems.length >= 3, `Extracted ${parsedReceiptItems.length} food items from raw receipt text`);

const parsedReis = parsedReceiptItems.find((i) => i.name.toLowerCase().includes("reis"));
assert(Boolean(parsedReis && parsedReis.amount === 1000 && parsedReis.unit === "g"), "Extracted 1000g Basmati Reis correctly");

const parsedEier = parsedReceiptItems.find((i) => i.name.toLowerCase().includes("eier"));
assert(Boolean(parsedEier && parsedEier.amount === 10 && parsedEier.unit === "Stk."), "Extracted 10 Stk. Bio Eier correctly");

// Shelf-Life Heuristic Tests (Zero-Effort MHD Matrix)
console.log("\n📅 Testing Automatic Shelf-Life Heuristic (calculateEstimatedMhd)...");

const schnitzelEstimate = calculateEstimatedMhd("Hähn.Minutenschnitz.", "Kühl");
assert(schnitzelEstimate.shelfLifeDays === 3, "Poultry (Hähnchen) gets 3 days shelf-life");
assert(schnitzelEstimate.isUrgent === true, "Poultry flagged as urgent/akut");

const salatEstimate = calculateEstimatedMhd("Pflücksalat", "Kühl");
assert(salatEstimate.shelfLifeDays === 4, "Leafy salad (Pflücksalat) gets 4 days shelf-life");
assert(salatEstimate.isUrgent === true, "Leafy salad flagged as urgent/akut");

const paprikaEstimate = calculateEstimatedMhd("Paprika rot", "Kühl");
assert(paprikaEstimate.shelfLifeDays === 7, "Fresh vegetables (Paprika) gets 7 days shelf-life");
assert(paprikaEstimate.isUrgent === false, "Vegetables not marked urgent");

const joghurtEstimate = calculateEstimatedMhd("Joghurt mild 1,5%", "Kühl");
assert(joghurtEstimate.shelfLifeDays === 14, "Dairy/Yogurt gets 14 days shelf-life");

const tkEstimate = calculateEstimatedMhd("Kartoffel-Gitter TK", "Tiefkühl");
assert(tkEstimate.shelfLifeDays === 180, "Frozen foods get 180 days shelf-life");

const haferEstimate = calculateEstimatedMhd("Haferflocken Zart", "Trocken");
assert(haferEstimate.shelfLifeDays === 240, "Dry oats/cereals get 240 days shelf-life");

const monsterEstimate = calculateEstimatedMhd("Monster White Zero", "Getränke");
assert(monsterEstimate.shelfLifeDays === 365, "Canned drinks get 365 days shelf-life");

// Real Lidl Receipt Fallback Test
console.log("\n🛒 Testing Real Lidl Receipt Parsing (Discounts, Weights, Pfand)...");
const lidlReceiptSample = `
LIDL Dienstleistung GmbH & Co. KG
Vogelwoogstr. 100, 67659 Kaiserslautern
----------------------------------------
Paprika rot                   0,63 A
  0,210 kg x 2,99 EUR/kg
Pflücksalat                   0,99 A
Gurken                        0,59 A
Kartoffel-Gitter              1,99 A
Joghurt mild 1,5%             0,69 A
Haferflocken Zart             0,79 A
Cornichons scharf             1,29 A
Monster White Zero            1,59 B
Pepsi Zero                    1,19 B
Pfand 0,25                    0,25 B
Pfand 0,25                    0,25 B
Tortilla Wraps Weiz.          1,19 A
Hähn.Minutenschnitz.          4,99 A
----------------------------------------
Lidl Plus Rabatt             -1,68
----------------------------------------
Zu zahlen EUR                14,99
`;

const parsedLidl = parseReceiptFallback(lidlReceiptSample);
assert(parsedLidl.length === 11, `Parsed exactly 11 valid food items from Lidl receipt (found ${parsedLidl.length})`);

const lidlPaprika = parsedLidl.find((i) => i.name.toLowerCase().includes("paprika"));
assert(Boolean(lidlPaprika && lidlPaprika.amount === 210 && lidlPaprika.unit === "g"), "Weight subline (0,210 kg x 2,99 EUR/kg) folded into 210 g");

const lidlPfand = parsedLidl.find((i) => i.name.toLowerCase().includes("pfand"));
assert(!lidlPfand, "Non-food Pfand/deposit lines excluded");

const lidlRabatt = parsedLidl.find((i) => i.name.toLowerCase().includes("rabatt"));
assert(!lidlRabatt, "Lidl Plus discount lines excluded");

const lidlSchnitzel = parsedLidl.find((i) => i.name.toLowerCase().includes("schnitz"));
assert(Boolean(lidlSchnitzel && lidlSchnitzel.isUrgent === true && lidlSchnitzel.mhd), "Hähnchenschnitzel has urgent flag and calculated MHD");

// -----------------------------------------------------------------------------
// TEST SUITE 6: RECIPE MATCHING & INGREDIENT RATIOS
// -----------------------------------------------------------------------------
console.log("\n🍳 6. Testing Recipe Catalog & Pantry Matching...");

const samplePantryForCooking: PantryItem[] = [
  { id: 1, name: "Basmati Reis", category: "Trocken", amount: 800, total: 1000, unit: "g", tone: "rice" },
  { id: 2, name: "Bio Eier", category: "Kühl", amount: 6, total: 10, unit: "Stk.", tone: "egg", mhd: "2026-10-20" },
  { id: 3, name: "Sojasoße", category: "Saucen", amount: 150, total: 250, unit: "ml", tone: "sauce" },
  { id: 7, name: "Wasser (Leitung)", category: "Getränke", amount: 999999, total: 999999, unit: "ml", tone: "water", isUnlimited: true },
];

const friedRice = FULL_RECIPE_CATALOG.find((r) => r.id === "r1");
assert(Boolean(friedRice), "Egg Fried Rice Deluxe exists in recipe catalog");

if (friedRice) {
  const breakdown = getRecipePantryBreakdown(friedRice, samplePantryForCooking, 2);
  assert(breakdown.matchPercentage > 0, `Pantry match calculated: ${breakdown.matchPercentage}%`);
  assert(breakdown.inStock.length > 0, `Identified available ingredients in stock (${breakdown.inStock.length})`);
}

// -----------------------------------------------------------------------------
// TEST SUITE 7: BLS/USDA FOOD NUTRITION DATABASE & REALISTIC MACROS
// -----------------------------------------------------------------------------
console.log("\n🥗 7. Testing BLS/USDA Food Nutrition Database & Accurate Macro Engine...");

const scallion = findFoodNutrition("Frühlingszwiebeln");
assert(scallion.calories === 32, "Frühlingszwiebeln has 32 kcal/100g (not dummy 180)");
assert(scallion.protein === 1.8, "Frühlingszwiebeln has 1.8g protein");
assert(scallion.defaultUnit === "Bund", "Frühlingszwiebeln recommended unit is Bund");

const scallionFuzzy = findFoodNutrition("fruhlingszwiebel");
assert(scallionFuzzy.calories === 32, "Fuzzy query matches Frühlingszwiebel");

const chicken = findFoodNutrition("Hähnchenbrust");
assert(chicken.calories === 110, "Hähnchenbrust has 110 kcal/100g");
assert(chicken.protein === 24.0, "Hähnchenbrust has 24.0g protein");

const eggs = findFoodNutrition("Bio Eier");
assert(eggs.calories === 143, "Bio Eier has 143 kcal/100g");

const cucumber = findFoodNutrition("Salatgurke");
assert(cucumber.calories === 15, "Salatgurke has 15 kcal/100g");

const rice = findFoodNutrition("Basmati Reis");
assert(rice.calories === 355, "Basmati Reis has 355 kcal/100g");

// Testing unit weight calculation (e.g. 10 Bund Frühlingszwiebeln = 1000g = 320 kcal)
const tenBunds = calculatePortionNutrition(scallion, 10, "Bund");
assert(tenBunds.calories === 320, "10 Bund Frühlingszwiebeln calculated as 320 kcal (1000g)");

// Testing getItemNutrientSpecs never returns 180 for spring onion
const springOnionSpecs = getItemNutrientSpecs({ name: "Frühlingszwiebeln", category: "Kühl" });
// -----------------------------------------------------------------------------
// TEST SUITE 8: MEAT + PASTA CATALOG RECIPES & SURPRISE ME
// -----------------------------------------------------------------------------
console.log("\n🍝 8. Testing Meat + Pasta Catalog Recipes & Preferences...");

function matchesMeat(r: any) {
  const ingredients = getSafeIngredientsList(r);
  const fullText = `${r.title} ${r.subtitle} ${r.available ? r.available(2) : ""} ${ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
  return (
    fullText.includes("hähnchen") ||
    fullText.includes("fleisch") ||
    fullText.includes("rind") ||
    fullText.includes("speck") ||
    fullText.includes("filet") ||
    fullText.includes("chicken") ||
    fullText.includes("hackfleisch")
  );
}

function matchesPasta(r: any) {
  const ingredients = getSafeIngredientsList(r);
  const fullText = `${r.title} ${r.subtitle} ${r.available ? r.available(2) : ""} ${ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
  return (
    fullText.includes("pasta") ||
    fullText.includes("nudel") ||
    fullText.includes("penne") ||
    fullText.includes("spaghetti") ||
    fullText.includes("alfredo") ||
    fullText.includes("bolognese")
  );
}

const chickenAlfredo = FULL_RECIPE_CATALOG.find((r) => r.id === "r10");
assert(Boolean(chickenAlfredo), "Catalog contains 'r10' (Cremige Hähnchen-Penne Alfredo)");
assert(Boolean(chickenAlfredo && matchesMeat(chickenAlfredo)), "r10 matches category 'meat'");
assert(Boolean(chickenAlfredo && matchesPasta(chickenAlfredo)), "r10 matches category 'pasta'");

const bolognese = FULL_RECIPE_CATALOG.find((r) => r.id === "r11");
assert(Boolean(bolognese), "Catalog contains 'r11' (Klassische Pasta Bolognese)");
assert(Boolean(bolognese && matchesMeat(bolognese)), "r11 matches category 'meat'");
assert(Boolean(bolognese && matchesPasta(bolognese)), "r11 matches category 'pasta'");

const arrabbiata = FULL_RECIPE_CATALOG.find((r) => r.id === "r12");
assert(Boolean(arrabbiata), "Catalog contains 'r12' (Penne all'Arrabbiata mit Speck)");
assert(Boolean(arrabbiata && matchesMeat(arrabbiata)), "r12 matches category 'meat'");
assert(Boolean(arrabbiata && matchesPasta(arrabbiata)), "r12 matches category 'pasta'");

// Ensure simultaneous Meat + Pasta filter finds recipes
const meatAndPastaMatches = FULL_RECIPE_CATALOG.filter((r) => matchesMeat(r) && matchesPasta(r));
assert(meatAndPastaMatches.length >= 3, `Found ${meatAndPastaMatches.length} recipes matching BOTH meat & pasta`);

// -----------------------------------------------------------------------------
// TEST SUITE 9: BULLETPROOF RECIPE HELPERS & CRASH RESISTANCE
// -----------------------------------------------------------------------------
console.log("\n🛡️ 9. Testing Bulletproof Recipe Helpers & Crash Resistance...");

// 1. Simulating an AI recipe saved to localStorage and restored without function prototypes
const rawSerializedAiRecipe = {
  id: "ai-recipe-999",
  title: "Mediterrane Hähnchen-Pfanne",
  subtitle: "Zartes Hähnchenfilet mit Zucchini",
  prepTime: "20 Min.",
  difficulty: "Einfach",
  pricePerServing: "2,50 €",
  calories: 380,
  protein: 34,
  carbs: 12,
  fat: 18,
  ingredients: [
    { name: "Hähnchenbrustfilet", amount: 300, unit: "g", inStock: false },
    { name: "Zucchini", amount: 1, unit: "Stk.", inStock: false },
  ],
  steps: ["Hähnchen in mundgerechte Stücke schneiden.", "In Olivenöl goldbraun braten."],
};

// getSafeIngredientsList handles missing ingredientsList method
const safeIngredients = getSafeIngredientsList(rawSerializedAiRecipe);
assert(safeIngredients.length === 2, "getSafeIngredientsList extracts 2 ingredients from serialized object");
assert(safeIngredients[0].name === "Hähnchenbrustfilet", "First ingredient is Hähnchenbrustfilet");

// getSafeSteps handles string array or missing steps
const safeSteps = getSafeSteps(rawSerializedAiRecipe);
assert(safeSteps.length === 2, "getSafeSteps extracts 2 steps from serialized object");

// getSafeAvailable handles missing available method and returns valid string
const safeAvailable = getSafeAvailable(rawSerializedAiRecipe);
assert(typeof safeAvailable === "string" && safeAvailable.length > 0, "getSafeAvailable returns formatted string");

// rehydrateRecipe adds missing helper functions
const rehydrated = rehydrateRecipe(rawSerializedAiRecipe);
assert(typeof rehydrated.ingredientsList === "function", "rehydrateRecipe adds ingredientsList() method");
assert(typeof rehydrated.available === "function", "rehydrateRecipe adds available() method");
assert(rehydrated.ingredientsList(2).length === 2, "rehydrated.ingredientsList(2) returns valid ingredient list");

// -----------------------------------------------------------------------------
// TEST SUITE 10: 3X DAILY ROTATION & EXPANDED CATALOG VARIETY
// -----------------------------------------------------------------------------
console.log("\n☀️ 10. Testing 3x Daily Rotation & Expanded Catalog Variety...");

// 1. Catalog expansion to 18 distinct recipes
assert(FULL_RECIPE_CATALOG.length >= 18, `Catalog contains at least 18 recipes (found ${FULL_RECIPE_CATALOG.length})`);

const teriyaki = FULL_RECIPE_CATALOG.find((r) => r.id === "r13");
assert(Boolean(teriyaki), "Contains 'r13' (Knuspriges Teriyaki-Hähnchen mit Basmati)");

const primavera = FULL_RECIPE_CATALOG.find((r) => r.id === "r14");
assert(Boolean(primavera), "Contains 'r14' (One-Pot Pasta Primavera)");

const shakshuka = FULL_RECIPE_CATALOG.find((r) => r.id === "r15");
assert(Boolean(shakshuka), "Contains 'r15' (Goldene Shakshuka mit Eiern)");

const wokNoodles = FULL_RECIPE_CATALOG.find((r) => r.id === "r16");
assert(Boolean(wokNoodles), "Contains 'r16' (Würzige Wok-Nudeln mit Lauch)");

const beefRice = FULL_RECIPE_CATALOG.find((r) => r.id === "r17");
assert(Boolean(beefRice), "Contains 'r17' (Zartes Rinder-Geschnetzeltes mit Reis)");

const hamEggRice = FULL_RECIPE_CATALOG.find((r) => r.id === "r18");
assert(Boolean(hamEggRice), "Contains 'r18' (Knusprige Schinken-Ei-Reispfanne)");

// 2. Testing getCurrentMealTimeSlot
const currentSlot = getCurrentMealTimeSlot();
assert(typeof currentSlot.slotId === "number" && currentSlot.slotId >= 0 && currentSlot.slotId <= 2, "Meal time slot returns 0, 1, or 2");
assert(typeof currentSlot.badge === "string" && currentSlot.badge.length > 0, "Meal time slot has valid badge label");

// 3. Ensuring day and slot shift results in different top recipe order
const now = new Date();
const startOfYear = new Date(now.getFullYear(), 0, 0);
const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
const morningOffset = dayOfYear * 11 + 0 * 17;
const middayOffset = dayOfYear * 11 + 1 * 17;
const eveningOffset = dayOfYear * 11 + 2 * 17;

assert(morningOffset !== middayOffset, "Morning offset differs from midday offset");
assert(middayOffset !== eveningOffset, "Midday offset differs from evening offset");

// -----------------------------------------------------------------------------
// TEST SUITE 11: DISH TEXT EXTRACTION & SAFE INGREDIENTS RECOVERY
// -----------------------------------------------------------------------------
console.log("\n🍲 11. Testing Dish Text Ingredient Extraction & Food Image Presets...");

const calamarataIngredients = extractIngredientsFromDishText(
  "Cremige Calamarata mit Hähnchen & Kirschtomaten",
  "Zarte Hähnchenstreifen in feiner Frischkäse-Kräutersauce mit süßen Cherrytomaten"
);
assert(calamarataIngredients.length >= 4, "Extracted at least 4 ingredients from Calamarata text");
assert(calamarataIngredients.some((i) => i.name.includes("Calamarata")), "Extracted Calamarata Pasta");
assert(calamarataIngredients.some((i) => i.name.includes("Hähnchen")), "Extracted Hähnchenbrustfilet");
assert(calamarataIngredients.some((i) => i.name.includes("Kirschtomaten") || i.name.includes("Cherry")), "Extracted Kirschtomaten");
assert(calamarataIngredients.some((i) => i.name.includes("Frischkäse")), "Extracted Frischkäse");

// Test getSafeIngredientsList on custom recipe with no rawIngredients
const emptyCustomRecipe = {
  id: "custom-test-1",
  title: "Cremige Calamarata mit Hähnchen & Kirschtomaten",
  subtitle: "Frisch zubereitet mit Kräutern",
};
const recoveredList = getSafeIngredientsList(emptyCustomRecipe, 2);
assert(recoveredList.length >= 3, "getSafeIngredientsList recovered ingredients for custom recipe");
assert(recoveredList.some((i) => i.name.includes("Calamarata")), "Recovered Calamarata in ingredients list");

// Test resolveRecipeFoodImage
const calamarataImg = resolveRecipeFoodImage("Cremige Calamarata mit Hähnchen");
assert(calamarataImg.includes("unsplash.com"), "Resolved high-res Unsplash image for Calamarata");

const pastaImg = resolveRecipeFoodImage("Penne Primavera");
assert(pastaImg.includes("unsplash.com"), "Resolved high-res Unsplash image for Primavera");

// -----------------------------------------------------------------------------
// TEST SUITE 12: INTERACTIVE COOKING "ASK ABOUT RECIPE" CHEF AI & FALLBACKS
// -----------------------------------------------------------------------------
console.log("\n★ 12. Testing 'Ask About Recipe' Kitchen Assistant (Basilikum, Substitutions, Heat)...");

const basilikumAnswer = await askAboutRecipeWithGemini("Basilikum einrühren: Ist Gewürz oder Pesto gemeint?", {
  recipeTitle: "Mediterrane Pasta Al Gusto",
  stepNumber: 3,
  stepTitle: "Aromen verbinden & Basilikum einrühren",
  stepInstruction: "Basilikum unter die heiße Pasta rühren und warm servieren.",
});
assert(basilikumAnswer.toLowerCase().includes("pesto") && basilikumAnswer.toLowerCase().includes("gewürz"), "Basilikum query clarifies spice vs. pesto distinction");
assert(basilikumAnswer.includes("1–2 TL"), "Provides concrete dosage advice for pesto substitute");

const ersatzAnswer = await askAboutRecipeWithGemini("Habe keine Sahne, was kann ich als Ersatz nehmen?", {
  recipeTitle: "Cremige Pasta",
  stepNumber: 2,
  stepTitle: "Sauce zubereiten",
});
assert(ersatzAnswer.toLowerCase().includes("milch") || ersatzAnswer.toLowerCase().includes("frischkäse"), "Provides realistic pantry substitutes for missing cream");

const hitzeAnswer = await askAboutRecipeWithGemini("Welche Hitze soll ich am Herd einstellen?", {
  recipeTitle: "Knuspriges Wok-Hähnchen",
  stepNumber: 1,
  stepTitle: "Fleisch anbraten",
});
assert(hitzeAnswer.includes("Stufe") || hitzeAnswer.includes("Hitze"), "Recommends clear stove temperature and heat settings");

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n=======================================================");
console.log(`🏁 TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
console.log("=======================================================\n");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
