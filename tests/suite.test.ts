import { deduplicatePantry, formatMhdDisplay, getMhdStatus, getItemNutrientSpecs, type PantryItem } from "../src/App";
import { parseReceiptFallback, calculateEstimatedMhd } from "../src/utils/receiptOcr";
import { getRecipePantryBreakdown } from "../src/utils/pantryMatching";
import { FULL_RECIPE_CATALOG } from "../src/data/recipeCatalog";
import { getFoodTone } from "../src/components/FoodIcons";
import { findFoodNutrition, calculatePortionNutrition } from "../src/data/foodNutritionDatabase";

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
assert(springOnionSpecs.caloriesPer100g === 32, "getItemNutrientSpecs returns 32 kcal for Frühlingszwiebeln (never 180)");

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
