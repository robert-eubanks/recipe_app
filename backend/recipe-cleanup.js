/**
 * Helpers for cleaning up imported recipe data.
 * The upstream parser sometimes picks a section header, an ingredient line, or
 * a browser print header as the title; these helpers repair that and infer a
 * category from keywords when the source data has none.
 */

const path = require('path');

// Titles that are clearly not a recipe name — fall back to the source filename
const BAD_TITLE_PATTERNS = [
  /^(ingredients?|directions|instructions|method|magazine)\s*:?$/i,
  /to taste$/i,                                           // ingredient line
  /^for [^:]+:/i,                                         // "For Sugar Cookies: ..."
  /^(published on|from:|print recipe|item details)\b/i,   // page/email headers
];

// Browser print timestamps appended to titles, e.g. " 1/6/22, 6:47 PM" or " 2/7/19, 12(05 PM"; ( and ) replace the colon in some
const PRINT_TIMESTAMP = /\s+\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}[:()]\d{2}\s*[AP]M\s*$/i;

// Invisible direction marks that show up in filenames
const INVISIBLE_CHARS = /[\u200e\u200f\u202a-\u202e]/g;

function isBadTitle(title) {
  if (!title || !title.trim()) return true;
  const t = title.trim();
  if (BAD_TITLE_PATTERNS.some((re) => re.test(t))) return true;
  // A long full sentence is a description, not a title
  if (t.length > 80 && /\.\s*$/.test(t)) return true;
  return false;
}

function toTitleCase(str) {
  return str.toLowerCase().replace(/(^|[\s(])(\S)/g, (m, sep, ch) => sep + ch.toUpperCase());
}

function titleFromFilename(sourceFile) {
  if (!sourceFile) return '';
  let name = path.basename(sourceFile.replace(INVISIBLE_CHARS, ''));
  name = name.replace(/\.(docx?|pdf|webloc|url|rtf|txt)$/i, '').replace(/\.html?$/i, '');

  // URL slugs like "www.foodnetwork.com-recipes-bobby-flay-green-pork-chili-recipe"
  if (/^www\./i.test(name)) {
    name = name.replace(/^www\.[^-]+-(recipes?-)?/i, '').replace(/-recipe$/i, '').replace(/-/g, ' ');
  }

  // CamelCase without spaces, e.g. "GumboYaYa"
  if (!/\s/.test(name)) {
    name = name.replace(/([a-z])([A-Z])/g, '$1 $2');
  }

  // All-lowercase or all-uppercase names read better in title case
  if (name === name.toLowerCase() || name === name.toUpperCase()) {
    name = toTitleCase(name);
  }

  return name.trim();
}

function cleanTitle(title, sourceFile) {
  let t = (title || '').replace(INVISIBLE_CHARS, '').trim();

  if (isBadTitle(t) || /^www\./i.test(t)) {
    const fromFile = titleFromFilename(sourceFile);
    if (fromFile) t = fromFile;
  }

  return t.replace(PRINT_TIMESTAMP, '').trim();
}

// Checked in order; the first match wins, so more specific categories come first
// (e.g. "Bourbon Bread Pudding" is a dessert, not a drink or bread).
const CATEGORY_RULES = [
  ['Desserts', /\b(cookies?|cakes?|pudding|fudge|brittle|pralines?|divinity|flan|br[uû]l[eé]e|beignets?|marshmall?ows?|marshmallo|cobbler|brigadeiro|cinnamon rolls?|dessert|saint-honor[eé])\b/i],
  ['Drinks & Cocktails', /\b(cocktails?|margaritas?|martini|mojito|daiquiri|shrubs?|lemonade|fizz(es)?|boulevardier|paper plane|tijuana lady|scorpion|campari|grenadine|drinks?|vodka|bourbon|rum|tequila|el diablo)\b/i],
  ['Breakfast', /\b(egg bake|frittata|fritatta|omelets?|pancakes?|hash browns?|home fries|quiche|hash)\b/i],
  ['Soups & Stews', /\b(soups?|stews?|chowder|chili|chile verde|chile colorado|green chile|gumbo|bourguignon)\b/i],
  ['Pasta & Pizza', /\b(pasta|pastas|spaghetti|lasagna|mac (and|&) cheese|macaroni|pizza|pizzeria|bolognese|rag[uù]|puttanesca)\b/i],
  ['Seafood', /\b(shrimp|halibut|salmon|tilapia|catfish|sole|fish|swordfish|clams?|camarones)\b/i],
  ['Poultry', /\b(chicken|turkey|duck)\b/i],
  ['Sauces & Seasonings', /\b(sauce|seasoning|rubs?|toum|hummus|hoummus|salsa|pesto|gravy|guacamole)\b/i],
  ['Meat', /\b(beef|pork|lamb|short ribs?|prime rib|rib roast|brisket|ribs|osso buco|chateaubrand|sausages?|meatballs?|kibbeh|steak|lechon|muffuletta)\b/i],
  ['Breads & Baking', /\b(baguettes?|bread|pita|cornbread|popovers?|biscuits?|hush ?puppies|p[aâ]te bris[eé]e|dough)\b/i],
  ['Sides & Salads', /\b(salads?|fattoush|beans|lentils?|quinoa|potato(es)?|cauliflower|mujadara|tart|appetizers|small plates)\b/i],
];

function inferCategory(title, sourceFile) {
  const text = `${title || ''} ${sourceFile || ''}`;
  const match = CATEGORY_RULES.find(([, re]) => re.test(text));
  return match ? match[0] : null;
}

module.exports = { cleanTitle, inferCategory, isBadTitle, titleFromFilename };
