import { useState, useEffect, useCallback } from 'react';
import { pb } from '../pb';
import { ConfirmModal } from './ConfirmModal';
import { QuestionPreviewCard } from './QuestionPreviewCard';
import { QuestionFormFields } from './QuestionFormFields';
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
    setEditError('');
    const qType = question.type || 'MULTIPLE_CHOICE';
    const n = normalizeQuestion(question);
    const newForm = {
      ...EMPTY_FORM,
      questionType: qType,
      questionText: question.text || '',
      mcCorrectAnswer: '',
      mcDistractors: ['', '', ''],
      sortingItems: ['', '', '', ''],
      dragSentence: '',
      dragDistractors: [''],
      dropdownSentence: '',
      categorizeGrid: [['', ''], ['', '']],
      discussionPlaceholder: '',
      discussionSampleAnswers: '',
      discussionMaxLength: 250
    };

    if (qType === 'MULTIPLE_CHOICE') {
      newForm.mcCorrectAnswer = n.options?.correct_answer || '';
      const dists = [...(n.options?.distractors || [])];
      while (dists.length < 3) dists.push('');
      newForm.mcDistractors = dists;
    } else if (qType === 'SORTING') {
      const seq = [...(n.options?.correct_sequence || [])];
      while (seq.length < 2) seq.push('');
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
    } else if (qType === 'DISCUSSION') {
      newForm.discussionPlaceholder = n.options?.placeholder || '';
      const samples = Array.isArray(n.options?.sample_answers) ? n.options.sample_answers.join('\n') : (n.options?.sample_answers || '');
      newForm.discussionSampleAnswers = samples;
      newForm.discussionMaxLength = n.options?.max_length || 250;
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
      if (form.sortingItems.length < 2) { setEditError('A sorting question must have at least 2 items.'); return; }
      if (form.sortingItems.some(s => !s.trim())) { setEditError('All sorting items must be filled out.'); return; }
      optionsPayload = { correct_sequence: form.sortingItems.map(s => s.trim()) };
    } else if (form.questionType === 'DRAG_DROP') {
      if (!form.dragSentence.trim()) { setEditError('Sentence is required.'); return; }
      const answers = extractBracketedAnswers(form.dragSentence);
      if (answers.length === 0) { setEditError('The sentence must contain at least one bracketed answer (e.g. [hooks]).'); return; }
      const filledDistractors = form.dragDistractors.map(d => d.trim()).filter(Boolean).slice(0, 3);
      optionsPayload = {
        sentence: form.dragSentence.trim(),
        answers_in_order: answers,
        distractors: filledDistractors
      };
    } else if (form.questionType === 'DROP_DOWN') {
      if (!form.dropdownSentence.trim()) { setEditError('Sentence is required.'); return; }
      const dropdowns = extractBracketedAnswers(form.dropdownSentence);
      if (dropdowns.length === 0) { setEditError('The sentence must contain at least one bracketed answer (e.g. [Go]).'); return; }
      const filledDistractors = form.dragDistractors.map(d => d.trim()).filter(Boolean).slice(0, 3);
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
    } else if (form.questionType === 'DISCUSSION') {
      const sampleAnswersArr = typeof form.discussionSampleAnswers === 'string'
        ? form.discussionSampleAnswers.split('\n').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(form.discussionSampleAnswers) ? form.discussionSampleAnswers : []);
      optionsPayload = {
        placeholder: form.discussionPlaceholder ? form.discussionPlaceholder.trim() : '',
        sample_answers: sampleAnswersArr,
        max_length: parseInt(form.discussionMaxLength, 10) || 250
      };
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

          {error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#ff4b60' }}>
              <p>{error}</p>
              <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: '16px' }}>Close</button>
            </div>
          ) : questions.length > 0 ? (
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s' }}
            >
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
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Loading questions...</p>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>This Dahoot has no questions yet.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                {canEdit && (
                  <button className="btn btn-primary" onClick={startCreating} style={{ width: 'auto' }}>➕ Add Question</button>
                )}
                <button className="btn btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Close</button>
              </div>
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

            <QuestionFormFields
              questionType={form.questionType}
              setQuestionType={(v) => updateForm({ questionType: v })}
              questionText={form.questionText}
              setQuestionText={(v) => updateForm({ questionText: v })}
              mcCorrectAnswer={form.mcCorrectAnswer}
              setMcCorrectAnswer={(v) => updateForm({ mcCorrectAnswer: v })}
              mcDistractors={form.mcDistractors}
              updateMcDistractor={(idx, val) => {
                if (Array.isArray(idx)) {
                  updateForm({ mcDistractors: idx });
                } else {
                  const next = [...form.mcDistractors];
                  next[idx] = val;
                  updateForm({ mcDistractors: next });
                }
              }}
              sortingItems={form.sortingItems}
              updateSortingItem={(idx, val) => {
                if (Array.isArray(idx)) {
                  updateForm({ sortingItems: idx });
                } else {
                  const next = [...form.sortingItems];
                  next[idx] = val;
                  updateForm({ sortingItems: next });
                }
              }}
              dragSentence={form.dragSentence}
              setDragSentence={(v) => updateForm({ dragSentence: v })}
              dragDistractors={form.dragDistractors}
              updateDragDistractor={(idx, val) => {
                if (Array.isArray(idx)) {
                  updateForm({ dragDistractors: idx });
                } else {
                  const next = [...form.dragDistractors];
                  next[idx] = val;
                  updateForm({ dragDistractors: next });
                }
              }}
              dropdownSentence={form.dropdownSentence}
              setDropdownSentence={(v) => updateForm({ dropdownSentence: v })}
              categorizeGrid={form.categorizeGrid}
              setCategorizeGrid={(arg) => {
                if (typeof arg === 'function') {
                  setForm(prev => ({ ...prev, categorizeGrid: arg(prev.categorizeGrid) }));
                } else {
                  updateForm({ categorizeGrid: arg });
                }
              }}
              discussionPlaceholder={form.discussionPlaceholder}
              setDiscussionPlaceholder={(v) => updateForm({ discussionPlaceholder: v })}
              discussionSampleAnswers={form.discussionSampleAnswers}
              setDiscussionSampleAnswers={(v) => updateForm({ discussionSampleAnswers: v })}
              discussionMaxLength={form.discussionMaxLength}
              setDiscussionMaxLength={(v) => updateForm({ discussionMaxLength: v })}
              disabled={editLoading}
            />

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
