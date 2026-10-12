import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import ListFieldEditor from './ListFieldEditor';
import { parseIngredients } from '../utils/parseList';
import { useRecipeFormState } from '../hooks/useRecipeFormState';

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let latestItems;

function Harness() {
  const {
    formData,
    handleArrayChange,
    handleAddArrayItem,
    handleRemoveArrayItem,
    handleSetArray,
  } = useRecipeFormState();
  latestItems = formData.ingredients;
  return (
    <ListFieldEditor
      label="Ingredients"
      name="ingredients"
      items={formData.ingredients}
      parse={parseIngredients}
      placeholder="e.g., 2 cups flour"
      pastePlaceholder="paste here"
      pasteHint="hint"
      addLabel="+ Add Ingredient"
      onArrayChange={handleArrayChange}
      onAddArrayItem={handleAddArrayItem}
      onRemoveArrayItem={handleRemoveArrayItem}
      onSetArray={handleSetArray}
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

test('starts on the individual tab with one empty input', () => {
  expect(container.querySelectorAll('.list-tab').length).toBe(2);
  expect(container.querySelector('.list-tab.active').textContent).toBe('Add individually');
  expect(container.querySelectorAll('input[type="text"]').length).toBe(1);
  expect(container.querySelector('textarea')).toBeNull();
});

test('paste tab previews parsed items and adds them to an empty list', () => {
  click(container.querySelectorAll('.list-tab')[1]);
  expect(container.querySelector('.list-tab.active').textContent).toBe('Paste & parse');

  typeInto(container.querySelector('textarea'), '2 cups flour\n1 tsp salt\n3 tbsp butter');

  expect(container.querySelector('.paste-preview-count').textContent).toBe('Found 3 items:');
  expect(Array.from(container.querySelectorAll('.paste-preview li')).map((li) => li.textContent))
    .toEqual(['2 cups flour', '1 tsp salt', '3 tbsp butter']);

  // Empty list offers a single "Add" action, no destructive replace.
  expect(byText('Add 3')).toBeTruthy();
  expect(byText('Replace list')).toBeFalsy();

  click(byText('Add 3'));

  expect(latestItems).toEqual(['2 cups flour', '1 tsp salt', '3 tbsp butter']);
  // Returns to the individual tab so the result is visible and editable.
  expect(container.querySelector('.list-tab.active').textContent).toBe('Add individually');
  expect(Array.from(container.querySelectorAll('input[type="text"]')).map((i) => i.value))
    .toEqual(['2 cups flour', '1 tsp salt', '3 tbsp butter']);
});

test('append keeps existing items, replace discards them', () => {
  click(container.querySelectorAll('.list-tab')[1]);
  typeInto(container.querySelector('textarea'), '1 cup sugar');
  click(byText('Add 1'));
  expect(latestItems).toEqual(['1 cup sugar']);

  click(container.querySelectorAll('.list-tab')[1]);
  typeInto(container.querySelector('textarea'), '2 eggs\n1 tsp vanilla');
  expect(byText('Append 2')).toBeTruthy();
  click(byText('Append 2'));
  expect(latestItems).toEqual(['1 cup sugar', '2 eggs', '1 tsp vanilla']);

  click(container.querySelectorAll('.list-tab')[1]);
  typeInto(container.querySelector('textarea'), '3 cups milk\n1 pinch salt');
  click(byText('Replace list'));
  expect(latestItems).toEqual(['3 cups milk', '1 pinch salt']);
});

test('single-line blob is split on measures via the fallback', () => {
  click(container.querySelectorAll('.list-tab')[1]);
  typeInto(container.querySelector('textarea'), '2 cups flour 1 tsp kosher salt 1/2 cup sugar');
  expect(Array.from(container.querySelectorAll('.paste-preview li')).map((li) => li.textContent))
    .toEqual(['2 cups flour', '1 tsp kosher salt', '1/2 cup sugar']);
});

test('apply buttons are disabled until the paste parses to something', () => {
  click(container.querySelectorAll('.list-tab')[1]);
  expect(container.querySelector('.paste-preview')).toBeNull();
  expect(container.querySelector('.paste-actions .btn').disabled).toBe(true);

  typeInto(container.querySelector('textarea'), '   \n  ');
  expect(container.querySelector('.paste-preview')).toBeNull();
  expect(container.querySelector('.paste-actions .btn').disabled).toBe(true);
});
