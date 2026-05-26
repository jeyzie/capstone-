export const PICKER_COLOR_COUNT = 16;

export const BRACES_PALETTE = [
  { id: 'navy', name: 'Navy Blue', hex: '#1e3a8a', undertones: ['warm', 'neutral'], reason: 'Makes teeth appear whiter' },
  { id: 'teal', name: 'Teal', hex: '#0d9488', undertones: ['warm'], reason: 'Complements warm undertones' },
  { id: 'silver', name: 'Silver', hex: '#94a3b8', undertones: ['warm', 'cool', 'neutral'], reason: 'Clean and balanced look' },
  { id: 'blue', name: 'Sky Blue', hex: '#2563eb', undertones: ['cool'], reason: 'Bright contrast for cool undertones' },
  { id: 'violet', name: 'Violet', hex: '#7c3aed', undertones: ['cool'], reason: 'Soft contrast for cool skin' },
  { id: 'maroon', name: 'Maroon', hex: '#881337', undertones: ['warm'], reason: 'Rich warmth without washing teeth out' },
  { id: 'black', name: 'Black', hex: '#1e293b', undertones: ['neutral'], reason: 'Classic neutral frame' },
  { id: 'pastel-pink', name: 'Pastel Pink', hex: '#f9a8d4', undertones: ['neutral'], reason: 'Soft aesthetic for neutral tones' },
  { id: 'coral', name: 'Coral', hex: '#f97316', undertones: ['warm'], reason: 'Warm pop without neon harshness' },
  { id: 'red', name: 'Red', hex: '#dc2626', undertones: ['warm', 'neutral'], reason: 'Bold contrast for a confident look' },
  { id: 'gold', name: 'Gold', hex: '#d97706', undertones: ['warm'], reason: 'Sunny accent for warm undertones' },
  { id: 'lavender', name: 'Lavender', hex: '#c4b5fd', undertones: ['cool', 'neutral'], reason: 'Light cool tone for softer smiles' },
  { id: 'forest', name: 'Forest Green', hex: '#16a34a', undertones: ['neutral', 'cool'], reason: 'Natural tone with balanced contrast' },
  { id: 'hot-pink', name: 'Hot Pink', hex: '#db2777', undertones: ['neutral'], reason: 'Playful shade for expressive style' },
  { id: 'yellow', name: 'Yellow', hex: '#eab308', undertones: [], avoid: true, reason: 'Can make teeth look less white' },
  { id: 'neon-green', name: 'Neon Green', hex: '#84cc16', undertones: [], avoid: true, reason: 'Can emphasize yellow tones in teeth' },
];

const UNDERTONE_COLORS = {
  cool: ['blue', 'violet', 'silver'],
  warm: ['teal', 'maroon', 'navy'],
  neutral: ['black', 'pastel-pink', 'silver'],
};

const FAVORITES_KEY = 'dentalogic-braces-favorites';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function averageRegion(ctx, width, height, xStart, xEnd, yStart, yEnd) {
  const x0 = Math.floor(width * xStart);
  const x1 = Math.floor(width * xEnd);
  const y0 = Math.floor(height * yStart);
  const y1 = Math.floor(height * yEnd);
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  const data = ctx.getImageData(0, 0, width, height).data;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      if (alpha < 40) continue;
      r += data[index];
      g += data[index + 1];
      b += data[index + 2];
      count += 1;
    }
  }

  if (!count) return { r: 180, g: 150, b: 130 };
  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  };
}

export function classifyUndertone(rgb) {
  const warmth = rgb.r - rgb.b;
  if (warmth > 22 && rgb.r >= rgb.g - 8) return 'warm';
  if (rgb.b - rgb.r > 12) return 'cool';
  return 'neutral';
}

export function classifySkinDepth(rgb) {
  const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  if (luminance > 185) return 'Light';
  if (luminance > 135) return 'Medium';
  return 'Deep';
}

export function classifyTeethShade(rgb) {
  const luminance = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  const yellowness = rgb.r + rgb.g * 0.5 - rgb.b * 1.4;
  if (luminance > 205 && yellowness < 40) return 'Bright';
  if (luminance > 175) return 'Natural';
  if (yellowness > 55) return 'Warm tint';
  return 'Soft ivory';
}

function scoreColor(color, undertone, teethShade) {
  if (color.avoid) return 0;

  let score = 62;
  const preferred = UNDERTONE_COLORS[undertone] ?? UNDERTONE_COLORS.neutral;

  if (preferred.includes(color.id)) score += 18;
  if (color.undertones.includes(undertone)) score += 12;
  if (color.undertones.length >= 2) score += 4;

  if (teethShade === 'Warm tint' && ['navy', 'silver', 'violet'].includes(color.id)) score += 8;
  if (teethShade === 'Bright' && ['teal', 'pastel-pink'].includes(color.id)) score += 4;
  if (teethShade === 'Natural' && ['silver', 'navy', 'black'].includes(color.id)) score += 5;

  const jitter = (color.id.charCodeAt(0) % 7) - 3;
  return clamp(score + jitter, 58, 97);
}

export async function analyzePortraitImage(imageSource) {
  const image =
    imageSource instanceof HTMLImageElement
      ? imageSource
      : await loadImageFromDataUrl(imageSource);

  const canvas = document.createElement('canvas');
  const size = 240;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not analyze the photo.');

  const scale = Math.max(size / image.width, size / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (size - drawWidth) / 2;
  const offsetY = (size - drawHeight) / 2;
  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  const skinLeft = averageRegion(ctx, size, size, 0.08, 0.28, 0.14, 0.38);
  const skinRight = averageRegion(ctx, size, size, 0.72, 0.92, 0.14, 0.38);
  const skinRgb = {
    r: Math.round((skinLeft.r + skinRight.r) / 2),
    g: Math.round((skinLeft.g + skinRight.g) / 2),
    b: Math.round((skinLeft.b + skinRight.b) / 2),
  };
  const teethRgb = averageRegion(ctx, size, size, 0.34, 0.66, 0.46, 0.68);

  const undertone = classifyUndertone(skinRgb);
  const depth = classifySkinDepth(skinRgb);
  const teethShade = classifyTeethShade(teethRgb);

  return {
    skinRgb,
    teethRgb,
    undertone,
    skinToneLabel: `${capitalize(undertone)} ${depth}`,
    teethShade,
    facialUndertone: capitalize(undertone),
  };
}

function scoreAvoidColor(color) {
  return clamp(34 + (color.id.length % 10), 32, 46);
}

export function buildRecommendations(analysis) {
  const pickerColors = BRACES_PALETTE.map((color) => {
    const isAvoid = !!color.avoid;
    const confidence = isAvoid
      ? scoreAvoidColor(color)
      : scoreColor(color, analysis.undertone, analysis.teethShade);

    return {
      ...color,
      confidence,
      isAvoid,
      isRecommended: !isAvoid,
    };
  });

  const topMatches = pickerColors
    .filter((color) => !color.isAvoid)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      bestMatch: index === 0,
    }));

  const ranked = pickerColors.map((color) => ({
    ...color,
    bestMatch: topMatches[0]?.id === color.id,
    rank: topMatches.find((item) => item.id === color.id)?.rank ?? null,
  }));

  return {
    ...analysis,
    topMatches,
    pickerColors: ranked,
    allColors: ranked,
    avoid: ranked.filter((color) => color.isAvoid),
    bestMatch: topMatches[0] ?? null,
  };
}

export function getColorFromRecommendations(recommendations, colorId) {
  if (!colorId) return null;
  return (
    recommendations?.allColors?.find((item) => item.id === colorId) ??
    BRACES_PALETTE.find((item) => item.id === colorId) ??
    null
  );
}

export function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

export function toggleFavorite(favorites, colorId) {
  const exists = favorites.includes(colorId);
  const next = exists ? favorites.filter((id) => id !== colorId) : [...favorites, colorId];
  saveFavorites(next);
  return next;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Crop region aligned with the on-screen mouth guide (center smile zone). */
export const MOUTH_FOCUS_CROP = {
  xStart: 0.14,
  xEnd: 0.86,
  yStart: 0.4,
  yEnd: 0.72,
};

export const MOUTH_PHOTO_SIZE = {
  width: 720,
  height: 400,
};

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load the selected image.'));
    image.src = dataUrl;
  });
}

async function loadImageSource(imageSource) {
  if (imageSource instanceof HTMLImageElement) return imageSource;
  if (imageSource instanceof HTMLCanvasElement) {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = imageSource.toDataURL('image/jpeg', 0.92);
    });
    return image;
  }
  return loadImageFromDataUrl(imageSource);
}

/** Crops to the mouth area and normalizes output size for preview + AI scan. */
export async function prepareMouthFocusedPhoto(imageSource) {
  const image = await loadImageSource(imageSource);
  const sx = Math.floor(image.width * MOUTH_FOCUS_CROP.xStart);
  const sy = Math.floor(image.height * MOUTH_FOCUS_CROP.yStart);
  const sw = Math.max(
    1,
    Math.floor(image.width * (MOUTH_FOCUS_CROP.xEnd - MOUTH_FOCUS_CROP.xStart)),
  );
  const sh = Math.max(
    1,
    Math.floor(image.height * (MOUTH_FOCUS_CROP.yEnd - MOUTH_FOCUS_CROP.yStart)),
  );

  const canvas = document.createElement('canvas');
  canvas.width = MOUTH_PHOTO_SIZE.width;
  canvas.height = MOUTH_PHOTO_SIZE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the photo.');

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.9);
}

export function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const full = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;
  const int = Number.parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function bracesPreviewGradient(hex) {
  return `repeating-linear-gradient(90deg, rgba(255,255,255,0.82) 0 11px, ${hexToRgba(hex, 0.88)} 11px 16px)`;
}

export function simulateScanProgress(onProgress) {
  const steps = [
    { value: 12, label: 'Detecting face region…' },
    { value: 34, label: 'Reading skin tone…' },
    { value: 58, label: 'Measuring teeth shade…' },
    { value: 78, label: 'Mapping facial undertone…' },
    { value: 94, label: 'Ranking brace colors…' },
    { value: 100, label: 'Finalizing best matches…' },
  ];

  return new Promise((resolve) => {
    let index = 0;
    const tick = () => {
      const step = steps[index];
      onProgress(step);
      index += 1;
      if (index >= steps.length) {
        window.setTimeout(resolve, 320);
        return;
      }
      window.setTimeout(tick, 520);
    };
    tick();
  });
}
