import { parseIngredients, parseInstructions } from './parseList';

const item = (text, section = null) => ({ text, section });

describe('parseIngredients', () => {
  test('splits on line breaks', () => {
    expect(parseIngredients('2 cups all-purpose flour\n1 tsp kosher salt\n1/2 cup sugar'))
      .toEqual([item('2 cups all-purpose flour'), item('1 tsp kosher salt'), item('1/2 cup sugar')]);
  });

  test('handles carriage returns and strips bullet glyphs', () => {
    expect(parseIngredients('• 2 cups flour\r\n▢ 1 tsp salt\r- 3 tbsp butter'))
      .toEqual([item('2 cups flour'), item('1 tsp salt'), item('3 tbsp butter')]);
  });

  test('falls back to measures when it is all one line', () => {
    expect(parseIngredients('2 cups all-purpose flour 1 tsp kosher salt 1/2 cup sugar 2 eggs'))
      .toEqual([item('2 cups all-purpose flour'), item('1 tsp kosher salt'), item('1/2 cup sugar'), item('2 eggs')]);
  });

  test('does not split inside parentheses or after a connector word', () => {
    expect(parseIngredients('1 (14-ounce) can diced tomatoes 2 cups flour, plus 2 tablespoons for dusting 1 1/2 teaspoons salt'))
      .toEqual([
        item('1 (14-ounce) can diced tomatoes'),
        item('2 cups flour, plus 2 tablespoons for dusting'),
        item('1 1/2 teaspoons salt'),
      ]);
  });

  test('does not split a quantity that follows another quantity', () => {
    expect(parseIngredients('1 9x13 pan of lasagna 2 cups cheese'))
      .toEqual([item('1 9x13 pan of lasagna'), item('2 cups cheese')]);
  });

  test('uses commas only when there are no quantities at all', () => {
    expect(parseIngredients('salt, pepper, olive oil, fresh basil'))
      .toEqual([item('salt'), item('pepper'), item('olive oil'), item('fresh basil')]);
    expect(parseIngredients('3 tablespoons butter, melted'))
      .toEqual([item('3 tablespoons butter, melted')]);
  });

  test('returns a single item unchanged, and nothing for blank input', () => {
    expect(parseIngredients('2 cups flour')).toEqual([item('2 cups flour')]);
    expect(parseIngredients('   ')).toEqual([]);
    expect(parseIngredients('')).toEqual([]);
  });

  test('splits into sections on "For the X" and "X:" header lines', () => {
    expect(parseIngredients('For the Cake\n2 cups flour\n1 cup sugar\nFor the Icing\n1 cup powdered sugar\n2 tbsp milk'))
      .toEqual([
        item('2 cups flour', 'Cake'),
        item('1 cup sugar', 'Cake'),
        item('1 cup powdered sugar', 'Icing'),
        item('2 tbsp milk', 'Icing'),
      ]);

    expect(parseIngredients('Cake:\n2 cups flour\nIcing:\n1 cup powdered sugar'))
      .toEqual([item('2 cups flour', 'Cake'), item('1 cup powdered sugar', 'Icing')]);
  });

  test('items before the first header stay ungrouped', () => {
    expect(parseIngredients('1 tsp vanilla\nFor the Icing\n1 cup powdered sugar'))
      .toEqual([item('1 tsp vanilla', null), item('1 cup powdered sugar', 'Icing')]);
  });

  test('a single run-together line never produces a section, even with colon-like text', () => {
    expect(parseIngredients('Icing: 1 cup powdered sugar 2 tbsp milk'))
      .toEqual([item('Icing:'), item('1 cup powdered sugar'), item('2 tbsp milk')]);
  });
});

describe('parseInstructions', () => {
  test('splits on line breaks', () => {
    expect(parseInstructions('Preheat the oven to 400 degrees.\nMix the dry ingredients.\nBake 25 minutes.'))
      .toEqual([item('Preheat the oven to 400 degrees.'), item('Mix the dry ingredients.'), item('Bake 25 minutes.')]);
  });

  test('strips numbered and "Step N" prefixes from lines', () => {
    expect(parseInstructions('1. Preheat the oven.\n2) Mix the batter.\nStep 3: Bake.'))
      .toEqual([item('Preheat the oven.'), item('Mix the batter.'), item('Bake.')]);
  });

  test('splits a single-line blob on numbered markers', () => {
    expect(parseInstructions('1. Preheat the oven to 400 degrees. 2. Mix the dry ingredients. 3. Bake for 25 minutes.'))
      .toEqual([item('Preheat the oven to 400 degrees.'), item('Mix the dry ingredients.'), item('Bake for 25 minutes.')]);
  });

  test('splits a single-line blob on unpunctuated "Step N" markers', () => {
    expect(parseInstructions('Step 1 Preheat the oven. Step 2 Mix the batter. Step 3 Bake until golden.'))
      .toEqual([item('Preheat the oven.'), item('Mix the batter.'), item('Bake until golden.')]);
  });

  test('splits a single-line blob on bullet glyphs', () => {
    expect(parseInstructions('• Preheat the oven • Mix the batter • Bake 25 minutes'))
      .toEqual([item('Preheat the oven'), item('Mix the batter'), item('Bake 25 minutes')]);
  });

  test('leaves prose with an embedded temperature as one step', () => {
    expect(parseInstructions('Preheat the oven to 350. Then bake the cake.'))
      .toEqual([item('Preheat the oven to 350. Then bake the cake.')]);
  });

  test('returns a single step unchanged, and nothing for blank input', () => {
    expect(parseInstructions('Just mix everything and bake.')).toEqual([item('Just mix everything and bake.')]);
    expect(parseInstructions('  \n ')).toEqual([]);
  });

  test('splits into sections on "For the X" and "X:" header lines', () => {
    expect(parseInstructions('For the Cake\nMix the batter.\nBake 25 minutes.\nFor the Icing\nBeat the butter.\nSpread on cake.'))
      .toEqual([
        item('Mix the batter.', 'Cake'),
        item('Bake 25 minutes.', 'Cake'),
        item('Beat the butter.', 'Icing'),
        item('Spread on cake.', 'Icing'),
      ]);
  });

  test('does not mistake a "Step N:" line for a section header', () => {
    expect(parseInstructions('Step 1: Preheat the oven.\nStep 2: Mix the batter.'))
      .toEqual([item('Preheat the oven.'), item('Mix the batter.')]);
  });
});
