import React from 'react';
import StarRating from './StarRating';
import ListFieldEditor from './ListFieldEditor';
import NutritionFieldEditor from './NutritionFieldEditor';
import { parseIngredients, parseInstructions } from '../utils/parseList';

function RecipeFormFields({
  formData,
  categories,
  onFieldChange,
  onArrayChange,
  onAddArrayItem,
  onRemoveArrayItem,
  onSetArray,
  onApplyNutrition,
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

      <ListFieldEditor
        label="Ingredients"
        name="ingredients"
        items={formData.ingredients}
        parse={parseIngredients}
        placeholder="e.g., 2 cups flour"
        pastePlaceholder={'2 cups all-purpose flour\n1 tsp kosher salt\n3 tablespoons butter, melted'}
        pasteHint="One ingredient per line. If it all arrives on one line, quantities and measures are used to split it."
        addLabel="+ Add Ingredient"
        onArrayChange={onArrayChange}
        onAddArrayItem={onAddArrayItem}
        onRemoveArrayItem={onRemoveArrayItem}
        onSetArray={onSetArray}
      />

      <ListFieldEditor
        label="Instructions"
        name="instructions"
        items={formData.instructions}
        parse={parseInstructions}
        placeholder="Step by step instructions"
        pastePlaceholder={'1. Preheat the oven to 400 degrees.\n2. Mix the dry ingredients.\n3. Bake for 25 minutes.'}
        pasteHint="One step per line. A single run-together block is split on numbered or bulleted list markers."
        addLabel="+ Add Step"
        multiline
        onArrayChange={onArrayChange}
        onAddArrayItem={onAddArrayItem}
        onRemoveArrayItem={onRemoveArrayItem}
        onSetArray={onSetArray}
      />

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

      <NutritionFieldEditor
        formData={formData}
        onFieldChange={onFieldChange}
        onApplyNutrition={onApplyNutrition}
      />

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
