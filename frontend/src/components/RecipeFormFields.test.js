import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import RecipeFormFields from './RecipeFormFields';
import { useRecipeFormState } from '../hooks/useRecipeFormState';

global.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let latestFormData;
let latestHasSections;

function Harness() {
  const {
    formData,
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
  } = useRecipeFormState();
  latestFormData = formData;
  latestHasSections = hasSections;
  return (
    <RecipeFormFields
      formData={formData}
      categories={[]}
      onFieldChange={handleInputChange}
      onArrayChange={handleArrayChange}
      onAddArrayItem={handleAddArrayItem}
      onRemoveArrayItem={handleRemoveArrayItem}
      onSetArray={handleSetArray}
      hasSections={hasSections}
      onToggleSections={handleToggleSections}
      onAddSection={handleAddSection}
      onRenameSection={handleRenameSection}
      onRemoveSection={handleRemoveSection}
      onApplyNutrition={handleApplyNutrition}
      onRatingChange={handleRatingChange}
      onPhotoFileChange={() => {}}
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

// ListFieldEditor renders <div className="form-group"><label>{label}</label>...
const editorFor = (labelText) =>
  Array.from(container.querySelectorAll('.form-group')).find((el) => {
    const label = el.firstElementChild;
    return label && label.tagName === 'LABEL' && label.textContent === labelText;
  });

const sectionsCheckbox = () => container.querySelector('input[type="checkbox"]');
const sectionNameInput = () =>
  Array.from(container.querySelectorAll('.form-group')).find(
    (el) => el.firstElementChild?.textContent === 'Section Name'
  )?.querySelector('input[type="text"]');
const sectionButtons = () => Array.from(container.querySelectorAll('.section-list-item'));
const activeSectionButton = () => container.querySelector('.section-list-item.active');

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  act(() => { root = createRoot(container); root.render(<Harness />); });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test('the sections panel is hidden until the checkbox is checked, and both editors render flat', () => {
  expect(container.querySelector('.section-list')).toBeNull();
  expect(editorFor('Ingredients')).toBeTruthy();
  expect(editorFor('Instructions')).toBeTruthy();
});

test('checking the box creates "Section 1" from existing content and selects it', () => {
  click(sectionsCheckbox());
  expect(latestHasSections).toBe(true);

  const buttons = sectionButtons();
  expect(buttons.length).toBe(1);
  expect(buttons[0].textContent).toBe('Section 1');
  expect(buttons[0].classList.contains('active')).toBe(true);

  expect(sectionNameInput().value).toBe('Section 1');
  expect(latestFormData.ingredients.every((i) => i.section === 'Section 1')).toBe(true);
  expect(latestFormData.instructions.every((i) => i.section === 'Section 1')).toBe(true);
});

test('there is exactly one Ingredients editor and one Instructions editor, regardless of how many sections exist', () => {
  click(sectionsCheckbox());
  click(byText('Add Section'));
  click(byText('Add Section'));

  expect(sectionButtons().length).toBe(3);
  expect(container.querySelectorAll('.form-group').length).toBeGreaterThan(0);
  expect(
    Array.from(container.querySelectorAll('.form-group')).filter(
      (el) => el.firstElementChild?.textContent === 'Ingredients'
    ).length
  ).toBe(1);
  expect(
    Array.from(container.querySelectorAll('.form-group')).filter(
      (el) => el.firstElementChild?.textContent === 'Instructions'
    ).length
  ).toBe(1);
});

test('Add Section creates the next section and selects it, leaving the previous section\'s items alone', () => {
  click(sectionsCheckbox());

  const ingredientsInput = () => editorFor('Ingredients').querySelector('input[type="text"]');
  typeInto(ingredientsInput(), '2 cups flour');
  expect(latestFormData.ingredients).toEqual([{ text: '2 cups flour', section: 'Section 1' }]);

  click(byText('Add Section'));
  expect(activeSectionButton().textContent).toBe('Section 2');
  // Section 2 is empty/new, so its own blank input is shown, not Section 1's flour.
  expect(ingredientsInput().value).toBe('');

  click(sectionButtons().find((b) => b.textContent === 'Section 1'));
  expect(ingredientsInput().value).toBe('2 cups flour');
});

test('adding an ingredient inside a section does not add a matching instruction row', () => {
  click(sectionsCheckbox());
  click(byText('+ Add Ingredient'));
  expect(latestFormData.ingredients.length).toBe(2);
  expect(latestFormData.instructions.length).toBe(1);
});

test('the Section Name field renames the section everywhere it appears', () => {
  click(sectionsCheckbox());
  typeInto(sectionNameInput(), 'Cake');

  expect(activeSectionButton().textContent).toBe('Cake');
  expect(latestFormData.ingredients.every((i) => i.section === 'Cake')).toBe(true);
  expect(latestFormData.instructions.every((i) => i.section === 'Cake')).toBe(true);
});

test('renaming a non-first section keeps it selected through every keystroke, not jumping to Section 1', () => {
  click(sectionsCheckbox());
  click(byText('Add Section'));
  expect(activeSectionButton().textContent).toBe('Section 2');

  for (const partial of ['I', 'Ic', 'Ici', 'Icin', 'Icing']) {
    typeInto(sectionNameInput(), partial);
    expect(activeSectionButton().textContent).toBe(partial);
    expect(sectionNameInput().value).toBe(partial);
  }

  expect(latestFormData.ingredients.some((i) => i.section === 'Icing')).toBe(true);
  expect(latestFormData.ingredients.some((i) => i.section === 'Section 1')).toBe(true);
});

test('Remove Section asks for confirmation first, and only removes on confirm', () => {
  click(sectionsCheckbox());
  click(byText('Add Section'));
  expect(sectionButtons().length).toBe(2);

  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
  click(byText('Remove Section'));
  expect(confirmSpy).toHaveBeenCalled();
  expect(sectionButtons().length).toBe(2);

  confirmSpy.mockReturnValue(true);
  click(byText('Remove Section'));
  expect(sectionButtons().length).toBe(1);

  confirmSpy.mockRestore();
});

test('removing the last section hides the editors until a new one is added', () => {
  click(sectionsCheckbox());
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  click(byText('Remove Section'));

  expect(sectionButtons().length).toBe(0);
  expect(editorFor('Ingredients')).toBeFalsy();
  expect(container.querySelector('.section-list-empty')).toBeTruthy();

  click(byText('Add Section'));
  expect(editorFor('Ingredients')).toBeTruthy();

  window.confirm.mockRestore();
});

test('unchecking the box again shows every item from every section, nothing is lost', () => {
  click(sectionsCheckbox());
  const ingredientsInput = () => editorFor('Ingredients').querySelector('input[type="text"]');
  typeInto(ingredientsInput(), '2 cups flour');
  click(byText('Add Section'));
  typeInto(ingredientsInput(), '1 cup powdered sugar');

  click(sectionsCheckbox());
  expect(latestHasSections).toBe(false);
  const texts = Array.from(editorFor('Ingredients').querySelectorAll('input[type="text"]')).map((i) => i.value);
  expect(texts).toEqual(['2 cups flour', '1 cup powdered sugar']);
});
