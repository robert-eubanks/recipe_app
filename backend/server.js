const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5001;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${req.params.id}-${Date.now()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

function deleteUploadedFile(imagePath) {
  if (!imagePath) return;
  fs.unlink(path.join(__dirname, imagePath.replace(/^\//, '')), (err) => {
    if (err && err.code !== 'ENOENT') console.error('Error deleting file', imagePath, err);
  });
}

function validateRating(rating) {
  if (rating === undefined || rating === null || rating === '') return { value: null, error: null };
  const r = parseInt(rating, 10);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return { value: null, error: 'rating must be an integer 1-5' };
  }
  return { value: r, error: null };
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded recipe photos
app.use('/uploads', express.static(UPLOADS_DIR));

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
    const {
      title, category_id, servings, prep_time, cook_time, total_time, notes, url, source_file, ingredients, instructions,
      subtitle, author, description, rating,
      nutrition_calories, nutrition_protein, nutrition_fat, nutrition_carbs,
      nutrition_fiber, nutrition_sugar, nutrition_sodium, nutrition_cholesterol
    } = req.body;

    const { value: ratingValue, error: ratingError } = validateRating(rating);
    if (ratingError) return res.status(400).json({ error: ratingError });

    const result = await db.run(
      `INSERT INTO recipes (
         title, category_id, servings, prep_time, cook_time, total_time, notes, url, source_file,
         subtitle, author, description, rating,
         nutrition_calories, nutrition_protein, nutrition_fat, nutrition_carbs,
         nutrition_fiber, nutrition_sugar, nutrition_sodium, nutrition_cholesterol
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, category_id, servings, prep_time, cook_time, total_time, notes, url, source_file,
        subtitle, author, description, ratingValue,
        nutrition_calories, nutrition_protein, nutrition_fat, nutrition_carbs,
        nutrition_fiber, nutrition_sugar, nutrition_sodium, nutrition_cholesterol
      ]
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
    const {
      title, category_id, servings, prep_time, cook_time, total_time, notes, url, ingredients, instructions,
      subtitle, author, description, rating, remove_photo,
      nutrition_calories, nutrition_protein, nutrition_fat, nutrition_carbs,
      nutrition_fiber, nutrition_sugar, nutrition_sodium, nutrition_cholesterol
    } = req.body;

    const { value: ratingValue, error: ratingError } = validateRating(rating);
    if (ratingError) return res.status(400).json({ error: ratingError });

    if (remove_photo) {
      const existing = await db.get('SELECT image_path FROM recipes WHERE id = ?', [req.params.id]);
      if (existing) deleteUploadedFile(existing.image_path);
    }

    await db.run(
      `UPDATE recipes SET
         title = ?, category_id = ?, servings = ?, prep_time = ?, cook_time = ?, total_time = ?, notes = ?, url = ?,
         subtitle = ?, author = ?, description = ?, rating = ?,
         nutrition_calories = ?, nutrition_protein = ?, nutrition_fat = ?, nutrition_carbs = ?,
         nutrition_fiber = ?, nutrition_sugar = ?, nutrition_sodium = ?, nutrition_cholesterol = ?,
         image_path = CASE WHEN ? THEN NULL ELSE image_path END,
         image_credit = CASE WHEN ? THEN NULL ELSE image_credit END,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title, category_id, servings, prep_time, cook_time, total_time, notes, url,
        subtitle, author, description, ratingValue,
        nutrition_calories, nutrition_protein, nutrition_fat, nutrition_carbs,
        nutrition_fiber, nutrition_sugar, nutrition_sodium, nutrition_cholesterol,
        !!remove_photo, !!remove_photo,
        req.params.id
      ]
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

// Upload/replace a recipe's photo
app.post('/api/recipes/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const existing = await db.get('SELECT image_path FROM recipes WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Recipe not found' });
    if (!req.file) return res.status(400).json({ error: 'No photo file provided' });

    deleteUploadedFile(existing.image_path);

    const image_path = `/uploads/${req.file.filename}`;
    const image_credit = req.body.image_credit || null;
    await db.run(
      'UPDATE recipes SET image_path = ?, image_credit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [image_path, image_credit, req.params.id]
    );

    res.json({ image_path, image_credit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete recipe
app.delete('/api/recipes/:id', async (req, res) => {
  try {
    const existing = await db.get('SELECT image_path FROM recipes WHERE id = ?', [req.params.id]);
    await db.run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
    if (existing) deleteUploadedFile(existing.image_path);
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
      WHERE (r.title LIKE ? OR r.notes LIKE ? OR i.text LIKE ? OR r.author LIKE ? OR r.description LIKE ?)
    `;
    let params = [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`];

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
