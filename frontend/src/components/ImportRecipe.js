import React, { useState } from 'react';
import axios from 'axios';
import RecipeFormFields from './RecipeFormFields';
import { useRecipeFormState, buildRecipeFormData } from '../hooks/useRecipeFormState';

function hasUsableContent(recipe) {
  return !!(recipe && (recipe.title || (recipe.ingredients && recipe.ingredients.length) || (recipe.instructions && recipe.instructions.length)));
}

function ImportRecipe({ categories, onSubmit, onCancel, onStartManualEntry }) {
  const [mode, setMode] = useState('choose'); // 'choose' | 'loading' | 'review' | 'failed'
  const [urlInput, setUrlInput] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const {
    formData,
    setFormData,
    handleInputChange,
    handleArrayChange,
    handleAddArrayItem,
    handleRemoveArrayItem,
    handleRatingChange,
    cleanFormData,
  } = useRecipeFormState();

  const handleImportResponse = (result) => {
    setImportResult(result);
    if (hasUsableContent(result.recipe)) {
      setFormData(buildRecipeFormData(result.recipe));
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

  const handleSave = (e) => {
    e.preventDefault();
    onSubmit(cleanFormData(), photoFile, importResult.image);
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
          onRatingChange={handleRatingChange}
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
