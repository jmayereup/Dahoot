import React, { useState, useEffect } from 'react';
import { OPTION_CLASSES, OPTION_SHAPES } from '../constants';

export function PlayerQuestion({
  qIndex,
  activeQuestion,
  hasAnswered,
  playerTimeLeft,
  error,
  submitAnswer
}) {
  const type = activeQuestion.type || 'MULTIPLE_CHOICE';

  // ----------------------------------------------------
  // SORTING STATE & HANDLERS
  // ----------------------------------------------------
  const [sortingItems, setSortingItems] = useState([]);

  useEffect(() => {
    if (type === 'SORTING' && Array.isArray(activeQuestion.options)) {
      // Initialize with a shuffled list
      setSortingItems([...activeQuestion.options].sort(() => 0.5 - Math.random()));
    }
  }, [activeQuestion.id, activeQuestion.options, type]);

  const moveSortingItem = (idx, direction) => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sortingItems.length - 1) return;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...sortingItems];
    // Swap
    const temp = updated[idx];
    updated[idx] = updated[newIdx];
    updated[newIdx] = temp;
    setSortingItems(updated);
  };

  const handleSortingSubmit = () => {
    submitAnswer(sortingItems);
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
    const parts = sentence.split(/(\[blank\d+\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/\[blank(\d+)\]/);
      if (match) {
        const blankIdx = parseInt(match[1]);
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
    const parts = sentence.split(/(\{\{\d+\}\})/g);
    return parts.map((part, idx) => {
      const match = part.match(/\{\{(\d+)\}\}/);
      if (match) {
        const dropIdx = parseInt(match[1]);
        const config = dropdowns[dropIdx];
        return (
          <select
            key={idx}
            className="player-sentence-select"
            value={dropdownSelections[dropIdx] || ''}
            onChange={(e) => handleDropdownChange(dropIdx, e.target.value)}
            disabled={playerTimeLeft <= 0}
          >
            <option value="">-- Choose --</option>
            {config.choices.map((choice, cIdx) => (
              <option key={cIdx} value={choice}>{choice}</option>
            ))}
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
              Timer: {playerTimeLeft}s
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
                {activeQuestion.options.map((opt, idx) => (
                  <button 
                    key={idx} 
                    className={`option-card interactive ${OPTION_CLASSES[idx]} ${playerTimeLeft <= 0 ? 'disabled' : ''}`}
                    onClick={() => submitAnswer(idx)}
                    disabled={playerTimeLeft <= 0}
                  >
                    <div className={`option-icon ${OPTION_SHAPES[idx]}`} />
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 2. SORTING */}
            {type === 'SORTING' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
                {sortingItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="player-sorting-card"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="sorting-number">{idx + 1}</span>
                      <span>{item}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button 
                        type="button"
                        className="btn-sorting-arrow"
                        onClick={() => moveSortingItem(idx, 'up')}
                        disabled={idx === 0 || playerTimeLeft <= 0}
                      >
                        ▲
                      </button>
                      <button 
                        type="button"
                        className="btn-sorting-arrow"
                        onClick={() => moveSortingItem(idx, 'down')}
                        disabled={idx === sortingItems.length - 1 || playerTimeLeft <= 0}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={handleSortingSubmit}
                  className="btn btn-primary"
                  disabled={playerTimeLeft <= 0}
                  style={{ marginTop: 16 }}
                >
                  Submit Order
                </button>
              </div>
            )}

            {/* 3. DRAG & DROP */}
            {type === 'DRAG_DROP' && activeQuestion.options && (
              <div style={{ width: '100%' }}>
                {/* Sentence Container */}
                <div className="player-sentence-container bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm text-slate-800" style={{
                  lineHeight: '2.5rem',
                  fontSize: '1.15rem',
                  marginBottom: 20
                }}>
                  {renderPlayerSentenceBlanks(activeQuestion.options.sentence)}
                </div>

                {/* Choices Pool */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex gap-2 flex-wrap justify-center min-h-[80px] mb-5">
                  {activeQuestion.options.choices?.map((choice, idx) => {
                    const isPlaced = placedWords.includes(choice);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePoolWordTap(choice)}
                        className={`player-pool-chip ${isPlaced ? 'placed' : ''}`}
                        disabled={isPlaced || playerTimeLeft <= 0}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleDragDropSubmit}
                  className="btn btn-primary"
                  disabled={placedWords.includes(null) || playerTimeLeft <= 0}
                >
                  Submit Blanks
                </button>
              </div>
            )}

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
                  disabled={dropdownSelections.includes('') || playerTimeLeft <= 0}
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
                      {activeQuestion.options.categories?.map((cat, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`btn ${idx === 0 ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => handleCategorizeChoice(activeQuestion.options.items[categorizeIdx].name, cat)}
                          disabled={playerTimeLeft <= 0}
                          style={{ padding: '12px 16px', fontSize: '0.95rem' }}
                        >
                          {cat}
                        </button>
                      ))}
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
                        disabled={playerTimeLeft <= 0}
                        style={{ flex: 1 }}
                      >
                        Reset
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary" 
                        onClick={handleCategorizeSubmit}
                        disabled={playerTimeLeft <= 0}
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
