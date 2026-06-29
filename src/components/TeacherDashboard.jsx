import React from 'react';
import { OPTION_CLASSES, OPTION_SHAPES } from '../constants';

export function TeacherDashboard({
  questionsList,
  loading,
  error,
  isEditing,
  selectedQuestion,
  questionType,
  setQuestionType,
  questionText,
  setQuestionText,
  
  // Multiple Choice & Sorting
  options,
  updateOptionValue,
  correctOptionIndex,
  setCorrectOptionIndex,

  // Drag & Drop
  dragSentence,
  setDragSentence,
  dragChoices,
  updateDragChoice,

  // Drop Down
  dropdownSentence,
  setDropdownSentence,
  dropdownOptions,
  updateDropdownOption,

  // Categorize
  categorizeCategories,
  setCategorizeCategories,
  categorizeItemsText,
  setCategorizeItemsText,

  startCreating,
  startEditing,
  cancelEditing,
  saveQuestion,
  deleteQuestion,
  setView
}) {
  return (
    <div className="app-container">
      <div className="panel panel-large animate-join-focus">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ marginBottom: 4 }}>Question Bank Manager</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              {isEditing 
                ? (selectedQuestion ? 'Edit existing quiz question' : 'Create a new quiz question') 
                : 'Manage questions for your self-hosted quiz lobby'
              }
            </p>
          </div>
          {!isEditing && (
            <button className="btn btn-primary" onClick={startCreating} style={{ width: 'auto', minWidth: 160 }}>
              + Add Question
            </button>
          )}
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            color: '#ff4b60', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: 20,
            textAlign: 'left'
          }}>
            {error}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={saveQuestion} style={{ textAlign: 'left' }}>
            
            {/* Question Type Selector */}
            <div className="form-group" style={{ maxWidth: '300px' }}>
              <label className="form-label">Question Type</label>
              <select 
                className="form-input" 
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value)}
                disabled={loading}
                style={{ cursor: 'pointer' }}
              >
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="SORTING">Sorting Order</option>
                <option value="DRAG_DROP">Drag & Drop (Blanks)</option>
                <option value="DROP_DOWN">Drop-Down (Select Blanks)</option>
                <option value="CATEGORIZE">Categorization Groups</option>
              </select>
            </div>

            {/* Common Question Text Prompt */}
            <div className="form-group">
              <label className="form-label">Question Prompt / Title</label>
              <input 
                type="text"
                className="form-input" 
                placeholder="e.g. Test your knowledge of React hooks!"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* 1. MULTIPLE CHOICE */}
            {questionType === 'MULTIPLE_CHOICE' && (
              <div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Answer Choices & Correct Option</label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
                    Fill out the 4 choices and select the option representing the correct answer.
                  </p>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                  gap: 16,
                  marginBottom: 28
                }}>
                  {options.map((opt, idx) => (
                    <div 
                      key={idx} 
                      className={`teacher-option-input-card ${OPTION_CLASSES[idx]} ${correctOptionIndex === idx ? 'active' : ''}`}
                      style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`option-icon ${OPTION_SHAPES[idx]}`} style={{ width: 16, height: 16, border: 'none' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                            Choice {idx + 1}
                          </span>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', color: correctOptionIndex === idx ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          <input 
                            type="radio" 
                            name="correct-option" 
                            checked={correctOptionIndex === idx}
                            onChange={() => setCorrectOptionIndex(idx)}
                            disabled={loading}
                            style={{ accentColor: 'var(--accent)' }}
                          />
                          Correct
                        </label>
                      </div>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={(e) => updateOptionValue(idx, e.target.value)}
                        disabled={loading}
                        style={{ padding: '10px 14px', fontSize: '0.95rem' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. SORTING */}
            {questionType === 'SORTING' && (
              <div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Sorting Elements (Correct Order)</label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
                    Enter items in their **correct sorted order** (top to bottom). The game will shuffle them automatically for players.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, maxWidth: '600px' }}>
                  {options.map((opt, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 30, fontWeight: 700, color: 'var(--accent-light)' }}>#{idx + 1}</span>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder={`Sorted Item ${idx + 1}`}
                        value={opt}
                        onChange={(e) => updateOptionValue(idx, e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. DRAG & DROP */}
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
                    disabled={loading}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Blank Words & Distractors</label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
                    Define the correct words matching the blanks, followed by incorrect distractor words.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28, maxWidth: '600px' }}>
                  {dragChoices.map((choice, idx) => {
                    const isBlankValue = dragSentence.includes(`[blank${idx}]`);
                    return (
                      <div key={idx} className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', color: isBlankValue ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                          {isBlankValue ? `Choice ${idx + 1} (Fills [blank${idx}])` : `Choice ${idx + 1} (Distractor Word)`}
                        </label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder={isBlankValue ? `Correct word for [blank${idx}]` : `Distractor word`}
                          value={choice}
                          onChange={(e) => updateDragChoice(idx, e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. DROP DOWN */}
            {questionType === 'DROP_DOWN' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Sentence with Dropdown slots</label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                    Write a sentence using placeholders like <code>{"{{0}}"}</code>, <code>{"{{1}}"}</code> for the dropdowns.
                  </p>
                  <textarea 
                    className="form-input" 
                    placeholder="e.g. PocketBase is written in {{0}} and uses {{1}} database."
                    rows={2}
                    value={dropdownSentence}
                    onChange={(e) => setDropdownSentence(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label className="form-label">Dropdown Selections Config</label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
                    Define comma-separated options. **The first option in the list is the correct answer**.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28, maxWidth: '600px' }}>
                  {dropdownOptions.map((choiceLine, idx) => {
                    const isDropdownUsed = dropdownSentence.includes(`{{${idx}}}`);
                    if (!isDropdownUsed && idx > 0) return null; // Show at least one config input
                    return (
                      <div key={idx} className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', color: isDropdownUsed ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                          {isDropdownUsed ? `Dropdown {{${idx}}} Options (Correct, Option2, Option3...)` : `Unused Dropdown Config`}
                        </label>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="e.g. Go, Rust, JavaScript, Python"
                          value={choiceLine}
                          onChange={(e) => updateDropdownOption(idx, e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. CATEGORIZE */}
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
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Items and Category Mapping</label>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                    Write one item per line, with the format <code>Item: CategoryName</code>. Max 20 items.
                  </p>
                  <textarea 
                    className="form-input" 
                    placeholder="e.g.&#10;React: Frameworks&#10;JavaScript: Languages&#10;MongoDB: Databases"
                    rows={6}
                    value={categorizeItemsText}
                    onChange={(e) => setCategorizeItemsText(e.target.value)}
                    disabled={loading}
                    style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={cancelEditing} disabled={loading} style={{ width: 'auto', minWidth: 120 }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: 'auto', minWidth: 150 }}>
                {loading ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="teacher-questions-list" style={{ 
              maxHeight: '520px', 
              overflowY: 'auto', 
              paddingRight: '8px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              marginBottom: 32
            }}>
              {questionsList.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '48px 16px', 
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--panel-border)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  No questions in the database yet. Click "+ Add Question" or reset to seed defaults.
                </div>
              ) : (
                questionsList.map((question, qIdx) => {
                  const type = question.type || 'MULTIPLE_CHOICE';
                  return (
                    <div 
                      key={question.id} 
                      style={{
                        background: 'rgba(15, 23, 42, 0.3)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 20,
                        flexWrap: 'wrap',
                        transition: 'border-color 0.2s ease'
                      }}
                      className="teacher-question-row"
                    >
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ 
                            background: 'var(--accent-glow)', 
                            color: 'var(--accent-light)', 
                            fontSize: '0.8rem', 
                            fontWeight: 700, 
                            padding: '2px 8px', 
                            borderRadius: '12px',
                            border: '1px solid var(--panel-border-focus)'
                          }}>
                            Q{qIdx + 1}
                          </span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            letterSpacing: '0.05em'
                          }}>
                            {type.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                          {question.text}
                        </div>
                        
                        {/* Summary details based on type */}
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {(type === 'MULTIPLE_CHOICE' || type === 'SORTING') && Array.isArray(question.options) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                              {question.options.map((opt, oIdx) => {
                                const isCorrect = type === 'MULTIPLE_CHOICE' && question.correct_option_index === oIdx;
                                return (
                                  <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: isCorrect ? 600 : 400, color: isCorrect ? '#10b981' : 'var(--text-secondary)' }}>
                                    <span className={`option-icon ${OPTION_SHAPES[oIdx]}`} style={{ width: 10, height: 10, border: 'none', backgroundColor: isCorrect ? '#10b981' : 'transparent', opacity: isCorrect ? 1 : 0.4 }} />
                                    <span>{opt}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {type === 'DRAG_DROP' && question.options && (
                            <div>
                              <p style={{ margin: '0 0 6px 0', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                {question.options.sentence}
                              </p>
                              <p style={{ margin: 0 }}>
                                Blanks: <strong style={{ color: 'var(--accent-light)' }}>{question.options.correct?.join(', ')}</strong>
                              </p>
                            </div>
                          )}

                          {type === 'DROP_DOWN' && question.options && (
                            <div>
                              <p style={{ margin: '0 0 6px 0', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                {question.options.sentence}
                              </p>
                              <p style={{ margin: 0 }}>
                                Dropdown Correct Answers: <strong style={{ color: 'var(--accent-light)' }}>{question.options.dropdowns?.map(d => d.correct).join(', ')}</strong>
                              </p>
                            </div>
                          )}

                          {type === 'CATEGORIZE' && question.options && (
                            <div>
                              <p style={{ margin: '0 0 6px 0' }}>
                                Categories: <strong style={{ color: 'var(--accent-light)' }}>{question.options.categories?.join(', ')}</strong>
                              </p>
                              <p style={{ margin: 0 }}>
                                Items: {question.options.items?.length || 0} items mapped.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-start' }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => startEditing(question)}
                          style={{ width: 'auto', padding: '8px 12px', minWidth: 60 }}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          onClick={() => deleteQuestion(question.id)}
                          style={{ 
                            width: 'auto', 
                            padding: '8px 12px', 
                            minWidth: 60,
                            borderColor: 'rgba(239, 68, 68, 0.2)',
                            color: '#ff4b60'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setView('selection')}
                style={{ width: 'auto', minWidth: 200 }}
              >
                ← Back to Main Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
