import DefaultRecipeLayout from './DefaultRecipeLayout';

export const LAYOUTS = {
  default: DefaultRecipeLayout,
};

export function getLayoutComponent(recipe) {
  return LAYOUTS[recipe.layout] || DefaultRecipeLayout;
}
