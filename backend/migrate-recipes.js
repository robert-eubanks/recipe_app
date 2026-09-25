#!/usr/bin/env node
/**
 * Migration script to import recipes from JSON file into SQLite database
 * Usage: node migrate-recipes.js <path-to-recipes-json>
 * Example: node migrate-recipes.js ../cookbook_project/data/recipes_final_merged.json
 */

const fs = require('fs');
const path = require('path');
const db = require('./database');
const { cleanTitle, inferCategory } = require('./recipe-cleanup');

async function migrateRecipes() {
  const jsonFilePath = process.argv[2];

  if (!jsonFilePath) {
    console.error('Usage: node migrate-recipes.js <path-to-recipes.json>');
    process.exit(1);
  }

  const fullPath = path.resolve(jsonFilePath);

  if (!fs.existsSync(fullPath)) {
    console.error(`Error: File not found: ${fullPath}`);
    process.exit(1);
  }

  try {
    console.log(`\n📖 Starting recipe migration from: ${fullPath}\n`);

    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(fileContent);
    const recipes = (data.recipes || []).map((recipe) => {
      const title = cleanTitle(recipe.title, recipe.source_file);
      return { ...recipe, title, category: recipe.category || inferCategory(title, recipe.source_file) };
    });

    console.log(`Found ${recipes.length} recipes to migrate...\n`);

    let successCount = 0;
    let skipCount = 0;
    const categories = new Set();

    // First pass: collect all categories and create them
    for (const recipe of recipes) {
      if (recipe.category) {
        categories.add(recipe.category);
      }
    }

    console.log(`📂 Creating ${categories.size} categories...\n`);

    const categoryMap = {};
    for (const categoryName of categories) {
      try {
        const result = await db.run(
          'INSERT INTO categories (name) VALUES (?)',
          [categoryName]
        );
        categoryMap[categoryName] = result.lastID;
        console.log(`  ✓ ${categoryName}`);
      } catch (err) {
        // Category might already exist, try to get its ID
        const existing = await db.get(
          'SELECT id FROM categories WHERE name = ?',
          [categoryName]
        );
        if (existing) {
          categoryMap[categoryName] = existing.id;
        }
      }
    }

    console.log(`\n🍳 Importing recipes...\n`);

    // Second pass: import recipes
    for (const recipe of recipes) {
      try {
        const categoryId = recipe.category ? categoryMap[recipe.category] : null;

        // Insert recipe
        const result = await db.run(
          `INSERT INTO recipes (title, source_file, category_id, servings, prep_time, cook_time, total_time, notes, url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            recipe.title,
            recipe.source_file || '',
            categoryId,
            recipe.servings || '',
            recipe.prep_time || '',
            recipe.cook_time || '',
            recipe.total_time || '',
            recipe.notes || '',
            recipe.url || ''
          ]
        );

        const recipeId = result.lastID;

        // Insert ingredients
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          for (let i = 0; i < recipe.ingredients.length; i++) {
            await db.run(
              'INSERT INTO ingredients (recipe_id, text, order_num) VALUES (?, ?, ?)',
              [recipeId, recipe.ingredients[i], i]
            );
          }
        }

        // Insert instructions
        if (recipe.instructions && Array.isArray(recipe.instructions)) {
          for (let i = 0; i < recipe.instructions.length; i++) {
            await db.run(
              'INSERT INTO instructions (recipe_id, text, order_num) VALUES (?, ?, ?)',
              [recipeId, recipe.instructions[i], i]
            );
          }
        }

        console.log(`  ✓ ${recipe.title}`);
        successCount++;
      } catch (err) {
        console.log(`  ✗ ${recipe.title} - ${err.message}`);
        skipCount++;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Migration Complete!`);
    console.log(`${'='.repeat(50)}`);
    console.log(`  Total recipes: ${recipes.length}`);
    console.log(`  Successfully imported: ${successCount}`);
    console.log(`  Skipped: ${skipCount}`);
    console.log(`  Categories created: ${categories.size}`);
    console.log(`\nDatabase location: ${path.join(__dirname, 'recipes.db')}`);
    console.log(`\nYou can now start the server with: npm run dev\n`);

    await db.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateRecipes();
