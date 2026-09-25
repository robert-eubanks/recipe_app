import React, { useState } from 'react';
import StarRating from './StarRating';
import { getLayoutComponent } from '../layouts';

function RecipeDetail({ recipe, categories, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [formData, setFormData] = useState({
    title: recipe.title,
    category_id: recipe.category_id,
    servings: recipe.servings || '',
    prep_time: recipe.prep_time || '',
    cook_time: recipe.cook_time || '',
    total_time: recipe.total_time || '',
    notes: recipe.notes || '',
    url: recipe.url || '',
    subtitle: recipe.subtitle || '',
    author: recipe.author || '',
    description: recipe.description || '',
    image_credit: recipe.image_credit || '',
    rating: recipe.rating || 0,
    nutrition_calories: recipe.nutrition_calories || '',
    nutrition_protein: recipe.nutrition_protein || '',
    nutrition_fat: recipe.nutrition_fat || '',
    nutrition_carbs: recipe.nutrition_carbs || '',
    nutrition_fiber: recipe.nutrition_fiber || '',
    nutrition_sugar: recipe.nutrition_sugar || '',
    nutrition_sodium: recipe.nutrition_sodium || '',
    nutrition_cholesterol: recipe.nutrition_cholesterol || '',
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
    const submitData = removePhoto ? { ...formData, remove_photo: true } : formData;
    await onUpdate(submitData, photoFile);
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

        <div className="form-group">
          <label>Subtitle</label>
          <input
            type="text"
            name="subtitle"
            value={formData.subtitle}
            onChange={handleInputChange}
            placeholder="A short subtitle"
          />
        </div>

        <div className="form-group">
          <label>Author</label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleInputChange}
            placeholder="Recipe author"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="A short description of the recipe"
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
          <label>Photo</label>
          {recipe.image_path && !removePhoto && (
            <div style={{ marginBottom: '8px' }}>
              <img src={recipe.image_path} alt={recipe.title} style={{ maxWidth: '200px', display: 'block', marginBottom: '4px' }} />
              <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={removePhoto}
                  onChange={(e) => setRemovePhoto(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Remove photo
              </label>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files[0] || null)}
          />
        </div>

        <div className="form-group">
          <label>Photo Credit</label>
          <input
            type="text"
            name="image_credit"
            value={formData.image_credit}
            onChange={handleInputChange}
            placeholder="Photo credit"
          />
        </div>

        <div className="form-group">
          <label>Rating</label>
          <StarRating
            rating={formData.rating}
            onChange={(n) => setFormData(prev => ({ ...prev, rating: n }))}
          />
        </div>

        <div className="form-group">
          <label>Nutrition (optional)</label>
          <div className="form-row">
            <div className="form-group">
              <label>Calories</label>
              <input type="text" name="nutrition_calories" value={formData.nutrition_calories} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Protein</label>
              <input type="text" name="nutrition_protein" value={formData.nutrition_protein} onChange={handleInputChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fat</label>
              <input type="text" name="nutrition_fat" value={formData.nutrition_fat} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Carbohydrates</label>
              <input type="text" name="nutrition_carbs" value={formData.nutrition_carbs} onChange={handleInputChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fiber</label>
              <input type="text" name="nutrition_fiber" value={formData.nutrition_fiber} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Sugar</label>
              <input type="text" name="nutrition_sugar" value={formData.nutrition_sugar} onChange={handleInputChange} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Sodium</label>
              <input type="text" name="nutrition_sodium" value={formData.nutrition_sodium} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>Cholesterol</label>
              <input type="text" name="nutrition_cholesterol" value={formData.nutrition_cholesterol} onChange={handleInputChange} />
            </div>
          </div>
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

  const Layout = getLayoutComponent(recipe);

  return (
    <div className="recipe-detail-wrapper">
      <Layout recipe={recipe} />
      <div className="recipe-actions">
        <button className="btn btn-primary" onClick={() => setIsEditing(true)}>Edit</button>
        <button className="btn btn-danger" onClick={() => onDelete(recipe.id)}>Delete</button>
      </div>
    </div>
  );
}

export default RecipeDetail;
