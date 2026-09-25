import { useState } from 'react';

export const EMPTY_RECIPE_FORM_DATA = {
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
};

// Merges `recipe` over the empty defaults, treating null/undefined fields as
// missing. `recipe.ingredients`/`instructions`, if present, must already be
// plain string arrays (map {id, text} objects to .text before calling).
export function buildRecipeFormData(recipe = {}) {
  const merged = {};
  for (const key of Object.keys(EMPTY_RECIPE_FORM_DATA)) {
    if (key === 'ingredients' || key === 'instructions') continue;
    const value = recipe[key];
    merged[key] = value === undefined || value === null ? EMPTY_RECIPE_FORM_DATA[key] : value;
  }
  merged.ingredients = recipe.ingredients && recipe.ingredients.length ? recipe.ingredients : [''];
  merged.instructions = recipe.instructions && recipe.instructions.length ? recipe.instructions : [''];
  return merged;
}

// Shared form state + handlers for the add/edit/import-review recipe forms,
// all of which render the same RecipeFormFields component.
export function useRecipeFormState(initialRecipe) {
  const [formData, setFormData] = useState(() => buildRecipeFormData(initialRecipe));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (index, arrayName, value) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => (i === index ? value : item)),
    }));
  };

  const handleAddArrayItem = (arrayName) => {
    setFormData((prev) => ({ ...prev, [arrayName]: [...prev[arrayName], ''] }));
  };

  const handleRemoveArrayItem = (index, arrayName) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index),
    }));
  };

  const handleRatingChange = (n) => {
    setFormData((prev) => ({ ...prev, rating: n }));
  };

  const cleanFormData = () => ({
    ...formData,
    ingredients: formData.ingredients.filter((i) => i.trim()),
    instructions: formData.instructions.filter((i) => i.trim()),
  });

  return {
    formData,
    setFormData,
    handleInputChange,
    handleArrayChange,
    handleAddArrayItem,
    handleRemoveArrayItem,
    handleRatingChange,
    cleanFormData,
  };
}
