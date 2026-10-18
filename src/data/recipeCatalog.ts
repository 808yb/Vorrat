export interface RecipeStep {
  stepNumber: number;
  title: string;
  instruction: string;
  duration?: string;
  tag?: string;
}

export interface CatalogRecipe {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  difficulty: "Einfach" | "Mittel" | "Super Einfach";
  baseCal: number;
  baseProt: number;
  baseCarb: number;
  baseCost: number;
  available: (s: number) => string;
  optional: string;
  tone: "mint" | "sage" | "amber";
  chefTip: string;
  imageUrl?: string;
  isAiGenerated?: boolean;
  matchScore?: number;
  steps: RecipeStep[];
  ingredientsList: (s: number) => Array<{ name: string; amount: string; optional?: boolean }>;
}

export const FULL_RECIPE_CATALOG: CatalogRecipe[] = [
  {
    id: "r1",
    title: "Egg Fried Rice Deluxe",
    subtitle: "Knusprig, herzhaft, proteinreich",
    time: "15 Min.",
    difficulty: "Einfach",
    baseCal: 180,
    baseProt: 11,
    baseCarb: 23,
    baseCost: 1.45,
    imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${100 * s}g Reis · ${s} Eier · Sojasoße`,
    optional: "TK-Erbsen oder Frühlingszwiebeln",
    tone: "mint",
    chefTip:
      "Trockener Reis ist das Geheimnis! Wenn du frischen Reis nimmst, breite ihn 10 Minuten auf einem Teller im Gefrierfach oder Kühlschrank aus, damit er Feuchtigkeit verliert.",
    ingredientsList: (s) => [
      { name: "Basmati Reis (vorgekocht/kalt)", amount: `${100 * s} g` },
      { name: "Bio Eier (Größe M oder L)", amount: `${s} Stk.` },
      { name: "Kikkoman Sojasauce", amount: `${12 * s} ml` },
      { name: "Frühlingszwiebeln (in Ringen)", amount: `${Math.max(1, s)} Stk.`, optional: true },
      { name: "Pflanzenöl / Sesamöl", amount: `${10 * s} ml` },
      { name: "TK-Erbsen", amount: `${40 * s} g`, optional: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Reis auflockern & vorbereiten",
        instruction:
          "Kalten Reis (idealerweise vom Vortag) mit angefeuchteten Händen oder einer Gabel gründlich auflockern, damit keine Klumpen bleiben. Frühlingszwiebeln in feine Ringe schneiden, weiße und grüne Teile trennen.",
        duration: "2 Min.",
        tag: "Vorbereitung",
      },
      {
        stepNumber: 2,
        title: "Eier verquirlen & anbraten",
        instruction:
          "Eier in einer kleinen Schale mit einer Prise Salz kurz verquirlen. 1 EL Öl im Wok oder einer großen Pfanne stark erhitzen. Weiße Zwiebelteile 30 Sekunden anbraten, dann die Eier hineingießen und mit einem Pfannenwender kurz stocken lassen, bis sie fluffig sind.",
        duration: "3 Min.",
        tag: "Pfanne",
      },
      {
        stepNumber: 3,
        title: "Reis knusprig durchbraten",
        instruction:
          "Den aufgelockerten Reis dazugeben. Die Hitze auf Maximum stellen und den Reis unter schnellem Schwenken 3 bis 4 Minuten braten, bis die Körner zischen und herrlich duften.",
        duration: "4 Min.",
        tag: "Braten",
      },
      {
        stepNumber: 4,
        title: "Mit Sojasauce vollenden",
        instruction:
          "Sojasauce direkt am heißen Pfannenrand entlang einfließen lassen – das erzeugt feine Röstaromen (Wok-Hei). Die grünen Frühlingszwiebeln und optionale Erbsen unterheben, 1 Minute durchschwenken und dampfend heiß anrichten.",
        duration: "2 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r2",
    title: "Grüne Reis-Bowl",
    subtitle: "Frisch mit cremigem Eier-Topping",
    time: "20 Min.",
    difficulty: "Einfach",
    baseCal: 165,
    baseProt: 9,
    baseCarb: 21,
    baseCost: 1.7,
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${90 * s}g Reis · ${s} Eier · Frühlingszwiebeln`,
    optional: "Gurke oder TK-Erbsen",
    tone: "sage",
    chefTip:
      "Das wachsweiche Eigelb dient hier als natürliche, samtige Sauce für den warmen Reis – einfach anschneiden und zerfließen lassen!",
    ingredientsList: (s) => [
      { name: "Basmati Reis (gekocht)", amount: `${90 * s} g` },
      { name: "Bio Eier", amount: `${s} Stk.` },
      { name: "Frühlingszwiebeln", amount: `${Math.max(1, s)} Stk.` },
      { name: "TK Bio-Erbsen", amount: `${60 * s} g`, optional: true },
      { name: "Sojasauce", amount: `${10 * s} ml` },
      { name: "Sesam oder Chiliflocken", amount: "Nach Belieben", optional: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Reis erwärmen & aromatisieren",
        instruction:
          "Gekochten Reis sanft in einem Topf mit 1 TL Sojasauce und einem Tropfen Öl erwärmen. Auf tiefe Schalen verteilen und warm halten.",
        duration: "3 Min.",
        tag: "Basis",
      },
      {
        stepNumber: 2,
        title: "Grünes Gemüse sautieren",
        instruction:
          "Frühlingszwiebeln in Ringe schneiden. 1 EL Öl in der Pfanne erhitzen, Erbsen und Zwiebeln 3–4 Minuten scharf anbraten, bis sie knackig grün glänzen.",
        duration: "4 Min.",
        tag: "Gemüse",
      },
      {
        stepNumber: 3,
        title: "Spiegelei auf den Punkt braten",
        instruction:
          "Eier vorsichtig in die Pfanne schlagen. Bei mittlerer Hitze braten, bis das Eiweiß gestockt ist, das Eigelb aber noch flüssig und cremig bleibt.",
        duration: "3 Min.",
        tag: "Ei",
      },
      {
        stepNumber: 4,
        title: "Bowl schichten & garnieren",
        instruction:
          "Das grüne Gemüse fächerförmig auf dem Reis anrichten, das Spiegelei mittig platzieren. Mit etwas Pfeffer, Sojasauce oder Chiliflocken bestreuen.",
        duration: "2 Min.",
        tag: "Anrichten",
      },
    ],
  },
  {
    id: "r3",
    title: "Crispy Rice Omelett",
    subtitle: "Goldbraun gebraten, innen saftig",
    time: "18 Min.",
    difficulty: "Mittel",
    baseCal: 170,
    baseProt: 10,
    baseCarb: 19,
    baseCost: 1.55,
    imageUrl: "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${80 * s}g Reis · ${s + 1} Eier · Sojasoße`,
    optional: "Chiliöl oder Sesam",
    tone: "amber",
    chefTip:
      "Geduld bei mittlerer Hitze (Stufe 5–6): So bildet der Reis eine knusprige Kruste wie bei Socarrat, während das Ei saftig bleibt.",
    ingredientsList: (s) => [
      { name: "Basmati Reis (gekocht)", amount: `${80 * s} g` },
      { name: "Bio Eier", amount: `${s + 1} Stk.` },
      { name: "Sojasauce", amount: `${10 * s} ml` },
      { name: "Pflanzenöl zum Ausbacken", amount: `${12 * s} ml` },
      { name: "Chiliöl / Frühlingszwiebeln", amount: "Nach Geschmack", optional: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Ei-Reis-Masse anrühren",
        instruction:
          "Eier in einer Schüssel aufschlagen, mit 1 TL Sojasauce und einer Prise Pfeffer verrühren. Den Reis direkt hineingeben und vermischen, bis alle Reiskörner mit Ei ummantelt sind.",
        duration: "3 Min.",
        tag: "Mischen",
      },
      {
        stepNumber: 2,
        title: "Pfanne vorheizen",
        instruction:
          "Eine beschichtete Pfanne mit 1 EL Öl auf mittlerer Stufe vorheizen. Das Öl sollte den Pfannenboden gleichmäßig bedecken.",
        duration: "2 Min.",
        tag: "Vorheizen",
      },
      {
        stepNumber: 3,
        title: "Goldbraun ausbacken",
        instruction:
          "Die Ei-Reis-Masse hineingießen, glattstreichen und bei moderater Hitze 5 Minuten braten, bis die Unterseite goldgelb und herrlich kross wird.",
        duration: "5 Min.",
        tag: "Braten",
      },
      {
        stepNumber: 4,
        title: "Wenden & vollenden",
        instruction:
          "Mit Hilfe eines flachen Tellers oder Topfdeckels das Omelett wenden und von der Rückseite noch 2–3 Minuten fertig braten. In Stücke schneiden und mit Sojasauce beträufeln.",
        duration: "3 Min.",
        tag: "Wenden",
      },
    ],
  },
  {
    id: "r4",
    title: "Teriyaki Hähnchen-Wok",
    subtitle: "Zartes Filet in Soja-Knoblauch-Glasur",
    time: "17 Min.",
    difficulty: "Einfach",
    baseCal: 195,
    baseProt: 15,
    baseCarb: 20,
    baseCost: 1.85,
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${110 * s}g Hähnchen · ${80 * s}g Reis · Sojasoße`,
    optional: "Brokkoli, Zucchini oder Sesam",
    tone: "mint",
    chefTip:
      "Das Hähnchenfleisch erst wenden, wenn es von selbst eine schöne Röstkruste am Pfannenboden gebildet hat – das schließt den Fleischsaft ein!",
    ingredientsList: (s) => [
      { name: "Frische Hähnchenbrust", amount: `${110 * s} g` },
      { name: "Basmati Reis (gekocht)", amount: `${80 * s} g` },
      { name: "Kikkoman Sojasauce", amount: `${15 * s} ml` },
      { name: "Wasser / Prise Zucker oder Honig", amount: `${10 * s} ml` },
      { name: "Knoblauch", amount: `${Math.max(1, Math.round(s * 0.5))} Zehe(n)` },
      { name: "Öl zum Braten", amount: `${10 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Hähnchen zuschneiden",
        instruction:
          "Hähnchenbrustfilet mit Küchenpapier trocken tupfen und quer zur Faser in ca. 2 cm breite Streifen schneiden. Knoblauch fein hacken.",
        duration: "3 Min.",
        tag: "Schneiden",
      },
      {
        stepNumber: 2,
        title: "Scharf anbraten",
        instruction:
          "Öl in der Pfanne stark erhitzen. Hähnchenstreifen hineingeben und 3 Minuten ohne Rühren scharf braten, dann wenden und weitere 2 Minuten bräunen.",
        duration: "5 Min.",
        tag: "Anbraten",
      },
      {
        stepNumber: 3,
        title: "Mit Soja & Knoblauch glasieren",
        instruction:
          "Knoblauch zugeben, Hitze reduzieren. Sojasauce, etwas Wasser und nach Wunsch eine Prise Zucker oder Honig einrühren. 2 Minuten köcheln, bis eine sirupartige Glasur entsteht.",
        duration: "3 Min.",
        tag: "Glasur",
      },
      {
        stepNumber: 4,
        title: "Auf Reis anrichten",
        instruction:
          "Reis auf Tellern anrichten, das zarte Teriyaki-Hähnchen mit der aromatischen Pfannensauce darübergeben und sofort heiß servieren.",
        duration: "2 Min.",
        tag: "Servieren",
      },
    ],
  },
  {
    id: "r5",
    title: "Erbsen-Zwiebel Spar-Pfanne",
    subtitle: "In 10 Min fertig, unter 1,15 € pro Portion",
    time: "10 Min.",
    difficulty: "Super Einfach",
    baseCal: 150,
    baseProt: 8,
    baseCarb: 22,
    baseCost: 1.15,
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${90 * s}g Reis · ${80 * s}g TK-Erbsen · Zwiebeln`,
    optional: "Prise Paprika oder Sojasauce",
    tone: "sage",
    chefTip:
      "Tiefgekühlte Erbsen bringen natürliche Süße und reichlich pflanzliches Eiweiß – super sättigend für ein winziges Budget!",
    ingredientsList: (s) => [
      { name: "Basmati Reis (gekocht)", amount: `${90 * s} g` },
      { name: "TK Bio-Erbsen", amount: `${80 * s} g` },
      { name: "Speisezwiebeln", amount: `${Math.max(1, Math.round(s * 0.5))} Stk.` },
      { name: "Sojasauce / Paprikapulver", amount: "Nach Geschmack" },
      { name: "Pflanzenöl", amount: `${8 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Zwiebeln anschwitzen",
        instruction:
          "Zwiebeln fein hacken. In 1 EL Öl bei mittlerer Hitze 2 bis 3 Minuten glasig andünsten, bis sie süßlich duften.",
        duration: "3 Min.",
        tag: "Dünsten",
      },
      {
        stepNumber: 2,
        title: "TK-Erbsen zugeben",
        instruction:
          "Die Erbsen direkt gefroren in die Pfanne geben und 3 Minuten mitschmoren, bis sie auftauen und ihr frisches Grün leuchtet.",
        duration: "3 Min.",
        tag: "Gemüse",
      },
      {
        stepNumber: 3,
        title: "Reis & Gewürze unterrühren",
        instruction:
          "Den gekochten Reis dazugeben. 1–2 EL Sojasauce und eine Prise edelsüßes Paprikapulver einrühren und 2 Minuten kräftig durchbraten.",
        duration: "2 Min.",
        tag: "Braten",
      },
      {
        stepNumber: 4,
        title: "Abschmecken & servieren",
        instruction:
          "Mit frisch gemahlenem Pfeffer abschmecken und dampfend heiß auf den Tisch bringen. Schneller geht vollwertiges Essen kaum!",
        duration: "1 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r6",
    title: "Cremiges Sesam-Rührei auf Reis",
    subtitle: "Fluffig gestockt mit Soja-Kräuter-Note",
    time: "12 Min.",
    difficulty: "Einfach",
    baseCal: 175,
    baseProt: 12,
    baseCarb: 18,
    baseCost: 1.35,
    imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${s + 1} Eier · ${80 * s}g Reis · Frühlingszwiebeln`,
    optional: "Schuss Milch oder Chili-Flocken",
    tone: "amber",
    chefTip:
      "Die Pfanne vom Herd ziehen, solange das Rührei noch saftig glänzt – durch die Eigenwärme stockt es auf dem Reis perfekt fertig!",
    ingredientsList: (s) => [
      { name: "Bio Eier", amount: `${s + 1} Stk.` },
      { name: "Basmati Reis (gekocht)", amount: `${80 * s} g` },
      { name: "Frühlingszwiebeln", amount: `${Math.max(1, s)} Stk.` },
      { name: "Sojasauce", amount: `${8 * s} ml` },
      { name: "Butter oder Öl", amount: `${10 * s} g` },
      { name: "Milch oder Wasser (für Cremigkeit)", amount: `${15 * s} ml`, optional: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Reisbett vorbereiten",
        instruction:
          "Gekochten Reis sanft erwärmen und als lockeres Bett in warme Schalen verteilen.",
        duration: "2 Min.",
        tag: "Basis",
      },
      {
        stepNumber: 2,
        title: "Eimasse luftig aufschlagen",
        instruction:
          "Eier in einer Schüssel mit 1 EL Milch oder Wasser, 1 TL Sojasauce und Pfeffer mit einer Gabel 30 Sekunden luftig verquirlen.",
        duration: "2 Min.",
        tag: "Aufschlagen",
      },
      {
        stepNumber: 3,
        title: "Sanft stocken lassen",
        instruction:
          "Butter oder Öl bei kleiner bis mittlerer Hitze schmelzen. Eimasse hineingießen und mit einem Spatel langsam von außen nach innen schieben.",
        duration: "3 Min.",
        tag: "Stocken",
      },
      {
        stepNumber: 4,
        title: "Auf den Reis gleiten lassen",
        instruction:
          "Sobald das Rührei samtig und saftig gestockt ist, sofort auf das Reisbett gleiten lassen. Mit feinen Frühlingszwiebelringen toppen.",
        duration: "1 Min.",
        tag: "Anrichten",
      },
    ],
  },
  {
    id: "r7",
    title: "Protein Power-Bowl",
    subtitle: "Doppel-Ei & Hähnchen mit Frühlingszwiebeln",
    time: "19 Min.",
    difficulty: "Mittel",
    baseCal: 210,
    baseProt: 18,
    baseCarb: 17,
    baseCost: 1.95,
    imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${100 * s}g Hähnchen · ${s} Eier · Sojasoße`,
    optional: "TK-Gemüse oder Röstzwiebeln",
    tone: "mint",
    chefTip:
      "Über 35g natürliches Protein pro Portion – die optimale Mahlzeit nach dem Sport oder an langen Arbeitstagen!",
    ingredientsList: (s) => [
      { name: "Frische Hähnchenbrust", amount: `${100 * s} g` },
      { name: "Bio Eier", amount: `${s} Stk.` },
      { name: "Basmati Reis (gekocht)", amount: `${75 * s} g` },
      { name: "Sojasauce", amount: `${12 * s} ml` },
      { name: "Frühlingszwiebeln", amount: `${Math.max(1, s)} Stk.` },
      { name: "Öl zum Braten", amount: `${10 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Hähnchenfilet braten",
        instruction:
          "Hähnchenbrust in mundgerechte Würfel schneiden, mit Pfeffer würzen. In heißem Öl 4–5 Minuten goldbraun anbraten, bis es durch ist. Auf einen Teller heben.",
        duration: "5 Min.",
        tag: "Fleisch",
      },
      {
        stepNumber: 2,
        title: "Eier zubereiten",
        instruction:
          "In derselben Pfanne die Eier aufschlagen und als Spiegeleier oder Rührei braten, dabei Bratensatz des Hähnchens mitnehmen.",
        duration: "3 Min.",
        tag: "Eier",
      },
      {
        stepNumber: 3,
        title: "Reis erwärmen",
        instruction:
          "Reis kurz in einer zweiten Pfanne oder Mikrowelle heiß machen und als Basis in Bowls verteilen.",
        duration: "2 Min.",
        tag: "Reis",
      },
      {
        stepNumber: 4,
        title: "Bowl bauen & toppen",
        instruction:
          "Hähnchenwürfel und Eier nebeneinander auf dem Reis anrichten. Mit Sojasauce beträufeln und mit Frühlingszwiebeln bestreuen.",
        duration: "2 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r8",
    title: "Knoblauch-Chili Fried Rice",
    subtitle: "Pikant gebraten mit krossem Spiegelei",
    time: "14 Min.",
    difficulty: "Einfach",
    baseCal: 185,
    baseProt: 9,
    baseCarb: 24,
    baseCost: 1.3,
    imageUrl: "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${100 * s}g Reis · ${s} Eier · Knoblauch`,
    optional: "Sriracha oder Limettensaft",
    tone: "amber",
    chefTip:
      "Das sanft geröstete Knoblauchöl durchzieht jedes Reiskorn mit einem vollmundigen Restaurant-Geschmack!",
    ingredientsList: (s) => [
      { name: "Basmati Reis (kalt/vorgekocht)", amount: `${100 * s} g` },
      { name: "Bio Eier", amount: `${s} Stk.` },
      { name: "Knoblauchzehen (in Scheiben)", amount: `${Math.max(2, s * 2)} Zehen` },
      { name: "Kikkoman Sojasauce", amount: `${12 * s} ml` },
      { name: "Chiliflocken / Sriracha", amount: "Nach Belieben" },
      { name: "Pflanzenöl", amount: `${15 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Knoblauch golden rösten",
        instruction:
          "Knoblauch in feine Scheiben schneiden. In 2 EL Öl bei mittlerer Hitze langsam goldgelb anrösten. Achtung: Nicht braun werden lassen, sonst wird er bitter!",
        duration: "3 Min.",
        tag: "Knoblauch",
      },
      {
        stepNumber: 2,
        title: "Reis mit Wok-Hitze braten",
        instruction:
          "Hitze auf Maximum drehen. Den Reis dazugeben und 3 bis 4 Minuten kräftig durchbraten, bis das Knoblauchöl vollständig aufgenommen ist.",
        duration: "4 Min.",
        tag: "Braten",
      },
      {
        stepNumber: 3,
        title: "Würzen & Spiegelei braten",
        instruction:
          "Reis mit Sojasauce und Chiliflocken abschmecken. Parallel in einer kleinen Pfanne ein Ei braten, bis der Eiweißrand knusprig braun wird.",
        duration: "3 Min.",
        tag: "Spiegelei",
      },
      {
        stepNumber: 4,
        title: "Anrichten & servieren",
        instruction:
          "Den heißen Knoblauch-Reis in eine Schale häufen, das knusprige Spiegelei obenauf platzieren und heiß servieren.",
        duration: "1 Min.",
        tag: "Anrichten",
      },
    ],
  },
  {
    id: "r9",
    title: "Frühlings-Omelett mit Erbsen",
    subtitle: "Leicht, ballaststoffreich & super saftig",
    time: "15 Min.",
    difficulty: "Einfach",
    baseCal: 160,
    baseProt: 11,
    baseCarb: 15,
    baseCost: 1.4,
    imageUrl: "https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${s + 1} Eier · ${70 * s}g Erbsen · Lauch`,
    optional: "Fetakäse oder Schnittlauch",
    tone: "sage",
    chefTip:
      "Mit aufgelegtem Pfannendeckel gart das Omelett gleichmäßig durch und geht wunderbar soufflé-artig auf!",
    ingredientsList: (s) => [
      { name: "Bio Eier", amount: `${s + 1} Stk.` },
      { name: "TK Bio-Erbsen", amount: `${70 * s} g` },
      { name: "Frühlingszwiebeln / Lauch", amount: `${Math.max(1, s)} Stk.` },
      { name: "Sojasauce oder Salz & Pfeffer", amount: "Nach Geschmack" },
      { name: "Pflanzenöl / Butter", amount: `${10 * s} g` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Gemüse andünsten",
        instruction:
          "Frühlingszwiebeln schneiden. Zusammen mit den TK-Erbsen in 1 TL Öl 2 Minuten in der Pfanne andünsten, bis sie duften.",
        duration: "3 Min.",
        tag: "Gemüse",
      },
      {
        stepNumber: 2,
        title: "Eimasse anrühren",
        instruction:
          "Eier in einer Schüssel mit einer Prise Salz, Pfeffer und 1 TL kaltem Wasser kurz verquirlen.",
        duration: "2 Min.",
        tag: "Eier",
      },
      {
        stepNumber: 3,
        title: "Mit Deckel stocken lassen",
        instruction:
          "Die Eimasse über das Gemüse in die Pfanne gießen. Den Deckel aufsetzen und bei kleiner Hitze 4 Minuten sanft stocken lassen.",
        duration: "4 Min.",
        tag: "Garen",
      },
      {
        stepNumber: 4,
        title: "Zusammenklappen & servieren",
        instruction:
          "Das Omelett vorsichtig mit einem Pfannenwender zur Hälfte umklappen und mit etwas Reis oder pur genießen.",
        duration: "1 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r10",
    title: "Cremige Hähnchen-Penne Alfredo",
    subtitle: "Zarte Hähnchenbrust in samtiger Knoblauch-Parmesan-Sauce",
    time: "20 Min.",
    difficulty: "Einfach",
    baseCal: 480,
    baseProt: 28,
    baseCarb: 46,
    baseCost: 2.70,
    imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${90 * s}g Penne · ${120 * s}g Hähnchen · Sahnesauce`,
    optional: "Parmesan oder frische Petersilie",
    tone: "amber",
    chefTip:
      "Die Penne al dente kochen und etwas Nudelkochwasser aufheben – damit bindet die Sauce seidenweich ab!",
    ingredientsList: (s) => [
      { name: "Penne Rigate (Pasta)", amount: `${90 * s} g` },
      { name: "Hähnchenbrustfilet (in Streifen)", amount: `${120 * s} g` },
      { name: "Sahne oder Milch", amount: `${75 * s} ml` },
      { name: "Knoblauch (fein gehackt)", amount: `${Math.max(1, s)} Zehe` },
      { name: "Parmesan oder Reibekäse", amount: `${25 * s} g`, optional: true },
      { name: "Olivenöl / Butter", amount: `${10 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pasta kochen",
        instruction: "Penne in reichlich kochendem Salzwasser al dente garen. Vor dem Abgießen 3 EL Nudelwasser abschöpfen.",
        duration: "9 Min.",
        tag: "Pasta",
      },
      {
        stepNumber: 2,
        title: "Hähnchenfilet anbraten",
        instruction: "Hähnchenbrust in mundgerechte Streifen schneiden. In einer heißen Pfanne mit etwas Olivenöl 4-5 Minuten goldbraun und saftig anbraten.",
        duration: "5 Min.",
        tag: "Fleisch",
      },
      {
        stepNumber: 3,
        title: "Samtige Sauce einköcheln",
        instruction: "Gehackten Knoblauch kurz mitdünsten, mit Sahne/Milch und dem Nudelwasser ablöschen. 2 Minuten sanft köcheln lassen und Käse einrühren.",
        duration: "3 Min.",
        tag: "Sauce",
      },
      {
        stepNumber: 4,
        title: "Penne untermengen & anrichten",
        instruction: "Die heißen Penne direkt in die sämige Sauce geben, 1 Minute durchschwenken, mit Pfeffer abschmecken und servieren.",
        duration: "2 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r11",
    title: "Klassische Pasta Bolognese",
    subtitle: "Herzhaftes Rinderhackfleisch in aromatischer Tomatensauce",
    time: "25 Min.",
    difficulty: "Einfach",
    baseCal: 495,
    baseProt: 26,
    baseCarb: 52,
    baseCost: 2.45,
    imageUrl: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${90 * s}g Spaghetti · ${110 * s}g Rind · Tomaten`,
    optional: "Parmesan oder frisches Basilikum",
    tone: "amber",
    chefTip:
      "Das Hackfleisch bei starker Hitze scharf anrösten, damit dunkle Röstaromen für tiefen Bolognese-Geschmack sorgen.",
    ingredientsList: (s) => [
      { name: "Spaghetti oder Penne (Pasta)", amount: `${90 * s} g` },
      { name: "Rinderhackfleisch (frisch)", amount: `${110 * s} g` },
      { name: "Gehackte Tomaten / Tomatensauce", amount: `${125 * s} g` },
      { name: "Zwiebel (gewürfelt)", amount: `${Math.max(1, Math.round(s * 0.5))} Stk.` },
      { name: "Knoblauch", amount: `${Math.max(1, s)} Zehe` },
      { name: "Olivenöl & Kräuter", amount: `${10 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Pasta aufsetzen",
        instruction: "Spaghetti oder Penne im großen Topf mit reichlich Salzwasser nach Packungsanleitung bissfest kochen.",
        duration: "10 Min.",
        tag: "Pasta",
      },
      {
        stepNumber: 2,
        title: "Hackfleisch scharf anbraten",
        instruction: "Zwiebeln und Knoblauch hacken. Hackfleisch im heißen Olivenöl kräftig krümelig anbraten, Zwiebeln nach 2 Minuten zugeben.",
        duration: "6 Min.",
        tag: "Fleisch",
      },
      {
        stepNumber: 3,
        title: "Bolognese köcheln",
        instruction: "Mit Tomaten ablöschen, mit Salz, Pfeffer und italienischen Kräutern würzen. Bei kleiner Hitze 8 Minuten sämig einköcheln.",
        duration: "8 Min.",
        tag: "Sauce",
      },
      {
        stepNumber: 4,
        title: "Mischen & servieren",
        instruction: "Die Pasta abgießen, auf Tellern anrichten, mit heißer Bolognese und optional geriebenem Käse toppen.",
        duration: "1 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r12",
    title: "Penne all'Arrabbiata mit Speck",
    subtitle: "Würzige Tomatensauce mit Chili-Note & knusprigen Speckstreifen",
    time: "18 Min.",
    difficulty: "Einfach",
    baseCal: 440,
    baseProt: 19,
    baseCarb: 48,
    baseCost: 2.10,
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${90 * s}g Penne · ${60 * s}g Speck · Tomatensauce`,
    optional: "Chiliflocken oder Parmesan",
    tone: "mint",
    chefTip:
      "Den Speck in einer kalten Pfanne langsam erhitzen – so tritt das Eigenfett aus und der Speck wird herrlich knusprig!",
    ingredientsList: (s) => [
      { name: "Penne Rigate (Pasta)", amount: `${90 * s} g` },
      { name: "Speckwürfel / Schinkenstreifen", amount: `${60 * s} g` },
      { name: "Tomatensauce / Passata", amount: `${120 * s} ml` },
      { name: "Knoblauch (in Scheiben)", amount: `${Math.max(1, s)} Zehe` },
      { name: "Chiliflocken / Peperoncino", amount: "1 Prise", optional: true },
      { name: "Olivenöl", amount: `${8 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Penne kochen",
        instruction: "Penne im Salzwasser al dente kochen. 2 EL Nudelwasser zurückbehalten.",
        duration: "9 Min.",
        tag: "Pasta",
      },
      {
        stepNumber: 2,
        title: "Speck knusprig braten",
        instruction: "Speckwürfel in der Pfanne ohne extra Fett 4 Minuten kross anbraten. Knoblauch und Chili dazugeben und 1 Minute mitbraten.",
        duration: "5 Min.",
        tag: "Braten",
      },
      {
        stepNumber: 3,
        title: "Arrabbiata-Sauce",
        instruction: "Tomatensauce eingießen, mit etwas Nudelwasser verrühren und 3 Minuten sanft einköcheln.",
        duration: "3 Min.",
        tag: "Sauce",
      },
      {
        stepNumber: 4,
        title: "Finish",
        instruction: "Penne direkt in die pikante Sauce geben, gut vermengen und dampfend servieren.",
        duration: "1 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r13",
    title: "Knuspriges Teriyaki-Hähnchen mit Basmati",
    subtitle: "Glänzendes Hähnchenfilet in süß-herzhafter Soja-Glasur",
    time: "18 Min.",
    difficulty: "Einfach",
    baseCal: 420,
    baseProt: 32,
    baseCarb: 48,
    baseCost: 2.65,
    imageUrl: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${100 * s}g Reis · ${120 * s}g Hähnchen · Sojasauce`,
    optional: "Sesam oder Frühlingszwiebeln",
    tone: "amber",
    chefTip:
      "Die Sojasauce mit einer Prise Zucker oder Honig kurz karamellisieren lassen – so entsteht der typische Teriyaki-Glanz!",
    ingredientsList: (s) => [
      { name: "Basmati Reis", amount: `${100 * s} g` },
      { name: "Hähnchenbrustfilet (in Streifen)", amount: `${120 * s} g` },
      { name: "Kikkoman Sojasauce", amount: `${15 * s} ml` },
      { name: "Frühlingszwiebeln (in Ringen)", amount: `${Math.max(1, s)} Stk.`, optional: true },
      { name: "Pflanzenöl / Sesamöl", amount: `${10 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Reis garen",
        instruction: "Basmati Reis mit der doppelten Menge gesalzenem Wasser aufkochen und 10-12 Minuten quellen lassen.",
        duration: "12 Min.",
        tag: "Reis",
      },
      {
        stepNumber: 2,
        title: "Hähnchen kross anbraten",
        instruction: "Hähnchenstreifen in heißem Öl in der Pfanne 4 Minuten kräftig anbraten, bis sie goldbraun sind.",
        duration: "4 Min.",
        tag: "Fleisch",
      },
      {
        stepNumber: 3,
        title: "Teriyaki glasieren",
        instruction: "Sojasauce und weiße Frühlingszwiebeln zugeben. Unter Schwenken 2 Minuten sirupartig einkochen lassen.",
        duration: "2 Min.",
        tag: "Sauce",
      },
      {
        stepNumber: 4,
        title: "Auf Reis anrichten",
        instruction: "Den dampfenden Reis in Schalen füllen, glasiertes Teriyaki-Hähnchen darauf verteilen und mit grünen Zwiebeln garnieren.",
        duration: "1 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r14",
    title: "One-Pot Pasta Primavera",
    subtitle: "Schnelle Penne mit grünen Erbsen & samtiger Kräuter-Note",
    time: "15 Min.",
    difficulty: "Super Einfach",
    baseCal: 360,
    baseProt: 14,
    baseCarb: 54,
    baseCost: 1.60,
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${85 * s}g Penne · ${60 * s}g Erbsen · Frischkäse`,
    optional: "Zitronensaft oder Kräuter",
    tone: "mint",
    chefTip:
      "Die Erbsen erst in den letzten 3 Minuten zugeben, damit sie knackig grün und herrlich süß bleiben.",
    ingredientsList: (s) => [
      { name: "Penne Rigate (Pasta)", amount: `${85 * s} g` },
      { name: "TK Bio-Erbsen", amount: `${60 * s} g` },
      { name: "Frischkäse oder Sahne", amount: `${40 * s} g` },
      { name: "Knoblauch / Zwiebel", amount: `${Math.max(1, s)} Zehe`, optional: true },
      { name: "Olivenöl / Butter", amount: `${10 * s} g` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Penne kochen",
        instruction: "Penne im Topf mit Salzwasser aufkochen. Nach 6 Minuten die TK-Erbsen direkt mit ins kochende Wasser geben.",
        duration: "9 Min.",
        tag: "Pasta",
      },
      {
        stepNumber: 2,
        title: "Wasser abschöpfen & abgießen",
        instruction: "4 EL Kochwasser auffangen, die Pasta und Erbsen durch ein Sieb abgießen.",
        duration: "1 Min.",
        tag: "Abgießen",
      },
      {
        stepNumber: 3,
        title: "Cremig abbinden",
        instruction: "Zurück in den warmen Topf geben, Frischkäse, Olivenöl und etwas Kochwasser unterheben, bis eine samtige Hülle entsteht.",
        duration: "2 Min.",
        tag: "Sauce",
      },
      {
        stepNumber: 4,
        title: "Servieren",
        instruction: "Mit frisch gemahlenem Pfeffer und einer Prise Salz abschmecken und warm genießen.",
        duration: "1 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r15",
    title: "Goldene Shakshuka mit Eiern",
    subtitle: "Pochierte Bio-Eier in aromatischer Tomaten-Kräuter-Pfanne",
    time: "14 Min.",
    difficulty: "Einfach",
    baseCal: 240,
    baseProt: 15,
    baseCarb: 14,
    baseCost: 1.50,
    imageUrl: "https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${s + 1} Eier · ${120 * s}g Tomaten · Knoblauch`,
    optional: "Fetakäse oder Chiliflocken",
    tone: "amber",
    chefTip:
      "Mulden mit einem Löffel in die Tomatensauce drücken und die Eier hineingleiten lassen – mit Deckel bleibt das Eigelb flüssig!",
    ingredientsList: (s) => [
      { name: "Bio Eier", amount: `${s + 1} Stk.` },
      { name: "Tomatensauce oder Passata", amount: `${120 * s} g` },
      { name: "Knoblauch / Zwiebel", amount: `${Math.max(1, s)} Zehe` },
      { name: "Olivenöl", amount: `${8 * s} ml` },
      { name: "Kräuter / Pfeffer", amount: "Nach Geschmack", optional: true },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Tomatensauce anrösten",
        instruction: "Knoblauch im Olivenöl in der Pfanne 1 Minute anschwitzen, mit Tomatensauce ablöschen und 3 Minuten sanft köcheln.",
        duration: "4 Min.",
        tag: "Sauce",
      },
      {
        stepNumber: 2,
        title: "Eier einbetten",
        instruction: "Kleine Mulden in die Sauce drücken und die Eier vorsichtig hineinschlagen.",
        duration: "2 Min.",
        tag: "Eier",
      },
      {
        stepNumber: 3,
        title: "Mit Deckel stocken lassen",
        instruction: "Den Deckel auflegen und bei kleiner Hitze 4 bis 5 Minuten stocken lassen, bis das Eiweiß fest, das Eigelb aber noch wachsweich ist.",
        duration: "5 Min.",
        tag: "Garen",
      },
      {
        stepNumber: 4,
        title: "Direkt aus der Pfanne genießen",
        instruction: "Mit Pfeffer und Kräutern bestreuen und direkt warm servieren – ideal zum Dippen mit Brot oder Reis.",
        duration: "1 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r16",
    title: "Würzige Wok-Nudeln mit Lauch",
    subtitle: "Blitzschnell gebraten mit Knoblauch-Sojasauce & Sesam",
    time: "12 Min.",
    difficulty: "Super Einfach",
    baseCal: 340,
    baseProt: 12,
    baseCarb: 56,
    baseCost: 1.35,
    imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${90 * s}g Nudeln · Lauch/Zwiebel · Sojasauce`,
    optional: "Röstzwiebeln oder Sesam",
    tone: "mint",
    chefTip:
      "Die Nudeln 1 Minute vor Packungsende abgießen und im heißen Wok mit der Sauce durchziehen lassen.",
    ingredientsList: (s) => [
      { name: "Nudeln / Spaghetti", amount: `${90 * s} g` },
      { name: "Frühlingszwiebeln / Lauch", amount: `${Math.max(1, s)} Stk.` },
      { name: "Kikkoman Sojasauce", amount: `${15 * s} ml` },
      { name: "Knoblauch", amount: `${Math.max(1, s)} Zehe` },
      { name: "Pflanzenöl / Sesamöl", amount: `${10 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Nudeln kochen",
        instruction: "Nudeln im kochenden Salzwasser bissfest garen und abgießen.",
        duration: "7 Min.",
        tag: "Kochen",
      },
      {
        stepNumber: 2,
        title: "Lauch & Knoblauch anrösten",
        instruction: "Frühlingszwiebeln und Knoblauch im heißen Öl 2 Minuten unter Rühren anbraten, bis sie duften.",
        duration: "2 Min.",
        tag: "Wok",
      },
      {
        stepNumber: 3,
        title: "Nudeln braten",
        instruction: "Nudeln und Sojasauce dazugeben. Bei hoher Hitze 2 Minuten kräftig schwenken, bis die Nudeln die Sauce aufgenommen haben.",
        duration: "2 Min.",
        tag: "Braten",
      },
      {
        stepNumber: 4,
        title: "Anrichten",
        instruction: "In Schalen servieren und nach Belieben mit Chili oder Röstzwiebeln toppen.",
        duration: "1 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r17",
    title: "Zartes Rinder-Geschnetzeltes mit Reis",
    subtitle: "Kräftige Rindfleisch-Streifen mit Zwiebeln & Basmati-Reis",
    time: "22 Min.",
    difficulty: "Einfach",
    baseCal: 460,
    baseProt: 31,
    baseCarb: 44,
    baseCost: 2.90,
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${100 * s}g Reis · ${110 * s}g Rind · Zwiebeln`,
    optional: "Sojasauce oder Pfeffer-Rahm",
    tone: "sage",
    chefTip:
      "Rindfleisch quer zur Faser in feine Streifen schneiden und nur kurz und scharf anbraten – so bleibt es butterzart!",
    ingredientsList: (s) => [
      { name: "Basmati Reis", amount: `${100 * s} g` },
      { name: "Rindfleisch / Geschnetzeltes", amount: `${110 * s} g` },
      { name: "Zwiebel / Schalotten", amount: `${Math.max(1, s)} Stk.` },
      { name: "Sojasauce oder Sahne", amount: `${12 * s} ml` },
      { name: "Pflanzenöl", amount: `${10 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Reis ansetzen",
        instruction: "Reis in kochendem Salzwasser auf kleiner Stufe quellen lassen.",
        duration: "12 Min.",
        tag: "Reis",
      },
      {
        stepNumber: 2,
        title: "Rindfleisch scharf braten",
        instruction: "Pfanne maximal erhitzen. Rindfleischstreifen in etwas Öl 2 Minuten scharf anbraten, herausnehmen.",
        duration: "3 Min.",
        tag: "Fleisch",
      },
      {
        stepNumber: 3,
        title: "Sauce zubereiten",
        instruction: "Zwiebeln im Bratensatz glasig dünsten, mit Sojasauce oder etwas Sahne ablöschen und kurz einkochen.",
        duration: "3 Min.",
        tag: "Sauce",
      },
      {
        stepNumber: 4,
        title: "Vermengen & anrichten",
        instruction: "Rindfleisch kurz zurück in die heiße Sauce geben, durchschwenken und sofort mit dem Reis servieren.",
        duration: "2 Min.",
        tag: "Finish",
      },
    ],
  },
  {
    id: "r18",
    title: "Knusprige Schinken-Ei-Reispfanne",
    subtitle: "Herzhaft angebratener Reis mit Speckstreifen & Spiegelei",
    time: "15 Min.",
    difficulty: "Einfach",
    baseCal: 390,
    baseProt: 21,
    baseCarb: 38,
    baseCost: 1.85,
    imageUrl: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80",
    available: (s) => `${100 * s}g Reis · ${s} Eier · ${50 * s}g Speck`,
    optional: "Frühlingszwiebeln",
    tone: "amber",
    chefTip:
      "Erst den Speck knusprig auslassen, dann den Reis im würzigen Speckfett anbraten für maximalen Geschmack!",
    ingredientsList: (s) => [
      { name: "Basmati Reis (vorgekocht)", amount: `${100 * s} g` },
      { name: "Bio Eier", amount: `${s} Stk.` },
      { name: "Speckwürfel oder Schinken", amount: `${50 * s} g` },
      { name: "Frühlingszwiebeln", amount: `${Math.max(1, s)} Stk.`, optional: true },
      { name: "Sojasauce", amount: `${10 * s} ml` },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Speck anbraten",
        instruction: "Speckwürfel in der Pfanne 3 Minuten anbraten, bis sie kross sind.",
        duration: "3 Min.",
        tag: "Braten",
      },
      {
        stepNumber: 2,
        title: "Reis knusprig rösten",
        instruction: "Reis dazugeben und bei starker Hitze 4 Minuten mitbraten, mit Sojasauce ablöschen.",
        duration: "4 Min.",
        tag: "Reis",
      },
      {
        stepNumber: 3,
        title: "Eier braten",
        instruction: "Den Reis zur Seite schieben oder separat Eier in der Pfanne als Spiegelei braten.",
        duration: "3 Min.",
        tag: "Eier",
      },
      {
        stepNumber: 4,
        title: "Kombinieren & anrichten",
        instruction: "Heißen Schinkenreis in Schalen anrichten, das Spiegelei darauflegen und mit Frühlingszwiebeln toppen.",
        duration: "1 Min.",
        tag: "Finish",
      },
    ],
  },
];
