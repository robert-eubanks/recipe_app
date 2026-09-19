import React from 'react';

function RecipeList({ recipes, selectedRecipeId, onSelectRecipe }) {
  if (recipes.length === 0) {
    return <div style={{ padding: '16px', color: '#999', fontSize: '14px' }}>No recipes found</div>;
  }

  return (
    <ul className="recipe-list">
      {recipes.map((recipe) => (
        <li
          key={recipe.id}
          className={`recipe-item ${selectedRecipeId === recipe.id ? 'active' : ''}`}
          onClick={() => onSelectRecipe(recipe)}
        >
          <div className="recipe-item-title">{recipe.title}</div>
          <div className="recipe-item-category">{recipe.category_name || 'Uncategorized'}</div>
        </li>
      ))}
    </ul>
  );
}

export default RecipeList;
