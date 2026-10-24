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
  hasSections,
  section,
  onArrayChange,
  onAddArrayItem,
  onRemoveArrayItem,
  onSetArray,
}) {
  const [mode, setMode] = useState('individual');
  const [pasteText, setPasteText] = useState('');

  const parsed = useMemo(() => parse(pasteText), [pasteText, parse]);

  // When sections are on, only the currently selected section's items (and
  // their original indices into the full array) are shown/edited here —
  // every other section's items live in `items` untouched, off-screen.
  const visibleEntries = useMemo(() => {
    const withIndex = items.map((item, index) => ({ item, index }));
    return hasSections ? withIndex.filter(({ item }) => item.section === section) : withIndex;
  }, [items, hasSections, section]);

  const hasContent = visibleEntries.some(({ item }) => item.text.trim());

  // Splices a full replacement for this section's contiguous run back into
  // the full array, leaving every other section's items in place. Any
  // section label a paste happened to detect is overridden to the section
  // already selected — sections are managed explicitly via the section list,
  // not re-derived from pasted text once they're turned on.
  const replaceVisible = (nextItems) => {
    if (!hasSections) return nextItems;
    const tagged = nextItems.map((item) => ({ ...item, section }));
    const runIndices = [];
    items.forEach((item, i) => {
      if (item.section === section) runIndices.push(i);
    });
    if (!runIndices.length) return [...items, ...tagged];
    const first = runIndices[0];
    const last = runIndices[runIndices.length - 1];
    return [...items.slice(0, first), ...tagged, ...items.slice(last + 1)];
  };

  const apply = (nextItems) => {
    onSetArray(name, replaceVisible(nextItems));
    setPasteText('');
    setMode('individual');
  };

  const renderItemInput = (item, index) => {
    const shared = {
      value: item.text,
      onChange: (e) => onArrayChange(index, name, e.target.value),
      placeholder,
    };
    return multiline
      ? <textarea {...shared} style={{ flex: 1, minHeight: '60px' }} />
      : <input type="text" {...shared} style={{ flex: 1 }} />;
  };

  const renderItemRow = ({ item, index }) => (
    <div key={index} style={{ marginBottom: '8px', display: 'flex', gap: '8px' }}>
      {renderItemInput(item, index)}
      {visibleEntries.length > 1 && (
        <button
          type="button"
          className="btn btn-danger btn-small"
          onClick={() => onRemoveArrayItem(index, name)}
        >
          ✕
        </button>
      )}
    </div>
  );

  const renderItems = () => (
    <>
      {visibleEntries.map(renderItemRow)}
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onAddArrayItem(name, hasSections ? section : null)}
        style={{ marginTop: '8px' }}
      >
        {addLabel}
      </button>
    </>
  );

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

      {mode === 'individual' && renderItems()}

      {mode === 'paste' && (
        <>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={pastePlaceholder}
            style={{ minHeight: '140px' }}
          />
          <p className="paste-hint">{pasteHint}</p>

          {parsed.length > 0 && (
            <div className="paste-preview-wrapper">
              <div className="paste-preview-count">
                Found {parsed.length} {parsed.length === 1 ? 'item' : 'items'}:
              </div>
              <ol>
                {parsed.map((item, i) => <li key={i}>{item.text}</li>)}
              </ol>
            </div>
          )}

          <div className="paste-actions">
            {hasContent && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={!parsed.length}
                onClick={() => apply([...visibleEntries.map(({ item }) => item).filter((item) => item.text.trim()), ...parsed])}
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
