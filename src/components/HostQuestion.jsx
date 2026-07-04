import React, { useMemo, useState } from 'react';
import { OPTION_CLASSES, OPTION_SHAPES, BUCKET_COLORS } from '../constants';
import { deterministicShuffle, shuffleArray } from '../utils/shuffle';
import { splitBracketTokens, getBlankIndex, getBracketInner, splitCurlyTokens, getCurlyIndex, getCurlyInner } from '../utils/blankParsing';
import { ConfirmModal } from './ConfirmModal';

export function HostQuestion({
  qIndex,
  questions,
  activeQuestion,
  hostTimeLeft,
  answeredCount,
  hostPlayers,
  hostShowLeaderboard,
  hostCancelTimer,
  timerDuration,
  roomCode,
  hostEndGame
}) {
  const type = activeQuestion.type || 'MULTIPLE_CHOICE';
  const [showStopConfirm, setShowStopConfirm] = useState(false);

  // Shuffle multiple choice options deterministically based on roomCode and question ID
  const shuffledMultipleChoiceOptions = useMemo(() => {
    if (type !== 'MULTIPLE_CHOICE' || !Array.isArray(activeQuestion.options)) return [];
    return deterministicShuffle(activeQuestion.options, `${roomCode}-${activeQuestion.id}`);
  }, [activeQuestion.id, activeQuestion.options, roomCode, type]);

  // Shuffle sorting options once when question changes so they display out of order
  const shuffledSortingOptions = useMemo(() => {
    if (type !== 'SORTING' || !Array.isArray(activeQuestion.options)) return [];
    return shuffleArray(activeQuestion.options);
  }, [activeQuestion.id, activeQuestion.options, type]);

  // Helper to parse drag and drop sentences
  const renderSentenceWithBlanks = (sentence) => {
    if (!sentence) return '';
    const parts = splitBracketTokens(sentence);
    return parts.map((part, idx) => {
      const numericIdx = getBlankIndex(part);
      const inner = getBracketInner(part);
      if (numericIdx !== null) {
        return (
          <span key={idx} className="host-sentence-blank">?</span>
        );
      }
      if (inner) {
        return (
          <span key={idx} className="host-sentence-blank">?</span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Helper to parse dropdown sentences
  const renderSentenceWithDropdowns = (sentence) => {
    if (!sentence) return '';
    const parts = splitCurlyTokens(sentence);
    return parts.map((part, idx) => {
      const numIdx = getCurlyIndex(part);
      const inner = getCurlyIndex(part) === null ? getCurlyInner(part) : null;
      if (numIdx !== null || inner) {
        return (
          <span key={idx} className="host-sentence-dropdown-placeholder">[ Select ▾ ]</span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="game-layout flex flex-col items-center w-full animate-fade-in">
      <div className="question-card w-full text-center mb-6">
        <div className="question-number inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-50 border border-rose-100/85 text-rose-500 font-extrabold text-xs tracking-widest uppercase rounded-full mb-4 shadow-xs">
          Question {qIndex + 1} of {questions.length} • {type.replace('_', ' ')}
        </div>
        <div className="question-title text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-relaxed max-w-4xl mx-auto px-4">
          {activeQuestion.text}
        </div>
      </div>

      <div className="game-mid-section flex flex-row items-center justify-center gap-12 md:gap-20 my-8 bg-slate-50/50 border border-slate-100 rounded-3xl p-6 max-w-xl w-full mx-auto shadow-xs">
        <div className="timer-container flex flex-col items-center">
          <div className="timer-number relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center rounded-full bg-rose-50 border-[6px] border-rose-200/60 shadow-inner animate-pulse-glow transition-all">
            <span className="text-4xl md:text-5xl font-black text-rose-500 font-mono tracking-tighter">
              {timerDuration === 0 || hostTimeLeft === null ? '∞' : hostTimeLeft}
            </span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-2">Seconds Left</span>
        </div>
        <div className="answer-stats flex flex-col items-center">
          <div className="w-24 h-24 md:w-28 md:h-28 flex flex-col items-center justify-center rounded-full bg-emerald-50 border-[6px] border-emerald-200/60 shadow-inner transition-all">
            <span className="answer-stats-num text-3xl md:text-4xl font-black text-emerald-600 font-mono">
              {answeredCount}
            </span>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">
              / {hostPlayers.length}
            </span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-2">Responses</span>
        </div>
      </div>

      {/* RENDER LAYOUT BY QUESTION TYPE */}
      <div className="question-content-area" style={{ marginTop: 24, width: '100%' }}>
        
        {/* 1. MULTIPLE CHOICE */}
        {type === 'MULTIPLE_CHOICE' && Array.isArray(activeQuestion.options) && (
          <div className="options-grid">
            {shuffledMultipleChoiceOptions.map((item, idx) => (
              <div key={item.originalIdx} className={`option-card ${OPTION_CLASSES[idx]}`}>
                <div className="option-icon">{['A', 'B', 'C', 'D'][idx]}</div>
                <span>{item.item}</span>
              </div>
            ))}
          </div>
        )}

        {/* 2. SORTING */}
        {type === 'SORTING' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center', fontSize: '1rem', fontWeight: 600 }}>
              Arrange these in the correct order on your device:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: '500px', margin: '0 auto' }}>
              {shuffledSortingOptions.map((opt, idx) => (
                <div 
                  key={idx} 
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: '1.1rem',
                    fontWeight: 600
                  }}
                >
                  <span style={{ color: 'var(--accent-light)', marginRight: 8 }}>✦</span>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. DRAG AND DROP */}
        {type === 'DRAG_DROP' && activeQuestion.options && (
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <div className="host-sentence-container bg-white border border-slate-200/60 rounded-2xl shadow-sm text-slate-800" style={{
              padding: '28px',
              fontSize: '1.4rem',
              lineHeight: '2rem',
              marginBottom: 32,
              display: 'inline-block'
            }}>
              {renderSentenceWithBlanks(activeQuestion.options.sentence)}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {activeQuestion.options.choices?.map((choice, idx) => (
                <div 
                  key={idx} 
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(93, 107, 130, 0.15)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)'
                  }}
                >
                  {choice}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. DROP DOWN */}
        {type === 'DROP_DOWN' && activeQuestion.options && (
          <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
            <div className="host-sentence-container bg-white border border-slate-200/60 rounded-2xl shadow-sm text-slate-800" style={{
              padding: '28px',
              fontSize: '1.4rem',
              lineHeight: '2rem',
              display: 'inline-block'
            }}>
              {renderSentenceWithDropdowns(activeQuestion.options.sentence)}
            </div>
          </div>
        )}

        {/* 5. CATEGORIZE */}
        {type === 'CATEGORIZE' && activeQuestion.options && (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(activeQuestion.options.categories?.length || 2, 4)}, 1fr)`,
              gap: 20,
              marginBottom: 32
            }}>
              {activeQuestion.options.categories?.map((cat, idx) => {
                const colorSet = BUCKET_COLORS[idx % BUCKET_COLORS.length];
                return (
                  <div 
                    key={idx}
                    style={{
                      background: colorSet.background,
                      border: colorSet.border,
                      borderRadius: '16px',
                      padding: '20px 16px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '1.2rem',
                      color: colorSet.color,
                      boxShadow: colorSet.shadow
                    }}
                  >
                    {cat}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {activeQuestion.options.items?.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                >
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 16, justifyContent: 'center' }}>
        {timerDuration > 0 && hostTimeLeft > 0 ? (
          <>
            <button className="btn btn-warning btn-sm" onClick={hostCancelTimer} style={{ width: 'auto' }}>
              ⏱ Stop Timer
            </button>
            <button className="btn btn-secondary btn-sm" onClick={hostShowLeaderboard} style={{ width: 'auto' }}>
              Skip Question
            </button>
          </>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={hostShowLeaderboard} style={{ width: 'auto' }}>
            Reveal Answers
          </button>
        )}
        <button 
          className="btn btn-danger btn-sm" 
          onClick={() => setShowStopConfirm(true)}
          style={{ width: 'auto' }}
        >
          🛑 Stop Game
        </button>
      </div>

      <ConfirmModal
        isOpen={showStopConfirm}
        onClose={() => setShowStopConfirm(false)}
        onConfirm={hostEndGame}
        title="Stop the game?"
        message="This will end the session for all players. Are you sure you want to stop and return to the home screen?"
        confirmText="Stop Game"
        cancelText="Keep Playing"
        variant="danger"
        icon="🛑"
      />
    </div>
  );
}
