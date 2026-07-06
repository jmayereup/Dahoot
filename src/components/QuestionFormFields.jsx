import { getMcOptions } from '../utils/questionSchema';

const OPTION_CLASSES_DEFAULT = ['option-card-red', 'option-card-blue', 'option-card-yellow', 'option-card-green'];

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
  dragAnswers,
  updateDragAnswer,
  dragDistractors,
  updateDragDistractor,
  dropdownSentence,
  setDropdownSentence,
  dropdownConfig,
  updateDropdownCorrect,
  updateDropdownDistractor,
  categorizeCategories,
  setCategorizeCategories,
  categorizeItemsText,
  setCategorizeItemsText,
  disabled = false,
  optionClasses = OPTION_CLASSES_DEFAULT
}) {
  const preventSubmitOnEnter = (e) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  return (
    <>
      <div className="form-group" style={{ maxWidth: '300px' }}>
        <label className="form-label">Question Type</label>
        <select
          className="form-input"
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
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
              Write a sentence using placeholders like <code>[blank0]</code>, <code>[blank1]</code>, etc. for blank spaces.
            </p>
            <textarea
              className="form-input"
              placeholder="e.g. In React, we use [blank0] to manage state and [blank1] for side effects."
              rows={2}
              value={dragSentence}
              onChange={(e) => setDragSentence(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Blank Answers (in sentence order)</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
              Each blank needs a correct answer in the same order as the placeholders in the sentence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7 max-w-[600px]">
            {dragAnswers.map((answer, idx) => {
              const isBlankUsed = dragSentence.includes(`[blank${idx}]`);
              return (
                <div key={idx} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: isBlankUsed ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                    {isBlankUsed ? `Answer for [blank${idx}]` : `Answer ${idx + 1} (Optional)`}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Correct word for [blank${idx}]`}
                    value={answer}
                    onChange={(e) => updateDragAnswer(idx, e.target.value)}
                    disabled={disabled}
                    onKeyDown={preventSubmitOnEnter}
                  />
                </div>
              );
            })}
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Distractor Words (decoys)</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
              Add 2 extra wrong words that appear alongside the correct answers in the choice pool.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7 max-w-[600px]">
            {dragDistractors.map((dist, idx) => (
              <div key={idx} className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>
                  Distractor {idx + 1}
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Distractor word ${idx + 1}`}
                  value={dist}
                  onChange={(e) => updateDragDistractor(idx, e.target.value)}
                  disabled={disabled}
                  onKeyDown={preventSubmitOnEnter}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {questionType === 'DROP_DOWN' && (
        <div>
          <div className="form-group">
            <label className="form-label">Sentence with Dropdown slots</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
              Write a sentence using placeholders like <code>{'{{0}}'}</code>, <code>{'{{1}}'}</code> for the dropdowns.
            </p>
            <textarea
              className="form-input"
              placeholder="e.g. PocketBase is written in {{0}} and uses {{1}} database."
              rows={2}
              value={dropdownSentence}
              onChange={(e) => setDropdownSentence(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Dropdown Configuration</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
              For each placeholder, enter the correct answer and at least 1 distractor.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28, maxWidth: '600px' }}>
            {dropdownConfig.map((dd, idx) => {
              const isUsed = dropdownSentence.includes(`{{${idx}}}`);
              if (!isUsed && idx > 0) return null;
              return (
                <div key={idx} className="form-group" style={{ margin: 0, padding: 12, border: '1px solid rgba(93, 107, 130, 0.15)', borderRadius: 8 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: isUsed ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                    {isUsed ? `Dropdown {{${idx}}}` : `Unused Dropdown ${idx}`}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Correct answer"
                    value={dd.correct_answer || ''}
                    onChange={(e) => updateDropdownCorrect(idx, e.target.value)}
                    disabled={disabled}
                    style={{ marginBottom: 8 }}
                    onKeyDown={preventSubmitOnEnter}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(dd.distractors || []).map((dist, dIdx) => (
                      <input
                        key={dIdx}
                        type="text"
                        className="form-input"
                        placeholder={`Distractor ${dIdx + 1}`}
                        value={dist}
                        onChange={(e) => updateDropdownDistractor(idx, dIdx, e.target.value)}
                        disabled={disabled}
                        onKeyDown={preventSubmitOnEnter}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {questionType === 'CATEGORIZE' && (
        <div>
          <div className="form-group">
            <label className="form-label">Categories (Separated by Commas)</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
              Enter up to 4 category names, separated by commas.
            </p>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Languages, Frameworks, Databases"
              value={categorizeCategories}
              onChange={(e) => setCategorizeCategories(e.target.value)}
              disabled={disabled}
              onKeyDown={preventSubmitOnEnter}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Items and Category Mapping</label>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
              Write one item per line, with the format <code>Item: CategoryName</code>. Max 20 items.
            </p>
            <textarea
              className="form-input"
              placeholder={'e.g.\nReact: Frameworks\nJavaScript: Languages\nMongoDB: Databases'}
              rows={6}
              value={categorizeItemsText}
              onChange={(e) => setCategorizeItemsText(e.target.value)}
              disabled={disabled}
              style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
            />
          </div>
        </div>
      )}
    </>
  );
}
