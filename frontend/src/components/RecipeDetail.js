import React, { useState } from 'react';
import RecipeFormFields from './RecipeFormFields';
import { getLayoutComponent } from '../layouts';
import { useRecipeFormState } from '../hooks/useRecipeFormState';

function RecipeDetail({ recipe, categories, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const {
    formData,
    handleInputChange,
    handleArrayChange,
    handleAddArrayItem,
    handleRemoveArrayItem,
    handleRatingChange,
    cleanFormData,
  } = useRecipeFormState({
    ...recipe,
    ingredients: recipe.ingredients.map(i => i.text),
    instructions: recipe.instructions.map(i => i.text),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanData = cleanFormData();
    const submitData = removePhoto ? { ...cleanData, remove_photo: true } : cleanData;
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

        <RecipeFormFields
          formData={formData}
          categories={categories}
          onFieldChange={handleInputChange}
          onArrayChange={handleArrayChange}
          onAddArrayItem={handleAddArrayItem}
          onRemoveArrayItem={handleRemoveArrayItem}
          onRatingChange={handleRatingChange}
          onPhotoFileChange={setPhotoFile}
          existingPhoto={recipe.image_path ? { path: recipe.image_path, title: recipe.title } : null}
          removePhoto={removePhoto}
          onRemovePhotoChange={setRemovePhoto}
        />

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
