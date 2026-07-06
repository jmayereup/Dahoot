import React, { useState, useEffect } from 'react';
import { OPTION_CLASSES, BUCKET_COLORS } from '../constants';
import { splitCurlyTokens, getCurlyIndex, getCurlyInner, splitBracketTokens, getBlankIndex, getBracketInner } from '../utils/blankParsing';
import { shuffleArray } from '../utils/shuffle';
import { normalizeQuestion, getMcOptions, getMcCorrectAnswer, getDragDropChoices, getDragDropCorrect, getDropDownChoices, getDropDownCorrect, getSortingCorrect, isScrambleSentence } from '../utils/questionSchema';

export function QuestionInteraction({
  question,
  questionNumber,
  totalQuestions,
  roundNumber,
  mode,
  onSubmit,
  playerAnswer,
  _isCorrect,
  categorizeIdx: externalCategorizeIdx,
  onCategorizeIdxChange,
}) {
  const type = question?.type || 'MULTIPLE_CHOICE';

  const [sortingPool, setSortingPool] = useState([]);
  const [sortedItems, setSortedItems] = useState([]);
  const [placedWords, setPlacedWords] = useState([]);
  const [activeBlankIdx, setActiveBlankIdx] = useState(0);
  const [dropdownSelections, setDropdownSelections] = useState([]);
  const [categorizeIdx, setCategorizeIdx] = useState(0);
  const [categoryAssignments, setCategoryAssignments] = useState({});

  const effectiveCategorizeIdx = externalCategorizeIdx !== undefined ? externalCategorizeIdx : categorizeIdx;
  const effectiveSetCategorizeIdx = onCategorizeIdxChange || setCategorizeIdx;

  useEffect(() => {
    if (!question) return;
    const n = normalizeQuestion(question);
    if (type === 'SORTING' && n?.options?.correct_sequence) {
      setSortingPool(shuffleArray(n.options.correct_sequence));
      setSortedItems([]);
    } else if (type === 'DRAG_DROP' && n?.options) {
      const correctLen = (n.options.answers_in_order || []).length;
      setPlacedWords(Array(correctLen).fill(null));
      setActiveBlankIdx(0);
    } else if (type === 'DROP_DOWN' && n?.options?.dropdowns) {
      const dropLen = n.options.dropdowns.length;
      setDropdownSelections(Array(dropLen).fill(''));
    } else if (type === 'CATEGORIZE' && n?.options) {
      effectiveSetCategorizeIdx(0);
      setCategoryAssignments({});
    }
  }, [question, type, effectiveSetCategorizeIdx]);

  const handlePoolItemClick = (item) => {
    if (sortedItems.includes(item)) return;
    setSortedItems([...sortedItems, item]);
  };

  const handleSortedItemClick = (item) => {
    setSortedItems(sortedItems.filter(i => i !== item));
  };

  const handlePoolWordTap = (word) => {
    if (placedWords.includes(word)) return;
    let fillIdx = activeBlankIdx;
    if (placedWords[fillIdx] !== null) {
      fillIdx = placedWords.indexOf(null);
    }
    if (fillIdx !== -1) {
      const updated = [...placedWords];
      updated[fillIdx] = word;
      setPlacedWords(updated);
      const nextEmpty = updated.indexOf(null);
      if (nextEmpty !== -1) {
        setActiveBlankIdx(nextEmpty);
      }
    }
  };

  const handleBlankTap = (blankIdx) => {
    if (placedWords[blankIdx] !== null) {
      const updated = [...placedWords];
      updated[blankIdx] = null;
      setPlacedWords(updated);
      setActiveBlankIdx(blankIdx);
    } else {
      setActiveBlankIdx(blankIdx);
    }
  };

  const handleDropdownChange = (idx, val) => {
    const updated = [...dropdownSelections];
    updated[idx] = val;
    setDropdownSelections(updated);
  };

  const handleCategorizeChoice = (itemName, category) => {
    const updated = { ...categoryAssignments };
    updated[itemName] = category;
    setCategoryAssignments(updated);
    effectiveSetCategorizeIdx(prev => prev + 1);
  };

  const handleCategorizeReset = () => {
    effectiveSetCategorizeIdx(0);
    setCategoryAssignments({});
  };

  const allCategorized = effectiveCategorizeIdx >= (question?.options?.items?.length || 0);

  const renderPlayerSentenceBlanks = (sentence) => {
    if (!sentence) return '';
    const parts = splitBracketTokens(sentence);
    return parts.map((part, idx) => {
      const numericIdx = getBlankIndex(part);
      const inner = getBracketInner(part);
      if (numericIdx !== null) {
        const blankIdx = numericIdx;
        const word = placedWords[blankIdx];
        const isActive = blankIdx === activeBlankIdx;
        return (
          <span
            key={idx}
            onClick={() => handleBlankTap(blankIdx)}
            className={`player-sentence-blank ${word ? 'filled' : ''} ${isActive ? 'active' : ''}`}
          >
            {word || '_____'}
          </span>
        );
      }
      if (inner) {
        let mappedIdx = -1;
        const correctAnswers = getDragDropCorrect(question) || [];
        if (correctAnswers.length) mappedIdx = correctAnswers.findIndex(c => c === inner);
        const blankIdx = mappedIdx !== -1 ? mappedIdx : 0;
        const word = placedWords[blankIdx];
        const isActive = blankIdx === activeBlankIdx;
        return (
          <span
            key={idx}
            onClick={() => handleBlankTap(blankIdx)}
            className={`player-sentence-blank ${word ? 'filled' : ''} ${isActive ? 'active' : ''}`}
          >
            {word || '_____'}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderPlayerSentenceDropdowns = (sentence, dropdowns) => {
    if (!sentence || !Array.isArray(dropdowns)) return '';
    const parts = splitCurlyTokens(sentence);
    let sequentialDrop = 0;
    return parts.map((part, idx) => {
      const dropIdx = getCurlyIndex(part);
      const inner = getCurlyInner(part);
      if (dropIdx !== null) {
        const choices = getDropDownChoices(question, dropIdx);
        return (
          <select
            key={idx}
            className="player-sentence-select"
            value={dropdownSelections[dropIdx] || ''}
            onChange={(e) => handleDropdownChange(dropIdx, e.target.value)}
          >
            <option value="">-- Choose --</option>
            {choices.map((choice, cIdx) => (
              <option key={cIdx} value={choice}>{choice}</option>
            ))}
          </select>
        );
      }
      if (inner) {
        const ddIdx = dropdowns.findIndex(d => d.correct_answer === inner || d.correct === inner);
        const idxToUse = ddIdx !== -1 ? ddIdx : sequentialDrop;
        if (ddIdx === -1) sequentialDrop += 1;
        const config = dropdowns[idxToUse] || { correct_answer: inner, distractors: [] };
        const correctVal = config.correct_answer || config.correct || inner;
        return (
          <select key={idx} className="player-sentence-select" disabled value={correctVal}>
            <option value={correctVal}>{correctVal}</option>
          </select>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderFeedbackSentenceBlanks = (sentence, pAnswer) => {
    if (!sentence) return '';
    const correctAnswers = getDragDropCorrect(question) || [];
    const parts = splitBracketTokens(sentence);
    let sequentialBlank = 0;
    return parts.map((part, idx) => {
      const numericIdx = getBlankIndex(part);
      const inner = getBracketInner(part);
      if (numericIdx !== null) {
        const blankIdx = numericIdx;
        const playerWord = pAnswer ? pAnswer[blankIdx] : null;
        const correctWord = correctAnswers[blankIdx] || '';
        const isBlankCorrect = playerWord === correctWord;
        return (
          <span
            key={idx}
            className={`player-sentence-blank feedback-blank ${playerWord ? (isBlankCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}
            style={{ cursor: 'default' }}
          >
            {playerWord ? (
              <span>{playerWord} {isBlankCorrect ? '✓' : `(Correct: ${correctWord})`}</span>
            ) : (
              <span>_____ (Correct: {correctWord})</span>
            )}
          </span>
        );
      }
      if (inner) {
        const valIdx = correctAnswers.findIndex(c => c === inner);
        let blankIdx;
        let usedSequential = false;
        if (valIdx !== -1) {
          blankIdx = valIdx;
        } else {
          blankIdx = sequentialBlank;
          usedSequential = true;
        }
        if (usedSequential) sequentialBlank += 1;
        const correctWord = correctAnswers[blankIdx] || inner;
        const playerWord = (pAnswer && Array.isArray(pAnswer)) ? pAnswer[blankIdx] : null;
        const isBlankCorrect = playerWord === correctWord;
        return (
          <span
            key={idx}
            className={`player-sentence-blank feedback-blank ${playerWord ? (isBlankCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}
            style={{ cursor: 'default' }}
          >
            {playerWord ? (
              <span>{playerWord} {isBlankCorrect ? '✓' : `(Correct: ${correctWord})`}</span>
            ) : (
              <span>_____ (Correct: ${correctWord})</span>
            )}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderFeedbackSentenceDropdowns = (sentence, pAnswer) => {
    if (!sentence) return '';
    const dropdowns = normalizeQuestion(question)?.options?.dropdowns || [];
    const parts = splitCurlyTokens(sentence);
    let sequentialDrop = 0;
    return parts.map((part, idx) => {
      const dropIdx = getCurlyIndex(part);
      const inner = getCurlyInner(part);
      if (dropIdx !== null) {
        const correctChoice = getDropDownCorrect(question, dropIdx);
        const playerChoice = pAnswer ? pAnswer[dropIdx] : '';
        const isDropCorrect = playerChoice === correctChoice;
        return (
          <span
            key={idx}
            className={`player-sentence-blank feedback-blank ${playerChoice ? (isDropCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}
          >
            {playerChoice ? (
              <span>{playerChoice} {isDropCorrect ? '✓' : `(Correct: ${correctChoice})`}</span>
            ) : (
              <span>_____ (Correct: {correctChoice})</span>
            )}
          </span>
        );
      }
      if (inner) {
        const guessedIdx = dropdowns.findIndex(d => d.correct_answer === inner || d.correct === inner);
        const idxToUse = guessedIdx !== -1 ? guessedIdx : sequentialDrop;
        if (guessedIdx === -1) sequentialDrop += 1;
        const config = dropdowns[idxToUse] || { correct_answer: inner };
        const correctChoice = config.correct_answer || config.correct || inner;
        const playerChoice = pAnswer && idxToUse !== -1 ? pAnswer[idxToUse] : '';
        const isDropCorrect = playerChoice === correctChoice;
        return (
          <span
            key={idx}
            className={`player-sentence-blank feedback-blank ${playerChoice ? (isDropCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}
          >
            {playerChoice ? (
              <span>{playerChoice} {isDropCorrect ? '✓' : `(Correct: ${correctChoice})`}</span>
            ) : (
              <span>_____ (Correct: {correctChoice})</span>
            )}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  if (!question) return null;

  if (mode === 'review') {
    return (
      <div style={{ marginTop: 24, textAlign: 'left' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
          Question Review:
        </h3>

        <div className="question-card" style={{ padding: '16px', marginBottom: 16 }}>
          <div className="question-title" style={{ fontSize: '1.1rem', lineHeight: '1.6rem' }}>
            {question.text}
          </div>
        </div>

        {type === 'MULTIPLE_CHOICE' && (() => {
          const opts = getMcOptions(question);
          const correct = getMcCorrectAnswer(question);
          return (
            <div className="options-grid">
              {opts.map((item, idx) => {
                const isCorrectAnswer = item === correct;
                const isPlayerChoice = (playerAnswer && playerAnswer.item === item) || playerAnswer === item;
                let cardClass = "";
                if (isCorrectAnswer) {
                  cardClass = "correct-feedback";
                } else if (isPlayerChoice && !isCorrectAnswer) {
                  cardClass = "incorrect-feedback";
                } else {
                  cardClass = "muted-feedback";
                }
                return (
                  <div key={idx} className={`option-card ${cardClass}`}>
                    <div className="option-icon">
                      {isCorrectAnswer ? '✓' : (isPlayerChoice ? '✗' : ['A', 'B', 'C', 'D'][idx])}
                    </div>
                    <span>{item}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {type === 'SORTING' && (() => {
          const seq = getSortingCorrect(question);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              {playerAnswer && Array.isArray(playerAnswer) ? (
                playerAnswer.map((item, idx) => {
                  const isItemCorrect = item === seq[idx];
                  return (
                    <div
                      key={idx}
                      className="player-sorting-card"
                      style={{
                        background: isItemCorrect ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        border: isItemCorrect ? '1.5px solid #10b981' : '1.5px solid #ef4444',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        color: isItemCorrect ? '#065f46' : '#991b1b'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="sorting-number" style={{
                          background: isItemCorrect ? '#10b981' : '#ef4444',
                          color: '#fff'
                        }}>{idx + 1}</span>
                        <span style={{ fontWeight: 600 }}>{item}</span>
                      </div>
                      <span style={{ fontWeight: 800 }}>{isItemCorrect ? '✓' : '✗'}</span>
                    </div>
                  );
                })
              ) : (
                seq.map((item, idx) => (
                  <div
                    key={idx}
                    className="player-sorting-card"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1.5px solid var(--panel-border)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12
                    }}
                  >
                    <span className="sorting-number">{idx + 1}</span>
                    <span style={{ fontWeight: 600 }}>{item} (Correct)</span>
                  </div>
                ))
              )}
            </div>
          );
        })()}

        {type === 'DRAG_DROP' && question.options && (
          <div className="player-sentence-container bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm text-slate-800" style={{
            lineHeight: '2.5rem',
            fontSize: '1.15rem'
          }}>
            {renderFeedbackSentenceBlanks(question.options.sentence, playerAnswer)}
          </div>
        )}

        {type === 'DROP_DOWN' && question.options && (
          <div className="player-sentence-container bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm text-slate-800" style={{
            lineHeight: '2.8rem',
            fontSize: '1.15rem'
          }}>
            {renderFeedbackSentenceDropdowns(question.options.sentence, playerAnswer)}
          </div>
        )}

        {type === 'CATEGORIZE' && question.options && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {question.options.items?.map((item, idx) => {
              const playerCat = playerAnswer ? playerAnswer[item.name] : null;
              const correctCat = item.category;
              const isItemCorrect = playerCat === correctCat;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: playerCat ? (isItemCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)') : 'rgba(245, 158, 11, 0.05)',
                    border: playerCat ? (isItemCorrect ? '1px solid #10b981' : '1px solid #ef4444') : '1px dashed #f59e0b',
                    color: playerCat ? (isItemCorrect ? '#065f46' : '#991b1b') : '#78350f'
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <div style={{ fontSize: '0.85rem' }}>
                    {playerCat ? (
                      <span>
                        Chosen: <strong>{playerCat}</strong> {isItemCorrect ? '✓' : `(Correct: ${correctCat})`}
                      </span>
                    ) : (
                      <span>Not answered (Correct: {correctCat})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="game-layout">
        <div className="question-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <span className="question-number" style={{
            background: 'rgba(255,183,178,0.2)',
            color: 'var(--accent-light)',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 'bold',
            display: 'inline-block',
            marginBottom: '12px'
          }}>
            {roundNumber != null ? `ROUND ${roundNumber} • ` : ''}QUESTION {(questionNumber || 1)}{totalQuestions ? ` of ${totalQuestions}` : ''}
          </span>
          <div className="question-title" style={{ fontSize: '1.4rem', lineHeight: '2rem', fontWeight: '700' }}>
            {question.text}
          </div>
        </div>

        <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '0.05em' }}>
          {type === 'MULTIPLE_CHOICE' && 'Select the correct option:'}
          {type === 'SORTING' && 'Sort items in order (top is first):'}
          {type === 'DRAG_DROP' && 'Tap words to fill the blanks:'}
          {type === 'DROP_DOWN' && 'Select words from dropdowns:'}
          {type === 'CATEGORIZE' && `Classify items (${effectiveCategorizeIdx}/${question.options?.items?.length || 0}):`}
        </div>

        <div className="player-input-area" style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

          {type === 'MULTIPLE_CHOICE' && (() => {
            const opts = getMcOptions(question);
            return (
              <div className="options-grid">
                {opts.map((option, idx) => (
                  <button
                    key={idx}
                    className={`option-card interactive ${OPTION_CLASSES[idx % 4]}`}
                    onClick={() => onSubmit(option)}
                  >
                    <div className="option-icon">{['A', 'B', 'C', 'D'][idx % 4]}</div>
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            );
          })()}

          {type === 'SORTING' && (
            <div className="w-full flex flex-col">
              <div className="player-sorting-container bg-slate-50/40 border border-slate-200/50 rounded-2xl p-5 mb-5 flex flex-col gap-3 min-h-[120px] transition-all justify-center">
                {sortedItems.length === 0 ? (
                  <div className="text-slate-400/90 italic font-medium text-base text-center w-full select-none">
                    Tap items below to rank them in order...
                  </div>
                ) : (
                  sortedItems.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSortedItemClick(item)}
                      className="flex items-center justify-between px-5 py-3.5 bg-white border border-slate-200/80 rounded-xl shadow-xs text-left w-full transition-all hover:bg-rose-50/30 hover:border-rose-200 active:scale-[0.99] cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-black">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-700">{item}</span>
                      </div>
                      <span className="text-slate-400 font-bold text-sm">✕</span>
                    </button>
                  ))
                )}
              </div>

              <div className="text-left mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Options to rank:</span>
              </div>
              <div className="flex gap-3 flex-wrap justify-center min-h-[60px] mb-6">
                {sortingPool.map((item, idx) => {
                  const isPlaced = sortedItems.includes(item);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePoolItemClick(item)}
                      className={`px-4.5 py-2.5 rounded-xl border text-sm font-bold shadow-xs transition-all ${
                        isPlaced
                          ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-30 cursor-not-allowed scale-95'
                          : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50/50 hover:border-blue-300 hover:scale-105 active:scale-95 cursor-pointer'
                      }`}
                      disabled={isPlaced}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onSubmit(sortedItems)}
                className="btn btn-primary"
                disabled={sortedItems.length < sortingPool.length}
                style={{ marginTop: 16 }}
              >
                Submit Order
              </button>
            </div>
          )}

          {type === 'DRAG_DROP' && question.options && (() => {
            const isScramble = isScrambleSentence(question);
            const choices = getDragDropChoices(question);
            return (
              <div style={{ width: '100%' }}>
                <div
                  className={isScramble
                    ? "player-sentence-container bg-white border-2 border-dashed border-[#BFFCC6] rounded-2xl p-6 relative shadow-xs text-slate-800 flex flex-wrap items-center justify-center gap-2 min-h-[90px] mb-6 transition-all"
                    : "player-sentence-container bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm text-slate-800"
                  }
                  style={!isScramble ? {
                    lineHeight: '2.8rem',
                    fontSize: '1.2rem',
                    marginBottom: 20
                  } : undefined}
                >
                  {isScramble ? (
                    placedWords.every(w => w === null) ? (
                      <div className="text-slate-400/90 italic font-medium text-base text-center w-full select-none py-1.5">
                        Click words below to form the sentence...
                      </div>
                    ) : (
                      placedWords.map((word, blankIdx) => {
                        if (word === null) return null;
                        return (
                          <button
                            key={blankIdx}
                            type="button"
                            onClick={() => handleBlankTap(blankIdx)}
                            className="inline-flex items-center justify-center bg-white border border-[#BFFCC6] text-[#2E6930] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 px-4 py-2 rounded-xl font-bold shadow-xs cursor-pointer transition-all"
                          >
                            {word}
                          </button>
                        );
                      })
                    )
                  ) : (
                    renderPlayerSentenceBlanks(question.options.sentence)
                  )}
                </div>

                <div className="flex gap-3 flex-wrap justify-center min-h-[60px] mb-6">
                  {choices.map((choice, idx) => {
                    const isPlaced = placedWords.includes(choice);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePoolWordTap(choice)}
                        className={`player-pool-chip ${isPlaced ? 'placed' : ''}`}
                        disabled={isPlaced}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => onSubmit(placedWords)}
                  className="btn btn-primary"
                  disabled={placedWords.includes(null)}
                >
                  {isScramble ? 'Submit Sentence' : 'Submit Blanks'}
                </button>
              </div>
            );
          })()}

          {type === 'DROP_DOWN' && question.options && (
            <div style={{ width: '100%' }}>
              <div className="player-sentence-container bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm text-slate-800" style={{
                lineHeight: '3rem',
                fontSize: '1.2rem',
                marginBottom: 20
              }}>
                {renderPlayerSentenceDropdowns(question.options.sentence, question.options.dropdowns)}
              </div>

              <button
                onClick={() => onSubmit(dropdownSelections)}
                className="btn btn-primary"
                disabled={dropdownSelections.includes('')}
              >
                Submit Answers
              </button>
            </div>
          )}

          {type === 'CATEGORIZE' && question.options && (
            <div style={{ width: '100%' }}>
              {!allCategorized ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div
                    className="categorize-deck-card bg-slate-50 border border-slate-200 p-8 rounded-2xl font-bold text-xl shadow-md w-full max-w-sm text-center"
                    style={{ animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                  >
                    {question.options.items[effectiveCategorizeIdx]?.name}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: question.options.categories?.length > 2 ? '1fr 1fr' : '1fr',
                    gap: 12,
                    width: '100%',
                    maxWidth: '380px',
                    marginTop: 12
                  }}>
                    {question.options.categories?.map((cat, idx) => {
                      const colorSet = BUCKET_COLORS[idx % BUCKET_COLORS.length];
                      return (
                        <button
                          key={idx}
                          type="button"
                          className="btn"
                          onClick={() => handleCategorizeChoice(question.options.items[effectiveCategorizeIdx].name, cat)}
                          style={{
                            background: colorSet.background,
                            border: colorSet.border,
                            color: colorSet.color,
                            boxShadow: colorSet.shadow,
                            padding: '16px 20px',
                            fontSize: '1rem',
                            borderRadius: '16px',
                            fontWeight: '700'
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 12, textAlign: 'center' }}>
                    Review Assignments
                  </h3>
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'rgba(0, 0, 0, 0.03)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginBottom: 20
                  }}>
                    {Object.keys(categoryAssignments).map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.95rem',
                          borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
                          paddingBottom: 6
                        }}
                      >
                        <span>{item}</span>
                        <span style={{ color: 'var(--accent-light)', fontWeight: 'bold' }}>{categoryAssignments[item]}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCategorizeReset}
                      style={{ flex: 1 }}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onSubmit(categoryAssignments)}
                      style={{ flex: 2 }}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
