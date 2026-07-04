import React, { useState, useEffect, useMemo } from 'react';
import { OPTION_CLASSES, OPTION_SHAPES, BUCKET_COLORS } from '../constants';
import { deterministicShuffle, shuffleArray } from '../utils/shuffle';
import { splitCurlyTokens, getCurlyIndex, getCurlyInner, splitBracketTokens, getBlankIndex, getBracketInner } from '../utils/blankParsing';

export function PlayerQuestion({
  qIndex,
  activeQuestion,
  hasAnswered,
  playerTimeLeft,
  error,
  submitAnswer,
  timerDuration,
  roomCode
}) {
  const type = activeQuestion.type || 'MULTIPLE_CHOICE';
  const isTimerActive = timerDuration !== 0;
  const isTimeUp = isTimerActive && playerTimeLeft !== null && playerTimeLeft <= 0;

  // Shuffle multiple choice options deterministically based on roomCode and question ID
  const shuffledMultipleChoiceOptions = useMemo(() => {
    if (type !== 'MULTIPLE_CHOICE' || !Array.isArray(activeQuestion.options)) return [];
    return deterministicShuffle(activeQuestion.options, `${roomCode}-${activeQuestion.id}`);
  }, [activeQuestion.id, activeQuestion.options, roomCode, type]);

  // ----------------------------------------------------
  // SORTING (Tap to Order) STATE & HANDLERS
  // ----------------------------------------------------
  const [sortingPool, setSortingPool] = useState([]);
  const [sortedItems, setSortedItems] = useState([]);

  useEffect(() => {
    if (type === 'SORTING' && Array.isArray(activeQuestion.options)) {
      setSortingPool(shuffleArray(activeQuestion.options));
      setSortedItems([]);
    }
  }, [activeQuestion.id, activeQuestion.options, type]);

  const handlePoolItemClick = (item) => {
    if (sortedItems.includes(item)) return;
    setSortedItems([...sortedItems, item]);
  };

  const handleSortedItemClick = (item) => {
    setSortedItems(sortedItems.filter(i => i !== item));
  };

  const handleSortingSubmit = () => {
    submitAnswer(sortedItems);
  };

  // ----------------------------------------------------
  // DRAG & DROP (Duolingo Style Tap-to-Place) STATE & HANDLERS
  // ----------------------------------------------------
  const [placedWords, setPlacedWords] = useState([]);
  const [activeBlankIdx, setActiveBlankIdx] = useState(0);

  const totalBlanks = typeof activeQuestion.options === 'object' && activeQuestion.options.correct
    ? activeQuestion.options.correct.length
    : 0;

  useEffect(() => {
    if (type === 'DRAG_DROP') {
      setPlacedWords(Array(totalBlanks).fill(null));
      setActiveBlankIdx(0);
    }
  }, [activeQuestion.id, totalBlanks, type]);

  const handlePoolWordTap = (word) => {
    // If the word is already placed, do nothing
    if (placedWords.includes(word)) return;

    // Find the blank to fill (either activeBlankIdx if empty, or first empty blank)
    let fillIdx = activeBlankIdx;
    if (placedWords[fillIdx] !== null) {
      fillIdx = placedWords.indexOf(null);
    }

    if (fillIdx !== -1) {
      const updated = [...placedWords];
      updated[fillIdx] = word;
      setPlacedWords(updated);

      // Move active index to next empty blank
      const nextEmpty = updated.indexOf(null);
      if (nextEmpty !== -1) {
        setActiveBlankIdx(nextEmpty);
      }
    }
  };

  const handleBlankTap = (blankIdx) => {
    // If there is a word in the blank, remove it and set active to this blank
    if (placedWords[blankIdx] !== null) {
      const updated = [...placedWords];
      updated[blankIdx] = null;
      setPlacedWords(updated);
      setActiveBlankIdx(blankIdx);
    } else {
      setActiveBlankIdx(blankIdx);
    }
  };

  const handleDragDropSubmit = () => {
    submitAnswer(placedWords);
  };

  // ----------------------------------------------------
  // DROP DOWN STATE & HANDLERS
  // ----------------------------------------------------
  const [dropdownSelections, setDropdownSelections] = useState([]);
  const totalDropdowns = typeof activeQuestion.options === 'object' && activeQuestion.options.dropdowns
    ? activeQuestion.options.dropdowns.length
    : 0;

  useEffect(() => {
    if (type === 'DROP_DOWN') {
      setDropdownSelections(Array(totalDropdowns).fill(''));
    }
  }, [activeQuestion.id, totalDropdowns, type]);

  const handleDropdownChange = (idx, val) => {
    const updated = [...dropdownSelections];
    updated[idx] = val;
    setDropdownSelections(updated);
  };

  const handleDropdownSubmit = () => {
    submitAnswer(dropdownSelections);
  };

  // ----------------------------------------------------
  // CATEGORIZE STATE & HANDLERS
  // ----------------------------------------------------
  const [categorizeIdx, setCategorizeIdx] = useState(0);
  const [categoryAssignments, setCategoryAssignments] = useState({});

  const totalCategorizeItems = typeof activeQuestion.options === 'object' && activeQuestion.options.items
    ? activeQuestion.options.items.length
    : 0;

  useEffect(() => {
    if (type === 'CATEGORIZE') {
      setCategorizeIdx(0);
      setCategoryAssignments({});
    }
  }, [activeQuestion.id, type]);

  const handleCategorizeChoice = (itemName, category) => {
    const updated = { ...categoryAssignments };
    updated[itemName] = category;
    setCategoryAssignments(updated);
    setCategorizeIdx(prev => prev + 1);
  };

  const handleCategorizeReset = () => {
    setCategorizeIdx(0);
    setCategoryAssignments({});
  };

  const handleCategorizeSubmit = () => {
    submitAnswer(categoryAssignments);
  };

  const renderPlayerSentenceBlanks = (sentence) => {
    if (!sentence) return '';
    const parts = splitBracketTokens(sentence);
    let sequentialBlank = 0;
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
        if (activeQuestion?.options?.correct) mappedIdx = activeQuestion.options.correct.findIndex(c => c === inner);
        const blankIdx = mappedIdx !== -1 ? mappedIdx : sequentialBlank;
        if (mappedIdx === -1) sequentialBlank += 1;
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
        const config = dropdowns[dropIdx] || { choices: [] };
        return (
          <select
            key={idx}
            className="player-sentence-select"
            value={dropdownSelections[dropIdx] || ''}
            onChange={(e) => handleDropdownChange(dropIdx, e.target.value)}
            disabled={isTimeUp}
          >
            <option value="">-- Choose --</option>
            {config.choices.map((choice, cIdx) => (
              <option key={cIdx} value={choice}>{choice}</option>
            ))}
          </select>
        );
      }
      if (inner) {
        let mappedIdx = dropdowns.findIndex(d => d.correct === inner);
        const idxToUse = mappedIdx !== -1 ? mappedIdx : sequentialDrop;
        if (mappedIdx === -1) sequentialDrop += 1;
        const config = dropdowns[idxToUse] || { choices: [inner] };
        return (
          <select key={idx} className="player-sentence-select" disabled value={config.correct || inner}>
            <option value={config.correct || inner}>{config.correct || inner}</option>
          </select>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Helper to check if categorization is fully complete
  const allCategorized = categorizeIdx >= totalCategorizeItems;

  return (
    <div>
      {!hasAnswered ? (
        <div className="game-layout">
          
          {/* Question Header Card */}
          <div className="question-card" style={{ padding: '20px' }}>
            <div className="question-number">Question {qIndex + 1}</div>
            <div className="question-title" style={{ fontSize: '1.25rem', lineHeight: '1.8rem' }}>{activeQuestion.text}</div>
          </div>

          {/* Timer Display */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-light)' }}>
              {timerDuration === 0 || playerTimeLeft === null ? 'Timer: ∞' : `Timer: ${playerTimeLeft}s`}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {type === 'MULTIPLE_CHOICE' && 'Select the correct option:'}
              {type === 'SORTING' && 'Sort items in order (top is first):'}
              {type === 'DRAG_DROP' && 'Tap words to fill the blanks:'}
              {type === 'DROP_DOWN' && 'Select words from dropdowns:'}
              {type === 'CATEGORIZE' && `Classify items (${categorizeIdx}/${totalCategorizeItems}):`}
            </span>
          </div>

          {error && <p style={{ color: '#ff4b60', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>}

          {/* RENDER BY TYPE */}
          <div className="player-input-area" style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            {/* 1. MULTIPLE CHOICE */}
            {type === 'MULTIPLE_CHOICE' && Array.isArray(activeQuestion.options) && (
              <div className="options-grid">
                {shuffledMultipleChoiceOptions.map((item, idx) => (
                  <button 
                    key={item.originalIdx} 
                    className={`option-card interactive ${OPTION_CLASSES[idx]} ${isTimeUp ? 'disabled' : ''}`}
                    onClick={() => submitAnswer(item.originalIdx)}
                    disabled={isTimeUp}
                  >
                    <div className="option-icon">{['A', 'B', 'C', 'D'][idx]}</div>
                    <span>{item.item}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 2. SORTING */}
            {type === 'SORTING' && (
              <div className="w-full flex flex-col">
                {/* Sorted items container */}
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
                        disabled={isTimeUp}
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

                {/* Pool of unsorted options */}
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
                        disabled={isPlaced || isTimeUp}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleSortingSubmit}
                  className="btn btn-primary"
                  disabled={sortedItems.length < sortingPool.length || isTimeUp}
                  style={{ marginTop: 16 }}
                >
                  Submit Order
                </button>
              </div>
            )}

            {/* 3. DRAG & DROP */}
            {type === 'DRAG_DROP' && activeQuestion.options && (() => {
              const isScramble = typeof activeQuestion.options === 'object' && 
                activeQuestion.options.sentence && 
                !activeQuestion.options.sentence.replace(/\[blank\d+\]/g, '').trim();
              return (
                <div style={{ width: '100%' }}>
                  {/* Sentence Container */}
                  <div 
                    className={isScramble 
                      ? "player-sentence-container bg-white border-2 border-dashed border-[#BFFCC6] rounded-2xl p-6 relative shadow-xs text-slate-800 flex flex-wrap items-center justify-center gap-2 min-h-[90px] mb-6 transition-all"
                      : "player-sentence-container bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm text-slate-800"
                    }
                    style={!isScramble ? {
                      lineHeight: '2.5rem',
                      fontSize: '1.15rem',
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
                      renderPlayerSentenceBlanks(activeQuestion.options.sentence)
                    )}
                  </div>

                  {/* Choices Pool */}
                  <div className="flex gap-3 flex-wrap justify-center min-h-[60px] mb-6">
                    {activeQuestion.options.choices?.map((choice, idx) => {
                      const isPlaced = placedWords.includes(choice);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePoolWordTap(choice)}
                          className={`player-pool-chip ${isPlaced ? 'placed' : ''}`}
                          disabled={isPlaced || isTimeUp}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleDragDropSubmit}
                    className="btn btn-primary"
                    disabled={placedWords.includes(null) || isTimeUp}
                  >
                    {isScramble ? 'Submit Sentence' : 'Submit Blanks'}
                  </button>
                </div>
              );
            })()}

            {/* 4. DROP DOWN */}
            {type === 'DROP_DOWN' && activeQuestion.options && (
              <div style={{ width: '100%' }}>
                {/* Sentence Container */}
                <div className="player-sentence-container bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm text-slate-800" style={{
                  lineHeight: '2.8rem',
                  fontSize: '1.15rem',
                  marginBottom: 20
                }}>
                  {renderPlayerSentenceDropdowns(activeQuestion.options.sentence, activeQuestion.options.dropdowns)}
                </div>

                <button
                  onClick={handleDropdownSubmit}
                  className="btn btn-primary"
                  disabled={dropdownSelections.includes('') || isTimeUp}
                >
                  Submit Answers
                </button>
              </div>
            )}

            {/* 5. CATEGORIZE */}
            {type === 'CATEGORIZE' && activeQuestion.options && (
              <div style={{ width: '100%' }}>
                {!allCategorized ? (
                  // Step-by-Step Card categorizer
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                    <div 
                      className="categorize-deck-card"
                      style={{
                        background: 'var(--accent-glow)',
                        border: '1px solid var(--panel-border-focus)',
                        boxShadow: 'var(--shadow-glow)',
                        borderRadius: '12px',
                        padding: '32px 16px',
                        width: '100%',
                        maxWidth: '340px',
                        textAlign: 'center',
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    >
                      {activeQuestion.options.items[categorizeIdx]?.name}
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: activeQuestion.options.categories?.length > 2 ? '1fr 1fr' : '1fr',
                      gap: 12,
                      width: '100%',
                      maxWidth: '340px',
                      marginTop: 12
                    }}>
                      {activeQuestion.options.categories?.map((cat, idx) => {
                        const colorSet = BUCKET_COLORS[idx % BUCKET_COLORS.length];
                        return (
                          <button
                            key={idx}
                            type="button"
                            className="btn"
                            onClick={() => handleCategorizeChoice(activeQuestion.options.items[categorizeIdx].name, cat)}
                            disabled={isTimeUp}
                            style={{
                              background: colorSet.background,
                              border: colorSet.border,
                              color: colorSet.color,
                              boxShadow: colorSet.shadow,
                              padding: '16px 20px',
                              fontSize: '1rem',
                              borderRadius: '16px',
                              fontWeight: '700',
                              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                            }}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Review summary screen
                  <div>
                    <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 12, textAlign: 'center' }}>
                      Review Assignments
                    </h3>
                    <div style={{ 
                      maxHeight: '180px', 
                      overflowY: 'auto', 
                      background: 'rgba(0, 0, 0, 0.2)', 
                      borderRadius: '8px', 
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginBottom: 20
                    }}>
                      {Object.keys(categoryAssignments).map((item, idx) => (
                        <div 
                          key={idx}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            fontSize: '0.9rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                            paddingBottom: 4
                          }}
                        >
                          <span>{item}</span>
                          <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{categoryAssignments[item]}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={handleCategorizeReset}
                        disabled={isTimeUp}
                        style={{ flex: 1 }}
                      >
                        Reset
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleCategorizeSubmit}
                        disabled={isTimeUp}
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
      ) : (
        <div>
          <div className="spinner" />
          <h2>Answer Submitted!</h2>
          <p className="waiting-message">Waiting for other players to answer or time to expire...</p>
        </div>
      )}
    </div>
  );
}
