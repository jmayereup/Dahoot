import { useState, useEffect, useCallback } from 'react';
import { pb } from '../pb';
import { ConfirmModal } from './ConfirmModal';
import { QuestionPreviewCard } from './QuestionPreviewCard';
import {
  normalizeQuestion,
  extractBracketedAnswers,
  legacyDragSentenceToBracketed,
  legacyDropDownSentenceToBracketed,
  unionDropDownDistractors,
  categorizeOptionsToGrid,
  categorizeGridToOptions,
  QUESTION_TYPE_PROMPTS
} from '../utils/questionSchema';

const OPTION_CLASSES = [
  'option-red',
  'option-blue',
  'option-yellow',
  'option-green'
];

const defaultFormState = {
  questionType: 'MULTIPLE_CHOICE',
  questionText: QUESTION_TYPE_PROMPTS.MULTIPLE_CHOICE,
  mcCorrectAnswer: '',
  mcDistractors: ['', '', ''],
  sortingItems: ['', '', '', ''],
  dragSentence: '',
  dragDistractors: [''],
  dropdownSentence: '',
  categorizeGrid: [['', ''], ['', '']]
};

export function PreviewModal({
  isOpen,
  onClose,
  game,
  gameId,
  questions: externalQuestions,
  canEdit,
  currentUser,
  userInfo,
  onSaveQuestion: onSaveQuestionProp,
  onDeleteQuestion: onDeleteQuestionProp,
  onImport,
  standalone
}) {
  const effectiveGameId = gameId || game?.id;
  const [questions, setQuestions] = useState(externalQuestions || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [questionToDeleteId, setQuestionToDeleteId] = useState(null);

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [form, setForm] = useState(defaultFormState);

  const resetForm = useCallback(() => {
    setForm(defaultFormState);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (externalQuestions) {
        setQuestions(externalQuestions);
      } else if (standalone && effectiveGameId) {
        loadQuestions();
      }
    }
  }, [isOpen, effectiveGameId]);

  useEffect(() => {
    if (externalQuestions) {
      setQuestions(externalQuestions);
    }
  }, [externalQuestions]);

  const loadQuestions = async () => {
    if (!effectiveGameId) return;
    setLoading(true);
    setError('');
    try {
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: effectiveGameId }),
        sort: 'created'
      });
      setQuestions(qList);
    } catch (err) {
      setError('Failed to load questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !editingQuestion && !deleteConfirmOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, editingQuestion, deleteConfirmOpen]);

  const startCreating = () => {
    resetForm();
    setEditingQuestion('new');
    setEditError('');
  };

  const startEditing = (question) => {
    const qType = question.type || 'MULTIPLE_CHOICE';
    setEditError('');
    const n = normalizeQuestion(question);
    const newForm = {
      questionType: qType,
      questionText: question.text || '',
      mcCorrectAnswer: '',
      mcDistractors: ['', '', ''],
      sortingItems: ['', '', '', ''],
      dragSentence: '',
      dragDistractors: [''],
      dropdownSentence: '',
      categorizeGrid: [['', ''], ['', '']]
    };

    if (qType === 'MULTIPLE_CHOICE') {
      newForm.mcCorrectAnswer = n.options?.correct_answer || '';
      const dists = [...(n.options?.distractors || [])];
      while (dists.length < 3) dists.push('');
      newForm.mcDistractors = dists;
    } else if (qType === 'SORTING') {
      const seq = [...(n.options?.correct_sequence || [])];
      while (seq.length < 4) seq.push('');
      newForm.sortingItems = seq;
    } else if (qType === 'DRAG_DROP') {
      const rawSentence = n.options?.sentence || '';
      const answers = n.options?.answers_in_order || [];
      newForm.dragSentence = legacyDragSentenceToBracketed(rawSentence, answers);
      const dists = (n.options?.distractors || []).filter(d => (d || '').trim());
      newForm.dragDistractors = dists.length ? dists : [''];
    } else if (qType === 'DROP_DOWN') {
      const rawSentence = n.options?.sentence || '';
      const dds = Array.isArray(n.options?.dropdowns) ? n.options.dropdowns : [];
      newForm.dropdownSentence = legacyDropDownSentenceToBracketed(rawSentence, dds);
      const union = unionDropDownDistractors(dds);
      newForm.dragDistractors = union.length ? union : [''];
    } else if (qType === 'CATEGORIZE') {
      newForm.categorizeGrid = categorizeOptionsToGrid(n.options);
    }

    setForm(newForm);
    setEditingQuestion(question);
  };

  const closeEdit = () => {
    setEditingQuestion(null);
    setEditError('');
  };

  const updateForm = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const updateMcDistractor = (idx, value) => {
    setForm(prev => {
      const next = [...prev.mcDistractors];
      next[idx] = value;
      return { ...prev, mcDistractors: next };
    });
  };

  const updateSortingItem = (idx, value) => {
    setForm(prev => {
      const next = [...prev.sortingItems];
      next[idx] = value;
      return { ...prev, sortingItems: next };
    });
  };

  const updateDragDistractor = (idx, value) => {
    setForm(prev => {
      const next = [...prev.dragDistractors];
      next[idx] = value;
      return { ...prev, dragDistractors: next };
    });
  };

  const saveQuestion = async () => {
    setEditError('');
    if (!canEdit) {
      setEditError('You do not have permission to edit this game.');
      return;
    }
    if (!form.questionText.trim()) {
      setEditError('Question text is required.');
      return;
    }

    let optionsPayload = null;
    if (form.questionType === 'MULTIPLE_CHOICE') {
      if (!form.mcCorrectAnswer.trim()) { setEditError('Correct answer is required.'); return; }
      if (form.mcDistractors.some(d => !d.trim())) { setEditError('All 3 distractors must be filled out.'); return; }
      optionsPayload = { correct_answer: form.mcCorrectAnswer.trim(), distractors: form.mcDistractors.map(d => d.trim()) };
    } else if (form.questionType === 'SORTING') {
      if (form.sortingItems.some(s => !s.trim())) { setEditError('All 4 sorting items must be filled out.'); return; }
      optionsPayload = { correct_sequence: form.sortingItems.map(s => s.trim()) };
    } else if (form.questionType === 'DRAG_DROP') {
      if (!form.dragSentence.trim()) { setEditError('Sentence is required.'); return; }
      const answers = extractBracketedAnswers(form.dragSentence);
      if (answers.length === 0) { setEditError('The sentence must contain at least one bracketed answer (e.g. [hooks]).'); return; }
      const filledDistractors = form.dragDistractors.map(d => d.trim()).filter(Boolean);
      optionsPayload = {
        sentence: form.dragSentence.trim(),
        answers_in_order: answers,
        distractors: filledDistractors
      };
    } else if (form.questionType === 'DROP_DOWN') {
      if (!form.dropdownSentence.trim()) { setEditError('Sentence is required.'); return; }
      const dropdowns = extractBracketedAnswers(form.dropdownSentence);
      if (dropdowns.length === 0) { setEditError('The sentence must contain at least one bracketed answer (e.g. [Go]).'); return; }
      const filledDistractors = form.dragDistractors.map(d => d.trim()).filter(Boolean);
      optionsPayload = {
        sentence: form.dropdownSentence.trim(),
        dropdowns: dropdowns.map(correct => ({
          correct_answer: correct,
          distractors: filledDistractors
        }))
      };
    } else if (form.questionType === 'CATEGORIZE') {
      const { categories, items } = categorizeGridToOptions(form.categorizeGrid);
      if (categories.length < 2) { setEditError('Please enter at least 2 categories in the first row.'); return; }
      if (items.length === 0) { setEditError('Please add at least one item in any cell.'); return; }
      optionsPayload = { categories, items };
    }

    setEditLoading(true);
    const questionData = {
      game_id: effectiveGameId,
      text: form.questionText.trim(),
      options: optionsPayload,
      type: form.questionType
    };

    try {
      if (standalone) {
        if (editingQuestion && editingQuestion !== 'new') {
          await pb.collection('dahoot_questions').update(editingQuestion.id, questionData);
        } else {
          await pb.collection('dahoot_questions').create(questionData);
        }
        await loadQuestions();
      } else if (onSaveQuestionProp) {
        await onSaveQuestionProp(questionData, editingQuestion);
      }
      closeEdit();
    } catch (err) {
      setEditError('Failed to save question: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const requestDeleteQuestion = (id) => {
    setQuestionToDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!questionToDeleteId) return;
    try {
      if (standalone) {
        await pb.collection('dahoot_questions').delete(questionToDeleteId);
        await loadQuestions();
      } else if (onDeleteQuestionProp) {
        await onDeleteQuestionProp(questionToDeleteId);
        setQuestions(prev => prev.filter(q => q.id !== questionToDeleteId));
      }
      setDeleteConfirmOpen(false);
      setQuestionToDeleteId(null);
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  };

  const preventSubmitOnEnter = (e) => {
    if (e.key === 'Enter') e.preventDefault();
  };

  const renderQuestionFormFields = () => {
    return (
      <>
        <div className="form-group" style={{ maxWidth: '300px' }}>
          <label className="form-label">Question Type</label>
          <select
            className="form-input"
            value={form.questionType}
            onChange={(e) => updateForm({ questionType: e.target.value })}
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
            value={form.questionText}
            onChange={(e) => updateForm({ questionText: e.target.value })}
            onKeyDown={preventSubmitOnEnter}
          />
        </div>

        {form.questionType === 'MULTIPLE_CHOICE' && (
          <div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Correct Answer</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                Enter the correct answer first, then add 3 distractors below.
              </p>
              <input
                type="text"
                className="form-input"
                placeholder="Correct answer"
                value={form.mcCorrectAnswer}
                onChange={(e) => updateForm({ mcCorrectAnswer: e.target.value })}
                onKeyDown={preventSubmitOnEnter}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Distractors (3 incorrect choices)</label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
              {form.mcDistractors.map((dist, idx) => (
                <div key={idx} className={`teacher-option-input-card ${OPTION_CLASSES[idx]}`} style={{ background: '#ffffff', border: '1px solid rgba(93, 107, 130, 0.15)', borderRadius: 'var(--radius-sm)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="option-icon" style={{ width: 20, height: 20, border: 'none', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {['A', 'B', 'C'][idx]}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Distractor {idx + 1}
                    </span>
                  </div>
                  <input type="text" className="form-input" placeholder={`Distractor ${idx + 1}`} value={dist} onChange={(e) => updateMcDistractor(idx, e.target.value)} style={{ padding: '10px 14px', fontSize: '0.95rem' }} onKeyDown={preventSubmitOnEnter} />
                </div>
              ))}
            </div>
          </div>
        )}

        {form.questionType === 'SORTING' && (
          <div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Sorting Elements (Correct Order)</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 16 }}>
                Enter items in their <strong>correct sorted order</strong> (top to bottom).
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, maxWidth: '600px' }}>
              {form.sortingItems.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 30, fontWeight: 700, color: 'var(--accent-light)' }}>#{idx + 1}</span>
                  <input type="text" className="form-input" placeholder={`Sorted Item ${idx + 1}`} value={opt} onChange={(e) => updateSortingItem(idx, e.target.value)} onKeyDown={preventSubmitOnEnter} />
                </div>
              ))}
            </div>
          </div>
        )}

        {form.questionType === 'DRAG_DROP' && (
          <div>
            <div className="form-group">
              <label className="form-label">Sentence with Blanks</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                Write a sentence using placeholders like <code>[blank0]</code>, <code>[blank1]</code>, etc.
              </p>
              <textarea className="form-input" placeholder="e.g. In React, we use [blank0] to manage state and [blank1] for side effects." rows={2} value={form.dragSentence} onChange={(e) => updateForm({ dragSentence: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Blank Answers (in sentence order)</label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7 max-w-[600px]">
              {form.dragAnswers.map((answer, idx) => {
                const isBlankUsed = form.dragSentence.includes(`[blank${idx}]`);
                return (
                  <div key={idx} className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', color: isBlankUsed ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {isBlankUsed ? `Answer for [blank${idx}]` : `Answer ${idx + 1} (Optional)`}
                    </label>
                    <input type="text" className="form-input" placeholder={`Correct word for [blank${idx}]`} value={answer} onChange={(e) => updateDragAnswer(idx, e.target.value)} onKeyDown={preventSubmitOnEnter} />
                  </div>
                );
              })}
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Distractor Words (decoys)</label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7 max-w-[600px]">
              {form.dragDistractors.map((dist, idx) => (
                <div key={idx} className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Distractor {idx + 1}</label>
                  <input type="text" className="form-input" placeholder={`Distractor word ${idx + 1}`} value={dist} onChange={(e) => updateDragDistractor(idx, e.target.value)} onKeyDown={preventSubmitOnEnter} />
                </div>
              ))}
            </div>
          </div>
        )}

        {form.questionType === 'DROP_DOWN' && (
          <div>
            <div className="form-group">
              <label className="form-label">Sentence with Dropdown slots</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                Write a sentence using placeholders like <code>{'{{0}}'}</code>, <code>{'{{1}}'}</code> for the dropdowns.
              </p>
              <textarea className="form-input" placeholder="e.g. PocketBase is written in {{0}} and uses {{1}} database." rows={2} value={form.dropdownSentence} onChange={(e) => updateForm({ dropdownSentence: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Dropdown Configuration</label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28, maxWidth: '600px' }}>
              {form.dropdownConfig.map((dd, idx) => {
                const isUsed = form.dropdownSentence.includes(`{{${idx}}}`);
                if (!isUsed && idx > 0) return null;
                return (
                  <div key={idx} className="form-group" style={{ margin: 0, padding: 12, border: '1px solid rgba(93, 107, 130, 0.15)', borderRadius: 8 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', color: isUsed ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {isUsed ? `Dropdown {{${idx}}}` : `Unused Dropdown ${idx}`}
                    </label>
                    <input type="text" className="form-input" placeholder="Correct answer" value={dd.correct_answer || ''} onChange={(e) => updateDropdownCorrect(idx, e.target.value)} style={{ marginBottom: 8 }} onKeyDown={preventSubmitOnEnter} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {(dd.distractors || []).map((dist, dIdx) => (
                        <input key={dIdx} type="text" className="form-input" placeholder={`Distractor ${dIdx + 1}`} value={dist} onChange={(e) => updateDropdownDistractor(idx, dIdx, e.target.value)} onKeyDown={preventSubmitOnEnter} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {form.questionType === 'CATEGORIZE' && (
          <div>
            <div className="form-group">
              <label className="form-label">Categories (Separated by Commas)</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                Enter up to 4 category names, separated by commas.
              </p>
              <input type="text" className="form-input" placeholder="e.g. Languages, Frameworks, Databases" value={form.categorizeCategories} onChange={(e) => updateForm({ categorizeCategories: e.target.value })} onKeyDown={preventSubmitOnEnter} />
            </div>
            <div className="form-group">
              <label className="form-label">Items and Category Mapping</label>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: -4, marginBottom: 12 }}>
                Write one item per line, with the format <code>Item: CategoryName</code>.
              </p>
              <textarea className="form-input" placeholder={'e.g.\nReact: Frameworks\nJavaScript: Languages'} rows={6} value={form.categorizeItemsText} onChange={(e) => updateForm({ categorizeItemsText: e.target.value })} style={{ fontFamily: 'monospace', fontSize: '0.9rem' }} />
            </div>
          </div>
        )}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(9, 10, 15, 0.85)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
      }}>
        <div className="panel panel-large animate-join-focus p-4 sm:p-7" style={{
          width: '95%', maxWidth: '1200px', maxHeight: '94vh', overflowY: 'auto',
          textAlign: 'left', border: '1px solid var(--panel-border-focus)', position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '15px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Questions ({questions.length})
              </span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                {game?.title || 'Preview Quiz'}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <button onClick={startCreating} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer">
                  ➕ Add Question
                </button>
              )}
              {canEdit && onImport && (
                <button onClick={onImport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors cursor-pointer">
                  📥 Import
                </button>
              )}
              <button onClick={onClose} className="bg-black/[0.04] hover:bg-black/[0.08]" style={{ border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                ✕
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Loading questions...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#ff4b60' }}>
              <p>{error}</p>
              <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: '16px' }}>Close</button>
            </div>
          ) : questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>This Dahoot has no questions yet.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                {canEdit && (
                  <button className="btn btn-primary" onClick={startCreating} style={{ width: 'auto' }}>➕ Add Question</button>
                )}
                <button className="btn btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Close</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {questions.map((question, qIdx) => (
                <QuestionPreviewCard
                  key={question.id}
                  question={question}
                  index={qIdx}
                  canEdit={canEdit}
                  onEdit={startEditing}
                  onDelete={requestDeleteQuestion}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {editingQuestion && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 10, 15, 0.7)', backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
        }}>
          <div className="panel panel-large animate-join-focus p-4 sm:p-7" style={{
            width: '100%', maxWidth: '750px', maxHeight: '94vh', overflowY: 'auto',
            textAlign: 'left', border: '1px solid var(--panel-border-focus)', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '15px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question Editor</span>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                  {editingQuestion === 'new' ? 'Add New Question' : 'Edit Question'}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{game?.title || 'Preview Quiz'}</p>
              </div>
              <button type="button" onClick={closeEdit} style={{ background: 'rgba(93,107,130,0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '1rem' }}>✕</button>
            </div>

            {editError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ff4b60', padding: '12px 16px', borderRadius: '8px', marginBottom: 20 }}>
                {editError}
              </div>
            )}

            <div>{renderQuestionFormFields()}</div>

            <div style={{ display: 'flex', gap: 12, marginTop: '24px', justifyContent: 'flex-end', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={closeEdit} style={{ width: 'auto', minWidth: '100px' }} disabled={editLoading}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={saveQuestion} style={{ width: 'auto', minWidth: '150px' }} disabled={editLoading}>
                {editLoading ? 'Saving...' : (editingQuestion === 'new' ? '✓ Add Question' : '✓ Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setQuestionToDeleteId(null); }}
        onConfirm={handleConfirmDelete}
        title="Delete this question?"
        message="This action cannot be undone and will delete the question permanently from the database."
        confirmText="Delete Question"
        cancelText="Keep Question"
        variant="danger"
        icon="🗑️"
      />
    </>
  );
}
