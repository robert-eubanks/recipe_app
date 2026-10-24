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
  ingredients: [{ text: '', section: null }],
  instructions: [{ text: '', section: null }],
};

// Normalizes one ingredient/instruction item to {text, section}. Accepts a
// plain string (from an import draft, which never knows about sections) or
// an {id, text, section} row from the API.
function normalizeItem(item) {
  if (typeof item === 'string') return { text: item, section: null };
  return { text: item.text, section: item.section ?? null };
}

// Merges `recipe` over the empty defaults, treating null/undefined fields as
// missing.
export function buildRecipeFormData(recipe = {}) {
  const merged = {};
  for (const key of Object.keys(EMPTY_RECIPE_FORM_DATA)) {
    if (key === 'ingredients' || key === 'instructions') continue;
    const value = recipe[key];
    merged[key] = value === undefined || value === null ? EMPTY_RECIPE_FORM_DATA[key] : value;
  }
  merged.ingredients = recipe.ingredients && recipe.ingredients.length
    ? recipe.ingredients.map(normalizeItem)
    : [{ text: '', section: null }];
  merged.instructions = recipe.instructions && recipe.instructions.length
    ? recipe.instructions.map(normalizeItem)
    : [{ text: '', section: null }];
  return merged;
}

function hasAnySection(items) {
  return items.some((item) => item.section);
}

// Once sections are active, every item must belong to a named section — the
// section-picker UI only shows named sections, so a leftover null-section
// item would become permanently invisible (though still submitted). Any item
// without a section is folded into a default bucket instead of being lost.
function fillNullSections(items, fallback = 'Section 1') {
  return items.map((item) => (item.section ? item : { ...item, section: fallback }));
}

// Shared form state + handlers for the add/edit/import-review recipe forms,
// all of which render the same RecipeFormFields component.
export function useRecipeFormState(initialRecipe) {
  const [formData, setFormData] = useState(() => buildRecipeFormData(initialRecipe));

  // One shared toggle for the whole recipe (not per-list): a cake+icing split
  // affects ingredients and instructions together. Initialized from whether
  // the recipe already has any grouped items, then controlled independently.
  const [hasSections, setHasSections] = useState(() =>
    hasAnySection(formData.ingredients) || hasAnySection(formData.instructions)
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleArrayChange = (index, arrayName, value) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, i) => (i === index ? { ...item, text: value } : item)),
    }));
  };

  // A section-scoped add inserts right after that section's last item (so the
  // section's items stay one contiguous run) instead of always appending to
  // the very end of the array, which would split the section in two once a
  // later section already exists.
  const handleAddArrayItem = (arrayName, section = null) => {
    setFormData((prev) => {
      const arr = prev[arrayName];
      if (section === null) return { ...prev, [arrayName]: [...arr, { text: '', section: null }] };
      let insertAt = arr.length;
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i].section === section) {
          insertAt = i + 1;
          break;
        }
      }
      return {
        ...prev,
        [arrayName]: [...arr.slice(0, insertAt), { text: '', section }, ...arr.slice(insertAt)],
      };
    });
  };

  const SIBLING_ARRAY = { ingredients: 'instructions', instructions: 'ingredients' };

  // Keeps one blank entry so the individual-entry tab is never empty. A
  // pasted block only ever supplies one list at a time, so any section label
  // it introduces that the sibling list doesn't know about yet gets a blank
  // placeholder pushed there too — otherwise a paste-detected "Icing" would
  // show up in Ingredients but never appear in Instructions.
  const handleSetArray = (arrayName, items) => {
    const nextItems = items.length ? items : [{ text: '', section: null }];
    const siblingName = SIBLING_ARRAY[arrayName];
    const willHaveSections = hasAnySection(nextItems) || hasAnySection(formData[siblingName]);
    setFormData((prev) => {
      const existingLabels = new Set(prev[siblingName].map((item) => item.section).filter(Boolean));
      const newLabels = [...new Set(nextItems.map((item) => item.section).filter(Boolean))]
        .filter((label) => !existingLabels.has(label));
      const updated = {
        ...prev,
        [arrayName]: nextItems,
        [siblingName]: newLabels.length
          ? [...prev[siblingName], ...newLabels.map((label) => ({ text: '', section: label }))]
          : prev[siblingName],
      };
      if (!willHaveSections) return updated;
      return {
        ...updated,
        ingredients: fillNullSections(updated.ingredients),
        instructions: fillNullSections(updated.instructions),
      };
    });
    if (hasAnySection(nextItems)) setHasSections(true);
  };

  const handleRemoveArrayItem = (index, arrayName) => {
    setFormData((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, i) => i !== index),
    }));
  };

  // A section is one shared name spanning both lists, not two independently
  // tracked labels — add/rename/remove always touch ingredients AND
  // instructions together so the two can never drift apart under the same
  // intended section. Adding one pushes a blank item into both lists (with a
  // uniquely-deduped label) so the new section appears in both immediately.
  // Returns the generated label so the caller can select it right away.
  const handleAddSection = () => {
    const existingLabels = new Set(
      [...formData.ingredients, ...formData.instructions].map((item) => item.section).filter(Boolean)
    );
    let n = 1;
    let label = `Section ${n}`;
    while (existingLabels.has(label)) label = `Section ${++n}`;
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { text: '', section: label }],
      instructions: [...prev.instructions, { text: '', section: label }],
    }));
    return label;
  };

  // Sections require a non-empty name, so an attempt to rename to blank is a no-op.
  const handleRenameSection = (oldLabel, newLabel) => {
    if (!newLabel.trim()) return;
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((item) => (item.section === oldLabel ? { ...item, section: newLabel } : item)),
      instructions: prev.instructions.map((item) => (item.section === oldLabel ? { ...item, section: newLabel } : item)),
    }));
  };

  // Removes the section (its header and all of its items) from both lists.
  const handleRemoveSection = (label) => {
    setFormData((prev) => {
      const ingredients = prev.ingredients.filter((item) => item.section !== label);
      const instructions = prev.instructions.filter((item) => item.section !== label);
      return {
        ...prev,
        ingredients: ingredients.length ? ingredients : [{ text: '', section: null }],
        instructions: instructions.length ? instructions : [{ text: '', section: null }],
      };
    });
  };

  // Turning sections on must not strand any item without a section (see
  // fillNullSections) — otherwise it would disappear from the section-picker
  // UI with no way to reach it again.
  const handleToggleSections = (enabled) => {
    setHasSections(enabled);
    if (enabled) {
      setFormData((prev) => ({
        ...prev,
        ingredients: fillNullSections(prev.ingredients),
        instructions: fillNullSections(prev.instructions),
      }));
    }
  };

  // Merges parsed nutrition values (keyed by short name, e.g. "calories")
  // into the matching nutrition_* fields, leaving unmatched fields untouched.
  const handleApplyNutrition = (parsed) => {
    setFormData((prev) => {
      const next = { ...prev };
      for (const [shortKey, value] of Object.entries(parsed)) {
        next[`nutrition_${shortKey}`] = value;
      }
      return next;
    });
  };

  const handleRatingChange = (n) => {
    setFormData((prev) => ({ ...prev, rating: n }));
  };

  const cleanFormData = () => ({
    ...formData,
    ingredients: formData.ingredients.filter((i) => i.text.trim()),
    instructions: formData.instructions.filter((i) => i.text.trim()),
  });

  return {
    formData,
    setFormData,
    hasSections,
    handleInputChange,
    handleArrayChange,
    handleAddArrayItem,
    handleRemoveArrayItem,
    handleSetArray,
    handleAddSection,
    handleRenameSection,
    handleRemoveSection,
    handleToggleSections,
    handleApplyNutrition,
    handleRatingChange,
    cleanFormData,
  };
}
