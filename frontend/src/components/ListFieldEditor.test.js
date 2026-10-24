import React, { act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import ListFieldEditor from './ListFieldEditor';
import { parseIngredients } from '../utils/parseList';
import { useRecipeFormState } from '../hooks/useRecipeFormState';

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let latestIngredients;

// ListFieldEditor itself no longer knows anything about the section list UI
// (that lives in RecipeFormFields) — it just edits a flat array, optionally
// filtered down to whichever `section` the harness tells it is selected.
function Harness({ hasSections, section }) {
  const { formData, handleArrayChange, handleAddArrayItem, handleRemoveArrayItem, handleSetArray } =
    useRecipeFormState();
  latestIngredients = formData.ingredients;
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
      hasSections={hasSections}
      section={section}
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
  const tag = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(tag.prototype, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});

function render(props = {}) {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => { root = createRoot(container); root.render(<Harness {...props} />); });
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test('starts on the individual tab with one empty input', () => {
  render();
  expect(container.querySelectorAll('.list-tab').length).toBe(2);
  expect(container.querySelector('.list-tab.active').textContent).toBe('Add individually');
  expect(container.querySelectorAll('input[type="text"]').length).toBe(1);
});

test('paste tab previews parsed items and adds them to an empty list', () => {
  render();
  click(container.querySelectorAll('.list-tab')[1]);
  expect(container.querySelector('.list-tab.active').textContent).toBe('Paste & parse');

  typeInto(container.querySelector('textarea'), '2 cups flour\n1 tsp salt\n3 tbsp butter');

  expect(container.querySelector('.paste-preview-count').textContent).toBe('Found 3 items:');
  expect(Array.from(container.querySelectorAll('.paste-preview-wrapper li')).map((li) => li.textContent))
    .toEqual(['2 cups flour', '1 tsp salt', '3 tbsp butter']);

  expect(byText('Add 3')).toBeTruthy();
  expect(byText('Replace list')).toBeFalsy();

  click(byText('Add 3'));

  expect(latestIngredients).toEqual([
    { text: '2 cups flour', section: null },
    { text: '1 tsp salt', section: null },
    { text: '3 tbsp butter', section: null },
  ]);
  expect(container.querySelector('.list-tab.active').textContent).toBe('Add individually');
});

test('append keeps existing items, replace discards them', () => {
  render();
  click(container.querySelectorAll('.list-tab')[1]);
  typeInto(container.querySelector('textarea'), '1 cup sugar');
  click(byText('Add 1'));
  expect(latestIngredients).toEqual([{ text: '1 cup sugar', section: null }]);

  click(container.querySelectorAll('.list-tab')[1]);
  typeInto(container.querySelector('textarea'), '2 eggs\n1 tsp vanilla');
  click(byText('Append 2'));
  expect(latestIngredients).toEqual([
    { text: '1 cup sugar', section: null },
    { text: '2 eggs', section: null },
    { text: '1 tsp vanilla', section: null },
  ]);

  click(container.querySelectorAll('.list-tab')[1]);
  typeInto(container.querySelector('textarea'), '3 cups milk\n1 pinch salt');
  click(byText('Replace list'));
  expect(latestIngredients).toEqual([
    { text: '3 cups milk', section: null },
    { text: '1 pinch salt', section: null },
  ]);
});

test('single-line blob is split on measures via the fallback', () => {
  render();
  click(container.querySelectorAll('.list-tab')[1]);
  typeInto(container.querySelector('textarea'), '2 cups flour 1 tsp kosher salt 1/2 cup sugar');
  expect(Array.from(container.querySelectorAll('.paste-preview-wrapper li')).map((li) => li.textContent))
    .toEqual(['2 cups flour', '1 tsp kosher salt', '1/2 cup sugar']);
});

test('apply buttons are disabled until the paste parses to something', () => {
  render();
  click(container.querySelectorAll('.list-tab')[1]);
  expect(container.querySelector('.paste-preview-wrapper')).toBeNull();
  expect(container.querySelector('.paste-actions .btn').disabled).toBe(true);

  typeInto(container.querySelector('textarea'), '   \n  ');
  expect(container.querySelector('.paste-preview-wrapper')).toBeNull();
  expect(container.querySelector('.paste-actions .btn').disabled).toBe(true);
});

describe('scoped to a selected section', () => {
  function renderWithSections(items) {
    container = document.createElement('div');
    document.body.appendChild(container);
    // A thin wrapper that seeds formData via a paste/replace before the
    // section-scoped assertions run, so the test can start from a known
    // multi-section array without needing the section-picker UI.
    function Seeded() {
      const { formData, handleArrayChange, handleAddArrayItem, handleRemoveArrayItem, handleSetArray } =
        useRecipeFormState();
      const [seeded, setSeeded] = useState(false);
      latestIngredients = formData.ingredients;
      useEffect(() => {
        if (!seeded) {
          handleSetArray('ingredients', items);
          setSeeded(true);
        }
      }, [seeded]);
      if (!seeded) return null;
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
          hasSections
          section="Cake"
          onArrayChange={handleArrayChange}
          onAddArrayItem={handleAddArrayItem}
          onRemoveArrayItem={handleRemoveArrayItem}
          onSetArray={handleSetArray}
        />
      );
    }
    act(() => { root = createRoot(container); root.render(<Seeded />); });
  }

  test('only shows items belonging to the selected section', () => {
    renderWithSections([
      { text: 'flour', section: 'Cake' },
      { text: 'sugar', section: 'Icing' },
      { text: 'butter', section: 'Cake' },
    ]);
    expect(Array.from(container.querySelectorAll('input[type="text"]')).map((i) => i.value))
      .toEqual(['flour', 'butter']);
  });

  test('adding an item stays within the section run, not appended past a later section', () => {
    renderWithSections([
      { text: 'flour', section: 'Cake' },
      { text: 'sugar', section: 'Icing' },
    ]);
    click(byText('+ Add Ingredient'));
    expect(latestIngredients).toEqual([
      { text: 'flour', section: 'Cake' },
      { text: '', section: 'Cake' },
      { text: 'sugar', section: 'Icing' },
    ]);
  });

  test('paste replace only replaces the selected section\'s items, leaving other sections untouched', () => {
    renderWithSections([
      { text: 'flour', section: 'Cake' },
      { text: 'sugar', section: 'Icing' },
    ]);
    click(container.querySelectorAll('.list-tab')[1]);
    typeInto(container.querySelector('textarea'), 'butter\neggs');
    click(byText('Replace list'));
    expect(latestIngredients).toEqual([
      { text: 'butter', section: 'Cake' },
      { text: 'eggs', section: 'Cake' },
      { text: 'sugar', section: 'Icing' },
    ]);
  });

  test('a section header detected inside a scoped paste is overridden to the selected section', () => {
    renderWithSections([{ text: 'flour', section: 'Cake' }]);
    click(container.querySelectorAll('.list-tab')[1]);
    typeInto(container.querySelector('textarea'), 'For the Topping\nsprinkles');
    click(byText('Append 1'));
    expect(latestIngredients).toEqual([
      { text: 'flour', section: 'Cake' },
      { text: 'sprinkles', section: 'Cake' },
    ]);
  });
});
