import { useState, useEffect } from 'react';
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
  categorizeGrid: [['', ''], ['', '']],
  discussionPlaceholder: '',
  discussionSampleAnswers: '',
  discussionMaxLength: 250
};

export function QuestionEditModal({
  isOpen,
  editingQuestion,
  gameTitle,
  canEdit = true,
  onClose,
  onSave
}) {
  const [form, setForm] = useState(defaultFormState);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !editingQuestion) return;

    setError('');
    if (editingQuestion === 'new') {
      setForm(defaultFormState);
      return;
    }

    const qType = editingQuestion.type || 'MULTIPLE_CHOICE';
    const n = normalizeQuestion(editingQuestion);
    const newForm = {
      ...defaultFormState,
      questionType: qType,
      questionText: editingQuestion.text || '',
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
      const samples = Array.isArray(n.options?.sample_answers)
        ? n.options.sample_answers.join('\n')
        : (n.options?.sample_answers || '');
      newForm.discussionSampleAnswers = samples;
      newForm.discussionMaxLength = n.options?.max_length || 250;
    }

    setForm(newForm);
  }, [isOpen, editingQuestion]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, loading, onClose]);

  const updateForm = (updates) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    setError('');
    if (!canEdit) {
      setError('You do not have permission to edit questions for this game.');
      return;
    }
    if (!form.questionText.trim()) {
      setError('Question text is required.');
      return;
    }

    let optionsPayload = null;
    if (form.questionType === 'MULTIPLE_CHOICE') {
      if (!form.mcCorrectAnswer.trim()) { setError('Correct answer is required.'); return; }
      const filledDistractors = form.mcDistractors.map(d => d.trim()).filter(Boolean).slice(0, 3);
      if (filledDistractors.length === 0) { setError('Please enter at least 1 distractor (incorrect option).'); return; }
      optionsPayload = { correct_answer: form.mcCorrectAnswer.trim(), distractors: filledDistractors };
    } else if (form.questionType === 'SORTING') {
      const filledItems = form.sortingItems.map(s => s.trim()).filter(Boolean);
      if (filledItems.length < 2) { setError('A sorting question must have at least 2 items.'); return; }
      optionsPayload = { correct_sequence: filledItems };
    } else if (form.questionType === 'DRAG_DROP') {
      if (!form.dragSentence.trim()) { setError('Sentence is required.'); return; }
      const answers = extractBracketedAnswers(form.dragSentence);
      if (answers.length === 0) { setError('The sentence must contain at least one bracketed answer (e.g. [hooks]).'); return; }
      const filledDistractors = form.dragDistractors.map(d => d.trim()).filter(Boolean).slice(0, 3);
      optionsPayload = {
        sentence: form.dragSentence.trim(),
        answers_in_order: answers,
        distractors: filledDistractors
      };
    } else if (form.questionType === 'DROP_DOWN') {
      if (!form.dropdownSentence.trim()) { setError('Sentence is required.'); return; }
      const dropdowns = extractBracketedAnswers(form.dropdownSentence);
      if (dropdowns.length === 0) { setError('The sentence must contain at least one bracketed answer (e.g. [Go]).'); return; }
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
      if (categories.length < 2) { setError('Please enter at least 2 categories in the first row.'); return; }
      if (items.length === 0) { setError('Please add at least one item in any cell.'); return; }
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

    setLoading(true);
    const questionData = {
      text: form.questionText.trim(),
      options: optionsPayload,
      type: form.questionType
    };

    try {
      await onSave(questionData, editingQuestion);
      onClose();
    } catch (err) {
      setError('Failed to save question: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !editingQuestion) return null;

  return (
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
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Question Editor
            </span>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
              {editingQuestion === 'new' ? 'Add New Question' : 'Edit Question'}
            </h2>
            {gameTitle && (
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {gameTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(93,107,130,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: '1rem'
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ff4b60',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: 20
          }}>
            {error}
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
          addSortingItem={() => updateForm({ sortingItems: [...form.sortingItems, ''] })}
          removeSortingItem={(idx) => {
            if (form.sortingItems.length <= 2) return;
            updateForm({ sortingItems: form.sortingItems.filter((_, i) => i !== idx) });
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
          addDragDistractor={() => updateForm({ dragDistractors: [...form.dragDistractors, ''] })}
          removeDragDistractor={(idx) => updateForm({ dragDistractors: form.dragDistractors.filter((_, i) => i !== idx) })}
          dropdownSentence={form.dropdownSentence}
          setDropdownSentence={(v) => updateForm({ dropdownSentence: v })}
          categorizeGrid={form.categorizeGrid}
          setCategorizeGrid={(arg) => {
            const next = typeof arg === 'function' ? arg(form.categorizeGrid) : arg;
            updateForm({ categorizeGrid: next });
          }}
          discussionPlaceholder={form.discussionPlaceholder}
          setDiscussionPlaceholder={(v) => updateForm({ discussionPlaceholder: v })}
          discussionSampleAnswers={form.discussionSampleAnswers}
          setDiscussionSampleAnswers={(v) => updateForm({ discussionSampleAnswers: v })}
          discussionMaxLength={form.discussionMaxLength}
          setDiscussionMaxLength={(v) => updateForm({ discussionMaxLength: v })}
          disabled={loading}
        />

        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: '24px',
          justifyContent: 'flex-end',
          borderTop: '1px solid var(--panel-border)',
          paddingTop: '16px'
        }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ width: 'auto', minWidth: '100px' }}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            style={{
              width: 'auto',
              minWidth: '150px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Saving...</span>
              </>
            ) : (
              editingQuestion === 'new' ? '✓ Add Question' : '✓ Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
