import { PantryItem, OpenFoodFactsProduct, Recipe } from '../types';

export const INITIAL_PANTRY: PantryItem[] = [
  {
    id: 'pantry-rice',
    name: 'Basmati Reis',
    brand: 'Ja!',
    category: 'Vorratsschrank',
    currentQuantity: 800,
    unit: 'g',
    minQuantity: 400,
    pricePerUnit: 0.20, // 0.20 € pro 100g (1.99€ / 1kg)
    caloriesPer100g: 355,
    proteinPer100g: 8.5,
    carbsPer100g: 78.0,
    fatPer100g: 0.9,
    barcode: '4008400404127',
    nutriScore: 'A',
  },
  {
    id: 'pantry-chicken',
    name: 'Frische Hähnchenbrust',
    brand: 'Wiesenhof',
    category: 'Kühlschrank',
    currentQuantity: 400,
    unit: 'g',
    minQuantity: 250,
    pricePerUnit: 1.15, // 1.15 € pro 100g (4.60€ / 400g)
    caloriesPer100g: 110,
    proteinPer100g: 24.0,
    carbsPer100g: 0.0,
    fatPer100g: 1.5,
    barcode: '4001686301264',
    nutriScore: 'A',
  },
  {
    id: 'pantry-eggs',
    name: 'Bio Freiland-Eier',
    brand: 'Demeter',
    category: 'Kühlschrank',
    currentQuantity: 6,
    unit: 'stk',
    minQuantity: 4,
    pricePerUnit: 0.35, // 0.35 € pro Ei (3.49€ / 10er)
    caloriesPer100g: 140, // ~85 kcal pro Ei (60g)
    proteinPer100g: 13.0,
    carbsPer100g: 0.7,
    fatPer100g: 9.8,
    barcode: '4056489312456',
    nutriScore: 'B',
  },
  {
    id: 'pantry-soy',
    name: 'Kikkoman Sojasauce',
    brand: 'Kikkoman',
    category: 'Gewürze & Saucen',
    currentQuantity: 120,
    unit: 'ml',
    minQuantity: 50,
    pricePerUnit: 1.80, // 1.80 € pro 100ml (2.70€ / 150ml)
    caloriesPer100g: 77,
    proteinPer100g: 10.0,
    carbsPer100g: 3.2,
    fatPer100g: 0.1,
    barcode: '8715035110106',
    nutriScore: 'C',
  },
  {
    id: 'pantry-veggies',
    name: 'TK Kaisergemüse & Brokkoli',
    brand: 'Bio Cool',
    category: 'Tiefkühl',
    currentQuantity: 600,
    unit: 'g',
    minQuantity: 300,
    pricePerUnit: 0.28, // 0.28 € pro 100g (2.10€ / 750g)
    caloriesPer100g: 34,
    proteinPer100g: 2.6,
    carbsPer100g: 4.5,
    fatPer100g: 0.4,
    barcode: '4008400290126',
    nutriScore: 'A',
  },
  {
    id: 'pantry-oil',
    name: 'Natives Olivenöl Extra',
    brand: 'Bertolli',
    category: 'Gewürze & Saucen',
    currentQuantity: 350,
    unit: 'ml',
    minQuantity: 150,
    pricePerUnit: 1.20, // 1.20 € pro 100ml (6.00€ / 500ml)
    caloriesPer100g: 824,
    proteinPer100g: 0.0,
    carbsPer100g: 0.0,
    fatPer100g: 92.0,
    barcode: '8002210115049',
    nutriScore: 'C',
  },
  {
    id: 'pantry-onions',
    name: 'Speisezwiebeln',
    brand: 'Regional',
    category: 'Vorratsschrank',
    currentQuantity: 4,
    unit: 'stk',
    minQuantity: 2,
    pricePerUnit: 0.25, // 0.25 € pro Zwiebel
    caloriesPer100g: 40,
    proteinPer100g: 1.1,
    carbsPer100g: 9.3,
    fatPer100g: 0.1,
    barcode: '4300000000101',
    nutriScore: 'A',
  },
  {
    id: 'pantry-garlic',
    name: 'Knoblauch',
    brand: 'Bio',
    category: 'Vorratsschrank',
    currentQuantity: 3,
    unit: 'stk',
    minQuantity: 1,
    pricePerUnit: 0.30, // 0.30 € pro Knolle
    caloriesPer100g: 149,
    proteinPer100g: 6.4,
    carbsPer100g: 33.0,
    fatPer100g: 0.5,
    barcode: '4300000000102',
    nutriScore: 'A',
  },
  {
    id: 'pantry-oats',
    name: 'Zarte Haferflocken',
    brand: 'Kölln',
    category: 'Vorratsschrank',
    currentQuantity: 500,
    unit: 'g',
    minQuantity: 250,
    pricePerUnit: 0.18, // 0.18 € pro 100g (0.89€ / 500g)
    caloriesPer100g: 370,
    proteinPer100g: 13.5,
    carbsPer100g: 58.7,
    fatPer100g: 7.0,
    barcode: '4008400300122',
    nutriScore: 'A',
  },
];

export const MOCK_OPEN_FOOD_FACTS_DATABASE: Record<string, OpenFoodFactsProduct> = {
  '4008400404127': {
    code: '4008400404127',
    product_name: 'Basmati Reis Spitzenqualität',
    brands: 'Ja!',
    categories: 'Pflanzliche Lebensmittel, Getreide, Reis',
    quantity_str: '1 kg',
    nutriments: {
      'energy-kcal_100g': 355,
      proteins_100g: 8.5,
      carbohydrates_100g: 78.0,
      fat_100g: 0.9,
    },
    nutrition_grades: 'a',
    default_unit: 'g',
    default_amount: 1000,
    default_category: 'Vorratsschrank',
    default_min_qty: 400,
    estimated_price: 1.99,
  },
  '4001686301264': {
    code: '4001686301264',
    product_name: 'Hähnchenbrustfilet Teilstücke',
    brands: 'Wiesenhof',
    categories: 'Fleisch, Geflügel, Hähnchen',
    quantity_str: '400 g',
    nutriments: {
      'energy-kcal_100g': 110,
      proteins_100g: 24.0,
      carbohydrates_100g: 0.0,
      fat_100g: 1.5,
    },
    nutrition_grades: 'a',
    default_unit: 'g',
    default_amount: 400,
    default_category: 'Kühlschrank',
    default_min_qty: 250,
    estimated_price: 4.59,
  },
  '4056489312456': {
    code: '4056489312456',
    product_name: 'Bio Freiland-Eier Kl. M/L',
    brands: 'Demeter / Alnatura',
    categories: 'Eier, Bio-Produkte',
    quantity_str: '10 Stück',
    nutriments: {
      'energy-kcal_100g': 140,
      proteins_100g: 13.0,
      carbohydrates_100g: 0.7,
      fat_100g: 9.8,
    },
    nutrition_grades: 'b',
    default_unit: 'stk',
    default_amount: 10,
    default_category: 'Kühlschrank',
    default_min_qty: 4,
    estimated_price: 3.49,
  },
  '8715035110106': {
    code: '8715035110106',
    product_name: 'Natürlich gebraute Sojasauce',
    brands: 'Kikkoman',
    categories: 'Saucen, Sojasaucen, Würzmittel',
    quantity_str: '150 ml',
    nutriments: {
      'energy-kcal_100g': 77,
      proteins_100g: 10.0,
      carbohydrates_100g: 3.2,
      fat_100g: 0.1,
    },
    nutrition_grades: 'c',
    default_unit: 'ml',
    default_amount: 150,
    default_category: 'Gewürze & Saucen',
    default_min_qty: 50,
    estimated_price: 2.69,
  },
  '4008400290126': {
    code: '4008400290126',
    product_name: 'TK Brokkoli & Kaisergemüse Bio',
    brands: 'Bio Cool',
    categories: 'Tiefkühl, Gemüse',
    quantity_str: '750 g',
    nutriments: {
      'energy-kcal_100g': 34,
      proteins_100g: 2.6,
      carbohydrates_100g: 4.5,
      fat_100g: 0.4,
    },
    nutrition_grades: 'a',
    default_unit: 'g',
    default_amount: 750,
    default_category: 'Tiefkühl',
    default_min_qty: 300,
    estimated_price: 2.19,
  },
  '4014400900010': {
    code: '4014400900010',
    product_name: 'Penne Rigate No. 73',
    brands: 'Barilla',
    categories: 'Pasta, Nudeln, Weizen',
    quantity_str: '500 g',
    nutriments: {
      'energy-kcal_100g': 359,
      proteins_100g: 12.0,
      carbohydrates_100g: 71.2,
      fat_100g: 2.0,
    },
    nutrition_grades: 'a',
    default_unit: 'g',
    default_amount: 500,
    default_category: 'Vorratsschrank',
    default_min_qty: 250,
    estimated_price: 1.89,
  },
  '4008400300122': {
    code: '4008400300122',
    product_name: 'Blütenzarte Haferflocken',
    brands: 'Kölln',
    categories: 'Frühstückscerealien, Haferflocken',
    quantity_str: '500 g',
    nutriments: {
      'energy-kcal_100g': 370,
      proteins_100g: 13.5,
      carbohydrates_100g: 58.7,
      fat_100g: 7.0,
    },
    nutrition_grades: 'a',
    default_unit: 'g',
    default_amount: 500,
    default_category: 'Vorratsschrank',
    default_min_qty: 250,
    estimated_price: 0.99,
  },
  '4311501664532': {
    code: '4311501664532',
    product_name: 'Griechischer Schafskäse Feta AOP',
    brands: 'Milbona / Dodoni',
    categories: 'Käse, Feta, Molkereiprodukte',
    quantity_str: '200 g',
    nutriments: {
      'energy-kcal_100g': 275,
      proteins_100g: 16.5,
      carbohydrates_100g: 1.0,
      fat_100g: 23.0,
    },
    nutrition_grades: 'd',
    default_unit: 'g',
    default_amount: 200,
    default_category: 'Kühlschrank',
    default_min_qty: 100,
    estimated_price: 2.29,
  },
};

export const SAMPLE_RECEIPTS = [
  {
    title: 'Rewe City (Wocheneinkauf & Basics)',
    date: '10.10.2026',
    store: 'REWE Markt GmbH · Filiale 4201',
    text: `REWE MARKT GMBH
MARKTSTR. 14, 80331 MUENCHEN
DATUM: 10.10.2026  17:42 BON: 8812

Ja! Basmati Reis 1kg             1,99 B
Wiesenhof Hähnchenbrust 400g     4,59 A
Demeter Bio Freiland-Eier 10er   3,49 A
Kikkoman Sojasauce 150ml         2,69 B
TK Bio Kaisergemüse 750g         2,19 A
Speisezwiebeln Netz 1kg          1,49 A
Natives Olivenoel 500ml          5,99 B

SUMME EUR                       22,43
GEGEBEN KARTE                   22,43
VIELEN DANK FUER IHREN BESUCH!`,
  },
  {
    title: 'Aldi Süd (Budget & Vorrat)',
    date: '08.10.2026',
    store: 'ALDI SÜD Dienstleistungs-SE',
    text: `ALDI SUED
FILIALE 109, STUTTGART
DATUM: 08.10.2026  12:15

Haferflocken Zart 500g           0,89 A
Bio Eier 10 Stk                  2,89 A
Penne Rigate Nudeln 500g         0,99 A
Passierte Tomaten 500g           0,85 A
Gouda jung gerieben 200g         1,69 A
Knoblauch 200g Netz              0,99 A

SUMME EUR                        8,30
EC-KARTE                         8,30`,
  },
  {
    title: 'Lidl Frische & Asia (Quick Pfanne)',
    date: '09.10.2026',
    store: 'Lidl Vertriebs-GmbH & Co. KG',
    text: `LIDL LOHNT SICH
KAUFBELEG NR: 39420
DATUM: 09.10.2026  18:05

Haehnchenbrustfilet 400g         4,49 A
TK Brokkoli Roeschen 1000g       1,89 A
Sojasosse Teriyaki 250ml         1,99 B
Jasmin Duftreis 1kg              2,19 A
Moeller Bio Eier 6er             1,99 A

GESAMT EUR                      12,55
KARTE MAESTRO                   12,55`,
  },
];

export const RECIPE_DATABASE: Recipe[] = [
  {
    id: 'recipe-fried-rice',
    title: '20-Min Knuspriger Egg-Fried-Rice mit Hähnchen',
    description: 'Budget-Klassiker: Nutzt Reis ideal aus. Perfekt mit Hähnchen, oder flexibel mit Eiern/Tofu!',
    prepTime: '18 Min.',
    difficulty: 'Einfach',
    cuisine: 'Asiatisch',
    tags: ['Schnell', 'High-Protein', 'Reste-Verwertung'],
    ingredients: [
      {
        name: 'Basmati Reis',
        amountPerServing: 80, // 80g ungekocht pro Portion
        unit: 'g',
        pantryItemId: 'pantry-rice',
        alternatives: 'Oder Jasminreis / Couscous',
      },
      {
        name: 'Frische Hähnchenbrust',
        amountPerServing: 100, // 100g pro Portion
        unit: 'g',
        pantryItemId: 'pantry-chicken',
        alternatives: 'ODER Tofu (100g) / extra 1-2 Eier',
      },
      {
        name: 'Bio Freiland-Eier',
        amountPerServing: 1, // 1 Ei pro Portion
        unit: 'stk',
        pantryItemId: 'pantry-eggs',
        alternatives: 'ODER Kichererbsen',
      },
      {
        name: 'TK Kaisergemüse & Brokkoli',
        amountPerServing: 100,
        unit: 'g',
        pantryItemId: 'pantry-veggies',
        alternatives: 'Beliebiges Frisch- oder Tiefkühlgemüse',
      },
      {
        name: 'Kikkoman Sojasauce',
        amountPerServing: 12,
        unit: 'ml',
        pantryItemId: 'pantry-soy',
        alternatives: 'Oder Tamari / Prise Salz & Pfeffer',
      },
      {
        name: 'Speisezwiebeln',
        amountPerServing: 0.33,
        unit: 'stk',
        pantryItemId: 'pantry-onions',
        alternatives: 'Oder Frühlingszwiebeln',
      },
    ],
    steps: [
      'Reis kochen oder kalten Reis vom Vortag auflockern.',
      'Hähnchenbrust in mundgerechte Streifen schneiden und in der Pfanne mit etwas Öl scharf anbraten.',
      'Zwiebeln und Tiefkühlgemüse dazugeben und 3-4 Minuten mitbraten.',
      'Reis in die Pfanne geben, eine Mulde formen, Eier hineinschlagen und stocken lassen.',
      'Mit Sojasauce ablöschen, alles durchschwenken und heiß servieren.',
    ],
  },
  {
    id: 'recipe-teriyaki-bowl',
    title: 'Herzhafte Wok-Bowl mit Soja-Glaze & Knoblauch',
    description: 'Aromatisches Pfannengericht: Knackiges Gemüse, karamellisierte Sojasauce und zartes Protein.',
    prepTime: '22 Min.',
    difficulty: 'Einfach',
    cuisine: 'Asiatisch / Fusion',
    tags: ['Fit & Fresh', 'Meal-Prep', 'Günstig'],
    ingredients: [
      {
        name: 'Basmati Reis',
        amountPerServing: 90,
        unit: 'g',
        pantryItemId: 'pantry-rice',
        alternatives: 'Oder Quinoa / Reisnudeln',
      },
      {
        name: 'Frische Hähnchenbrust',
        amountPerServing: 120,
        unit: 'g',
        pantryItemId: 'pantry-chicken',
        alternatives: 'ODER Spiegeleier / Pilze / Rinderhack',
      },
      {
        name: 'TK Kaisergemüse & Brokkoli',
        amountPerServing: 120,
        unit: 'g',
        pantryItemId: 'pantry-veggies',
        alternatives: 'Oder Frische Zucchini & Möhren',
      },
      {
        name: 'Kikkoman Sojasauce',
        amountPerServing: 15,
        unit: 'ml',
        pantryItemId: 'pantry-soy',
      },
      {
        name: 'Knoblauch',
        amountPerServing: 0.5,
        unit: 'stk',
        pantryItemId: 'pantry-garlic',
      },
      {
        name: 'Natives Olivenöl Extra',
        amountPerServing: 8,
        unit: 'ml',
        pantryItemId: 'pantry-oil',
      },
    ],
    steps: [
      'Reis nach Packungsanleitung gar kochen.',
      'Knoblauch fein hacken, Hähnchen würfeln.',
      'Öl erhitzen, Knoblauch und Hähnchen anbraten, dann Gemüse zugeben.',
      'Mit Sojasauce und einem Teelöffel Honig/Wasser ablöschen und 3 Minuten einköcheln lassen.',
      'Reis in Schüsseln anrichten und Wok-Mix darüber geben.',
    ],
  },
  {
    id: 'recipe-egg-scramble',
    title: 'Protein-Bratpfanne "Country Style" mit Gemüse',
    description: 'Blitzschnell, cremig und extrem günstig: Eier-Pfanne mit Zwiebeln, Knoblauch und Gemüse.',
    prepTime: '12 Min.',
    difficulty: 'Einfach',
    cuisine: 'Europäisch / Fitness',
    tags: ['Unter 15 Min', 'Low Carb', 'Ultra-Budget'],
    ingredients: [
      {
        name: 'Bio Freiland-Eier',
        amountPerServing: 2,
        unit: 'stk',
        pantryItemId: 'pantry-eggs',
        alternatives: 'ODER Hähnchenreste / Feta',
      },
      {
        name: 'TK Kaisergemüse & Brokkoli',
        amountPerServing: 90,
        unit: 'g',
        pantryItemId: 'pantry-veggies',
      },
      {
        name: 'Speisezwiebeln',
        amountPerServing: 0.5,
        unit: 'stk',
        pantryItemId: 'pantry-onions',
      },
      {
        name: 'Knoblauch',
        amountPerServing: 0.33,
        unit: 'stk',
        pantryItemId: 'pantry-garlic',
      },
      {
        name: 'Natives Olivenöl Extra',
        amountPerServing: 7,
        unit: 'ml',
        pantryItemId: 'pantry-oil',
      },
    ],
    steps: [
      'Zwiebeln würfeln und in Öl glasig dünsten.',
      'Tiefkühlgemüse und Knoblauch hinzufügen, 4 Minuten anbraten.',
      'Eier verquirlen, mit einer Prise Salz und Pfeffer würzen.',
      'Eier in die Pfanne gießen, bei mittlerer Hitze sanft stocken lassen und cremig servieren.',
    ],
  },
  {
    id: 'recipe-savory-oats',
    title: 'Herzhafte Haferflocken-Bowl mit Spiegelei & Soja',
    description: 'Trendiges Superfood zum kleinen Preis: Cremiger Haferbrei, asiatisch gewürzt mit flüssigem Eigelb.',
    prepTime: '14 Min.',
    difficulty: 'Einfach',
    cuisine: 'Modern Fusion',
    tags: ['Ballaststoffreich', 'Spar-Tipp', 'Power-Food'],
    ingredients: [
      {
        name: 'Zarte Haferflocken',
        amountPerServing: 70,
        unit: 'g',
        pantryItemId: 'pantry-oats',
      },
      {
        name: 'Bio Freiland-Eier',
        amountPerServing: 1,
        unit: 'stk',
        pantryItemId: 'pantry-eggs',
        alternatives: 'ODER Hähnchenstreifen',
      },
      {
        name: 'Kikkoman Sojasauce',
        amountPerServing: 10,
        unit: 'ml',
        pantryItemId: 'pantry-soy',
      },
      {
        name: 'Speisezwiebeln',
        amountPerServing: 0.33,
        unit: 'stk',
        pantryItemId: 'pantry-onions',
      },
      {
        name: 'Natives Olivenöl Extra',
        amountPerServing: 5,
        unit: 'ml',
        pantryItemId: 'pantry-oil',
      },
    ],
    steps: [
      'Haferflocken mit Wasser und einer Prise Salz zu einem sämigen Brei aufkochen.',
      'In einer separaten Pfanne Spiegelei mit knusprigem Rand braten.',
      'Zwiebeln rösten.',
      'Haferflocken in eine Schüssel füllen, Sojasauce unterrühren, Spiegelei darauflegen.',
    ],
  },
];
