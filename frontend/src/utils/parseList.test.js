import { parseIngredients, parseInstructions } from './parseList';

describe('parseIngredients', () => {
  test('splits on line breaks', () => {
    expect(parseIngredients('2 cups all-purpose flour\n1 tsp kosher salt\n1/2 cup sugar'))
      .toEqual(['2 cups all-purpose flour', '1 tsp kosher salt', '1/2 cup sugar']);
  });

  test('handles carriage returns and strips bullet glyphs', () => {
    expect(parseIngredients('• 2 cups flour\r\n▢ 1 tsp salt\r- 3 tbsp butter'))
      .toEqual(['2 cups flour', '1 tsp salt', '3 tbsp butter']);
  });

  test('falls back to measures when it is all one line', () => {
    expect(parseIngredients('2 cups all-purpose flour 1 tsp kosher salt 1/2 cup sugar 2 eggs'))
      .toEqual(['2 cups all-purpose flour', '1 tsp kosher salt', '1/2 cup sugar', '2 eggs']);
  });

  test('does not split inside parentheses or after a connector word', () => {
    expect(parseIngredients('1 (14-ounce) can diced tomatoes 2 cups flour, plus 2 tablespoons for dusting 1 1/2 teaspoons salt'))
      .toEqual(['1 (14-ounce) can diced tomatoes', '2 cups flour, plus 2 tablespoons for dusting', '1 1/2 teaspoons salt']);
  });

  test('does not split a quantity that follows another quantity', () => {
    expect(parseIngredients('1 9x13 pan of lasagna 2 cups cheese'))
      .toEqual(['1 9x13 pan of lasagna', '2 cups cheese']);
  });

  test('uses commas only when there are no quantities at all', () => {
    expect(parseIngredients('salt, pepper, olive oil, fresh basil'))
      .toEqual(['salt', 'pepper', 'olive oil', 'fresh basil']);
    expect(parseIngredients('3 tablespoons butter, melted'))
      .toEqual(['3 tablespoons butter, melted']);
  });

  test('returns a single item unchanged, and nothing for blank input', () => {
    expect(parseIngredients('2 cups flour')).toEqual(['2 cups flour']);
    expect(parseIngredients('   ')).toEqual([]);
    expect(parseIngredients('')).toEqual([]);
  });
});

describe('parseInstructions', () => {
  test('splits on line breaks', () => {
    expect(parseInstructions('Preheat the oven to 400 degrees.\nMix the dry ingredients.\nBake 25 minutes.'))
      .toEqual(['Preheat the oven to 400 degrees.', 'Mix the dry ingredients.', 'Bake 25 minutes.']);
  });

  test('strips numbered and "Step N" prefixes from lines', () => {
    expect(parseInstructions('1. Preheat the oven.\n2) Mix the batter.\nStep 3: Bake.'))
      .toEqual(['Preheat the oven.', 'Mix the batter.', 'Bake.']);
  });

  test('splits a single-line blob on numbered markers', () => {
    expect(parseInstructions('1. Preheat the oven to 400 degrees. 2. Mix the dry ingredients. 3. Bake for 25 minutes.'))
      .toEqual(['Preheat the oven to 400 degrees.', 'Mix the dry ingredients.', 'Bake for 25 minutes.']);
  });

  test('splits a single-line blob on unpunctuated "Step N" markers', () => {
    expect(parseInstructions('Step 1 Preheat the oven. Step 2 Mix the batter. Step 3 Bake until golden.'))
      .toEqual(['Preheat the oven.', 'Mix the batter.', 'Bake until golden.']);
  });

  test('splits a single-line blob on bullet glyphs', () => {
    expect(parseInstructions('• Preheat the oven • Mix the batter • Bake 25 minutes'))
      .toEqual(['Preheat the oven', 'Mix the batter', 'Bake 25 minutes']);
  });

  test('leaves prose with an embedded temperature as one step', () => {
    expect(parseInstructions('Preheat the oven to 350. Then bake the cake.'))
      .toEqual(['Preheat the oven to 350. Then bake the cake.']);
  });

  test('returns a single step unchanged, and nothing for blank input', () => {
    expect(parseInstructions('Just mix everything and bake.')).toEqual(['Just mix everything and bake.']);
    expect(parseInstructions('  \n ')).toEqual([]);
  });
});
