// Smart Color detection utility for KY INVENTORY
// Maps color names to CSS colors, hexes, and styling

const colorMap = {
  black: { bg: '#09090b', border: '#27272a', text: '#ffffff' },
  jet: { bg: '#0a0a0a', border: '#262626', text: '#ffffff' },
  core: { bg: '#18181b', border: '#3f3f46', text: '#ffffff' },
  white: { bg: '#f8fafc', border: '#94a3b8', text: '#0f172a' },
  offwhite: { bg: '#f1f5f9', border: '#cbd5e1', text: '#0f172a' },
  cream: { bg: '#fef3c7', border: '#fcd34d', text: '#78350f' },
  ivory: { bg: '#fffbeb', border: '#fef3c7', text: '#78350f' },
  red: { bg: '#ef4444', border: '#b91c1c', text: '#ffffff' },
  bordo: { bg: '#881337', border: '#4c0519', text: '#ffffff' },
  marron: { bg: '#5c1d24', border: '#3b1116', text: '#ffffff' },
  coral: { bg: '#fb7185', border: '#f43f5e', text: '#ffffff' },
  blue: { bg: '#3b82f6', border: '#1d4ed8', text: '#ffffff' },
  navy: { bg: '#1e3a8a', border: '#172554', text: '#ffffff' },
  skyblue: { bg: '#38bdf8', border: '#0284c7', text: '#0f172a' },
  turq: { bg: '#06b6d4', border: '#0891b2', text: '#ffffff' },
  pink: { bg: '#ec4899', border: '#be185d', text: '#ffffff' },
  beige: { bg: '#d4b996', border: '#a88965', text: '#ffffff' },
  lightbeige: { bg: '#e7d7c1', border: '#c7b299', text: '#3e2723' },
  camel: { bg: '#c19a6b', border: '#8b6914', text: '#ffffff' },
  nude: { bg: '#e5cfb8', border: '#bfa084', text: '#451a03' },
  tan: { bg: '#d2b48c', border: '#a68050', text: '#ffffff' },
  brown: { bg: '#78350f', border: '#451a03', text: '#ffffff' },
  darkbrown: { bg: '#3e1e0a', border: '#271205', text: '#ffffff' },
  chestnut: { bg: '#853224', border: '#5c2218', text: '#ffffff' },
  green: { bg: '#10b981', border: '#047857', text: '#ffffff' },
  olive: { bg: '#65a30d', border: '#3f6212', text: '#ffffff' },
  gold: { bg: '#eab308', border: '#a16207', text: '#ffffff' },
  oldgold: { bg: '#ca8a04', border: '#854d0e', text: '#ffffff' },
  lightgold: { bg: '#fde68a', border: '#fcd34d', text: '#78350f' },
  yellow: { bg: '#facc15', border: '#ca8a04', text: '#713f12' },
  mais: { bg: '#facc15', border: '#eab308', text: '#713f12' },
  orange: { bg: '#f97316', border: '#c2410c', text: '#ffffff' },
  purple: { bg: '#a855f7', border: '#7e22ce', text: '#ffffff' },
  maroon: { bg: '#831843', border: '#500724', text: '#ffffff' },
  portroyale: { bg: '#4c0519', border: '#2a020d', text: '#ffffff' },
  burgundy: { bg: '#881337', border: '#4c0519', text: '#ffffff' },
  grey: { bg: '#6b7280', border: '#374151', text: '#ffffff' },
  gray: { bg: '#6b7280', border: '#374151', text: '#ffffff' },
  charcoal: { bg: '#374151', border: '#1f2937', text: '#ffffff' },
  silver: { bg: '#cbd5e1', border: '#64748b', text: '#0f172a' },
  silvermulti: { bg: '#cbd5e1', border: '#94a3b8', text: '#0f172a' },
  multi: { bg: '#a855f7', border: '#ec4899', text: '#ffffff' },
  platin: { bg: '#e2e8f0', border: '#94a3b8', text: '#0f172a' },
  stone: { bg: '#a8a29e', border: '#78716c', text: '#ffffff' },
  taupe: { bg: '#8b8589', border: '#635d61', text: '#ffffff' }
};

export function formatColorName(colorRaw) {
  if (!colorRaw) return 'Standard';
  const clean = String(colorRaw).trim().toUpperCase();
  const known = {
    'DARKBROWN': 'Dark Brown',
    'OFFWHITE': 'Off White',
    'OLDGOLD': 'Old Gold',
    'LIGHTGOLD': 'Light Gold',
    'LIGHTBEIGE': 'Light Beige',
    'SILVERMULTI': 'Silver Multi',
    'PORTROYALE': 'Port Royale',
    'SKYBLUE': 'Sky Blue',
    'TURQ': 'Turq',
    'PLATIN': 'Platin',
    'BORDO': 'Bordo',
    'MARRON': 'Marron',
    'CHESTNUT': 'Chestnut',
    'MAIS': 'Mais',
    'STONE': 'Stone',
    'CORAL': 'Coral',
    'IVORY': 'Ivory',
    'TAUPE': 'Taupe',
    'MULTI': 'Multi',
    'BLACK': 'Black',
    'WHITE': 'White',
    'BROWN': 'Brown',
    'TAN': 'Tan',
    'GOLD': 'Gold',
    'SILVER': 'Silver',
    'RED': 'Red',
    'BLUE': 'Blue',
    'NAVY': 'Navy'
  };
  if (known[clean]) return known[clean];
  return clean.charAt(0) + clean.slice(1).toLowerCase();
}

export function getColorDetails(colorName) {
  if (!colorName) {
    return { bg: '#6366f1', border: '#4f46e5', text: '#ffffff' };
  }

  const clean = colorName.toLowerCase().replace(/[^a-z]/g, '');

  // Exact match
  if (colorMap[clean]) {
    return colorMap[clean];
  }

  // Keyword search in map
  for (const [key, details] of Object.entries(colorMap)) {
    if (clean.includes(key)) {
      return details;
    }
  }

  // If user provided a direct hex/rgb code
  if (colorName.startsWith('#') || colorName.startsWith('rgb')) {
    return { bg: colorName, border: 'rgba(255,255,255,0.2)', text: '#ffffff' };
  }

  // Fallback pleasant amber/slate accent
  return { bg: '#f59e0b', border: '#d97706', text: '#000000' };
}

export function getColorHex(colorName) {
  return getColorDetails(colorName).bg;
}
