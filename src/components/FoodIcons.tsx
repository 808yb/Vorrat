import React from 'react';
import {
  Apple,
  Banana,
  Beef,
  Carrot,
  Citrus,
  Coffee,
  CookingPot,
  Croissant,
  CupSoda,
  Droplet,
  Drumstick,
  Egg,
  Fish,
  Flame,
  GlassWater,
  Layers,
  Milk,
  Package,
  Refrigerator,
  Salad,
  Snowflake,
  Soup,
  UtensilsCrossed,
  Wheat,
  type LucideIcon,
} from 'lucide-react';

/**
 * Maps product names and categories to a semantic tone.
 */
export function getFoodTone(name: string, category?: string): string {
  if (!name && !category) return 'generic';
  const lower = (name || '').toLowerCase().trim();
  const catLower = (category || '').toLowerCase().trim();

  // 1. Grains, Pasta, Rice, Oats (Check first so 'reis' is not matched by 'eis')
  if (lower.includes('reis') || lower.includes('rice') || lower.includes('risotto') || lower.includes('basmati') || lower.includes('jasmin')) {
    return 'rice';
  }
  if (lower.includes('nudel') || lower.includes('pasta') || lower.includes('penne') || lower.includes('spaghetti') || lower.includes('fusilli') || lower.includes('macaroni')) {
    return 'pasta';
  }
  if (lower.includes('hafer') || lower.includes('oat') || lower.includes('müsli') || lower.includes('porridge') || lower.includes('flocken') || lower.includes('mehl') || lower.includes('linse')) {
    return 'oats';
  }

  // 2. Frozen / Tiefkühl (Use word boundary for 'eis' so it doesn't match 'reis' or 'fleisch')
  if (
    catLower.includes('tiefkühl') ||
    catLower.includes('tk') ||
    /\btk\b/i.test(lower) ||
    lower.startsWith('tk-') ||
    lower.includes('tiefkühl') ||
    /\b(eis|speiseeis|wassereis|stieleis)\b/i.test(lower) ||
    lower.includes('kartoffel-gitter') ||
    lower.includes('pommes') ||
    lower.includes('pizza')
  ) {
    return 'freezer';
  }

  // 3. Drinks / Beverages
  if (
    catLower.includes('getränk') ||
    catLower.includes('drink') ||
    lower.includes('wasser') ||
    lower.includes('water') ||
    lower.includes('leitung')
  ) {
    if (lower.includes('kaffee') || lower.includes('coffee') || lower.includes('espresso') || lower.includes('tee') || lower.includes('tea')) {
      return 'coffee';
    }
    if (lower.includes('monster') || lower.includes('pepsi') || lower.includes('cola') || lower.includes('energy') || lower.includes('fanta') || lower.includes('sprite') || lower.includes('limo') || lower.includes('saft')) {
      return 'drink';
    }
    return 'water';
  }

  // 4. Dairy & Eggs
  if (
    lower.includes('milch') ||
    lower.includes('milk') ||
    lower.includes('joghurt') ||
    lower.includes('quark') ||
    lower.includes('sahne') ||
    lower.includes('schmand') ||
    lower.includes('crème')
  ) {
    return 'milk';
  }
  if (lower.includes('käse') || lower.includes('cheese') || lower.includes('parmesan') || lower.includes('feta') || lower.includes('gouda') || lower.includes('mozzarella') || lower.includes('cheddar') || lower.includes('butter')) {
    return 'cheese';
  }
  if (/\b(ei|eier|bio-eier|freilandeier|rührei|spiegelei|omelett|egg|eggs)\b/i.test(lower) || lower.includes('eier')) {
    return 'egg';
  }

  // 4. Meat, Poultry, Fish
  if (
    lower.includes('hähnchen') ||
    lower.includes('huhn') ||
    lower.includes('chicken') ||
    lower.includes('geflügel') ||
    lower.includes('pute') ||
    lower.includes('minuten') ||
    lower.includes('schnitz')
  ) {
    return 'chicken';
  }
  if (
    lower.includes('rind') ||
    lower.includes('beef') ||
    lower.includes('steak') ||
    lower.includes('hack') ||
    lower.includes('fleisch') ||
    lower.includes('bratwurst') ||
    lower.includes('mett') ||
    lower.includes('schwein')
  ) {
    return 'beef';
  }
  if (lower.includes('lachs') || lower.includes('fisch') || lower.includes('fish') || lower.includes('thunfisch') || lower.includes('forelle') || lower.includes('garnele')) {
    return 'fish';
  }

  // 5. Fresh Salads, Herbs, Leafy Greens
  if (
    lower.includes('salat') ||
    lower.includes('pflück') ||
    lower.includes('rucola') ||
    lower.includes('spinat') ||
    lower.includes('kräuter') ||
    lower.includes('basilikum') ||
    lower.includes('petersilie') ||
    lower.includes('erbse') ||
    lower.includes('pea') ||
    lower.includes('edamame')
  ) {
    return 'salad';
  }

  // 6. Fresh Fruits
  if (lower.includes('apfel') || lower.includes('apple') || lower.includes('beere') || lower.includes('erdbeer') || lower.includes('himbeer') || lower.includes('blaubeer')) {
    return 'apple';
  }
  if (lower.includes('banane') || lower.includes('banana')) {
    return 'banana';
  }
  if (lower.includes('zitrone') || lower.includes('limette') || lower.includes('lemon') || lower.includes('lime') || lower.includes('orange') || lower.includes('citrus')) {
    return 'citrus';
  }

  // 7. Fresh Vegetables
  if (
    lower.includes('karotte') ||
    lower.includes('möhre') ||
    lower.includes('carrot') ||
    lower.includes('paprika') ||
    lower.includes('gurke') ||
    lower.includes('zucchini') ||
    lower.includes('aubergine') ||
    lower.includes('brokkoli') ||
    lower.includes('broccoli') ||
    lower.includes('zwiebel') ||
    lower.includes('onion') ||
    lower.includes('knoblauch') ||
    lower.includes('garlic') ||
    lower.includes('lauch') ||
    lower.includes('frühlingszwiebel')
  ) {
    return 'carrot';
  }
  if (lower.includes('tomate') || lower.includes('tomato') || lower.includes('passata')) {
    return 'tomato';
  }

  // 8. Bakery & Wraps
  if (lower.includes('brot') || lower.includes('bread') || lower.includes('wrap') || lower.includes('tortilla') || lower.includes('toast') || lower.includes('brötchen') || lower.includes('baguette') || lower.includes('pita')) {
    return 'bread';
  }


  // 10. Sauces, Spices, Oils
  if (lower.includes('öl') || lower.includes('oil') || lower.includes('olivenöl') || lower.includes('sesamöl')) {
    return 'oil';
  }
  if (lower.includes('soja') || lower.includes('sauce') || lower.includes('soße') || lower.includes('kikkoman') || lower.includes('teriyaki') || lower.includes('sriracha') || lower.includes('essig') || lower.includes('senf') || lower.includes('ketchup') || lower.includes('cornichon')) {
    return 'sauce';
  }

  // Category fallback if name didn't match specific foods
  if (catLower.includes('tiefkühl') || catLower.includes('tk')) return 'freezer';
  if (catLower.includes('getränk')) return 'drink';
  if (catLower.includes('saucen')) return 'sauce';
  if (catLower.includes('trocken')) return 'rice';
  if (catLower.includes('kühl')) return 'refrigerator';

  return 'generic';
}

interface ToneConfig {
  icon: LucideIcon;
  bg: string;
  border: string;
  color: string;
}

const TONE_MAP: Record<string, ToneConfig> = {
  freezer: {
    icon: Snowflake,
    bg: '#eff6ff',
    border: '#bfdbfe',
    color: '#2563eb',
  },
  milk: {
    icon: Milk,
    bg: '#f0f9ff',
    border: '#bae6fd',
    color: '#0284c7',
  },
  cheese: {
    icon: Layers,
    bg: '#fffbeb',
    border: '#fde68a',
    color: '#d97706',
  },
  egg: {
    icon: Egg,
    bg: '#fffbeb',
    border: '#fde68a',
    color: '#d97706',
  },
  chicken: {
    icon: Drumstick,
    bg: '#fff1f2',
    border: '#fecdd3',
    color: '#e11d48',
  },
  beef: {
    icon: Beef,
    bg: '#fff1f2',
    border: '#fecdd3',
    color: '#e11d48',
  },
  fish: {
    icon: Fish,
    bg: '#f0fdfa',
    border: '#99f6e4',
    color: '#0d9488',
  },
  salad: {
    icon: Salad,
    bg: '#f0fdf4',
    border: '#bbf7d0',
    color: '#16a34a',
  },
  peas: {
    icon: Salad,
    bg: '#f0fdf4',
    border: '#bbf7d0',
    color: '#16a34a',
  },
  onion: {
    icon: Carrot,
    bg: '#fff7ed',
    border: '#fed7aa',
    color: '#ea580c',
  },
  carrot: {
    icon: Carrot,
    bg: '#fff7ed',
    border: '#fed7aa',
    color: '#ea580c',
  },
  broccoli: {
    icon: Salad,
    bg: '#f0fdf4',
    border: '#bbf7d0',
    color: '#16a34a',
  },
  garlic: {
    icon: Carrot,
    bg: '#fff7ed',
    border: '#fed7aa',
    color: '#ea580c',
  },
  tomato: {
    icon: Apple,
    bg: '#fef2f2',
    border: '#fecaca',
    color: '#dc2626',
  },
  apple: {
    icon: Apple,
    bg: '#fef2f2',
    border: '#fecaca',
    color: '#dc2626',
  },
  banana: {
    icon: Banana,
    bg: '#fefce8',
    border: '#fef08a',
    color: '#ca8a04',
  },
  citrus: {
    icon: Citrus,
    bg: '#fefce8',
    border: '#fef08a',
    color: '#ca8a04',
  },
  lemon: {
    icon: Citrus,
    bg: '#fefce8',
    border: '#fef08a',
    color: '#ca8a04',
  },
  bread: {
    icon: Croissant,
    bg: '#fffbeb',
    border: '#fde68a',
    color: '#b45309',
  },
  rice: {
    icon: CookingPot,
    bg: '#fffbeb',
    border: '#fde68a',
    color: '#b45309',
  },
  pasta: {
    icon: UtensilsCrossed,
    bg: '#fffbeb',
    border: '#fde68a',
    color: '#b45309',
  },
  oats: {
    icon: Wheat,
    bg: '#fffbeb',
    border: '#fde68a',
    color: '#b45309',
  },
  water: {
    icon: GlassWater,
    bg: '#f0f9ff',
    border: '#7dd3fc',
    color: '#0284c7',
  },
  drink: {
    icon: CupSoda,
    bg: '#f5f3ff',
    border: '#ddd6fe',
    color: '#7c3aed',
  },
  coffee: {
    icon: Coffee,
    bg: '#fef3c7',
    border: '#fde68a',
    color: '#92400e',
  },
  sauce: {
    icon: Flame,
    bg: '#fff7ed',
    border: '#fed7aa',
    color: '#c2410c',
  },
  oil: {
    icon: Droplet,
    bg: '#fefce8',
    border: '#fef08a',
    color: '#ca8a04',
  },
  refrigerator: {
    icon: Refrigerator,
    bg: '#f0f9ff',
    border: '#bae6fd',
    color: '#0284c7',
  },
  generic: {
    icon: UtensilsCrossed,
    bg: '#ecfdf5',
    border: '#a7f3d0',
    color: '#059669',
  },
};

export interface ProductMarkProps {
  tone?: string;
  name?: string;
  category?: string;
  compact?: boolean;
}

/**
 * Modern, clean Lucide-based category and food badge.
 */
export function ProductMark({
  tone,
  name,
  category,
  compact = false,
}: ProductMarkProps) {
  // Determine effective tone
  const deduced = name ? getFoodTone(name, category) : undefined;
  const effectiveTone =
    deduced && deduced !== 'generic'
      ? deduced
      : tone && tone !== 'generic'
      ? tone
      : category
      ? getFoodTone('', category)
      : 'generic';

  const config = TONE_MAP[effectiveTone] || TONE_MAP.generic;
  const IconComponent = config.icon;
  const iconSize = compact ? 18 : 23;

  return (
    <div
      className={`product-mark ${effectiveTone} ${compact ? 'compact' : ''}`}
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
      }}
      title={name || effectiveTone}
    >
      <IconComponent
        size={iconSize}
        strokeWidth={2.2}
        color={config.color}
        aria-hidden="true"
      />
    </div>
  );
}

// Legacy exports for compatibility
export const FoodIconRice = () => <CookingPot size={22} color="#b45309" />;
export const FoodIconEgg = () => <Egg size={22} color="#d97706" />;
export const FoodIconSauce = () => <Flame size={22} color="#c2410c" />;
export const FoodIconPeas = () => <Salad size={22} color="#16a34a" />;
export const FoodIconOnion = () => <Carrot size={22} color="#ea580c" />;
export const FoodIconChicken = () => <Drumstick size={22} color="#e11d48" />;
export const FoodIconPasta = () => <UtensilsCrossed size={22} color="#b45309" />;
export const FoodIconOats = () => <Wheat size={22} color="#b45309" />;
export const FoodIconMilk = () => <Milk size={22} color="#0284c7" />;
export const FoodIconCheese = () => <Layers size={22} color="#d97706" />;
export const FoodIconTomato = () => <Apple size={22} color="#dc2626" />;
export const FoodIconOil = () => <Droplet size={22} color="#ca8a04" />;
export const FoodIconLemon = () => <Citrus size={22} color="#ca8a04" />;
export const FoodIconApple = () => <Apple size={22} color="#dc2626" />;
export const FoodIconBread = () => <Croissant size={22} color="#b45309" />;
export const FoodIconCarrot = () => <Carrot size={22} color="#ea580c" />;
export const FoodIconBroccoli = () => <Salad size={22} color="#16a34a" />;
export const FoodIconGarlic = () => <Carrot size={22} color="#ea580c" />;
export const FoodIconWater = () => <GlassWater size={22} color="#0284c7" />;
export const FoodIconGeneric = () => <UtensilsCrossed size={22} color="#059669" />;
