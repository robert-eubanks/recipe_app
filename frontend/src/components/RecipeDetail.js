import React, { useState } from 'react';
import RecipeFormFields from './RecipeFormFields';
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

        <RecipeFormFields
          formData={formData}
          categories={categories}
          onFieldChange={handleInputChange}
          onArrayChange={handleArrayChange}
          onAddArrayItem={handleAddArrayItem}
          onRemoveArrayItem={handleRemoveArrayItem}
          onRatingChange={(n) => setFormData(prev => ({ ...prev, rating: n }))}
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
