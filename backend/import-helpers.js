/**
 * Helpers for importing recipes from a website URL, a PDF file, or a .webloc
 * file. Two import paths funnel into the same result shape:
 *   { recipe, image, warnings, errors }
 * `warnings` are soft gaps ("couldn't determine X"); `errors` are hard
 * failures. Callers decide `ok` from whether anything usable came back.
 */

const { cleanTitle, inferCategory } = require('./recipe-cleanup');

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// ==================== URL safety ====================

// Rejects non-http(s) URLs and obviously-local/private hosts before any
// server-side fetch of a user-supplied URL. Not exhaustive (no DNS
// resolution to catch hostnames that resolve to a private IP) — a
// pragmatic guard for a personal, single-user app, not a full SSRF defense.
function isPrivateOrLocalHost(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (e) {
    return true;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = parseInt(ipv4[1], 10);
    const b = parseInt(ipv4[2], 10);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;

  return false;
}

// ==================== JSON-LD / schema.org ====================

function extractJsonLdRecipe(html) {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const candidates = [];
  let m;
  while ((m = scriptRe.exec(html)) !== null) {
    try {
      candidates.push(JSON.parse(m[1].trim()));
    } catch (e) {
      // skip malformed block, keep scanning others
    }
  }

  function isRecipeType(obj) {
    if (!obj || !obj['@type']) return false;
    const t = obj['@type'];
    return t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'));
  }

  for (const parsed of candidates) {
    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      if (isRecipeType(item)) return item;
      if (item && Array.isArray(item['@graph'])) {
        const found = item['@graph'].find(isRecipeType);
        if (found) return found;
      }
    }
  }
  return null;
}

function isoDurationToFriendly(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!m || (!m[1] && !m[2])) return '';
  const hours = parseInt(m[1] || '0', 10);
  const minutes = parseInt(m[2] || '0', 10);
  const parts = [];
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0) parts.push(`${minutes} min`);
  return parts.join(' ');
}

function authorName(a) {
  if (!a) return '';
  if (typeof a === 'string') return a.trim();
  if (typeof a === 'object' && a.name) return String(a.name).trim();
  return '';
}

function normalizeAuthor(author) {
  if (!author) return '';
  if (Array.isArray(author)) {
    return author.map(authorName).filter(Boolean).join(', ');
  }
  return authorName(author);
}

function stepText(step) {
  if (typeof step === 'string') return step.trim();
  if (step && typeof step === 'object' && step.text) return String(step.text).trim();
  return '';
}

function isSectionType(type) {
  return type === 'HowToSection' || (Array.isArray(type) && type.includes('HowToSection'));
}

function normalizeInstructions(recipeInstructions) {
  if (!recipeInstructions) return [];
  if (typeof recipeInstructions === 'string') {
    return recipeInstructions.split('\n').map((s) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(recipeInstructions)) return [];

  const sectionCount = recipeInstructions.filter((item) => item && isSectionType(item['@type'])).length;
  const multiSection = sectionCount > 1;

  const out = [];
  for (const item of recipeInstructions) {
    if (!item) continue;
    if (isSectionType(item['@type']) && Array.isArray(item.itemListElement)) {
      if (multiSection && item.name) out.push(`— ${item.name} —`);
      for (const sub of item.itemListElement) {
        const t = stepText(sub);
        if (t) out.push(t);
      }
    } else {
      const t = stepText(item);
      if (t) out.push(t);
    }
  }
  return out;
}

function imageFromObject(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') return { url: obj, credit: null };
  if (typeof obj === 'object' && obj.url) return { url: obj.url, credit: obj.creditText || null };
  return null;
}

function normalizeImage(image) {
  if (!image) return null;
  if (Array.isArray(image)) {
    for (const item of image) {
      const result = imageFromObject(item);
      if (result) return result;
    }
    return null;
  }
  return imageFromObject(image);
}

function resolveCategory(recipeCategory, title, categories) {
  if (recipeCategory) {
    const name = Array.isArray(recipeCategory) ? recipeCategory[0] : recipeCategory;
    if (typeof name === 'string') {
      const match = categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
      if (match) return { category_id: match.id, warning: null };
    }
  }
  const inferred = inferCategory(title, null);
  if (inferred) {
    const match = categories.find((c) => c.name.toLowerCase() === inferred.toLowerCase());
    if (match) return { category_id: match.id, warning: null };
  }
  return { category_id: null, warning: "Couldn't determine a category — please choose one." };
}

function mapSchemaOrgToRecipe(schemaRecipe, categories) {
  const warnings = [];

  const rawTitle = Array.isArray(schemaRecipe.name) ? schemaRecipe.name[0] : schemaRecipe.name;
  const title = cleanTitle(rawTitle || '', null);

  const rawDescription = schemaRecipe.description;
  const description = Array.isArray(rawDescription) ? rawDescription.join(' ') : (rawDescription || '');

  const author = normalizeAuthor(schemaRecipe.author);

  const rawYield = schemaRecipe.recipeYield;
  const servings = Array.isArray(rawYield) ? String(rawYield[0]) : (rawYield != null ? String(rawYield) : '');

  const prep_time = isoDurationToFriendly(schemaRecipe.prepTime);
  if (schemaRecipe.prepTime && !prep_time) warnings.push(`Couldn't parse prep time duration '${schemaRecipe.prepTime}'`);
  const cook_time = isoDurationToFriendly(schemaRecipe.cookTime);
  if (schemaRecipe.cookTime && !cook_time) warnings.push(`Couldn't parse cook time duration '${schemaRecipe.cookTime}'`);
  const total_time = isoDurationToFriendly(schemaRecipe.totalTime);
  if (schemaRecipe.totalTime && !total_time) warnings.push(`Couldn't parse total time duration '${schemaRecipe.totalTime}'`);
  if (!schemaRecipe.prepTime && !schemaRecipe.cookTime && !schemaRecipe.totalTime) {
    warnings.push("Couldn't determine any timing information");
  }

  const ingredients = Array.isArray(schemaRecipe.recipeIngredient)
    ? schemaRecipe.recipeIngredient.map((i) => String(i).trim()).filter(Boolean)
    : [];
  if (ingredients.length === 0) warnings.push("Couldn't find an ingredients list");

  const instructions = normalizeInstructions(schemaRecipe.recipeInstructions);
  if (instructions.length === 0) warnings.push("Couldn't find instructions");

  const image = normalizeImage(schemaRecipe.image);

  const nutrition = schemaRecipe.nutrition || {};
  const nutritionFields = {
    nutrition_calories: nutrition.calories || '',
    nutrition_protein: nutrition.proteinContent || '',
    nutrition_fat: nutrition.fatContent || '',
    nutrition_carbs: nutrition.carbohydrateContent || '',
    nutrition_fiber: nutrition.fiberContent || '',
    nutrition_sugar: nutrition.sugarContent || '',
    nutrition_sodium: nutrition.sodiumContent || '',
    nutrition_cholesterol: nutrition.cholesterolContent || '',
  };

  const { category_id, warning: categoryWarning } = resolveCategory(schemaRecipe.recipeCategory, title, categories);
  if (categoryWarning) warnings.push(categoryWarning);

  if (schemaRecipe.aggregateRating && schemaRecipe.aggregateRating.ratingValue) {
    const { ratingValue, ratingCount, reviewCount } = schemaRecipe.aggregateRating;
    const count = ratingCount || reviewCount;
    warnings.push(`Site rating: ${ratingValue}${count ? ` from ${count} ratings` : ''} (not imported — set your own rating below)`);
  }

  const url = (typeof schemaRecipe.url === 'string' && /^https?:\/\//i.test(schemaRecipe.url))
    ? schemaRecipe.url
    : (schemaRecipe.__fetchedUrl || '');

  const recipe = {
    title,
    subtitle: '',
    author,
    description,
    category_id,
    servings,
    prep_time,
    cook_time,
    total_time,
    notes: '',
    url,
    source_file: '',
    ingredients,
    instructions,
    image_credit: image?.credit || '',
    rating: 0,
    ...nutritionFields,
  };

  return { recipe, image, warnings };
}

async function fetchAndParseRecipeUrl(url, categories) {
  if (!url) {
    return { ok: false, recipe: {}, image: null, warnings: [], errors: ['No URL provided'] };
  }
  if (isPrivateOrLocalHost(url)) {
    return { ok: false, recipe: {}, image: null, warnings: [], errors: ['That URL is not allowed'] };
  }

  let html;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': BROWSER_USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return { ok: false, recipe: {}, image: null, warnings: [], errors: [`Couldn't fetch the page: HTTP ${response.status}`] };
    }
    html = await response.text();
  } catch (err) {
    return { ok: false, recipe: {}, image: null, warnings: [], errors: [`Couldn't fetch the page: ${err.message}`] };
  }

  const schemaRecipe = extractJsonLdRecipe(html);
  if (!schemaRecipe) {
    return { ok: false, recipe: {}, image: null, warnings: [], errors: ['No structured recipe data found on this page'] };
  }
  schemaRecipe.__fetchedUrl = url;

  const { recipe, image, warnings } = mapSchemaOrgToRecipe(schemaRecipe, categories);
  return { ok: true, recipe, image, warnings, errors: [] };
}

// ==================== .webloc ====================

function extractUrlFromWebloc(xmlText) {
  const m = xmlText.match(/<key>\s*URL\s*<\/key>\s*<string>\s*([\s\S]*?)\s*<\/string>/i);
  return m ? m[1].trim() : null;
}

// ==================== PDF heuristic parser ====================

const SECTION_BOUNDARY_RE = /^(notes?|private notes|source)\s*:?\s*$/i;
const INGREDIENTS_HEADER_RE = /^ingredients?\s*:?\s*$/i;
const INSTRUCTIONS_HEADER_RE = /^(preparation|instructions|directions|method)\s*:?\s*$/i;

// Print-to-PDF page footers, e.g. "Page 1 of 2" or "-- 1 of 2 --" — noise,
// never recipe content, safe to drop wherever they appear.
const PAGE_FOOTER_RE = /^-{0,2}\s*(page\s+)?\d+\s+of\s+\d+\s*-{0,2}$/i;

// Joins lines that were wrapped mid-sentence by the PDF's line breaks,
// without leaving a stray space before punctuation the wrap happened to
// land on (e.g. ["...until soft", "."] -> "...until soft." not "soft .").
function joinWrappedLines(wrappedLines) {
  return wrappedLines.join(' ').replace(/\s+([.,;:!?)])/g, '$1').trim();
}

function parsePdfText(text, sourceFileName, categories) {
  const lines = (text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !PAGE_FOOTER_RE.test(l));
  const warnings = [];
  const errors = [];

  if (lines.length === 0) {
    return {
      recipe: {},
      warnings: [],
      errors: ['This PDF appears to be a scanned image with no extractable text — OCR is not supported'],
    };
  }

  const ingredientsHeaderIdx = lines.findIndex((l) => INGREDIENTS_HEADER_RE.test(l));
  let instructionsHeaderIdx = -1;
  const searchFrom = ingredientsHeaderIdx !== -1 ? ingredientsHeaderIdx + 1 : 0;
  for (let i = searchFrom; i < lines.length; i++) {
    if (INSTRUCTIONS_HEADER_RE.test(lines[i])) {
      instructionsHeaderIdx = i;
      break;
    }
  }

  if (ingredientsHeaderIdx === -1 && instructionsHeaderIdx === -1) {
    errors.push("Couldn't find an ingredients or instructions section — this PDF may not be a recipe, or uses an unrecognized layout");
  }

  // ---- ingredients + servings ----
  let servings = '';
  let ingredients = [];
  if (ingredientsHeaderIdx !== -1) {
    const end = instructionsHeaderIdx !== -1 ? instructionsHeaderIdx : lines.length;
    const block = lines.slice(ingredientsHeaderIdx + 1, end);
    for (const line of block) {
      const yieldMatch = line.match(/^(yield|serves|servings)\s*:?\s*(.+)$/i);
      if (yieldMatch && !servings) {
        servings = yieldMatch[2].trim();
      } else {
        ingredients.push(line);
      }
    }
    if (ingredients.length === 0) warnings.push('Ingredients section was found but no ingredient lines could be extracted');
  } else if (instructionsHeaderIdx !== -1) {
    warnings.push("Couldn't find an ingredients section — you'll need to add ingredients manually");
  }

  // ---- instructions ----
  let instructions = [];
  if (instructionsHeaderIdx !== -1) {
    let end = lines.length;
    for (let i = instructionsHeaderIdx + 1; i < lines.length; i++) {
      if (SECTION_BOUNDARY_RE.test(lines[i])) {
        end = i;
        break;
      }
    }
    // Drop bare source-URL lines from the block — captured separately as
    // `url` below, and would otherwise get glued onto the last step's text.
    const block = lines.slice(instructionsHeaderIdx + 1, end).filter((l) => !/^https?:\/\//i.test(l));

    const stepMarkerIdxs = [];
    block.forEach((line, i) => { if (/^step\s+\d+\b/i.test(line)) stepMarkerIdxs.push(i); });

    const buildSteps = (markerIdxs, stripRe) => {
      const steps = [];
      for (let i = 0; i < markerIdxs.length; i++) {
        const start = markerIdxs[i];
        const stop = i + 1 < markerIdxs.length ? markerIdxs[i + 1] : block.length;
        const stepLines = block.slice(start, stop).map((l, idx) => (idx === 0 ? l.replace(stripRe, '') : l));
        const combined = joinWrappedLines(stepLines);
        if (combined) steps.push(combined);
      }
      return steps;
    };

    if (stepMarkerIdxs.length >= 2) {
      instructions = buildSteps(stepMarkerIdxs, /^step\s+\d+\s*:?\s*/i);
    } else {
      const numMarkerIdxs = [];
      block.forEach((line, i) => { if (/^\d+[.)]\s+/.test(line)) numMarkerIdxs.push(i); });
      if (numMarkerIdxs.length >= 2) {
        instructions = buildSteps(numMarkerIdxs, /^\d+[.)]\s+/);
      } else {
        instructions = block.filter(Boolean);
      }
    }
    if (instructions.length === 0) warnings.push('Instructions section was found but no steps could be extracted');
  } else if (ingredientsHeaderIdx !== -1) {
    warnings.push("Couldn't find an instructions section — you'll need to add steps manually");
  }

  // ---- title / author / times / url / description (all scanned before the first section header) ----
  const headerBoundary = [ingredientsHeaderIdx, instructionsHeaderIdx].filter((i) => i !== -1);
  const preHeaderEnd = headerBoundary.length ? Math.min(...headerBoundary) : lines.length;
  const preHeaderLines = lines.slice(0, preHeaderEnd);

  const byLine = preHeaderLines.find((l) => /^by\s+(.+)/i.test(l));
  const author = byLine ? byLine.match(/^by\s+(.+)/i)[1].trim() : '';

  const readyInLine = preHeaderLines.find((l) => /^(ready in|total time)\s*:?\s*(.+)/i.test(l));
  const total_time = readyInLine ? readyInLine.match(/^(ready in|total time)\s*:?\s*(.+)/i)[2].trim() : '';
  const prepLine = preHeaderLines.find((l) => /^prep(aration)?\s*time\s*:?\s*(.+)/i.test(l));
  const prep_time = prepLine ? prepLine.match(/^prep(aration)?\s*time\s*:?\s*(.+)/i)[2].trim() : '';
  const cookLine = preHeaderLines.find((l) => /^cook(ing)?\s*time\s*:?\s*(.+)/i.test(l));
  const cook_time = cookLine ? cookLine.match(/^cook(ing)?\s*time\s*:?\s*(.+)/i)[2].trim() : '';
  if (!total_time && !prep_time && !cook_time) warnings.push("Couldn't determine any timing information");

  const urlLine = lines.find((l) => /^https?:\/\//i.test(l));
  const url = urlLine || '';

  // Everything before the section headers that isn't a recognized meta line
  // (byline, times, rating, date) is either the title or the description —
  // group the survivors into runs of *consecutive* lines first, since a
  // wrapped description paragraph shows up as several adjacent lines and
  // should be treated as one block, not several title candidates.
  const isMetaLine = (l) =>
    l === byLine || l === readyInLine || l === prepLine || l === cookLine ||
    /^https?:\/\//i.test(l) ||
    /^(updated|published)\b/i.test(l) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(l) ||
    /^(rating|yield|serves|servings)\b/i.test(l);

  const contentRuns = [];
  preHeaderLines.forEach((line, idx) => {
    if (isMetaLine(line)) return;
    const lastRun = contentRuns[contentRuns.length - 1];
    if (lastRun && lastRun.lastIdx === idx - 1) {
      lastRun.lines.push(line);
      lastRun.lastIdx = idx;
    } else {
      contentRuns.push({ lines: [line], lastIdx: idx });
    }
  });

  // The description is whichever run reads as prose: more than one line,
  // or a single line that's long and sentence-shaped.
  const isProseRun = (run) => run.lines.length > 1 || (run.lines[0].length > 40 && /[.!?]\s*$/.test(run.lines[0]));
  const descriptionRun = contentRuns
    .filter(isProseRun)
    .sort((a, b) => b.lines.join(' ').length - a.lines.join(' ').length)[0];
  const description = descriptionRun ? joinWrappedLines(descriptionRun.lines) : '';

  const titleRuns = contentRuns.filter((run) => run !== descriptionRun && run.lines.length === 1 && run.lines[0].length <= 80);
  let rawTitle = '';
  if (titleRuns.length > 0) {
    rawTitle = titleRuns[titleRuns.length - 1].lines[0];
  } else {
    rawTitle = lines[0];
    warnings.push("Couldn't confidently identify the recipe title — please verify it");
  }
  const title = cleanTitle(rawTitle, sourceFileName);

  const inferredCategory = inferCategory(title, sourceFileName);
  const categoryMatch = inferredCategory
    ? categories.find((c) => c.name.toLowerCase() === inferredCategory.toLowerCase())
    : null;
  if (!categoryMatch) warnings.push("Couldn't determine a category — please choose one.");

  const recipe = {
    title,
    subtitle: '',
    author,
    description,
    category_id: categoryMatch ? categoryMatch.id : null,
    servings,
    prep_time,
    cook_time,
    total_time,
    notes: '',
    url,
    source_file: sourceFileName || '',
    ingredients,
    instructions,
    image_credit: '',
    rating: 0,
    nutrition_calories: '',
    nutrition_protein: '',
    nutrition_fat: '',
    nutrition_carbs: '',
    nutrition_fiber: '',
    nutrition_sugar: '',
    nutrition_sodium: '',
    nutrition_cholesterol: '',
  };

  return { recipe, warnings, errors };
}

module.exports = {
  isPrivateOrLocalHost,
  extractJsonLdRecipe,
  mapSchemaOrgToRecipe,
  fetchAndParseRecipeUrl,
  extractUrlFromWebloc,
  parsePdfText,
  isoDurationToFriendly,
  normalizeAuthor,
  normalizeInstructions,
  normalizeImage,
};
