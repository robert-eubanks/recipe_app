import React, { useState } from 'react';

function RecipeForm({ categories, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    category_id: '',
    servings: '',
    prep_time: '',
    cook_time: '',
    total_time: '',
    notes: '',
    url: '',
    source_file: '',
    ingredients: [''],
    instructions: [''],
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArrayChange = (index, arrayName, value) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => i === index ? value : item)
    }));
  };

  const handleAddArrayItem = (arrayName) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: [...prev[arrayName], '']
    }));
  };

  const handleRemoveArrayItem = (index, arrayName) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Filter out empty ingredients and instructions
    const cleanData = {
      ...formData,
      ingredients: formData.ingredients.filter(i => i.trim()),
      instructions: formData.instructions.filter(i => i.trim()),
    };
    onSubmit(cleanData);
  };

  return (
    <form onSubmit={handleSubmit} className="recipe-detail">
      <h2>Add New Recipe</h2>

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

      <div className="form-row">
        <div className="form-group">
          <label>Category</label>
          <select
            name="category_id"
            value={formData.category_id}
            onChange={handleInputChange}
          >
            <option value="">-- Select Category --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Servings</label>
          <input
            type="text"
            name="servings"
            value={formData.servings}
            onChange={handleInputChange}
            placeholder="4 servings"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Prep Time</label>
          <input
            type="text"
            name="prep_time"
            value={formData.prep_time}
            onChange={handleInputChange}
            placeholder="15 min"
          />
        </div>

        <div className="form-group">
          <label>Cook Time</label>
          <input
            type="text"
            name="cook_time"
            value={formData.cook_time}
            onChange={handleInputChange}
            placeholder="30 min"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Total Time</label>
        <input
          type="text"
          name="total_time"
          value={formData.total_time}
          onChange={handleInputChange}
          placeholder="45 min"
        />
      </div>

      <div className="form-group">
        <label>Source File</label>
        <input
          type="text"
          name="source_file"
          value={formData.source_file}
          onChange={handleInputChange}
          placeholder="e.g., Cookbook.pdf"
        />
      </div>

      <div className="form-group">
        <label>Ingredients</label>
        {formData.ingredients.map((ingredient, index) => (
          <div key={index} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={ingredient}
              onChange={(e) => handleArrayChange(index, 'ingredients', e.target.value)}
              placeholder="e.g., 2 cups flour"
              style={{ flex: 1 }}
            />
            {formData.ingredients.length > 1 && (
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => handleRemoveArrayItem(index, 'ingredients')}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleAddArrayItem('ingredients')}
          style={{ marginTop: '8px' }}
        >
          + Add Ingredient
        </button>
      </div>

      <div className="form-group">
        <label>Instructions</label>
        {formData.instructions.map((instruction, index) => (
          <div key={index} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
            <textarea
              value={instruction}
              onChange={(e) => handleArrayChange(index, 'instructions', e.target.value)}
              placeholder="Step by step instructions"
              style={{ flex: 1, minHeight: '60px' }}
            />
            {formData.instructions.length > 1 && (
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => handleRemoveArrayItem(index, 'instructions')}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => handleAddArrayItem('instructions')}
          style={{ marginTop: '8px' }}
        >
          + Add Step
        </button>
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          placeholder="Tips, variations, or notes"
        />
      </div>

      <div className="form-group">
        <label>URL (if from web)</label>
        <input
          type="url"
          name="url"
          value={formData.url}
          onChange={handleInputChange}
          placeholder="https://example.com/recipe"
        />
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Add Recipe</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default RecipeForm;
