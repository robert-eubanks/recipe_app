import React, { useMemo, useState } from 'react';

function ListFieldEditor({
  label,
  name,
  items,
  parse,
  placeholder,
  pastePlaceholder,
  pasteHint,
  addLabel,
  multiline = false,
  onArrayChange,
  onAddArrayItem,
  onRemoveArrayItem,
  onSetArray,
}) {
  const [mode, setMode] = useState('individual');
  const [pasteText, setPasteText] = useState('');

  const parsed = useMemo(() => parse(pasteText), [pasteText, parse]);
  const hasContent = items.some((item) => item.trim());

  const apply = (nextItems) => {
    onSetArray(name, nextItems);
    setPasteText('');
    setMode('individual');
  };

  const renderItemInput = (value, index) => {
    const shared = {
      value,
      onChange: (e) => onArrayChange(index, name, e.target.value),
      placeholder,
    };
    return multiline
      ? <textarea {...shared} style={{ flex: 1, minHeight: '60px' }} />
      : <input type="text" {...shared} style={{ flex: 1 }} />;
  };

  return (
    <div className="form-group">
      <label>{label}</label>

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
        <>
          {items.map((item, index) => (
            <div key={index} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
              {renderItemInput(item, index)}
              {items.length > 1 && (
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => onRemoveArrayItem(index, name)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onAddArrayItem(name)}
            style={{ marginTop: '8px' }}
          >
            {addLabel}
          </button>
        </>
      ) : (
        <>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={pastePlaceholder}
            style={{ minHeight: '140px' }}
          />
          <p className="paste-hint">{pasteHint}</p>

          {parsed.length > 0 && (
            <div className="paste-preview">
              <div className="paste-preview-count">
                Found {parsed.length} {parsed.length === 1 ? 'item' : 'items'}:
              </div>
              <ol>
                {parsed.map((item, index) => <li key={index}>{item}</li>)}
              </ol>
            </div>
          )}

          <div className="paste-actions">
            {hasContent && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!parsed.length}
                onClick={() => apply([...items.filter((item) => item.trim()), ...parsed])}
              >
                Append {parsed.length || ''}
              </button>
            )}
            <button
              type="button"
              className={hasContent ? 'btn btn-secondary' : 'btn btn-primary'}
              disabled={!parsed.length}
              onClick={() => apply(parsed)}
            >
              {hasContent ? 'Replace list' : `Add ${parsed.length || ''}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ListFieldEditor;
