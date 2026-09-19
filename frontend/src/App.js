import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import RecipeList from './components/RecipeList';
import RecipeDetail from './components/RecipeDetail';
import RecipeForm from './components/RecipeForm';
import SearchBar from './components/SearchBar';

function App() {
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all recipes on mount
  useEffect(() => {
    loadRecipes();
    loadCategories();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/recipes');
      setRecipes(response.data);
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
  };

  const handleAddRecipe = async (recipeData) => {
    try {
      await axios.post('/api/recipes', recipeData);
      setShowForm(false);
      loadRecipes();
      setError(null);
    } catch (err) {
      setError('Failed to add recipe');
      console.error(err);
    }
  };

  const handleUpdateRecipe = async (recipeData) => {
    try {
      await axios.put(`/api/recipes/${selectedRecipe.id}`, recipeData);
      setSelectedRecipe(null);
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
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '✕ Close' : '+ Add Recipe'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {loading && <div className="loading">Loading...</div>}

          {!showForm && (
            <RecipeList
              recipes={displayRecipes}
              selectedRecipeId={selectedRecipe?.id}
              onSelectRecipe={handleSelectRecipe}
            />
          )}
        </aside>

        <main className="main-content">
          {showForm ? (
            <RecipeForm
              categories={categories}
              onSubmit={handleAddRecipe}
              onCancel={() => setShowForm(false)}
            />
          ) : selectedRecipe ? (
            <RecipeDetail
              recipe={selectedRecipe}
              categories={categories}
              onUpdate={handleUpdateRecipe}
              onDelete={handleDeleteRecipe}
            />
          ) : (
            <div className="welcome">
              <h2>Welcome to your Recipe Database</h2>
              <p>Select a recipe from the list or add a new one to get started.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
