# Quick Start Guide

Get your recipe database up and running in 5 minutes.

## 1. Install Dependencies

Open Terminal and run:

```bash
cd recipe-app/backend
npm install

cd ../frontend
npm install
```

## 2. Start the Backend Server

In Terminal 1:
```bash
cd recipe-app/backend
npm run dev
```

You should see:
```
🍳 Recipe API server running on http://localhost:5000
```

## 3. Start the Frontend App

In Terminal 2:
```bash
cd recipe-app/frontend
npm start
```

This will open your browser to `http://localhost:3000`

## 4. Add Your First Recipe

Click "➕ Add Recipe" and fill in the form:
- Title (required)
- Category
- Servings, prep/cook times
- Add ingredients
- Add instructions
- Notes and URL (optional)

Click "Add Recipe" to save.

## 5. Import Your Existing Recipes (Optional)

If you have a `recipes_final_merged.json` file from your cookbook project:

```bash
cd recipe-app/backend
node migrate-recipes.js /path/to/recipes_final_merged.json
```

Then refresh your browser to see all imported recipes.

## Common Tasks

### Search Recipes
- Type in the search box in the sidebar
- Optionally filter by category
- Click "Search"

### Edit a Recipe
- Click on any recipe in the list
- Click "Edit" in the recipe detail
- Make changes
- Click "Save Changes"

### Delete a Recipe
- Click on a recipe
- Click "Delete"
- Confirm

### Change Category
While editing a recipe, select a different category from the dropdown.

## Stopping the Servers

- Press `Ctrl+C` in each terminal to stop

## Troubleshooting

### Port 3000 or 5000 Already in Use
```bash
# Mac/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
```

### Missing Dependencies
```bash
# Delete node_modules and reinstall
rm -rf backend/node_modules frontend/node_modules
npm install
```

### Database Errors
```bash
# Reset the database
rm backend/recipes.db
npm run dev  # This recreates it
```

## Next Steps

- Read [README.md](./README.md) for full documentation
- Explore the API at http://localhost:5000/api/health
- Build custom features (see README for ideas)
- Deploy to production when ready

Enjoy! 🍳
