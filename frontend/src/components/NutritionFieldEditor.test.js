import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import NutritionFieldEditor from './NutritionFieldEditor';
import { useRecipeFormState } from '../hooks/useRecipeFormState';

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let latestFormData;

function Harness() {
  const { formData, handleInputChange, handleApplyNutrition } = useRecipeFormState();
  latestFormData = formData;
  return (
    <NutritionFieldEditor
      formData={formData}
      onFieldChange={handleInputChange}
      onApplyNutrition={handleApplyNutrition}
    />
  );
}

const byText = (text) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent.trim() === text);

const click = (el) => act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });

const typeInto = (el, value) => act(() => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => { root = createRoot(container); root.render(<Harness />); });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test('starts on the individual tab with all 8 nutrition inputs', () => {
  expect(container.querySelector('.list-tab.active').textContent).toBe('Add individually');
  expect(container.querySelectorAll('input[type="text"]').length).toBe(8);
});

test('paste tab previews parsed nutrients and applies only the matched fields', () => {
  click(container.querySelectorAll('.list-tab')[1]);
  typeInto(container.querySelector('textarea'), 'Calories: 320\nProtein: 12g\nFat: 8g');

  expect(container.querySelector('.paste-preview-count').textContent).toBe('Found 3 of 8 values:');
  expect(Array.from(container.querySelectorAll('.paste-preview-wrapper li')).map((li) => li.textContent))
    .toEqual(['Calories: 320', 'Protein: 12g', 'Fat: 8g']);

  click(byText('Apply 3 values'));

  expect(latestFormData.nutrition_calories).toBe('320');
  expect(latestFormData.nutrition_protein).toBe('12g');
  expect(latestFormData.nutrition_fat).toBe('8g');
  expect(latestFormData.nutrition_carbs).toBe('');

  // Returns to the individual tab with the applied values visible.
  expect(container.querySelector('.list-tab.active').textContent).toBe('Add individually');
  expect(container.querySelector('input[name="nutrition_calories"]').value).toBe('320');
});

test('apply button is disabled and singular-count label used when nothing parses', () => {
  click(container.querySelectorAll('.list-tab')[1]);
  expect(byText('Apply')).toBeTruthy();
  expect(byText('Apply').disabled).toBe(true);

  typeInto(container.querySelector('textarea'), 'Sodium: 400mg');
  expect(byText('Apply 1 value')).toBeTruthy();
});

test('applying does not clobber fields already set manually', () => {
  click(container.querySelectorAll('.list-tab')[0]);
  act(() => {
    const input = container.querySelector('input[name="nutrition_sodium"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '999mg');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(latestFormData.nutrition_sodium).toBe('999mg');

  click(container.querySelectorAll('.list-tab')[1]);
  typeInto(container.querySelector('textarea'), 'Calories: 320');
  click(byText('Apply 1 value'));

  expect(latestFormData.nutrition_calories).toBe('320');
  expect(latestFormData.nutrition_sodium).toBe('999mg');
});
