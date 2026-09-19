# Recipe Database Web Application

A modern database-backed recipe management application built with Node.js/Express backend and React frontend.

## Project Structure

```
recipe-app/
├── backend/                 # Node.js + Express API server
│   ├── package.json        # Backend dependencies
│   ├── server.js           # Main Express server
│   └── database.js         # SQLite database setup
├── frontend/               # React application
│   ├── package.json        # Frontend dependencies
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js          # Main app component
│       ├── App.css         # App styling
│       ├── index.js        # React entry point
│       ├── index.css       # Global styles
│       └── components/     # React components
│           ├── RecipeList.js
│           ├── RecipeDetail.js
│           ├── RecipeForm.js
│           └── SearchBar.js
└── README.md              # This file
```

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (file-based, zero setup)
- **Frontend**: React 18
- **API**: RESTful with CORS support
- **Styling**: CSS3

## Features

- ✅ Browse all recipes
- ✅ Add new recipes with ingredients, instructions, and metadata
- ✅ Edit existing recipes
- ✅ Delete recipes
- ✅ Search recipes by name or ingredient
- ✅ Filter by category
- ✅ Categorize recipes
- ✅ Track cooking times and servings
- ✅ Store recipe URLs and source information

## Installation

### Prerequisites

- Node.js 14+ and npm

### Setup

1. **Install backend dependencies**:
```bash
cd recipe-app/backend
npm install
```

2. **Install frontend dependencies**:
```bash
cd ../frontend
npm install
```

## Running the Application

### Development Mode (Two Terminals)

**Terminal 1 - Start Backend Server**:
```bash
cd recipe-app/backend
npm run dev
# Server will run on http://localhost:5000
```

**Terminal 2 - Start Frontend Server**:
```bash
cd recipe-app/frontend
npm start
# App will open on http://localhost:3000
```

### Or Using One Command (from root directory)

If you want to run both simultaneously:
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2 (in another terminal)
cd frontend && npm start
```

## API Endpoints

### Recipes
- `GET /api/recipes` - Get all recipes
- `GET /api/recipes/:id` - Get single recipe
- `POST /api/recipes` - Create new recipe
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category

### Search
- `GET /api/search?q=term&category=id` - Search recipes

### Health
- `GET /api/health` - Health check

## Database

The application uses **SQLite** with the following schema:

### Tables

**categories**
- id (PK)
- name (TEXT, UNIQUE)
- created_at (DATETIME)

**recipes**
- id (PK)
- title (TEXT)
- source_file (TEXT)
- category_id (FK)
- servings (TEXT)
- prep_time (TEXT)
- cook_time (TEXT)
- total_time (TEXT)
- notes (TEXT)
- url (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)

**ingredients**
- id (PK)
- recipe_id (FK)
- text (TEXT)
- order_num (INTEGER)
- created_at (DATETIME)

**instructions**
- id (PK)
- recipe_id (FK)
- text (TEXT)
- order_num (INTEGER)
- created_at (DATETIME)

The database file (`recipes.db`) is automatically created in the backend directory on first run.

## Development

### Adding a New Component

1. Create file in `frontend/src/components/`
2. Import and use in `App.js`
3. Restart frontend server

### Modifying the API

1. Edit `backend/server.js`
2. Add route handlers as needed
3. Backend auto-restarts with nodemon

### Database Schema Changes

1. Edit `backend/database.js` initialization
2. Delete `recipes.db` to reset
3. Restart server to recreate with new schema

## Importing Your Recipe Data

You can import your existing recipe collection from your `recipes_final_merged.json` file:

1. Create a script in `backend/` to migrate your JSON data
2. Use the API endpoints to create recipes programmatically
3. Or manually add recipes through the web interface

Example migration script coming soon.

## Production Build

### Build React App
```bash
cd frontend
npm run build
```

The built app will be in `frontend/build/` and the backend will serve it automatically.

### Build for Deployment
```bash
cd backend
npm install --production
NODE_ENV=production node server.js
```

## Configuration

### Change Port
Edit `backend/server.js`:
```javascript
const PORT = process.env.PORT || 5000; // Change 5000
```

### Database Location
The database is stored at `backend/recipes.db`. To change:
Edit `backend/database.js`:
```javascript
const DB_PATH = path.join(__dirname, 'recipes.db'); // Change path
```

## Troubleshooting

### Port Already in Use
If port 3000 or 5000 is already in use:
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Database Errors
If you get database errors, delete the database and let it recreate:
```bash
cd backend
rm recipes.db
npm run dev
```

### CORS Issues
Frontend is configured to proxy to `localhost:5000`. Make sure backend is running.

## Next Steps

1. ✅ Install dependencies
2. ✅ Run backend and frontend
3. 📝 Add your recipes through the UI
4. 🔍 Try searching and filtering
5. 📚 Build additional features

## Future Enhancements

- User authentication
- Image uploads for recipes
- Recipe ratings and notes
- Recipe collections/favorites
- Export to PDF
- Recipe scaling calculator
- Meal planning
- Shopping list generator

## License

MIT

---

Built with ❤️ for recipe management
