// Parses a pasted nutrition-facts block (one nutrient per line, or all run
// together on one line) into our scalar nutrition_* fields. Unlike the
// ingredient/instruction lists, order doesn't matter here — each nutrient is
// found by its own label, anywhere in the text, so "Saturated Fat" never gets
// mistaken for "Fat" and sub-values like "Added Sugars" are safely ignored.

export const NUTRITION_FIELDS = [
  { key: 'nutrition_calories', shortKey: 'calories', label: 'Calories' },
  { key: 'nutrition_protein', shortKey: 'protein', label: 'Protein' },
  { key: 'nutrition_fat', shortKey: 'fat', label: 'Fat' },
  { key: 'nutrition_carbs', shortKey: 'carbs', label: 'Carbohydrates' },
  { key: 'nutrition_fiber', shortKey: 'fiber', label: 'Fiber' },
  { key: 'nutrition_sugar', shortKey: 'sugar', label: 'Sugar' },
  { key: 'nutrition_sodium', shortKey: 'sodium', label: 'Sodium' },
  { key: 'nutrition_cholesterol', shortKey: 'cholesterol', label: 'Cholesterol' },
];

// Anchored at the start of a segment, so a qualifier word before the label
// ("Saturated Fat", "Added Sugars") simply fails to match and is dropped.
const FIELD_PATTERNS = [
  { shortKey: 'calories', re: /^calories?\b\s*[:\-–]?\s*/i },
  { shortKey: 'protein', re: /^protein\b\s*[:\-–]?\s*/i },
  { shortKey: 'fat', re: /^(?:total\s+)?fat\b\s*[:\-–]?\s*/i },
  { shortKey: 'carbs', re: /^(?:total\s+)?carb(?:ohydrate)?s?\b\s*[:\-–]?\s*/i },
  { shortKey: 'fiber', re: /^(?:dietary\s+)?fiber\b\s*[:\-–]?\s*/i },
  { shortKey: 'sugar', re: /^(?:total\s+)?sugars?\b\s*[:\-–]?\s*/i },
  { shortKey: 'sodium', re: /^sodium\b\s*[:\-–]?\s*/i },
  { shortKey: 'cholesterol', re: /^cholesterol\b\s*[:\-–]?\s*/i },
];

// Longer/qualified phrases are listed before the bare word they contain so
// "Saturated Fat" is cut out as its own (ultimately ignored) segment instead
// of being glued onto the previous nutrient's value.
const LABEL_WORDS = [
  'saturated fat', 'trans fat', 'polyunsaturated fat', 'monounsaturated fat', 'total fat', 'fat',
  'added sugars', 'added sugar', 'total sugars', 'sugars', 'sugar',
  'dietary fiber', 'fiber',
  'total carbohydrates', 'total carbohydrate', 'carbohydrates', 'carbohydrate', 'carbs', 'carb',
  'calories', 'protein', 'sodium', 'cholesterol',
];

const CUT_MARKER_RE = new RegExp(`\\b(${LABEL_WORDS.join('|').replace(/ /g, '\\s+')})\\b`, 'gi');

export function parseNutrition(text) {
  const normalized = (text || '').replace(/\r\n|\r/g, '\n');
  if (!normalized.trim()) return {};

  const cuts = [];
  let match;
  CUT_MARKER_RE.lastIndex = 0;
  while ((match = CUT_MARKER_RE.exec(normalized)) !== null) {
    cuts.push(match.index);
  }
  if (!cuts.length) return {};

  const result = {};
  for (let i = 0; i < cuts.length; i++) {
    const end = i + 1 < cuts.length ? cuts[i + 1] : normalized.length;
    const segment = normalized.slice(cuts[i], end).split('\n')[0].replace(/^[,;\s]+/, '').trim();
    if (!segment) continue;

    for (const field of FIELD_PATTERNS) {
      if (result[field.shortKey]) continue; // first match wins
      if (field.re.test(segment)) {
        const value = segment.replace(field.re, '').replace(/[,;.\s]+$/, '').trim();
        if (value) result[field.shortKey] = value;
        break;
      }
    }
  }
  return result;
}
