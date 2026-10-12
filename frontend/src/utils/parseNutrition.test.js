import { parseNutrition } from './parseNutrition';

test('parses one labeled nutrient per line', () => {
  expect(parseNutrition(`Calories: 320
Protein: 12g
Fat: 8g
Carbohydrates: 45g
Fiber: 3g
Sugar: 10g
Sodium: 400mg
Cholesterol: 20mg`)).toEqual({
    calories: '320',
    protein: '12g',
    fat: '8g',
    carbs: '45g',
    fiber: '3g',
    sugar: '10g',
    sodium: '400mg',
    cholesterol: '20mg',
  });
});

test('parses a single run-together line without commas or colons', () => {
  expect(parseNutrition('Calories 320 Protein 12g Fat 8g Carbohydrates 45g'))
    .toEqual({ calories: '320', protein: '12g', fat: '8g', carbs: '45g' });
});

test('parses a comma-separated single line', () => {
  expect(parseNutrition('Calories: 320, Protein: 12g, Fat: 8g, Sodium: 400mg'))
    .toEqual({ calories: '320', protein: '12g', fat: '8g', sodium: '400mg' });
});

test('ignores saturated/trans fat and added sugars, keeping the general values', () => {
  expect(parseNutrition(`Calories: 320
Total Fat: 8g
Saturated Fat: 3g
Trans Fat: 0g
Total Carbohydrate: 45g
Sugars: 10g
Added Sugars: 4g`)).toEqual({
    calories: '320',
    fat: '8g',
    carbs: '45g',
    sugar: '10g',
  });
});

test('singular "Total Carbohydrate" and "Dietary Fiber" labels are recognized', () => {
  expect(parseNutrition('Total Carbohydrate 45g\nDietary Fiber 3g'))
    .toEqual({ carbs: '45g', fiber: '3g' });
});

test('keeps only the first value when a nutrient is mentioned twice', () => {
  expect(parseNutrition('Calories: 320\nCalories: 999')).toEqual({ calories: '320' });
});

test('returns an empty object for blank input or text with no recognizable nutrients', () => {
  expect(parseNutrition('')).toEqual({});
  expect(parseNutrition('   \n  ')).toEqual({});
  expect(parseNutrition('A delicious weeknight dinner.')).toEqual({});
});
