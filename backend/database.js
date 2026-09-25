const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'recipes.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database', err);
      } else {
        console.log('Connected to SQLite database at', DB_PATH);
        this.init();
      }
    });
  }

  init() {
    // Create tables if they don't exist
    this.db.serialize(() => {
      // Categories table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Recipes table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS recipes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          source_file TEXT,
          category_id INTEGER,
          servings TEXT,
          prep_time TEXT,
          cook_time TEXT,
          total_time TEXT,
          notes TEXT,
          url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id)
        )
      `);

      // New optional recipe fields (idempotent - safe to run against an existing populated DB)
      const newRecipeColumns = [
        'subtitle TEXT',
        'author TEXT',
        'description TEXT',
        'image_path TEXT',
        'image_credit TEXT',
        'rating INTEGER',
        'nutrition_calories TEXT',
        'nutrition_protein TEXT',
        'nutrition_fat TEXT',
        'nutrition_carbs TEXT',
        'nutrition_fiber TEXT',
        'nutrition_sugar TEXT',
        'nutrition_sodium TEXT',
        'nutrition_cholesterol TEXT',
        'layout TEXT'
      ];
      for (const columnDef of newRecipeColumns) {
        this.db.run(`ALTER TABLE recipes ADD COLUMN ${columnDef}`, (err) => {
          if (err && !/duplicate column name/.test(err.message)) {
            console.error(`Error adding column (${columnDef}):`, err);
          }
        });
      }

      // Ingredients table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS ingredients (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recipe_id INTEGER NOT NULL,
          text TEXT NOT NULL,
          order_num INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
        )
      `);

      // Instructions table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS instructions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recipe_id INTEGER NOT NULL,
          text TEXT NOT NULL,
          order_num INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
        )
      `);
    });
  }

  // Helper to run queries with promises
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = new Database();
