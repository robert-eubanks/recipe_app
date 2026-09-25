import React, { useState } from 'react';
import axios from 'axios';
import RecipeFormFields from './RecipeFormFields';

const DEFAULT_FORM_DATA = {
  title: '',
  category_id: '',
  servings: '',
  prep_time: '',
  cook_time: '',
  total_time: '',
  notes: '',
  url: '',
  source_file: '',
  subtitle: '',
  author: '',
  description: '',
  image_credit: '',
  rating: 0,
  nutrition_calories: '',
  nutrition_protein: '',
  nutrition_fat: '',
  nutrition_carbs: '',
  nutrition_fiber: '',
  nutrition_sugar: '',
  nutrition_sodium: '',
  nutrition_cholesterol: '',
  ingredients: [''],
  instructions: [''],
};

function buildFormData(recipe) {
  return {
    ...DEFAULT_FORM_DATA,
    ...recipe,
    category_id: recipe.category_id ?? '',
    rating: recipe.rating || 0,
    ingredients: recipe.ingredients && recipe.ingredients.length ? recipe.ingredients : [''],
    instructions: recipe.instructions && recipe.instructions.length ? recipe.instructions : [''],
  };
}

function hasUsableContent(recipe) {
  return !!(recipe && (recipe.title || (recipe.ingredients && recipe.ingredients.length) || (recipe.instructions && recipe.instructions.length)));
}

function ImportRecipe({ categories, onSubmit, onCancel, onStartManualEntry }) {
  const [mode, setMode] = useState('choose'); // 'choose' | 'loading' | 'review' | 'failed'
  const [urlInput, setUrlInput] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [formData, setFormData] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const handleImportResponse = (result) => {
    setImportResult(result);
    if (hasUsableContent(result.recipe)) {
      setFormData(buildFormData(result.recipe));
      setMode('review');
    } else {
      setMode('failed');
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setMode('loading');
    setLoadError(null);
    try {
      const res = await axios.post('/api/import/url', { url: urlInput.trim() });
      handleImportResponse(res.data);
    } catch (err) {
      setLoadError('Import failed unexpectedly. Please try again.');
      setMode('choose');
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!fileInput) return;
    setMode('loading');
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.append('file', fileInput);
      const res = await axios.post('/api/import/file', fd);
      handleImportResponse(res.data);
    } catch (err) {
      setLoadError('Import failed unexpectedly. Please try again.');
      setMode('choose');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (index, arrayName, value) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleAddArrayItem = (arrayName) => {
    setFormData((prev) => ({ ...prev, [arrayName]: [...prev[arrayName], ''] }));
  };

  const handleRemoveArrayItem = (index, arrayName) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index),
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    const cleanData = {
      ...formData,
      ingredients: formData.ingredients.filter((i) => i.trim()),
      instructions: formData.instructions.filter((i) => i.trim()),
    };
    onSubmit(cleanData, photoFile, importResult.image);
  };

  const renderFeedback = () => (
    <>
      {importResult.errors.length > 0 && (
        <div className="error-message">
          <strong>Couldn't fully import this recipe:</strong>
          <ul>{importResult.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      )}
      {importResult.warnings.length > 0 && (
        <div className="import-warnings">
          <strong>Please review:</strong>
          <ul>{importResult.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}
    </>
  );

  if (mode === 'review') {
    return (
      <form onSubmit={handleSave} className="recipe-detail">
        <h2>Review Imported Recipe</h2>
        {renderFeedback()}

        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="Recipe name"
          />
        </div>

        <RecipeFormFields
          formData={formData}
          categories={categories}
          onFieldChange={handleInputChange}
          onArrayChange={handleArrayChange}
          onAddArrayItem={handleAddArrayItem}
          onRemoveArrayItem={handleRemoveArrayItem}
          onRatingChange={(n) => setFormData((prev) => ({ ...prev, rating: n }))}
          onPhotoFileChange={setPhotoFile}
          showSourceFile
          existingPhoto={importResult.image ? { path: importResult.image.url, title: formData.title } : null}
        />

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save Recipe</button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    );
  }

  if (mode === 'failed') {
    return (
      <div className="recipe-detail">
        <h2>Import Recipe</h2>
        {renderFeedback()}
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={() => { setMode('choose'); setImportResult(null); }}>
            Try Again
          </button>
          <button type="button" className="btn btn-secondary" onClick={onStartManualEntry}>
            Start Manual Entry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recipe-detail">
      <h2>Import Recipe</h2>

      {loadError && <div className="error-message">{loadError}</div>}
      {mode === 'loading' && <div className="loading">Importing...</div>}

      <form onSubmit={handleUrlSubmit}>
        <div className="form-group">
          <label>From a website URL</label>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/recipe"
            disabled={mode === 'loading'}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={mode === 'loading' || !urlInput.trim()}>
            Import from URL
          </button>
        </div>
      </form>

      <form onSubmit={handleFileSubmit}>
        <div className="form-group">
          <label>From a file (.pdf or .webloc)</label>
          <input
            type="file"
            accept=".pdf,.webloc"
            onChange={(e) => setFileInput(e.target.files[0] || null)}
            disabled={mode === 'loading'}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={mode === 'loading' || !fileInput}>
            Import File
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default ImportRecipe;
