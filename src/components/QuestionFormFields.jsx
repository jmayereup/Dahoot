import { extractBracketedAnswers, QUESTION_TYPE_PROMPTS } from '../utils/questionSchema';

const OPTION_CLASSES_DEFAULT = ['option-card-red', 'option-card-blue', 'option-card-yellow', 'option-card-green'];

function CategorizeGrid({ grid, setGrid, disabled }) {
  const updateCell = (rowIdx, colIdx, value) => {
    setGrid(prev => {
      const next = prev.map(r => [...r]);
      while (next[rowIdx].length <= colIdx) next[rowIdx].push('');
      next[rowIdx][colIdx] = value;
      return next;
    });
  };

  const addColumn = () => {
    setGrid(prev => prev.map(r => [...r, '']));
  };

  const removeColumn = (colIdx) => {
    setGrid(prev => {
      if (!prev[0] || prev[0].length <= 2) return prev;
      return prev.map(r => r.filter((_, i) => i !== colIdx));
    });
  };

  const addRow = () => {
    setGrid(prev => {
      const cols = (prev[0] || []).length || 2;
      const newRow = Array(cols).fill('');
      return [...prev, newRow];
    });
  };

  const removeRow = (rowIdx) => {
    setGrid(prev => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== rowIdx);
    });
  };

  const numCols = (grid[0] || []).length;
  const numRows = grid.length;

  return (
    <div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
        First row lists the categories. Add a row for each set of items and type one item per line inside each cell.
      </p>

      <div style={{ overflowX: 'auto', border: '1px solid rgba(93,107,130,0.18)', borderRadius: 'var(--radius-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
          <thead>
            <tr style={{ background: 'rgba(93,107,130,0.04)' }}>
              {(grid[0] || []).map((cat, cIdx) => (
                <th key={cIdx} style={{ padding: 8, borderBottom: '1px solid rgba(93,107,130,0.18)', textAlign: 'left', fontWeight: 700, color: 'var(--accent-light)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`Category ${cIdx + 1}`}
                      value={cat}
                      onChange={(e) => updateCell(0, cIdx, e.target.value)}
                      disabled={disabled}
                      style={{ padding: '6px 10px', fontSize: '0.85rem', fontWeight: 700, textTransform: 'none', letterSpacing: 'normal' }}
                    />
                    {numCols > 2 && (
                      <button
                        type="button"
                        onClick={() => removeColumn(cIdx)}
                        disabled={disabled}
                        style={{ background: 'rgba(239,68,68,0.08)', border: 'none', color: '#dc2626', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        title="Remove column"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ padding: 8, borderBottom: '1px solid rgba(93,107,130,0.18)', width: 40 }}>
                <button
                  type="button"
                  onClick={addColumn}
                  disabled={disabled}
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Add column"
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.slice(1).map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ padding: 8, borderTop: '1px solid rgba(93,107,130,0.12)', verticalAlign: 'top' }}>
                    <textarea
                      className="form-input"
                      placeholder={'One item per line'}
                      value={cell}
                      onChange={(e) => updateCell(rIdx + 1, cIdx, e.target.value)}
                      disabled={disabled}
                      rows={3}
                      style={{ padding: '6px 10px', fontSize: '0.85rem', resize: 'vertical', minHeight: 60 }}
                    />
                  </td>
                ))}
                <td style={{ padding: 8, borderTop: '1px solid rgba(93,107,130,0.12)', width: 40, verticalAlign: 'top' }}>
                  {numRows > 2 && (
                    <button
                      type="button"
                      onClick={() => removeRow(rIdx + 1)}
                      disabled={disabled}
                      style={{ background: 'rgba(239,68,68,0.08)', border: 'none', color: '#dc2626', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Remove row"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-2 mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
      >
        ➕ Add Row
      </button>
    </div>
  );
}

function DistractorList({ distractors, updateDistractor, disabled, label, help }) {
  return (
    <div>
      <div className="form-group" style={{ marginBottom: 8 }}>
        <label className="form-label">{label}</label>
        {help && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
            {help}
          </p>
        )}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 10,
        marginBottom: 16
      }}>
        {distractors.map((dist, idx) => (
          <div
            key={idx}
            className="teacher-option-input-card"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(93, 107, 130, 0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <input
              type="text"
              className="form-input"
              placeholder={`Distractor ${idx + 1}`}
              value={dist}
              onChange={(e) => updateDistractor(idx, e.target.value)}
              disabled={disabled}
              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
              onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            />
            {distractors.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const next = distractors.filter((_, i) => i !== idx);
                  // Replace via prop: simulate by setting each one to previous value, then last empty
                  for (let i = idx; i < next.length; i++) updateDistractor(i, next[i]);
                  updateDistractor(next.length, '');
                }}
                disabled={disabled}
                style={{ background: 'rgba(239,68,68,0.08)', border: 'none', color: '#dc2626', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                title="Remove distractor"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => updateDistractor(distractors.length, '')}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
      >
        ➕ Add Distractor
      </button>
    </div>
  );
}

export function QuestionFormFields({
  questionType,
  setQuestionType,
  questionText,
  setQuestionText,
  mcCorrectAnswer,
  setMcCorrectAnswer,
  mcDistractors,
  updateMcDistractor,
  sortingItems,
  updateSortingItem,
  dragSentence,
  setDragSentence,
  dragDistractors,
  updateDragDistractor,
  dropdownSentence,
  setDropdownSentence,
  categorizeGrid,
  setCategorizeGrid,
  disabled = false,
  optionClasses = OPTION_CLASSES_DEFAULT
}) {
  const preventSubmitOnEnter = (e) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const detectedAnswers = extractBracketedAnswers(
    questionType === 'DRAG_DROP' ? dragSentence : dropdownSentence
  );

  return (
    <>
      <div className="form-group" style={{ maxWidth: '300px' }}>
        <label className="form-label">Question Type</label>
        <select
          className="form-input"
          value={questionType}
          onChange={(e) => {
            const newType = e.target.value;
            setQuestionType(newType);
            const current = (questionText || '').trim();
            const knownDefaults = new Set(Object.values(QUESTION_TYPE_PROMPTS));
            if (!current || knownDefaults.has(current)) {
              setQuestionText(QUESTION_TYPE_PROMPTS[newType] || '');
            }
          }}
          disabled={disabled}
          style={{ cursor: 'pointer' }}
        >
          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
          <option value="SORTING">Sorting Order</option>
          <option value="DRAG_DROP">Drag & Drop (Blanks)</option>
          <option value="DROP_DOWN">Drop-Down (Select Blanks)</option>
          <option value="CATEGORIZE">Categorization Groups</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Question Prompt / Title</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Test your knowledge of React hooks!"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          disabled={disabled}
          onKeyDown={preventSubmitOnEnter}
        />
      </div>

      {questionType === 'MULTIPLE_CHOICE' && (
        <div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Correct Answer</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
              Enter the correct answer first, then add 3 plausible distractors below.
            </p>
            <input
              type="text"
              className="form-input"
              placeholder="Correct answer"
              value={mcCorrectAnswer}
              onChange={(e) => setMcCorrectAnswer(e.target.value)}
              disabled={disabled}
              onKeyDown={preventSubmitOnEnter}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Distractors (3 incorrect choices)</label>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginBottom: 28
          }}>
            {mcDistractors.map((dist, idx) => (
              <div
                key={idx}
                className={`teacher-option-input-card ${optionClasses[idx]}`}
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(93, 107, 130, 0.15)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="option-icon" style={{ width: 20, height: 20, border: 'none', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {['A', 'B', 'C'][idx]}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Distractor {idx + 1}
                  </span>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Distractor ${idx + 1}`}
                  value={dist}
                  onChange={(e) => updateMcDistractor(idx, e.target.value)}
                  disabled={disabled}
                  style={{ padding: '10px 14px', fontSize: '0.95rem' }}
                  onKeyDown={preventSubmitOnEnter}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {questionType === 'SORTING' && (
        <div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Sorting Elements (Correct Order)</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
              Enter items in their <strong>correct sorted order</strong> (top to bottom). The game will shuffle them automatically for players.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, maxWidth: '600px' }}>
            {sortingItems.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 30, fontWeight: 700, color: 'var(--accent-light)' }}>#{idx + 1}</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Sorted Item ${idx + 1}`}
                  value={opt}
                  onChange={(e) => updateSortingItem(idx, e.target.value)}
                  disabled={disabled}
                  onKeyDown={preventSubmitOnEnter}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {questionType === 'DRAG_DROP' && (
        <div>
          <div className="form-group">
            <label className="form-label">Sentence with Blanks</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
              Wrap each answer word in <code>[brackets]</code>. The bracketed words become the correct answers automatically.
            </p>
            <textarea
              className="form-input"
              placeholder="e.g. In React, we use [hooks] to manage state and [useState] for side effects."
              rows={3}
              value={dragSentence}
              onChange={(e) => setDragSentence(e.target.value)}
              disabled={disabled}
            />
          </div>

          {detectedAnswers.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Detected blanks:
              </span>
              {detectedAnswers.map((w, idx) => (
                <span key={idx} style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#047857', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600 }}>
                  {w}
                </span>
              ))}
            </div>
          )}

          <DistractorList
            distractors={dragDistractors}
            updateDistractor={updateDragDistractor}
            disabled={disabled}
            label="Distractor Words (optional)"
            help="These appear in the choice pool alongside the correct answers. Leave empty if you only want players to choose from the correct answers."
          />
        </div>
      )}

      {questionType === 'DROP_DOWN' && (
        <div>
          <div className="form-group">
            <label className="form-label">Sentence with Dropdowns</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
              Wrap each correct answer in <code>[brackets]</code>. Every bracket becomes a dropdown, and all dropdowns share the same choice list below.
            </p>
            <textarea
              className="form-input"
              placeholder="e.g. PocketBase is written in [Go] and uses [SQLite] as its database."
              rows={3}
              value={dropdownSentence}
              onChange={(e) => setDropdownSentence(e.target.value)}
              disabled={disabled}
            />
          </div>

          {detectedAnswers.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Detected dropdowns:
              </span>
              {detectedAnswers.map((w, idx) => (
                <span key={idx} style={{ padding: '3px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#047857', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600 }}>
                  {w}
                </span>
              ))}
            </div>
          )}

          <DistractorList
            distractors={dragDistractors}
            updateDistractor={updateDragDistractor}
            disabled={disabled}
            label="Dropdown Choices (optional)"
            help="Enter one or more words. Every dropdown will offer these as choices along with its own correct answer. Leave empty for a 1-option dropdown."
          />
        </div>
      )}

      {questionType === 'CATEGORIZE' && (
        <div>
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label">Categories & Items</label>
          </div>
          <CategorizeGrid
            grid={categorizeGrid}
            setGrid={setCategorizeGrid}
            disabled={disabled}
          />
        </div>
      )}
    </>
  );
}
