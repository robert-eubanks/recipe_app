const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from frontend build (for production)
app.use(express.static(path.join(__dirname, '../frontend/build')));

// ==================== RECIPES ====================

// Get all recipes with ingredients and instructions
app.get('/api/recipes', async (req, res) => {
  try {
    const recipes = await db.all(`
      SELECT r.*, c.name as category_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      ORDER BY r.title
    `);

    // Get ingredients and instructions for each recipe
    for (let recipe of recipes) {
      recipe.ingredients = await db.all(
        'SELECT id, text FROM ingredients WHERE recipe_id = ? ORDER BY order_num',
        [recipe.id]
      );
      recipe.instructions = await db.all(
        'SELECT id, text FROM instructions WHERE recipe_id = ? ORDER BY order_num',
        [recipe.id]
      );
    }

    res.json(recipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single recipe
app.get('/api/recipes/:id', async (req, res) => {
  try {
    const recipe = await db.get(
      'SELECT r.*, c.name as category_name FROM recipes r LEFT JOIN categories c ON r.category_id = c.id WHERE r.id = ?',
      [req.params.id]
    );

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    recipe.ingredients = await db.all(
      'SELECT id, text FROM ingredients WHERE recipe_id = ? ORDER BY order_num',
      [recipe.id]
    );
    recipe.instructions = await db.all(
      'SELECT id, text FROM instructions WHERE recipe_id = ? ORDER BY order_num',
      [recipe.id]
    );

    res.json(recipe);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new recipe
app.post('/api/recipes', async (req, res) => {
  try {
    const { title, category_id, servings, prep_time, cook_time, total_time, notes, url, source_file, ingredients, instructions } = req.body;

    const result = await db.run(
      `INSERT INTO recipes (title, category_id, servings, prep_time, cook_time, total_time, notes, url, source_file)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, category_id, servings, prep_time, cook_time, total_time, notes, url, source_file]
    );

    const recipeId = result.lastID;

    // Add ingredients
    if (ingredients && Array.isArray(ingredients)) {
      for (let i = 0; i < ingredients.length; i++) {
        await db.run(
          'INSERT INTO ingredients (recipe_id, text, order_num) VALUES (?, ?, ?)',
          [recipeId, ingredients[i], i]
        );
      }
    }

    // Add instructions
    if (instructions && Array.isArray(instructions)) {
      for (let i = 0; i < instructions.length; i++) {
        await db.run(
          'INSERT INTO instructions (recipe_id, text, order_num) VALUES (?, ?, ?)',
          [recipeId, instructions[i], i]
        );
      }
    }

    res.status(201).json({ id: recipeId, message: 'Recipe created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update recipe
app.put('/api/recipes/:id', async (req, res) => {
  try {
    const { title, category_id, servings, prep_time, cook_time, total_time, notes, url, ingredients, instructions } = req.body;

    await db.run(
      `UPDATE recipes SET title = ?, category_id = ?, servings = ?, prep_time = ?, cook_time = ?, total_time = ?, notes = ?, url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, category_id, servings, prep_time, cook_time, total_time, notes, url, req.params.id]
    );

    // Update ingredients
    if (ingredients && Array.isArray(ingredients)) {
      await db.run('DELETE FROM ingredients WHERE recipe_id = ?', [req.params.id]);
      for (let i = 0; i < ingredients.length; i++) {
        await db.run(
          'INSERT INTO ingredients (recipe_id, text, order_num) VALUES (?, ?, ?)',
          [req.params.id, ingredients[i], i]
        );
      }
    }

    // Update instructions
    if (instructions && Array.isArray(instructions)) {
      await db.run('DELETE FROM instructions WHERE recipe_id = ?', [req.params.id]);
      for (let i = 0; i < instructions.length; i++) {
        await db.run(
          'INSERT INTO instructions (recipe_id, text, order_num) VALUES (?, ?, ?)',
          [req.params.id, instructions[i], i]
        );
      }
    }

    res.json({ message: 'Recipe updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Recipe deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CATEGORIES ====================

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.all('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create category
app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const result = await db.run('INSERT INTO categories (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.lastID, name });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SEARCH ====================

// Search recipes
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const categoryId = req.query.category || null;

    let sql = `
      SELECT DISTINCT r.*, c.name as category_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN ingredients i ON r.id = i.recipe_id
      WHERE (r.title LIKE ? OR r.notes LIKE ? OR i.text LIKE ?)
    `;
    let params = [`%${q}%`, `%${q}%`, `%${q}%`];

    if (categoryId) {
      sql += ` AND r.category_id = ?`;
      params.push(categoryId);
    }

    sql += ` ORDER BY r.title`;

    const results = await db.all(sql, params);

    // Get ingredients and instructions
    for (let recipe of results) {
      recipe.ingredients = await db.all(
        'SELECT id, text FROM ingredients WHERE recipe_id = ? ORDER BY order_num',
        [recipe.id]
      );
      recipe.instructions = await db.all(
        'SELECT id, text FROM instructions WHERE recipe_id = ? ORDER BY order_num',
        [recipe.id]
      );
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🍳 Recipe API server running on http://localhost:${PORT}`);
  console.log(`📁 Database: recipes.db`);
  console.log(`\nAPI Routes:`);
  console.log(`  GET    /api/recipes          - Get all recipes`);
  console.log(`  GET    /api/recipes/:id      - Get single recipe`);
  console.log(`  POST   /api/recipes          - Create recipe`);
  console.log(`  PUT    /api/recipes/:id      - Update recipe`);
  console.log(`  DELETE /api/recipes/:id      - Delete recipe`);
  console.log(`  GET    /api/categories       - Get all categories`);
  console.log(`  POST   /api/categories       - Create category`);
  console.log(`  GET    /api/search?q=term    - Search recipes\n`);
});
