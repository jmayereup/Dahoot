import React, { useState, useEffect } from 'react';
import { OPTION_CLASSES, BUCKET_COLORS } from '../constants';

export function PracticeView({
  practiceState,
  selectedGame,
  nickname,
  questionsQueue,
  currentQuestionIdx,
  failedQuestions,
  masteredCount,
  totalCount,
  roundNumber,
  score,
  playerSelectedIdx,
  playerFeedback,
  error,
  firstTryCorrectCount,
  startPractice,
  submitAnswer,
  nextQuestion,
  startNextRound,
  exitPractice
}) {
  const activeQuestion = questionsQueue[currentQuestionIdx];
  const type = activeQuestion?.type || 'MULTIPLE_CHOICE';

  // ----------------------------------------------------
  // LOCAL STATES FOR VARIOUS QUESTION TYPES
  // ----------------------------------------------------
  const [sortingPool, setSortingPool] = useState([]);
  const [sortedItems, setSortedItems] = useState([]);
  const [placedWords, setPlacedWords] = useState([]);
  const [activeBlankIdx, setActiveBlankIdx] = useState(0);
  const [categorizeIdx, setCategorizeIdx] = useState(0);
  const [categoryAssignments, setCategoryAssignments] = useState({});
  const [localNickname, setLocalNickname] = useState(nickname || 'Student');
 
  // Reset inputs when active question changes
  useEffect(() => {
    if (!activeQuestion) return;
 
    if (type === 'SORTING' && Array.isArray(activeQuestion.options)) {
      setSortingPool([...activeQuestion.options].sort(() => 0.5 - Math.random()));
      setSortedItems([]);
    } else if (type === 'DRAG_DROP' && activeQuestion.options) {
      const correctLen = activeQuestion.options.correct ? activeQuestion.options.correct.length : 0;
      setPlacedWords(Array(correctLen).fill(null));
      setActiveBlankIdx(0);
    } else if (type === 'CATEGORIZE' && activeQuestion.options) {
      setCategorizeIdx(0);
      setCategoryAssignments({});
    }
  }, [activeQuestion, type]);
 
  // ----------------------------------------------------
  // SORTING HANDLERS
  // ----------------------------------------------------
  const handlePoolItemClick = (item) => {
    if (sortedItems.includes(item)) return;
    setSortedItems([...sortedItems, item]);
  };
 
  const handleSortedItemClick = (item) => {
    setSortedItems(sortedItems.filter(i => i !== item));
  };

  // ----------------------------------------------------
  // DRAG & DROP HANDLERS
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // CATEGORIZE HANDLERS
  // ----------------------------------------------------
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

  const allCategorized = categorizeIdx >= (activeQuestion?.options?.items?.length || 0);

  // ----------------------------------------------------
  // FEEDBACK RENDER HELPERS (Duplicated/adapted from PlayerFeedback)
  // ----------------------------------------------------
  const renderFeedbackSentenceBlanks = (sentence, correct, playerAnswer) => {
    if (!sentence) return '';
    const parts = sentence.split(/(\[blank\d+\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/\[blank(\d+)\]/);
      if (match) {
        const blankIdx = parseInt(match[1]);
        const playerWord = playerAnswer ? playerAnswer[blankIdx] : null;
        const correctWord = correct ? correct[blankIdx] : '';
        const isCorrect = playerWord === correctWord;
        
        return (
          <span 
            key={idx} 
            className={`player-sentence-blank feedback-blank ${playerWord ? (isCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}
            style={{ cursor: 'default' }}
          >
            {playerWord ? (
              <span>
                {playerWord} {isCorrect ? '✓' : `(Correct: ${correctWord})`}
              </span>
            ) : (
              <span>_____ (Correct: {correctWord})</span>
            )}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const renderQuestionReview = () => {
    return (
      <div style={{ marginTop: 24, textAlign: 'left' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
          Question Review:
        </h3>
        
        <div className="question-card" style={{ padding: '16px', marginBottom: 16 }}>
          <div className="question-title" style={{ fontSize: '1.1rem', lineHeight: '1.6rem' }}>
            {activeQuestion.text}
          </div>
        </div>

        {/* 1. MULTIPLE CHOICE */}
        {type === 'MULTIPLE_CHOICE' && Array.isArray(activeQuestion.options) && (
          <div className="options-grid">
            {activeQuestion.options.map((item, idx) => {
              const isCorrectAnswer = idx === activeQuestion.correct_option_index;
              const isPlayerChoice = idx === playerSelectedIdx;
              
              let cardClass = "";
              if (isCorrectAnswer) {
                cardClass = "correct-feedback";
              } else if (isPlayerChoice && !isCorrectAnswer) {
                cardClass = "incorrect-feedback";
              } else {
                cardClass = "muted-feedback";
              }

              return (
                <div 
                  key={idx} 
                  className={`option-card ${cardClass}`}
                >
                  <div className="option-icon">
                    {isCorrectAnswer ? '✓' : (isPlayerChoice ? '✗' : ['A', 'B', 'C', 'D'][idx])}
                  </div>
                  <span>{item}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. SORTING */}
        {type === 'SORTING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            {playerSelectedIdx && Array.isArray(playerSelectedIdx) ? (
              playerSelectedIdx.map((item, idx) => {
                const isItemCorrect = item === activeQuestion.options[idx];
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
              activeQuestion.options.map((item, idx) => (
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
        )}

        {/* 3. DRAG & DROP */}
        {type === 'DRAG_DROP' && activeQuestion.options && (
          <div className="player-sentence-container bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm text-slate-800" style={{
            lineHeight: '2.5rem',
            fontSize: '1.15rem'
          }}>
            {renderFeedbackSentenceBlanks(
              activeQuestion.options.sentence, 
              activeQuestion.options.correct, 
              playerSelectedIdx
            )}
          </div>
        )}

        {/* 4. CATEGORIZE */}
        {type === 'CATEGORIZE' && activeQuestion.options && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeQuestion.options.items?.map((item, idx) => {
              const playerCat = playerSelectedIdx ? playerSelectedIdx[item.name] : null;
              const correctCat = item.category;
              const isCorrect = playerCat === correctCat;
              
              return (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: playerCat ? (isCorrect ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)') : 'rgba(245, 158, 11, 0.05)',
                    border: playerCat ? (isCorrect ? '1px solid #10b981' : '1px solid #ef4444') : '1px dashed #f59e0b',
                    color: playerCat ? (isCorrect ? '#065f46' : '#991b1b') : '#78350f'
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <div style={{ fontSize: '0.85rem' }}>
                    {playerCat ? (
                      <span>
                        Chosen: <strong>{playerCat}</strong> {isCorrect ? '✓' : `(Correct: ${correctCat})`}
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
  };

  // ----------------------------------------------------
  // SUB-PAGES RENDERS BY STATE
  // ----------------------------------------------------
  
  // 1. INTRO VIEW
  if (practiceState === 'INTRO') {
    return (
      <div className="app-container">
        <div className="panel" style={{ maxWidth: '520px' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🎯</span>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Solo Practice Mode</h2>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-light)', fontWeight: 'bold', marginBottom: '16px' }}>
            {selectedGame?.title}
          </h3>
          
          {selectedGame?.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.45rem' }}>
              {selectedGame.description}
            </p>
          )}

          <div style={{ 
            background: 'rgba(93, 107, 130, 0.04)', 
            border: '1px solid rgba(93, 107, 130, 0.08)',
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'left',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Mastery Guidelines:
            </span>
            <div style={{ fontSize: '0.9rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>⏱️ <strong>Self-Paced</strong>: No timer. Take all the time you need.</div>
              <div>🔄 <strong>Wrong Repeats</strong>: If you get a question wrong, it goes to the back of the deck.</div>
              <div>🏆 <strong>Mastery</strong>: You finish only when you get all questions correct!</div>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); startPractice(localNickname); }}>
            <div className="form-group">
              <label className="form-label">Enter your Nickname</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Einstein"
                maxLength={15}
                value={localNickname}
                onChange={(e) => setLocalNickname(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={exitPractice}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                className="btn btn-primary animate-pulse-glow"
                style={{ flex: 2 }}
              >
                Start Practice
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Calculate mastery values
  const masteryPercentage = Math.round((masteredCount / totalCount) * 100);

  // 2. QUESTION & FEEDBACK COMBINED CONTAINER VIEW
  return (
    <div className="app-container">
      {/* Session Progress Header */}
      <div style={{ 
        width: '100%', 
        maxWidth: '720px', 
        display: 'flex', 
        flexDirection: 'column',
        gap: '8px',
        padding: '0 12px 16px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
          <span>👤 <strong>{nickname}</strong> (Practice Mode)</span>
          <span>Score: <strong>{score}</strong></span>
          <button 
            onClick={() => {
              if (window.confirm("Quit practice session? Your progress will be lost.")) {
                exitPractice();
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              textDecoration: 'underline'
            }}
          >
            Quit Session
          </button>
        </div>

        {/* Progress Tracker Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255, 255, 255, 0.4)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Round {roundNumber}: Question {currentQuestionIdx + 1} of {questionsQueue.length}
            </span>
            <span style={{ color: '#10b981' }}>
              Mastery: {masteredCount} / {totalCount} ({masteryPercentage}%)
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ width: '100%', height: '8px', background: 'rgba(93, 107, 130, 0.08)', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
            <div 
              style={{ 
                width: `${masteryPercentage}%`, 
                height: '100%', 
                background: 'linear-gradient(to right, #10b981, #34d399)', 
                transition: 'width 0.4s ease-in-out'
              }} 
            />
          </div>
        </div>
      </div>

      <div className="panel panel-large animate-fade-in">
        
        {/* QUESTION VIEW */}
        {practiceState === 'QUESTION' && activeQuestion && (
          <div>
            <div className="game-layout">
              {/* Question card */}
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
                  ROUND {roundNumber} • QUESTION {currentQuestionIdx + 1}
                </span>
                <div className="question-title" style={{ fontSize: '1.4rem', lineHeight: '2rem', fontWeight: '700' }}>
                  {activeQuestion.text}
                </div>
              </div>

              {/* Instructions tag */}
              <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '0.05em' }}>
                {type === 'MULTIPLE_CHOICE' && 'Select the correct option:'}
                {type === 'SORTING' && 'Sort items in order (top is first):'}
                {type === 'DRAG_DROP' && 'Tap words to fill the blanks:'}
                {type === 'CATEGORIZE' && `Classify items (${categorizeIdx}/${activeQuestion.options?.items?.length || 0}):`}
              </div>

              {error && <p style={{ color: '#ff4b60', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>}

              {/* RENDER INPUT AREA BY TYPE */}
              <div className="player-input-area" style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                
                {/* 1. MULTIPLE CHOICE */}
                {type === 'MULTIPLE_CHOICE' && Array.isArray(activeQuestion.options) && (
                  <div className="options-grid">
                    {activeQuestion.options.map((option, idx) => (
                      <button 
                        key={idx} 
                        className={`option-card interactive ${OPTION_CLASSES[idx % 4]}`}
                        onClick={() => submitAnswer(idx)}
                      >
                        <div className="option-icon">{['A', 'B', 'C', 'D'][idx % 4]}</div>
                        <span>{option}</span>
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
                            disabled={isPlaced}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => submitAnswer(sortedItems)}
                      className="btn btn-primary"
                      disabled={sortedItems.length < sortingPool.length}
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
                              disabled={isPlaced}
                            >
                              {choice}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => submitAnswer(placedWords)}
                        className="btn btn-primary"
                        disabled={placedWords.includes(null)}
                      >
                        {isScramble ? 'Submit Sentence' : 'Submit Blanks'}
                      </button>
                    </div>
                  );
                })()}

                {/* 4. CATEGORIZE */}
                {type === 'CATEGORIZE' && activeQuestion.options && (
                  <div style={{ width: '100%' }}>
                    {!allCategorized ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                        <div 
                          className="categorize-deck-card bg-slate-50 border border-slate-200 p-8 rounded-2xl font-bold text-xl shadow-md w-full max-w-sm text-center"
                          style={{ animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                        >
                          {activeQuestion.options.items[categorizeIdx]?.name}
                        </div>

                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: activeQuestion.options.categories?.length > 2 ? '1fr 1fr' : '1fr',
                          gap: 12,
                          width: '100%',
                          maxWidth: '380px',
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
                            onClick={() => submitAnswer(categoryAssignments)}
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
        )}

        {/* FEEDBACK & REVIEW VIEW */}
        {practiceState === 'FEEDBACK' && playerFeedback && (
          <div className="feedback-screen animate-fade-in">
            {playerFeedback.correct ? (
              <div style={{ animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <div className="feedback-icon feedback-correct" style={{ fontSize: '4rem', marginBottom: '8px' }}>✓</div>
                <h2 style={{ color: '#10b981', fontSize: '2rem' }}>Correct!</h2>
                <div className="points-text feedback-correct" style={{ fontSize: '1.25rem', marginTop: '4px' }}>
                  +{playerFeedback.points} points
                </div>
              </div>
            ) : (
              <div style={{ animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <div className="feedback-icon feedback-incorrect" style={{ fontSize: '4rem', marginBottom: '8px' }}>✗</div>
                <h2 style={{ color: '#f43f5e', fontSize: '2rem' }}>Incorrect</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '8px 0 16px' }}>
                  No worries! This question will repeat at the end.
                </p>
              </div>
            )}

            {renderQuestionReview()}

            <button 
              onClick={nextQuestion} 
              className="btn btn-primary animate-pulse-glow"
              style={{ marginTop: '32px', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}
            >
              {currentQuestionIdx + 1 < questionsQueue.length ? 'Next Question' : 'Complete Round'}
            </button>
          </div>
        )}

        {/* ROUND COMPLETE VIEW */}
        {practiceState === 'ROUND_COMPLETE' && (
          <div className="animate-fade-in" style={{ padding: '24px' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>🔄</span>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Round {roundNumber} Complete!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '24px' }}>
              You got <strong>{questionsQueue.length - failedQuestions.length}</strong> correct out of <strong>{questionsQueue.length}</strong> questions in this round.
            </p>

            <div style={{
              background: '#fff5f5',
              border: '1px solid #fee2e2',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'left',
              marginBottom: '32px'
            }}>
              <h3 style={{ color: '#b91c1c', fontWeight: 'bold', fontSize: '1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> Needs Review
              </h3>
              <p style={{ color: '#7f1d1d', fontSize: '0.88rem', lineHeight: '1.4rem' }}>
                We've queued the <strong>{failedQuestions.length}</strong> question(s) you got wrong. Let's practice them again until you master them!
              </p>
            </div>

            <button 
              onClick={startNextRound}
              className="btn btn-primary btn-lg"
              style={{ maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto' }}
            >
              Start Next Round ({failedQuestions.length} Questions)
            </button>
          </div>
        )}

        {/* FINISHED / MASTERED VIEW */}
        {practiceState === 'FINISHED' && (
          <div className="animate-fade-in" style={{ padding: '32px 16px' }}>
            <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '16px', animation: 'bounce-slow 3s infinite ease-in-out' }}>🏆</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '900', background: 'linear-gradient(to right, #10b981, #059669)', bgClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: '8px' }}>
              Mastery Attained!
            </h2>
            <p style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '32px', fontWeight: '500' }}>
              Outstanding, {nickname}! You've successfully answered every single question correctly!
            </p>

            {/* Performance Stats Cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px', 
              marginBottom: '32px',
              textAlign: 'left'
            }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.08)', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Total Score
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10b981' }}>
                  {score}
                </span>
              </div>

              <div style={{ background: 'rgba(93, 107, 130, 0.04)', border: '1px solid rgba(93, 107, 130, 0.08)', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Rounds Played
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#475569' }}>
                  {roundNumber}
                </span>
              </div>

              <div style={{ background: 'rgba(93, 107, 130, 0.04)', border: '1px solid rgba(93, 107, 130, 0.08)', borderRadius: '16px', padding: '16px', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  First-Try Accuracy
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: '800', color: '#475569' }}>
                  {firstTryCorrectCount} / {totalCount} ({Math.round((firstTryCorrectCount / totalCount) * 100)}%)
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Questions answered correctly on your very first attempt.
                </p>
              </div>
            </div>

            <button 
              onClick={exitPractice}
              className="btn btn-primary btn-lg"
              style={{ maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto' }}
            >
              Exit Practice Mode
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
