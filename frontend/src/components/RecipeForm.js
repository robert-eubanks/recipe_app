import React, { useState } from 'react';
import RecipeFormFields from './RecipeFormFields';
import { useRecipeFormState } from '../hooks/useRecipeFormState';

function RecipeForm({ categories, onSubmit, onCancel }) {
  const [photoFile, setPhotoFile] = useState(null);
  const {
    formData,
    handleInputChange,
    handleArrayChange,
    handleAddArrayItem,
    handleRemoveArrayItem,
    handleRatingChange,
    cleanFormData,
  } = useRecipeFormState();

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(cleanFormData(), photoFile);
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
      />

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">Add Recipe</button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default RecipeForm;
