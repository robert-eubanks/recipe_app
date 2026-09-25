#!/usr/bin/env node
/**
 * One-off cleanup for recipes already in the database:
 *   - repairs bad titles (section headers, ingredient lines, print timestamps)
 *   - assigns an inferred category to recipes that have none
 * Backs up recipes.db before writing.
 * Usage: node fix-recipes.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const db = require('./database');
const { cleanTitle, inferCategory } = require('./recipe-cleanup');

const DB_PATH = path.join(__dirname, 'recipes.db');

async function getOrCreateCategory(name, cache) {
  if (cache[name]) return cache[name];
  await db.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [name]);
  const row = await db.get('SELECT id FROM categories WHERE name = ?', [name]);
  cache[name] = row.id;
  return row.id;
}

async function fixRecipes() {
  const dryRun = process.argv.includes('--dry-run');

  if (!dryRun) {
    const backupPath = `${DB_PATH}.bak-${Date.now()}`;
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`💾 Backed up database to ${path.basename(backupPath)}\n`);
  }

  const recipes = await db.all('SELECT id, title, source_file, category_id FROM recipes ORDER BY id');
  const categoryCache = {};
  let titlesFixed = 0;
  const categoryCounts = {};
  const uncategorized = [];

  for (const recipe of recipes) {
    const title = cleanTitle(recipe.title, recipe.source_file);
    if (title !== recipe.title) {
      console.log(`  ✎ #${recipe.id}: "${recipe.title}" → "${title}"`);
      titlesFixed++;
      if (!dryRun) {
        await db.run('UPDATE recipes SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, recipe.id]);
      }
    }

    if (!recipe.category_id) {
      const category = inferCategory(title, recipe.source_file);
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        if (!dryRun) {
          const categoryId = await getOrCreateCategory(category, categoryCache);
          await db.run('UPDATE recipes SET category_id = ? WHERE id = ?', [categoryId, recipe.id]);
        }
      } else {
        uncategorized.push(`#${recipe.id} ${title}`);
      }
    }
  }

  console.log(`\n${dryRun ? '🔍 Dry run — no changes written' : '✅ Cleanup complete'}`);
  console.log(`  Titles fixed: ${titlesFixed}`);
  console.log('  Recipes categorized:');
  Object.entries(categoryCounts).forEach(([name, count]) => console.log(`    ${name}: ${count}`));
  console.log(`  Left uncategorized: ${uncategorized.length}`);
  uncategorized.forEach((line) => console.log(`    - ${line}`));

  await db.close();
}

fixRecipes().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
