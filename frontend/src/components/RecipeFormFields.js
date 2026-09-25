import React from 'react';
import StarRating from './StarRating';

const NUTRITION_FIELDS = [
  ['nutrition_calories', 'Calories'],
  ['nutrition_protein', 'Protein'],
  ['nutrition_fat', 'Fat'],
  ['nutrition_carbs', 'Carbohydrates'],
  ['nutrition_fiber', 'Fiber'],
  ['nutrition_sugar', 'Sugar'],
  ['nutrition_sodium', 'Sodium'],
  ['nutrition_cholesterol', 'Cholesterol'],
];

function RecipeFormFields({
  formData,
  categories,
  onFieldChange,
  onArrayChange,
  onAddArrayItem,
  onRemoveArrayItem,
  onRatingChange,
  onPhotoFileChange,
  showSourceFile = false,
  existingPhoto,
  removePhoto,
  onRemovePhotoChange,
}) {
  return (
    <>
      <div className="form-group">
        <label>Subtitle</label>
        <input
          type="text"
          name="subtitle"
          value={formData.subtitle}
          onChange={onFieldChange}
          placeholder="A short subtitle"
        />
      </div>

      <div className="form-group">
        <label>Author</label>
        <input
          type="text"
          name="author"
          value={formData.author}
          onChange={onFieldChange}
          placeholder="Recipe author"
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={onFieldChange}
          placeholder="A short description of the recipe"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Category</label>
          <select
            name="category_id"
            value={formData.category_id || ''}
            onChange={onFieldChange}
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
            onChange={onFieldChange}
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
            onChange={onFieldChange}
            placeholder="15 min"
          />
        </div>

        <div className="form-group">
          <label>Cook Time</label>
          <input
            type="text"
            name="cook_time"
            value={formData.cook_time}
            onChange={onFieldChange}
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
          onChange={onFieldChange}
          placeholder="45 min"
        />
      </div>

      {showSourceFile && (
        <div className="form-group">
          <label>Source File</label>
          <input
            type="text"
            name="source_file"
            value={formData.source_file}
            onChange={onFieldChange}
            placeholder="e.g., Cookbook.pdf"
          />
        </div>
      )}

      <div className="form-group">
        <label>Ingredients</label>
        {formData.ingredients.map((ingredient, index) => (
          <div key={index} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={ingredient}
              onChange={(e) => onArrayChange(index, 'ingredients', e.target.value)}
              placeholder="e.g., 2 cups flour"
              style={{ flex: 1 }}
            />
            {formData.ingredients.length > 1 && (
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => onRemoveArrayItem(index, 'ingredients')}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onAddArrayItem('ingredients')}
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
              onChange={(e) => onArrayChange(index, 'instructions', e.target.value)}
              placeholder="Step by step instructions"
              style={{ flex: 1, minHeight: '60px' }}
            />
            {formData.instructions.length > 1 && (
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => onRemoveArrayItem(index, 'instructions')}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onAddArrayItem('instructions')}
          style={{ marginTop: '8px' }}
        >
          + Add Step
        </button>
      </div>

      <div className="form-group">
        <label>Photo</label>
        {existingPhoto && !removePhoto && (
          <div style={{ marginBottom: '8px' }}>
            <img src={existingPhoto.path} alt={existingPhoto.title} style={{ maxWidth: '200px', display: 'block', marginBottom: '4px' }} />
            <label style={{ fontWeight: 'normal', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="checkbox"
                checked={removePhoto}
                onChange={(e) => onRemovePhotoChange(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Remove photo
            </label>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => onPhotoFileChange(e.target.files[0] || null)}
        />
      </div>

      <div className="form-group">
        <label>Photo Credit</label>
        <input
          type="text"
          name="image_credit"
          value={formData.image_credit}
          onChange={onFieldChange}
          placeholder="Photo credit"
        />
      </div>

      <div className="form-group">
        <label>Rating</label>
        <StarRating rating={formData.rating} onChange={onRatingChange} />
      </div>

      <div className="form-group">
        <label>Nutrition (optional)</label>
        {NUTRITION_FIELDS.reduce((rows, field, i) => {
          if (i % 2 === 0) rows.push([field]);
          else rows[rows.length - 1].push(field);
          return rows;
        }, []).map((pair, i) => (
          <div className="form-row" key={i}>
            {pair.map(([key, label]) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <input type="text" name={key} value={formData[key]} onChange={onFieldChange} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={onFieldChange}
          placeholder="Tips, variations, or notes"
        />
      </div>

      <div className="form-group">
        <label>URL</label>
        <input
          type="url"
          name="url"
          value={formData.url}
          onChange={onFieldChange}
          placeholder="https://example.com/recipe"
        />
      </div>
    </>
  );
}

export default RecipeFormFields;
