import React, { useState } from 'react';
import RecipeFormFields from './RecipeFormFields';

function RecipeForm({ categories, onSubmit, onCancel }) {
  const [photoFile, setPhotoFile] = useState(null);
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
    onSubmit(cleanData, photoFile);
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
        onRatingChange={(n) => setFormData(prev => ({ ...prev, rating: n }))}
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
