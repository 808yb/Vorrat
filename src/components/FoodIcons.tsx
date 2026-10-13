import React from 'react';

export function getFoodTone(name: string, category?: string): string {
  if (!name) return 'generic';
  const lower = name.toLowerCase();

  if (lower.includes('wasser') || lower.includes('water') || lower.includes('leitung')) {
    return 'water';
  }
  if (lower.includes('reis') || lower.includes('rice') || lower.includes('risotto') || lower.includes('basmati') || lower.includes('jasmin')) {
    return 'rice';
  }
  if (lower.includes('ei') || lower.includes('egg') || lower.includes('eier') || lower.includes('omelett') || lower.includes('rührei') || lower.includes('spiegelei')) {
    return 'egg';
  }
  if (lower.includes('hähnchen') || lower.includes('huhn') || lower.includes('chicken') || lower.includes('fleisch') || lower.includes('filet') || lower.includes('poulet') || lower.includes('pute') || lower.includes('rind')) {
    return 'chicken';
  }
  if (lower.includes('soja') || lower.includes('sauce') || lower.includes('soße') || lower.includes('kikkoman') || lower.includes('teriyaki') || lower.includes('sriracha') || lower.includes('essig') || lower.includes('senf')) {
    return 'sauce';
  }
  if (lower.includes('erbse') || lower.includes('pea') || lower.includes('edamame') || lower.includes('bohne') || lower.includes('mais') || lower.includes('spinat')) {
    return 'peas';
  }
  if (lower.includes('zwiebel') || lower.includes('lauch') || lower.includes('onion') || lower.includes('schalotte') || lower.includes('porree')) {
    return 'onion';
  }
  if (lower.includes('nudel') || lower.includes('pasta') || lower.includes('penne') || lower.includes('spaghetti') || lower.includes('fusilli') || lower.includes('macaroni')) {
    return 'pasta';
  }
  if (lower.includes('hafer') || lower.includes('oat') || lower.includes('müsli') || lower.includes('porridge') || lower.includes('flocken') || lower.includes('granola')) {
    return 'oats';
  }
  if (lower.includes('milch') || lower.includes('milk') || lower.includes('joghurt') || lower.includes('quark') || lower.includes('sahne') || lower.includes('drink')) {
    return 'milk';
  }
  if (lower.includes('käse') || lower.includes('cheese') || lower.includes('parmesan') || lower.includes('feta') || lower.includes('gouda') || lower.includes('mozzarella') || lower.includes('cheddar')) {
    return 'cheese';
  }
  if (lower.includes('tomate') || lower.includes('tomato') || lower.includes('passata') || lower.includes('ketchup')) {
    return 'tomato';
  }
  if (lower.includes('öl') || lower.includes('oil') || lower.includes('olivenöl') || lower.includes('sesamöl')) {
    return 'oil';
  }
  if (lower.includes('limette') || lower.includes('zitrone') || lower.includes('lemon') || lower.includes('lime') || lower.includes('citrus')) {
    return 'lemon';
  }
  if (lower.includes('apfel') || lower.includes('apple') || lower.includes('birne') || lower.includes('beere') || lower.includes('obst') || lower.includes('frucht')) {
    return 'apple';
  }
  if (lower.includes('brot') || lower.includes('bread') || lower.includes('toast') || lower.includes('baguette') || lower.includes('brötchen') || lower.includes('mehl')) {
    return 'bread';
  }
  if (lower.includes('karotte') || lower.includes('möhre') || lower.includes('carrot') || lower.includes('rübe')) {
    return 'carrot';
  }
  if (lower.includes('brokkoli') || lower.includes('broccoli') || lower.includes('blumenkohl') || lower.includes('kaisergemüse')) {
    return 'broccoli';
  }
  if (lower.includes('knoblauch') || lower.includes('garlic') || lower.includes('ingwer') || lower.includes('ginger')) {
    return 'garlic';
  }

  // Category fallback if name didn't match specific foods
  if (category === 'Saucen') return 'sauce';
  if (category === 'Trocken') return 'rice';
  if (category === 'Kühl') return 'egg';

  return 'generic';
}

export function FoodIconRice() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Reis">
      {/* Ceramic Bowl */}
      <path d="M6 18c0 7.7 5.4 14 12 14s12-6.3 12-14H6Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.6" />
      <ellipse cx="18" cy="18" rx="12" ry="3.5" fill="#E2E8F0" />
      {/* Fluffy Rice Mound */}
      <path d="M7.5 17.5c0-4.8 4.7-9 10.5-9s10.5 4.2 10.5 9c0 .2-4.7 2-10.5 2s-10.5-1.8-10.5-2Z" fill="#FFFFFF" />
      {/* Rice Grains */}
      <ellipse cx="14" cy="13" rx="2" ry="1" transform="rotate(-25 14 13)" fill="#FEF08A" stroke="#FDE047" strokeWidth="0.7" />
      <ellipse cx="20" cy="12.5" rx="2" ry="1" transform="rotate(25 20 12.5)" fill="#FEF08A" stroke="#FDE047" strokeWidth="0.7" />
      <ellipse cx="17.5" cy="15.5" rx="2" ry="1" transform="rotate(-5 17.5 15.5)" fill="#FEF08A" stroke="#FDE047" strokeWidth="0.7" />
      <ellipse cx="23" cy="15" rx="2" ry="1" transform="rotate(40 23 15)" fill="#FEF08A" stroke="#FDE047" strokeWidth="0.7" />
      <ellipse cx="11.5" cy="15.5" rx="2" ry="1" transform="rotate(-35 11.5 15.5)" fill="#FEF08A" stroke="#FDE047" strokeWidth="0.7" />
      {/* Bowl Foot */}
      <rect x="14" y="30.5" width="8" height="2.5" rx="1" fill="#94A3B8" />
      {/* Fresh aromatic steam curls */}
      <path d="M15 7c-1-1.5-1-2.5 0-3.5" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
      <path d="M21 8c-1-1.8-1-2.8 0-4" stroke="#10B981" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export function FoodIconEgg() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Eier">
      {/* Fried/poached egg white with tender curved contour */}
      <path
        d="M18 5C10 5 4 11 4 19c0 8.5 6 13 14 13s14-4.5 14-13c0-8-6-14-14-14Z"
        fill="#F8FAFC"
        stroke="#E2E8F0"
        strokeWidth="1.4"
      />
      <path
        d="M6 18c1-4 4-8 10-9 7-1 12 3 14 8 2 5-1 10-6 12-7 3-15 0-18-11Z"
        fill="#FFFFFF"
      />
      {/* Golden egg yolk */}
      <circle cx="18" cy="19" r="6.6" fill="#F59E0B" />
      <circle cx="18" cy="19" r="6" fill="#FBBF24" />
      {/* Glossy highlight */}
      <circle cx="16.5" cy="17" r="2" fill="#FEF08A" opacity="0.85" />
      {/* Black pepper grains */}
      <circle cx="11.5" cy="15" r="0.7" fill="#64748B" />
      <circle cx="23.5" cy="13.5" r="0.7" fill="#64748B" />
      <circle cx="23" cy="23.5" r="0.7" fill="#64748B" />
    </svg>
  );
}

export function FoodIconSauce() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Sojasauce">
      {/* Red Cap */}
      <path d="M14 6h8v3h-8z" fill="#DC2626" />
      <path d="M12 9h12v2H12z" fill="#EF4444" rx="1" />
      {/* Spout */}
      <path d="M13 7l-4-2.2v2.4l4 1z" fill="#DC2626" />
      {/* Glass Body */}
      <path d="M13 11l-3 4v14a3 3 0 003 3h10a3 3 0 003-3V15l-3-4H13z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.3" />
      {/* Dark Soy Liquid */}
      <path d="M10.5 17.5h15v10.5a2 2 0 01-2 2h-11a2 2 0 01-2-2V17.5z" fill="#450A0A" />
      <ellipse cx="18" cy="17.5" rx="7.5" ry="1.4" fill="#7F1D1D" />
      {/* Gloss Highlight */}
      <path d="M12 19.5v6" stroke="#FEF2F2" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      {/* Japanese Label */}
      <rect x="13.5" y="21" width="9" height="5.5" rx="1" fill="#FEF2F2" opacity="0.9" />
      <line x1="15" y1="23.5" x2="21" y2="23.5" stroke="#991B1B" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function FoodIconPeas() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Erbsen">
      {/* Pod Outer */}
      <path d="M5 24C6 14 15 7 29 8c-3 9-11 19-21 20-2 .2-3.5-1.5-3-4Z" fill="#059669" stroke="#047857" strokeWidth="1.4" />
      {/* Pod Inner */}
      <path d="M7 23C8.5 15.5 16 10 27 10.5c-4 7-10 14.5-18 16-.9.2-2.2-.6-2-3.5Z" fill="#10B981" />
      {/* Plump Sweet Peas */}
      <circle cx="12" cy="20" r="3.3" fill="#34D399" stroke="#059669" strokeWidth="1" />
      <circle cx="11" cy="19" r="1.1" fill="#A7F3D0" />
      <circle cx="17.5" cy="16.5" r="3.3" fill="#34D399" stroke="#059669" strokeWidth="1" />
      <circle cx="16.5" cy="15.5" r="1.1" fill="#A7F3D0" />
      <circle cx="23" cy="13.5" r="3.3" fill="#34D399" stroke="#059669" strokeWidth="1" />
      <circle cx="22" cy="12.5" r="1.1" fill="#A7F3D0" />
      {/* Stem */}
      <path d="M29 8c2.5-1 4-3 4.5-4.5" stroke="#047857" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function FoodIconOnion() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Frühlingszwiebeln">
      {/* Green Stalks */}
      <path d="M14 18L10 5" stroke="#16A34A" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M18 18L18 4" stroke="#15803D" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M20 18L26 6" stroke="#22C55E" strokeWidth="2.6" strokeLinecap="round" />
      {/* White Bulb */}
      <path d="M12 18c0-1 8-1 8 0v9a4 4 0 01-8 0v-9z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.2" />
      <ellipse cx="16" cy="27" rx="4" ry="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.2" />
      {/* Root tufts */}
      <path d="M14 31l-1 2.5M16 31.5v2.5M18 31l1 2.5" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round" />
      {/* Green tender gradient band */}
      <path d="M12 17c1.5-.5 6.5-.5 8 0v3c-1.5.5-6.5.5-8 0v-3z" fill="#86EFAC" />
    </svg>
  );
}

export function FoodIconChicken() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Hähnchen">
      {/* Roasted Chicken Breast / Drumstick */}
      <path d="M10 25c-1.5-1.5-2-3.5 0-5.5l11-11c3.5-3.5 8.5-2.5 10.5-.5s3 7-.5 10.5L20 29.5c-2 2-4 1.5-5.5 0" fill="#EA580C" />
      <path d="M12 23c-1-1-1.5-2.5 0-4l10-10c2.5-2.5 6.5-2 8 0s2.5 5.5 0 8L20 27c-1.5 1.5-3 1-4 0" fill="#F97316" />
      {/* Savory Grill Marks */}
      <line x1="19" y1="13" x2="23" y2="17" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="17" x2="26" y2="21" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="17" x2="20" y2="21" stroke="#9A3412" strokeWidth="1.5" strokeLinecap="round" />
      {/* Bone */}
      <path d="M9 26l-3 3" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" />
      <circle cx="5.5" cy="29.5" r="1.8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
      <circle cx="6.5" cy="30.5" r="1.8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
    </svg>
  );
}

export function FoodIconPasta() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Pasta">
      <g transform="rotate(-30 18 18)">
        <path d="M10 13l3-4h6l-3 4H10z" fill="#FDE047" stroke="#EAB308" strokeWidth="1.2" />
        <path d="M10 13v10l3 4V17l-3-4z" fill="#FACC15" stroke="#EAB308" strokeWidth="1.2" />
        <path d="M13 27h6l-3-4h-6l3 4z" fill="#EAB308" />
        <path d="M19 9v14l-3 4V13l3-4z" fill="#FEF08A" stroke="#EAB308" strokeWidth="1.2" />
        <line x1="12" y1="16" x2="15" y2="20" stroke="#CA8A04" strokeWidth="0.8" />
        <line x1="14" y1="14" x2="17" y2="18" stroke="#CA8A04" strokeWidth="0.8" />
      </g>
      <path d="M26 8c-3 0-5 2.5-4 5.5 3 0 5-2.5 4-5.5z" fill="#16A34A" />
    </svg>
  );
}

export function FoodIconOats() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Haferflocken">
      <path d="M7 19c0 6.5 4.5 12 11 12s11-5.5 11-12H7z" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.4" />
      <ellipse cx="18" cy="19" rx="11" ry="3" fill="#FDE68A" />
      <ellipse cx="14" cy="15" rx="2.5" ry="1.4" fill="#F59E0B" opacity="0.8" />
      <ellipse cx="20" cy="14" rx="2.4" ry="1.3" transform="rotate(20 20 14)" fill="#D97706" opacity="0.8" />
      <ellipse cx="17" cy="17" rx="2.6" ry="1.4" transform="rotate(-15 17 17)" fill="#B45309" opacity="0.7" />
      <ellipse cx="22" cy="17" rx="2" ry="1.2" fill="#F59E0B" opacity="0.8" />
      <path d="M26 8c-2 2-3 5-3 8" stroke="#D97706" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="25" cy="9" rx="1.5" ry="2.5" transform="rotate(30 25 9)" fill="#F59E0B" />
      <ellipse cx="22" cy="12" rx="1.5" ry="2.5" transform="rotate(-30 22 12)" fill="#F59E0B" />
    </svg>
  );
}

export function FoodIconMilk() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Milch">
      <path d="M12 14l3-6h6l3 6H12z" fill="#BAE6FD" stroke="#38BDF8" strokeWidth="1.2" />
      <rect x="12" y="14" width="12" height="16" rx="2" fill="#F0F9FF" stroke="#38BDF8" strokeWidth="1.3" />
      <path d="M12 19h12v5H12z" fill="#0284C7" />
      <text x="18" y="23" textAnchor="middle" fontSize="3.5" fontWeight="bold" fill="#FFFFFF" fontFamily="sans-serif">MILK</text>
      <circle cx="18" cy="27" r="1.3" fill="#38BDF8" />
      <rect x="16.5" y="6" width="3" height="2" rx="0.5" fill="#0284C7" />
    </svg>
  );
}

export function FoodIconCheese() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Käse">
      <path d="M6 25l22 4V20L6 14v11z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.2" />
      <path d="M6 14L24 7l4 13L6 14z" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />
      <ellipse cx="14" cy="20" rx="2.5" ry="2" fill="#D97706" />
      <ellipse cx="22" cy="24" rx="2" ry="2" fill="#D97706" />
      <circle cx="20" cy="13" r="1.8" fill="#F59E0B" />
      <circle cx="13" cy="13" r="1.3" fill="#F59E0B" />
      <ellipse cx="8" cy="18" rx="1.5" ry="1.2" fill="#D97706" />
    </svg>
  );
}

export function FoodIconTomato() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Tomaten">
      <ellipse cx="18" cy="20" rx="12" ry="10" fill="#EF4444" stroke="#DC2626" strokeWidth="1.2" />
      <ellipse cx="18" cy="19.5" rx="11" ry="9" fill="#F87171" opacity="0.5" />
      <ellipse cx="13" cy="16" rx="2.5" ry="1.5" transform="rotate(-25 13 16)" fill="#FFFFFF" opacity="0.6" />
      <path d="M18 10l-3 3 3-1 3 1-3-3z" fill="#15803D" />
      <path d="M18 10l-5-1 3 3-1-3 3 1z" fill="#16A34A" />
      <path d="M18 10l5-1-3 3 1-3-3 1z" fill="#16A34A" />
      <path d="M18 10c0-2.5 1-4.5 3-5.5" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function FoodIconOil() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Öl">
      <rect x="16.5" y="5" width="3" height="3" fill="#B45309" rx="0.5" />
      <path d="M15 8h6v3l3 3v14a2 2 0 01-2 2H14a2 2 0 01-2-2V14l3-3V8z" fill="#FEFCE8" stroke="#CA8A04" strokeWidth="1.3" />
      <path d="M13 16h10v11a1 1 0 01-1 1H14a1 1 0 01-1-1V16z" fill="#84CC16" opacity="0.75" />
      <ellipse cx="18" cy="16" rx="5" ry="1.2" fill="#65A30D" />
      <ellipse cx="17.5" cy="21.5" rx="1.8" ry="2.8" transform="rotate(25 17.5 21.5)" fill="#4D7C0F" />
      <circle cx="19" cy="23" r="1.2" fill="#65A30D" />
    </svg>
  );
}

export function FoodIconLemon() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Zitrone">
      <circle cx="18" cy="18" r="13" fill="#FACC15" stroke="#EAB308" strokeWidth="1.4" />
      <circle cx="18" cy="18" r="11" fill="#FEF08A" />
      <circle cx="18" cy="18" r="10" fill="#FACC15" />
      <circle cx="18" cy="18" r="1.5" fill="#FEF08A" />
      <path d="M18 18L13 9a10 10 0 0110 0L18 18z" fill="#EAB308" opacity="0.75" />
      <path d="M18 18L9 15a10 10 0 014-7L18 18z" fill="#EAB308" opacity="0.75" />
      <path d="M18 18L9 21a10 10 0 010-6L18 18z" fill="#EAB308" opacity="0.75" />
      <path d="M18 18l4 9a10 10 0 01-8-3L18 18z" fill="#EAB308" opacity="0.75" />
      <path d="M18 18l9 3a10 10 0 01-5 6L18 18z" fill="#EAB308" opacity="0.75" />
      <path d="M18 18l9-3a10 10 0 010 6L18 18z" fill="#EAB308" opacity="0.75" />
    </svg>
  );
}

export function FoodIconApple() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Apfel">
      <path d="M18 11c-2-2-7-1.5-9 1.5-2.5 4-2 12.5 3 15.5 3 1.8 5 .5 6 0 1 .5 3 1.8 6 0 5-3 5.5-11.5 3-15.5-2-3-7-3.5-9-1.5z" fill="#EF4444" stroke="#DC2626" strokeWidth="1.3" />
      <ellipse cx="13" cy="17" rx="2" ry="4" transform="rotate(-20 13 17)" fill="#FFFFFF" opacity="0.5" />
      <path d="M18 11c.5-2.5 1.5-5 3.5-6" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 8c2-2 5-2 6 0-1 2.5-4 2.5-6 0z" fill="#22C55E" />
    </svg>
  );
}

export function FoodIconBread() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Brot">
      <path d="M7 23c-1.5-5 1-11 11-11s12.5 6 11 11c-.5 2-4 3.5-11 3.5S7.5 25 7 23z" fill="#D97706" stroke="#B45309" strokeWidth="1.4" />
      <path d="M8 22c-.5-4.5 1.5-9.5 10-9.5s10.5 5 10 9.5c-1 2-4 3-10 3s-9-1-10-3z" fill="#F59E0B" />
      <path d="M12 16c1.5 2 3 3.5 4 4" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 15c1.5 2 3 3.5 4 4" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 16c1.2 1.8 2.5 3.2 3.5 3.8" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FoodIconCarrot() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Karotten">
      <g transform="rotate(-35 18 18)">
        <path d="M14 12c-2 0-3 1-3 2l5 17c.5 1.5 1.5 1.5 2 0l5-17c0-1-1-2-3-2h-6z" fill="#F97316" stroke="#EA580C" strokeWidth="1.3" />
        <line x1="13" y1="17" x2="16" y2="17" stroke="#C2410C" strokeWidth="1" strokeLinecap="round" />
        <line x1="17" y1="21" x2="20" y2="21" stroke="#C2410C" strokeWidth="1" strokeLinecap="round" />
        <line x1="15" y1="25" x2="18" y2="25" stroke="#C2410C" strokeWidth="1" strokeLinecap="round" />
        <path d="M16 12L13 6M17 12V4M18 12L21 6" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function FoodIconBroccoli() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Brokkoli">
      <path d="M15 22h6v8a2 2 0 01-2 2h-2a2 2 0 01-2-2v-8z" fill="#86EFAC" stroke="#16A34A" strokeWidth="1.2" />
      <circle cx="18" cy="13" r="6" fill="#15803D" />
      <circle cx="12" cy="16" r="5" fill="#16A34A" />
      <circle cx="24" cy="16" r="5" fill="#16A34A" />
      <circle cx="15" cy="18" r="4.5" fill="#22C55E" />
      <circle cx="21" cy="18" r="4.5" fill="#22C55E" />
      <circle cx="18" cy="14" r="3.5" fill="#4ADE80" opacity="0.6" />
    </svg>
  );
}

export function FoodIconGarlic() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Knoblauch">
      <path d="M18 6v4" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 9c-5 1-9 6-9 12 0 6 4 9 9 9s9-3 9-9c0-6-4-11-9-12z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.3" />
      <path d="M14 11c-2 2-3 5-3 9 0 5 1.5 8 4 9" stroke="#E2E8F0" strokeWidth="1.2" />
      <path d="M22 11c2 2 3 5 3 9 0 5-1.5 8-4 9" stroke="#E2E8F0" strokeWidth="1.2" />
      <path d="M18 10v19" stroke="#E2E8F0" strokeWidth="1.2" />
      <path d="M16 29l-1 2M18 29v2.5M20 29l1 2" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function FoodIconWater() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Wasser">
      <path
        d="M18 5C18 5 9 16 9 22C9 26.97 13.03 31 18 31C22.97 31 27 26.97 27 22C27 16 18 5 18 5Z"
        fill="#38BDF8"
        stroke="#0284C7"
        strokeWidth="1.4"
      />
      <path
        d="M14 21C14 18 16 14 18 12"
        stroke="#E0F2FE"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="21" cy="24" r="1.5" fill="#FFFFFF" opacity="0.7" />
    </svg>
  );
}

export function FoodIconGeneric() {
  return (
    <svg width="34" height="34" viewBox="0 0 36 36" fill="none" aria-label="Lebensmittel">
      <path d="M7 23h22v2a1 1 0 01-1 1H8a1 1 0 01-1-1v-2z" fill="#10B981" />
      <path d="M9 22c0-7 4-11 9-11s9 4 9 11H9z" fill="#D1FAE5" stroke="#10B981" strokeWidth="1.4" />
      <circle cx="18" cy="9.5" r="2" fill="#059669" />
      <path d="M13 19c1-3 3-5 5-5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      <path d="M25 8l.6 1.4L27 10l-1.4.6L25 12l-.6-1.4L23 10l1.4-.6L25 8z" fill="#10B981" />
    </svg>
  );
}

export function ProductMark({
  tone,
  name,
  compact = false,
}: {
  tone?: string;
  name?: string;
  compact?: boolean;
}) {
  const deduced = name ? getFoodTone(name) : undefined;
  const effectiveTone =
    deduced && deduced !== 'generic'
      ? deduced
      : tone && tone !== 'generic'
      ? tone
      : 'generic';

  return (
    <div
      className={`product-mark ${effectiveTone} ${compact ? 'compact' : ''}`}
      title={name || effectiveTone}
    >
      {effectiveTone === 'water' && <FoodIconWater />}
      {effectiveTone === 'rice' && <FoodIconRice />}
      {effectiveTone === 'egg' && <FoodIconEgg />}
      {effectiveTone === 'sauce' && <FoodIconSauce />}
      {effectiveTone === 'peas' && <FoodIconPeas />}
      {effectiveTone === 'onion' && <FoodIconOnion />}
      {effectiveTone === 'chicken' && <FoodIconChicken />}
      {effectiveTone === 'pasta' && <FoodIconPasta />}
      {effectiveTone === 'oats' && <FoodIconOats />}
      {effectiveTone === 'milk' && <FoodIconMilk />}
      {effectiveTone === 'cheese' && <FoodIconCheese />}
      {effectiveTone === 'tomato' && <FoodIconTomato />}
      {effectiveTone === 'oil' && <FoodIconOil />}
      {effectiveTone === 'lemon' && <FoodIconLemon />}
      {effectiveTone === 'apple' && <FoodIconApple />}
      {effectiveTone === 'bread' && <FoodIconBread />}
      {effectiveTone === 'carrot' && <FoodIconCarrot />}
      {effectiveTone === 'broccoli' && <FoodIconBroccoli />}
      {effectiveTone === 'garlic' && <FoodIconGarlic />}
      {![
        'water',
        'rice',
        'egg',
        'sauce',
        'peas',
        'onion',
        'chicken',
        'pasta',
        'oats',
        'milk',
        'cheese',
        'tomato',
        'oil',
        'lemon',
        'apple',
        'bread',
        'carrot',
        'broccoli',
        'garlic',
      ].includes(effectiveTone) && <FoodIconGeneric />}
    </div>
  );
}
