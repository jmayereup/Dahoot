import React, { useState, useEffect, useRef } from 'react';
import { pb } from '../pb';
import { ConfirmModal } from './ConfirmModal';
import {
  splitBracketTokens,
  getBlankIndex,
  getBracketInner,
  splitCurlyTokens,
  getCurlyIndex,
  getCurlyInner
} from '../utils/blankParsing';
import { getDragDropCorrect, getDropDownCorrect, normalizeQuestion } from '../utils/questionSchema';

const OPTION_CLASSES = [
  'option-red',
  'option-blue',
  'option-yellow',
  'option-green'
];

export function QuestionsPreviewModal({
  isOpen,
  onClose,
  gameId,
  gamesList = [],
  isAuthenticated,
  currentUser,
  userInfo = null,
  gameQuestions = [],
  refreshQuestions
}) {
  const containerRef = useRef(null);


  // Editing state within the preview
  const [previewEditingQuestion, setPreviewEditingQuestion] = useState(null); // null | question object | 'new'
  const [previewEditLoading, setPreviewEditLoading] = useState(false);
  const [previewEditError, setPreviewEditError] = useState('');

  // Deletion confirm modal state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [questionToDeleteId, setQuestionToDeleteId] = useState(null);

  // Question Form States
  const [questionType, setQuestionType] = useState('MULTIPLE_CHOICE');
  const [questionText, setQuestionText] = useState('');

  // Multiple Choice
  const [mcCorrectAnswer, setMcCorrectAnswer] = useState('');
  const [mcDistractors, setMcDistractors] = useState(['', '', '']);

  // Sorting
  const [sortingItems, setSortingItems] = useState(['', '', '', '']);

  // Drag and Drop
  const [dragSentence, setDragSentence] = useState('');
  const [dragAnswers, setDragAnswers] = useState(['', '', '']);
  const [dragDistractors, setDragDistractors] = useState(['', '']);

  // Drop Down
  const [dropdownSentence, setDropdownSentence] = useState('');
  const [dropdownConfig, setDropdownConfig] = useState([
    { correct_answer: '', distractors: ['', ''] },
    { correct_answer: '', distractors: ['', ''] }
  ]);

  // Categorize
  const [categorizeCategories, setCategorizeCategories] = useState('');
  const [categorizeItemsText, setCategorizeItemsText] = useState('');

  const selectedGame = gamesList.find(g => g.id === gameId);

  // Determine if current user can edit the game
  const canEditGame = () => {
    if (!selectedGame) return false;
    if (!isAuthenticated) return false;
    const userRole = userInfo?.role || 'PLAYER';
    if (userRole === 'TEACHER' || userRole === 'ADMIN') return true;

    const creatorName = selectedGame.creator ? selectedGame.creator.toLowerCase().trim() : '';
    const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
    const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
    const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
    const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';

    return (myDahootUsername && creatorName === myDahootUsername) ||
           (myName && creatorName === myName) || 
           (myEmail && creatorName === myEmail) || 
           (myUsername && creatorName === myUsername) || 
           (currentUser?.id && creatorName === currentUser.id);
  };

  const hasEditPermission = canEditGame();

  // Escape key close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !previewEditingQuestion && !deleteConfirmOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, previewEditingQuestion, deleteConfirmOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const startCreating = () => {
    setQuestionType('MULTIPLE_CHOICE');
    setQuestionText('');
    setMcCorrectAnswer('');
    setMcDistractors(['', '', '']);
    setSortingItems(['', '', '', '']);
    setDragSentence('');
    setDragAnswers(['', '', '']);
    setDragDistractors(['', '']);
    setDropdownSentence('');
    setDropdownConfig([
      { correct_answer: '', distractors: ['', ''] },
      { correct_answer: '', distractors: ['', ''] }
    ]);
    setCategorizeCategories('');
    setCategorizeItemsText('');
    setPreviewEditingQuestion('new');
    setPreviewEditError('');
  };

  const startEditing = (question) => {
    const type = question.type || 'MULTIPLE_CHOICE';
    setQuestionType(type);
    setQuestionText(question.text || '');
    setPreviewEditError('');
    const n = normalizeQuestion(question);

    if (type === 'MULTIPLE_CHOICE') {
      setMcCorrectAnswer(n.options?.correct_answer || '');
      const dists = [...(n.options?.distractors || [])];
      while (dists.length < 3) dists.push('');
      setMcDistractors(dists);
    } else if (type === 'SORTING') {
      const seq = [...(n.options?.correct_sequence || [])];
      while (seq.length < 4) seq.push('');
      setSortingItems(seq);
    } else if (type === 'DRAG_DROP') {
      setDragSentence(n.options?.sentence || '');
      const ans = [...(n.options?.answers_in_order || [])];
      while (ans.length < 3) ans.push('');
      setDragAnswers(ans);
      const dists = [...(n.options?.distractors || [])];
      while (dists.length < 2) dists.push('');
      setDragDistractors(dists);
    } else if (type === 'DROP_DOWN') {
      setDropdownSentence(n.options?.sentence || '');
      const dds = Array.isArray(n.options?.dropdowns) ? n.options.dropdowns : [];
      const padded = dds.map(d => ({
        correct_answer: d.correct_answer || '',
        distractors: [...(d.distractors || [])]
      }));
      while (padded.length < 2) padded.push({ correct_answer: '', distractors: ['', ''] });
      padded.forEach(d => { while (d.distractors.length < 2) d.distractors.push(''); });
      setDropdownConfig(padded);
    } else if (type === 'CATEGORIZE') {
      const cats = Array.isArray(n.options?.categories) ? n.options.categories.join(', ') : '';
      setCategorizeCategories(cats);
      const items = Array.isArray(n.options?.items) ? n.options.items : [];
      const itemsLines = items.map(item => `${item.name}: ${item.category}`).join('\n');
      setCategorizeItemsText(itemsLines);
    }

    setPreviewEditingQuestion(question);
  };

  const closePreviewEditQuestion = () => {
    setPreviewEditingQuestion(null);
    setPreviewEditError('');
  };

  const preventSubmitOnEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const updateMcDistractor = (idx, value) => {
    setMcDistractors(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const updateSortingItem = (idx, value) => {
    setSortingItems(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const updateDragAnswer = (idx, value) => {
    setDragAnswers(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const updateDragDistractor = (idx, value) => {
    setDragDistractors(prev => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const updateDropdownCorrect = (idx, value) => {
    setDropdownConfig(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], correct_answer: value };
      return next;
    });
  };

  const updateDropdownDistractor = (idx, distIdx, value) => {
    setDropdownConfig(prev => {
      const next = [...prev];
      const dists = [...(next[idx].distractors || [])];
      dists[distIdx] = value;
      next[idx] = { ...next[idx], distractors: dists };
      return next;
    });
  };

  const savePreviewQuestion = async () => {
    setPreviewEditError('');
    if (!hasEditPermission) {
      setPreviewEditError('You do not have permission to edit this game.');
      return;
    }
    if (!questionText.trim()) {
      setPreviewEditError('Question text is required.');
      return;
    }

    let optionsPayload = null;
    if (questionType === 'MULTIPLE_CHOICE') {
      if (!mcCorrectAnswer.trim()) {
        setPreviewEditError('Correct answer is required.');
        return;
      }
      if (mcDistractors.some(d => !d.trim())) {
        setPreviewEditError('All 3 distractors must be filled out.');
        return;
      }
      optionsPayload = { correct_answer: mcCorrectAnswer.trim(), distractors: mcDistractors.map(d => d.trim()) };
    } else if (questionType === 'SORTING') {
      if (sortingItems.some(s => !s.trim())) {
        setPreviewEditError('All 4 sorting items must be filled out.');
        return;
      }
      optionsPayload = { correct_sequence: sortingItems.map(s => s.trim()) };
    } else if (questionType === 'DRAG_DROP') {
      if (!dragSentence.trim()) {
        setPreviewEditError('Sentence with blanks is required.');
        return;
      }
      const numBlanks = (dragSentence.match(/\[[^\]]+\]/g) || []).length;
      if (numBlanks === 0) {
        setPreviewEditError('The sentence must contain at least one blank placeholder (e.g. [blank0]).');
        return;
      }
      const activeAnswers = dragAnswers.slice(0, numBlanks);
      if (activeAnswers.some(a => !a.trim())) {
        setPreviewEditError(`Please define all ${numBlanks} correct blank answers.`);
        return;
      }
      if (dragDistractors.some(d => !d.trim())) {
        setPreviewEditError('All distractor words must be filled out.');
        return;
      }
      optionsPayload = {
        sentence: dragSentence.trim(),
        answers_in_order: activeAnswers.map(a => a.trim()),
        distractors: dragDistractors.map(d => d.trim())
      };
    } else if (questionType === 'DROP_DOWN') {
      if (!dropdownSentence.trim()) {
        setPreviewEditError('Sentence with dropdowns is required.');
        return;
      }
      const numDropdowns = (dropdownSentence.match(/\{\{\d+\}\}/g) || []).length;
      if (numDropdowns === 0) {
        setPreviewEditError('The sentence must contain at least one dropdown placeholder (e.g. {{0}}).');
        return;
      }
      const activeDropdowns = dropdownConfig.slice(0, numDropdowns);
      for (let i = 0; i < activeDropdowns.length; i++) {
        if (!activeDropdowns[i].correct_answer.trim()) {
          setPreviewEditError(`Please define the correct answer for dropdown {{${i}}}.`);
          return;
        }
        const filledDistractors = (activeDropdowns[i].distractors || []).filter(d => d.trim());
        if (filledDistractors.length < 1) {
          setPreviewEditError(`Please add at least 1 distractor for dropdown {{${i}}}.`);
          return;
        }
      }
      optionsPayload = {
        sentence: dropdownSentence.trim(),
        dropdowns: activeDropdowns.map(d => ({
          correct_answer: d.correct_answer.trim(),
          distractors: (d.distractors || []).filter(x => x.trim())
        }))
      };
    } else if (questionType === 'CATEGORIZE') {
      if (!categorizeCategories.trim()) {
        setPreviewEditError('Categories list is required.');
        return;
      }
      if (!categorizeItemsText.trim()) {
        setPreviewEditError('Items list is required.');
        return;
      }
      const categoriesList = categorizeCategories.split(',').map(c => c.trim()).filter(Boolean);
      if (categoriesList.length < 2) {
        setPreviewEditError('Please enter at least 2 categories, separated by commas.');
        return;
      }
      try {
        const itemsList = categorizeItemsText.split('\n').map(line => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const cat = parts[1].trim();
            if (!categoriesList.includes(cat)) {
              throw new Error(`Category "${cat}" does not match defined categories.`);
            }
            return { name: parts[0].trim(), category: cat };
          }
          if (line.trim()) {
            throw new Error(`Invalid line: "${line}". Must be "ItemName: CategoryName".`);
          }
          return null;
        }).filter(Boolean);
        if (itemsList.length === 0) {
          setPreviewEditError('Please enter at least one item.');
          return;
        }
        optionsPayload = { categories: categoriesList, items: itemsList };
      } catch (err) {
        setPreviewEditError(err.message);
        return;
      }
    }

    setPreviewEditLoading(true);
    const questionData = {
      game_id: gameId,
      text: questionText.trim(),
      options: optionsPayload,
      type: questionType
    };

    try {
      if (previewEditingQuestion && previewEditingQuestion !== 'new') {
        await pb.collection('dahoot_questions').update(previewEditingQuestion.id, questionData);
      } else {
        await pb.collection('dahoot_questions').create(questionData);
      }
      closePreviewEditQuestion();
      if (refreshQuestions) await refreshQuestions();
    } catch (err) {
      console.error('Error saving question:', err);
      setPreviewEditError('Failed to save question: ' + err.message);
    } finally {
      setPreviewEditLoading(false);
    }
  };

  const requestDeleteQuestion = (id) => {
    setQuestionToDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!questionToDeleteId) return;
    try {
      await pb.collection('dahoot_questions').delete(questionToDeleteId);
      setDeleteConfirmOpen(false);
      setQuestionToDeleteId(null);
      if (refreshQuestions) await refreshQuestions();
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  };

  const renderPreviewSentenceWithBlanks = (sentence) => {
    if (!sentence) return '';
    const correctAnswers = getDragDropCorrect(previewEditingQuestion || {});
    const parts = splitBracketTokens(sentence);
    return parts.map((part, idx) => {
      const numericIdx = getBlankIndex(part);
      const inner = getBracketInner(part);
      if (numericIdx !== null) {
        const blankIdx = numericIdx;
        const correctWord = correctAnswers[blankIdx] || '';
        return (
          <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
            {correctWord || '_____'}
          </span>
        );
      }
      if (inner) {
        const mappedIdx = correctAnswers.findIndex(c => c === inner);
        const blankIdx = mappedIdx !== -1 ? mappedIdx : 0;
        const correctWord = correctAnswers[blankIdx] || inner;
        return (
          <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
            {correctWord || inner}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderPreviewSentenceWithDropdowns = (sentence) => {
    if (!sentence) return '';
    const dropdowns = normalizeQuestion(previewEditingQuestion || {})?.options?.dropdowns || [];
    const parts = splitCurlyTokens(sentence);
    let sequentialDrop = 0;
    return parts.map((part, idx) => {
      const dropIdx = getCurlyIndex(part);
      const inner = getCurlyInner(part);
      if (dropIdx !== null) {
        const correctVal = getDropDownCorrect(previewEditingQuestion || {}, dropIdx);
        return (
          <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
            {correctVal || '_____'}
          </span>
        );
      }
      if (inner) {
        const mappedIdx = dropdowns.findIndex(d => d.correct_answer === inner || d.correct === inner);
        const idxToUse = mappedIdx !== -1 ? mappedIdx : sequentialDrop;
        if (mappedIdx === -1) sequentialDrop += 1;
        const config = dropdowns[idxToUse] || { correct_answer: inner };
        const correctVal = config.correct_answer || config.correct || inner;
        return (
          <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
            {correctVal}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderPreviewCategorize = (options) => {
    if (!options) return null;
    const categories = options.categories || [];
    const items = options.items || [];
    return (
      <div className="grid grid-cols-2 gap-3 mt-2">
        {categories.map((cat, cIdx) => {
          const catItems = items.filter(item => item.category === cat);
          return (
            <div key={cIdx} className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-1 truncate" title={cat}>
                Category: <span className="text-slate-800">{cat}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {catItems.map((item, iIdx) => (
                  <span key={iIdx} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10px] font-semibold rounded-lg truncate max-w-full">
                    {item.name}
                  </span>
                ))}
                {catItems.length === 0 && (
                  <span className="text-[10px] text-slate-400 italic">No items</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPreviewOptions = (question) => {
    const type = question.type || 'MULTIPLE_CHOICE';
    const n = normalizeQuestion(question);

    if (type === 'MULTIPLE_CHOICE') {
      const correct = n.options?.correct_answer || '';
      const merged = [correct, ...(n.options?.distractors || [])];
      return (
        <div className="flex flex-col gap-2">
          {merged.map((opt, oIdx) => {
            const isCorrect = opt === correct;
            return (
              <div
                key={oIdx}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs transition-colors ${
                  isCorrect
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                    : 'border-slate-100 bg-slate-50/50 text-slate-500'
                }`}
              >
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                  isCorrect
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCorrect ? '✓' : ['A', 'B', 'C', 'D'][oIdx]}
                </span>
                <span className="truncate" title={opt}>{opt}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'SORTING') {
      const opts = n.options?.correct_sequence || [];
      return (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
            <span><span>✨ Correct Sorted Order:</span></span>
          </div>
          {opts.map((opt, oIdx) => (
            <div
              key={oIdx}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium text-xs shadow-xs"
            >
              <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 bg-emerald-500 text-white">
                {oIdx + 1}
              </span>
              <span className="truncate" title={opt}>{opt}</span>
            </div>
          ))}
        </div>
      );
    }

    if (type === 'DRAG_DROP' && question.options) {
      return (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sentence:</div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
            {renderPreviewSentenceWithBlanks(question.options.sentence)}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mr-1">Blanks:</span>
            {(n.options?.answers_in_order || []).map((word, wIdx) => (
              <span key={wIdx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                {word}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (type === 'DROP_DOWN' && question.options) {
      return (
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sentence:</div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
            {renderPreviewSentenceWithDropdowns(question.options.sentence)}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mr-1">Dropdowns:</span>
            {(n.options?.dropdowns || []).map((d, dIdx) => (
              <span key={dIdx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                {d.correct_answer || d.correct}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (type === 'CATEGORIZE' && question.options) {
      return renderPreviewCategorize(question.options);
    }

    return null;
  };

  const renderQuestionFormFields = () => {
    return (
      <>
        {/* Question Type Selector */}
        <div className="form-group" style={{ maxWidth: '300px' }}>
          <label className="form-label">Question Type</label>
          <select 
            className="form-input" 
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
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
            onKeyDown={preventSubmitOnEnter}
          />
        </div>

        {/* 1. MULTIPLE CHOICE */}
        {questionType === 'MULTIPLE_CHOICE' && (
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
                value={mcCorrectAnswer}
                onChange={(e) => setMcCorrectAnswer(e.target.value)}
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
                  className={`teacher-option-input-card ${OPTION_CLASSES[idx]}`}
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
                    style={{ padding: '10px 14px', fontSize: '0.95rem' }}
                    onKeyDown={preventSubmitOnEnter}
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
                    onKeyDown={preventSubmitOnEnter}
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
              />
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Blank Answers (in sentence order)</label>
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
                      onKeyDown={preventSubmitOnEnter}
                    />
                  </div>
                );
              })}
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Distractor Words (decoys)</label>
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
                    onKeyDown={preventSubmitOnEnter}
                  />
                </div>
              ))}
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
                placeholder="e.g.&#10;React: Frameworks&#10;JavaScript: Languages&#10;MongoDB: Databases"
                rows={6}
                value={categorizeItemsText}
                onChange={(e) => setCategorizeItemsText(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              />
            </div>
          </div>
        )}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 1. MAIN QUESTIONS LIST PREVIEW MODAL */}
      <div 
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(9, 10, 15, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px'
        }}
      >
        <div 
          className="panel panel-large animate-join-focus p-4 sm:p-7" 
          style={{ 
            width: '95%', 
            maxWidth: '1200px', 
            maxHeight: '94vh', 
            overflowY: 'auto',
            textAlign: 'left',
            border: '1px solid var(--panel-border-focus)',
            position: 'relative'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px', 
            borderBottom: '1px solid var(--panel-border)',
            paddingBottom: '15px',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Questions ({gameQuestions.length})
              </span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                {selectedGame ? selectedGame.title : 'Preview Quiz'}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {hasEditPermission && (
                <button
                  onClick={startCreating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                >
                  ➕ Add Question
                </button>
              )}
              <button 
                onClick={onClose}
                className="bg-black/[0.04] hover:bg-black/[0.08]"
                style={{
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {gameQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>This Dahoot has no questions yet.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                {hasEditPermission && (
                  <button className="btn btn-primary" onClick={startCreating} style={{ width: 'auto' }}>➕ Add Question</button>
                )}
                <button className="btn btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Close</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gameQuestions.map((question, qIdx) => (
                <div 
                  key={question.id} 
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      {/* Header */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-rose-50 text-rose-600 border border-rose-100 font-bold px-2.5 py-0.5 rounded-full text-xs">
                            Q{qIdx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {(question.type || 'MULTIPLE_CHOICE').replace('_', ' ')}
                          </span>
                        </div>
                        {hasEditPermission && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditing(question)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit question"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => requestDeleteQuestion(question.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="Delete question"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Question Text */}
                      <div className="font-bold text-slate-800 text-sm mb-4 leading-relaxed line-clamp-3" title={question.text}>
                        {question.text}
                      </div>
                    </div>

                    {/* Render specific option details */}
                    <div>
                      {renderPreviewOptions(question)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. SUB-MODAL FOR EDITING/CREATING A QUESTION */}
      {previewEditingQuestion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(9, 10, 15, 0.7)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px'
        }}>
          <div
            className="panel panel-large animate-join-focus p-4 sm:p-7"
            style={{
              width: '100%',
              maxWidth: '750px',
              maxHeight: '94vh',
              overflowY: 'auto',
              textAlign: 'left',
              border: '1px solid var(--panel-border-focus)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '15px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question Editor</span>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                  {previewEditingQuestion === 'new' ? 'Add New Question' : 'Edit Question'}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedGame?.title || 'Preview Quiz'}
                </p>
              </div>
              <button
                type="button"
                onClick={closePreviewEditQuestion}
                style={{ background: 'rgba(93,107,130,0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '1rem' }}
              >✕</button>
            </div>

            {previewEditError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ff4b60', padding: '12px 16px', borderRadius: '8px', marginBottom: 20 }}>
                {previewEditError}
              </div>
            )}

            <div>
              {renderQuestionFormFields()}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: '24px', justifyContent: 'flex-end', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={closePreviewEditQuestion} style={{ width: 'auto', minWidth: '100px' }} disabled={previewEditLoading}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={savePreviewQuestion} style={{ width: 'auto', minWidth: '150px' }} disabled={previewEditLoading}>
                {previewEditLoading ? 'Saving...' : (previewEditingQuestion === 'new' ? '✓ Add Question' : '✓ Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DELETION CONFIRMATION DIALOG */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setQuestionToDeleteId(null);
        }}
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
