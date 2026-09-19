import React, { useState } from 'react';

function RecipeDetail({ recipe, categories, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: recipe.title,
    category_id: recipe.category_id,
    servings: recipe.servings || '',
    prep_time: recipe.prep_time || '',
    cook_time: recipe.cook_time || '',
    total_time: recipe.total_time || '',
    notes: recipe.notes || '',
    url: recipe.url || '',
    ingredients: recipe.ingredients.map(i => i.text),
    instructions: recipe.instructions.map(i => i.text),
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onUpdate(formData);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="recipe-detail">
        <h2>Edit Recipe</h2>

        <div className="form-group">
          <label>Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category</label>
            <select
              name="category_id"
              value={formData.category_id || ''}
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
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => handleRemoveArrayItem(index, 'ingredients')}
              >
                ✕
              </button>
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
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => handleRemoveArrayItem(index, 'instructions')}
              >
                ✕
              </button>
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
          <label>URL</label>
          <input
            type="url"
            name="url"
            value={formData.url}
            onChange={handleInputChange}
            placeholder="https://example.com/recipe"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Save Changes</button>
          <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="recipe-detail">
      <h2>{recipe.title}</h2>
      {recipe.category_name && <p style={{ color: '#999', marginTop: '4px' }}>{recipe.category_name}</p>}

      <div className="recipe-meta">
        {recipe.servings && (
          <div className="recipe-meta-item">
            <div className="recipe-meta-label">Servings</div>
            <div className="recipe-meta-value">{recipe.servings}</div>
          </div>
        )}
        {recipe.prep_time && (
          <div className="recipe-meta-item">
            <div className="recipe-meta-label">Prep Time</div>
            <div className="recipe-meta-value">{recipe.prep_time}</div>
          </div>
        )}
        {recipe.cook_time && (
          <div className="recipe-meta-item">
            <div className="recipe-meta-label">Cook Time</div>
            <div className="recipe-meta-value">{recipe.cook_time}</div>
          </div>
        )}
        {recipe.total_time && (
          <div className="recipe-meta-item">
            <div className="recipe-meta-label">Total Time</div>
            <div className="recipe-meta-value">{recipe.total_time}</div>
          </div>
        )}
      </div>

      {recipe.ingredients.length > 0 && (
        <div className="recipe-section">
          <h3>Ingredients</h3>
          <ul className="recipe-list-items">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.id}>{ingredient.text}</li>
            ))}
          </ul>
        </div>
      )}

      {recipe.instructions.length > 0 && (
        <div className="recipe-section">
          <h3>Instructions</h3>
          <ol className="recipe-list-items">
            {recipe.instructions.map((instruction) => (
              <li key={instruction.id}>{instruction.text}</li>
            ))}
          </ol>
        </div>
      )}

      {recipe.notes && (
        <div className="recipe-section">
          <h3>Notes</h3>
          <p style={{ lineHeight: '1.6', color: '#555' }}>{recipe.notes}</p>
        </div>
      )}

      {recipe.url && (
        <div className="recipe-section">
          <h3>Source</h3>
          <a href={recipe.url} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>
            {recipe.url}
          </a>
        </div>
      )}

      <div className="recipe-actions">
        <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit</button>
        <button className="btn btn-danger" onClick={() => onDelete(recipe.id)}>Delete</button>
      </div>
    </div>
  );
}

export default RecipeDetail;
