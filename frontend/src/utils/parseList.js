// Parsers for turning pasted blocks of text into ingredient/instruction lists.
// Both prefer line breaks; each has its own fallback for text that arrived as a
// single run-together line.

const QTY = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:\\.\\d+)?|[½¼¾⅓⅔⅛⅜⅝⅞⅙⅚⅕])';

// A quantity that is not glued to a word, decimal, fraction or range (so "9x13",
// "1-2" and "14-ounce" are not treated as the start of a new ingredient).
const QTY_BOUNDARY_RE = new RegExp(`(^|[^\\w./-])(${QTY})`, 'g');

// Words that make a following quantity a continuation rather than a new item,
// e.g. "2 cups flour, plus 2 tablespoons for dusting".
const CONNECTOR_TAIL_RE = /\b(?:plus|about|or|to|and|each|of|more|approximately|another|up|least|than|every|per|x)\s*$/i;

const BULLET_RE = /^\s*[-–—*•·‣▪▫○●▢□☐+]+\s*/;

// Sub-recipe section headers, e.g. "For the Icing" or "Icing:". Only ever
// applied on the multi-line path — a single run-together line has no
// reliable way to distinguish a header from content, so it's left alone.
const FOR_THE_HEADER_RE = /^for\s+the\s+(.+?)\s*:?\s*$/i;
const COLON_HEADER_RE = /^([A-Za-z][A-Za-z\s'&-]{0,39}):\s*$/;

function titleCase(text) {
  return text.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

function extractSectionHeader(line) {
  const forThe = line.match(FOR_THE_HEADER_RE);
  if (forThe) return titleCase(forThe[1].trim());

  const colon = line.match(COLON_HEADER_RE);
  if (colon && !/\d/.test(colon[1])) return titleCase(colon[1].trim());

  return null;
}

// "Step 3" carries its own marker, so trailing punctuation is optional. A bare
// leading number needs punctuation, otherwise "2 eggs" would lose its quantity.
const STEP_WORD_PREFIX_RE = /^\s*step\s*\d{1,2}\s*[.):\-–]?\s*/i;
const NUMBER_PREFIX_RE = /^\s*\d{1,2}\s*[.):\-–]\s*/;

// Inline list markers used to break a single-line instruction blob apart:
// "Step 2 ...", "2. ...", "2) ..." or a bullet glyph.
const STEP_MARKER_RE = /(^|\s)(step\s*\d{1,2}\s*[.):\-–]?\s|\d{1,2}\s*[.)]\s|[•·‣▪▫○●]\s*)/gi;

function splitLines(text) {
  return (text || '')
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripBullet(text) {
  return text.replace(BULLET_RE, '').trim();
}

function stripStepPrefix(text) {
  const base = stripBullet(text);
  if (STEP_WORD_PREFIX_RE.test(base)) return base.replace(STEP_WORD_PREFIX_RE, '').trim();
  return base.replace(NUMBER_PREFIX_RE, '').trim();
}

// Paren depth at each character, so quantities inside "(14-ounce)" can be ignored.
function parenDepths(text) {
  const depths = new Array(text.length).fill(0);
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(' || text[i] === '[') depth++;
    depths[i] = depth;
    if (text[i] === ')' || text[i] === ']') depth = Math.max(0, depth - 1);
  }
  return depths;
}

function splitByQuantity(text) {
  const depths = parenDepths(text);
  const cuts = [];
  let match;
  QTY_BOUNDARY_RE.lastIndex = 0;
  while ((match = QTY_BOUNDARY_RE.exec(text)) !== null) {
    const start = match.index + match[1].length;
    if (start === 0 || depths[start] > 0) continue;
    const before = text.slice(0, start);
    // A quantity right after another quantity is a continuation, not a new item.
    if (/[\d½¼¾⅓⅔⅛⅜⅝⅞⅙⅚⅕]\s*$/.test(before)) continue;
    if (CONNECTOR_TAIL_RE.test(before)) continue;
    cuts.push(start);
  }
  if (!cuts.length) return [];

  const parts = [];
  let prev = 0;
  for (const cut of cuts) {
    parts.push(text.slice(prev, cut));
    prev = cut;
  }
  parts.push(text.slice(prev));
  return parts.map((part) => stripBullet(part).replace(/[,;]\s*$/, '').trim()).filter(Boolean);
}

function splitByStepMarkers(text) {
  const cuts = [];
  let match;
  STEP_MARKER_RE.lastIndex = 0;
  while ((match = STEP_MARKER_RE.exec(text)) !== null) {
    const start = match.index + match[1].length;
    if (start > 0) cuts.push(start);
  }
  if (!cuts.length) return [];

  const parts = [];
  let prev = 0;
  for (const cut of cuts) {
    parts.push(text.slice(prev, cut));
    prev = cut;
  }
  parts.push(text.slice(prev));
  return parts.map(stripStepPrefix).filter(Boolean);
}

// Walks lines in order, starting a new current section whenever a header
// line is found; every other line becomes an item tagged with that section
// (null until the first header is seen).
function groupBySections(lines, stripLine) {
  const items = [];
  let section = null;
  for (const line of lines) {
    const header = extractSectionHeader(line);
    if (header) {
      section = header;
      continue;
    }
    const text = stripLine(line);
    if (text) items.push({ text, section });
  }
  return items;
}

export function parseIngredients(text) {
  const lines = splitLines(text);
  if (lines.length > 1) return groupBySections(lines, stripBullet);

  const single = stripBullet(lines[0] || '');
  if (!single) return [];

  const byQuantity = splitByQuantity(single);
  if (byQuantity.length > 1) return byQuantity.map((t) => ({ text: t, section: null }));

  // No quantities at all ("salt, pepper, olive oil") — commas are the only signal left.
  if (!/\d/.test(single)) {
    const byComma = single.split(/[;,]/).map((part) => part.trim()).filter(Boolean);
    if (byComma.length > 1) return byComma.map((t) => ({ text: t, section: null }));
  }

  return [{ text: single, section: null }];
}

export function parseInstructions(text) {
  const lines = splitLines(text);
  if (lines.length > 1) return groupBySections(lines, stripStepPrefix);

  const single = (lines[0] || '').trim();
  if (!single) return [];

  const byMarker = splitByStepMarkers(single);
  if (byMarker.length > 1) return byMarker.map((t) => ({ text: t, section: null }));

  return [{ text: stripStepPrefix(single), section: null }];
}
