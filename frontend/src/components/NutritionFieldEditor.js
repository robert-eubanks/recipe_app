import React, { useMemo, useState } from 'react';
import { NUTRITION_FIELDS, parseNutrition } from '../utils/parseNutrition';

const PASTE_PLACEHOLDER = 'Calories: 320\nProtein: 12g\nFat: 8g\nCarbohydrates: 45g\nFiber: 3g\nSugar: 10g\nSodium: 400mg\nCholesterol: 20mg';

function NutritionFieldEditor({ formData, onFieldChange, onApplyNutrition }) {
  const [mode, setMode] = useState('individual');
  const [pasteText, setPasteText] = useState('');

  const parsed = useMemo(() => parseNutrition(pasteText), [pasteText]);
  const parsedCount = Object.keys(parsed).length;

  const apply = () => {
    onApplyNutrition(parsed);
    setPasteText('');
    setMode('individual');
  };

  return (
    <div className="form-group">
      <label>Nutrition (optional)</label>

      <div className="list-tabs">
        <button
          type="button"
          className={`list-tab ${mode === 'individual' ? 'active' : ''}`}
          onClick={() => setMode('individual')}
        >
          Add individually
        </button>
        <button
          type="button"
          className={`list-tab ${mode === 'paste' ? 'active' : ''}`}
          onClick={() => setMode('paste')}
        >
          Paste &amp; parse
        </button>
      </div>

      {mode === 'individual' ? (
        NUTRITION_FIELDS.reduce((rows, field, i) => {
          if (i % 2 === 0) rows.push([field]);
          else rows[rows.length - 1].push(field);
          return rows;
        }, []).map((pair, i) => (
          <div className="form-row" key={i}>
            {pair.map(({ key, label }) => (
              <div className="form-group" key={key}>
                <label>{label}</label>
                <input type="text" name={key} value={formData[key]} onChange={onFieldChange} />
              </div>
            ))}
          </div>
        ))
      ) : (
        <>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={PASTE_PLACEHOLDER}
            style={{ minHeight: '140px' }}
          />
          <p className="paste-hint">
            One nutrient per line as "Label: value" (Calories, Protein, Fat, Carbohydrates, Fiber, Sugar, Sodium, Cholesterol).
            Works pasted as a single run-together line too. Sub-values like Saturated Fat or Added Sugars are ignored.
          </p>

          {parsedCount > 0 && (
            <div className="paste-preview">
              <div className="paste-preview-count">Found {parsedCount} of 8 values:</div>
              <ul>
                {NUTRITION_FIELDS.filter((field) => parsed[field.shortKey]).map((field) => (
                  <li key={field.key}>{field.label}: {parsed[field.shortKey]}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="paste-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!parsedCount}
              onClick={apply}
            >
              {parsedCount ? `Apply ${parsedCount} value${parsedCount === 1 ? '' : 's'}` : 'Apply'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default NutritionFieldEditor;
