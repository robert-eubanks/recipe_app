import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import ImportRecipe from './components/ImportRecipe';
import SearchBar from './components/SearchBar';

function App() {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [featuredRecipe, setFeaturedRecipe] = useState(null);

  // Fetch all recipes on mount
  useEffect(() => {
    loadRecipes({ pickFeatured: true });
    loadCategories();
  }, []);

  // The welcome-pane "featured" recipe is only (re-)randomized on first load
  // — every other call just refreshes the list, so it doesn't jump around
  // (e.g. right after saving an edit, while the welcome pane isn't even showing).
  const loadRecipes = async ({ pickFeatured = false } = {}) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/recipes');
      setRecipes(response.data);
      if (pickFeatured && response.data.length) {
        setFeaturedRecipe(response.data[Math.floor(Math.random() * response.data.length)]);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load recipes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const handleSearch = async (query, categoryId) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('/api/search', {
        params: {
          q: query,
          category: categoryId || undefined
        }
      });
      setSearchResults(response.data);
      setSelectedRecipe(null);
      setError(null);
    } catch (err) {
      setError('Search failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchResults(null);
  };

  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setShowForm(false);
    setShowImport(false);
  };

  const uploadPhoto = async (recipeId, photoFile, imageCredit) => {
    const fd = new FormData();
    fd.append('photo', photoFile);
    if (imageCredit) fd.append('image_credit', imageCredit);
    await axios.post(`/api/recipes/${recipeId}/photo`, fd);
  };

  const handleAddRecipe = async (recipeData, photoFile) => {
    try {
      const res = await axios.post('/api/recipes', recipeData);
      if (photoFile) {
        await uploadPhoto(res.data.id, photoFile, recipeData.image_credit);
      }
      setShowForm(false);
      loadRecipes();
      setError(null);
    } catch (err) {
      setError('Failed to add recipe');
      console.error(err);
    }
  };

  const handleImportedRecipe = async (recipeData, photoFile, sourceImage) => {
    try {
      const res = await axios.post('/api/recipes', recipeData);
      if (photoFile) {
        await uploadPhoto(res.data.id, photoFile, recipeData.image_credit);
      } else if (sourceImage?.url) {
        await axios.post(`/api/recipes/${res.data.id}/photo-from-url`, {
          url: sourceImage.url,
          credit: recipeData.image_credit || sourceImage.credit,
        });
      }
      setShowImport(false);
      loadRecipes();
      setError(null);
    } catch (err) {
      setError('Failed to save imported recipe');
      console.error(err);
    }
  };

  const handleUpdateRecipe = async (recipeData, photoFile) => {
    try {
      await axios.put(`/api/recipes/${selectedRecipe.id}`, recipeData);
      if (photoFile) {
        await uploadPhoto(selectedRecipe.id, photoFile, recipeData.image_credit);
      }
      // Stay on this recipe after saving, with its freshly-saved data — PUT
      // itself doesn't return the updated recipe, so re-fetch it.
      const refreshed = await axios.get(`/api/recipes/${selectedRecipe.id}`);
      setSelectedRecipe(refreshed.data);
      loadRecipes();
      setError(null);
    } catch (err) {
      setError('Failed to update recipe');
      console.error(err);
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await axios.delete(`/api/recipes/${recipeId}`);
        setSelectedRecipe(null);
        loadRecipes();
        setError(null);
      } catch (err) {
        setError('Failed to delete recipe');
        console.error(err);
      }
    }
  };

  const displayRecipes = searchResults !== null ? searchResults : recipes;

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍳 Recipe Database</h1>
        <p>Manage your recipe collection</p>
      </header>

      <div className="app-container">
        <aside className="sidebar">
          <SearchBar
            categories={categories}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            hasActiveSearch={searchResults !== null}
          />

          <div className="sidebar-actions">
            <button
              className="btn btn-primary"
              onClick={() => { setShowForm(!showForm); setShowImport(false); }}
            >
              {showForm ? '✕ Close' : '+ Add Recipe'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowImport(!showImport); setShowForm(false); }}
            >
              {showImport ? '✕ Close' : '⬇ Import Recipe'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading && <div className="loading">Loading...</div>}

          {!showForm && !showImport && (
            <RecipeList
              recipes={displayRecipes}
              selectedRecipeId={selectedRecipe?.id}
              onSelectRecipe={handleSelectRecipe}
            />
          )}
        </aside>

        <main className="main-content">
          {showImport ? (
            <ImportRecipe
              categories={categories}
              onSubmit={handleImportedRecipe}
              onCancel={() => setShowImport(false)}
              onStartManualEntry={() => { setShowImport(false); setShowForm(true); }}
            />
          ) : showForm ? (
            <RecipeForm
              categories={categories}
              onSubmit={handleAddRecipe}
              onCancel={() => setShowForm(false)}
            />
          ) : selectedRecipe ? (
            <RecipeDetail
              key={selectedRecipe.id}
              recipe={selectedRecipe}
              categories={categories}
              onUpdate={handleUpdateRecipe}
              onDelete={handleDeleteRecipe}
            />
          ) : (
            <div className="welcome">
              <h2>Welcome to your Recipe Database</h2>
              <p>Select a recipe from the list or add a new one to get started.</p>

              {featuredRecipe && (
                <div className="featured-recipe">
                  <div className="featured-recipe-label">Feeling undecided? Try this</div>
                  <div className="featured-recipe-title">{featuredRecipe.title}</div>
                  {featuredRecipe.category_name && (
                    <div className="featured-recipe-category">{featuredRecipe.category_name}</div>
                  )}
                  <button
                    className="btn btn-primary"
                    style={{ width: 'auto' }}
                    onClick={() => handleSelectRecipe(featuredRecipe)}
                  >
                    View Recipe
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
