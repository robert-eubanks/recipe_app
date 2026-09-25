import React from 'react';
import StarRating from '../components/StarRating';
import './DefaultRecipeLayout.css';

const NUTRITION_FIELDS = [
  { key: 'nutrition_calories', label: 'Calories' },
  { key: 'nutrition_protein', label: 'Protein' },
  { key: 'nutrition_fat', label: 'Fat' },
  { key: 'nutrition_carbs', label: 'Carbohydrates' },
  { key: 'nutrition_fiber', label: 'Fiber' },
  { key: 'nutrition_sugar', label: 'Sugar' },
  { key: 'nutrition_sodium', label: 'Sodium' },
  { key: 'nutrition_cholesterol', label: 'Cholesterol' },
];

function DefaultRecipeLayout({ recipe }) {
  const hasNutrition = NUTRITION_FIELDS.some(({ key }) => recipe[key]);

  return (
    <div className="recipe-display">
      <div className="recipe-display-header">
        <div className="recipe-display-header-text">
          <h1 className="recipe-display-title">{recipe.title}</h1>
          {recipe.subtitle && <p className="recipe-display-subtitle">{recipe.subtitle}</p>}
          {recipe.author && <p className="recipe-display-byline">By {recipe.author}</p>}
          {recipe.updated_at && (
            <p className="recipe-display-updated">
              Updated {new Date(recipe.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
        {recipe.image_path && (
          <figure className="recipe-display-photo">
            <img src={recipe.image_path} alt={recipe.title} />
            {recipe.image_credit && <figcaption>{recipe.image_credit}</figcaption>}
          </figure>
        )}
      </div>

      <div className="recipe-display-divider" />

      <div className="recipe-display-meta">
        {recipe.total_time && (
          <div className="recipe-display-meta-row">
            <span className="recipe-display-meta-label">Ready In</span>
            <span className="recipe-display-meta-value">{recipe.total_time}</span>
          </div>
        )}
        {recipe.prep_time && (
          <div className="recipe-display-meta-row">
            <span className="recipe-display-meta-label">Prep Time</span>
            <span className="recipe-display-meta-value">{recipe.prep_time}</span>
          </div>
        )}
        {recipe.cook_time && (
          <div className="recipe-display-meta-row">
            <span className="recipe-display-meta-label">Cook Time</span>
            <span className="recipe-display-meta-value">{recipe.cook_time}</span>
          </div>
        )}
        {recipe.rating && (
          <div className="recipe-display-meta-row">
            <span className="recipe-display-meta-label">Rating</span>
            <StarRating rating={recipe.rating} readOnly />
          </div>
        )}
      </div>

      {recipe.description && <p className="recipe-display-description">{recipe.description}</p>}

      <div className="recipe-display-rule recipe-display-rule-thick" />

      <div className="recipe-display-columns">
        <div className="recipe-display-column">
          <h2 className="recipe-display-section-header">Ingredients</h2>
          {recipe.servings && <p className="recipe-display-yield">Yield: {recipe.servings}</p>}
          {recipe.ingredients.length > 0 && (
            <ul className="recipe-display-ingredients">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id}>{ingredient.text}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="recipe-display-column">
          <h2 className="recipe-display-section-header">Preparation</h2>
          {recipe.instructions.map((instruction, index) => (
            <div key={instruction.id} className="recipe-display-step">
              <p className="recipe-display-step-label">Step {index + 1}</p>
              <p className="recipe-display-step-text">{instruction.text}</p>
            </div>
          ))}
        </div>
      </div>

      {hasNutrition && (
        <section className="recipe-display-nutrition">
          <h2 className="recipe-display-section-header">Nutrition</h2>
          <div className="recipe-display-nutrition-grid">
            {NUTRITION_FIELDS.map(({ key, label }) => (
              recipe[key] && (
                <div key={key} className="recipe-display-nutrition-item">
                  <span className="recipe-display-meta-label">{label}</span>
                  <span className="recipe-display-meta-value">{recipe[key]}</span>
                </div>
              )
            ))}
          </div>
        </section>
      )}

      {recipe.notes && (
        <div className="recipe-display-extra">
          <h2 className="recipe-display-section-header">Notes</h2>
          <p className="recipe-display-description">{recipe.notes}</p>
        </div>
      )}

      {recipe.url && (
        <div className="recipe-display-extra">
          <h2 className="recipe-display-section-header">Source</h2>
          <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="recipe-display-link">
            {recipe.url}
          </a>
        </div>
      )}

      <div className="recipe-display-rule recipe-display-rule-thick" />
    </div>
  );
}

export default DefaultRecipeLayout;
