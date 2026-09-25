const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./database');
const {
  fetchAndParseRecipeUrl,
  extractUrlFromWebloc,
  parsePdfText,
  isPrivateOrLocalHost,
} = require('./import-helpers');

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

// For import files (.pdf/.webloc) — kept in memory only, never written to
// UPLOADS_DIR, which stays reserved for actual recipe photos.
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

function deleteUploadedFile(imagePath) {
  if (!imagePath) return;
  fs.unlink(path.join(__dirname, imagePath.replace(/^\//, '')), (err) => {
    if (err && err.code !== 'ENOENT') console.error('Error deleting file', imagePath, err);
  });
}

// Shared by the multipart photo upload and the photo-from-url import path:
// both get bytes onto disk their own way, then converge here to delete the
// old photo (if any) and update the DB row.
async function applyRecipePhoto(recipeId, image_path, imageCredit) {
  const existing = await db.get('SELECT image_path FROM recipes WHERE id = ?', [recipeId]);
  if (!existing) return null;
  deleteUploadedFile(existing.image_path);
  await db.run(
    'UPDATE recipes SET image_path = ?, image_credit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [image_path, imageCredit || null, recipeId]
  );
  return { image_path, image_credit: imageCredit || null };
}

function validateRating(rating) {
  if (rating === undefined || rating === null || rating === '' || rating === 0 || rating === '0') return { value: null, error: null };
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
    if (!req.file) return res.status(400).json({ error: 'No photo file provided' });
    const result = await applyRecipePhoto(req.params.id, `/uploads/${req.file.filename}`, req.body.image_credit);
    if (!result) return res.status(404).json({ error: 'Recipe not found' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Attach a photo to a recipe by fetching it from a URL (used by imports)
app.post('/api/recipes/:id/photo-from-url', async (req, res) => {
  try {
    const { url, credit } = req.body;
    if (!url) return res.status(400).json({ error: 'No image URL provided' });
    if (isPrivateOrLocalHost(url)) return res.status(400).json({ error: 'That URL is not allowed' });

    const existing = await db.get('SELECT id FROM recipes WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Recipe not found' });

    const imgRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) return res.status(400).json({ error: `Couldn't download image: HTTP ${imgRes.status}` });
    const contentType = (imgRes.headers.get('content-type') || '').split(';')[0];
    if (!contentType.startsWith('image/')) return res.status(400).json({ error: 'URL did not return an image' });

    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[contentType] || '.jpg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const filename = `${req.params.id}-${Date.now()}${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

    const result = await applyRecipePhoto(req.params.id, `/uploads/${filename}`, credit);
    res.json(result);
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

// ==================== IMPORT ====================

// Parse a recipe from a URL (schema.org/Recipe JSON-LD). Does not write to
// the DB — returns a draft for the frontend to review before saving via the
// normal POST /api/recipes.
app.post('/api/import/url', async (req, res) => {
  try {
    const categories = await db.all('SELECT * FROM categories');
    const result = await fetchAndParseRecipeUrl(req.body.url, categories);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, recipe: {}, image: null, warnings: [], errors: [error.message] });
  }
});

// Parse a recipe from an uploaded .pdf or .webloc file. Same draft contract
// as /api/import/url. The uploaded file itself is never persisted to disk.
app.post('/api/import/file', importUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ ok: false, recipe: {}, image: null, warnings: [], errors: ['No file provided'] });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const categories = await db.all('SELECT * FROM categories');

    if (ext === '.webloc') {
      const url = extractUrlFromWebloc(req.file.buffer.toString('utf8'));
      if (!url) {
        return res.json({ ok: false, recipe: {}, image: null, warnings: [], errors: ["Couldn't find a URL inside this .webloc file"] });
      }
      const result = await fetchAndParseRecipeUrl(url, categories);
      return res.json(result);
    }

    if (ext === '.pdf') {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: req.file.buffer });
      const data = await parser.getText();
      await parser.destroy();
      const { recipe, warnings, errors } = parsePdfText(data.text, req.file.originalname, categories);
      const hasUsableData = (recipe.ingredients && recipe.ingredients.length) || (recipe.instructions && recipe.instructions.length);
      return res.json({ ok: !!hasUsableData && errors.length === 0, recipe, image: null, warnings, errors });
    }

    return res.json({ ok: false, recipe: {}, image: null, warnings: [], errors: ['Unsupported file type — please upload a .pdf or .webloc file'] });
  } catch (error) {
    res.status(500).json({ ok: false, recipe: {}, image: null, warnings: [], errors: [error.message] });
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
  console.log(`  GET    /api/search?q=term    - Search recipes`);
  console.log(`  POST   /api/import/url       - Parse a recipe from a URL`);
  console.log(`  POST   /api/import/file      - Parse a recipe from a .pdf/.webloc file\n`);
});
