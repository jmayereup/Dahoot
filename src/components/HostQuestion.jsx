import React, { useState } from 'react';
import { OPTION_CLASSES, BUCKET_COLORS } from '../constants';
import { splitBracketTokens, getBlankIndex, getBracketInner, splitCurlyTokens, getCurlyIndex, getCurlyInner } from '../utils/blankParsing';
import { ConfirmModal } from './ConfirmModal';
import { useShuffledOptions } from '../hooks/useShuffledOptions';

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

  const { mcOptions: shuffledMultipleChoiceOptions, sortingPool: shuffledSortingOptions, dragDropChoices: shuffledDragDropChoices, categorizeItems: shuffledCategorizeItems } = useShuffledOptions(activeQuestion, `${roomCode}-${activeQuestion.id}`);

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
      <div className="question-card w-full text-center mb-3">
        <div className="question-number inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100/85 text-rose-500 font-extrabold text-[10px] tracking-widest uppercase rounded-full mb-2 shadow-xs">
          Question {qIndex + 1} of {questions.length} • {type.replace('_', ' ')}
        </div>
        <div className="question-title text-2xl md:text-4xl font-black text-slate-800 tracking-tight leading-normal max-w-3xl mx-auto px-4">
          {activeQuestion.text}
        </div>
      </div>

      <div className="game-mid-section flex flex-row items-center justify-center gap-8 md:gap-14 my-4 bg-slate-50/50 border border-slate-100 rounded-3xl p-4 py-3 max-w-md w-full mx-auto shadow-xs">
        <div className="timer-container flex flex-col items-center">
          <div className="timer-number relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-full bg-rose-50 border-[5px] border-rose-200/60 shadow-inner animate-pulse-glow transition-all">
            <span className="text-3xl md:text-4xl font-black text-rose-500 font-mono tracking-tighter">
              {timerDuration === 0 || hostTimeLeft === null ? '∞' : hostTimeLeft}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1.5">Seconds Left</span>
        </div>
        <div className="answer-stats flex flex-col items-center">
          <div className="w-20 h-20 md:w-24 md:h-24 flex flex-col items-center justify-center rounded-full bg-emerald-50 border-[5px] border-emerald-200/60 shadow-inner transition-all">
            <span className="answer-stats-num text-2xl md:text-3xl font-black text-emerald-600 font-mono">
              {answeredCount}
            </span>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">
              / {hostPlayers.length}
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1.5">Responses</span>
        </div>
      </div>

      {/* RENDER LAYOUT BY QUESTION TYPE */}
      <div className="question-content-area" style={{ marginTop: 12, width: '100%' }}>
        
        {/* 1. MULTIPLE CHOICE */}
        {type === 'MULTIPLE_CHOICE' && (
          <div className="options-grid !gap-3">
            {shuffledMultipleChoiceOptions.map((item, idx) => (
              <div key={item.item} className={`option-card ${OPTION_CLASSES[idx]} !p-3.5 !rounded-xl !text-base`}>
                <div className="option-icon !w-8 !h-8 !text-base">{['A', 'B', 'C', 'D'][idx]}</div>
                <span>{item.item}</span>
              </div>
            ))}
          </div>
        )}

        {/* 2. SORTING */}
        {type === 'SORTING' && (
          <div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 12, textAlign: 'center', fontSize: '0.95rem', fontWeight: 600 }}>
              Arrange these in the correct order on your device:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '450px', margin: '0 auto' }}>
              {shuffledSortingOptions.map((opt, idx) => (
                <div 
                  key={idx} 
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: '1rem',
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
          <div style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
            <div className="host-sentence-container bg-white border border-slate-200/60 rounded-2xl shadow-sm text-slate-800" style={{
              padding: '16px',
              fontSize: '1.20rem',
              lineHeight: '1.7rem',
              marginBottom: 16,
              display: 'inline-block'
            }}>
              {renderSentenceWithBlanks(activeQuestion.options.sentence)}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {shuffledDragDropChoices.map((choice, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(93, 107, 130, 0.15)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.9rem',
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
          <div style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
            <div className="host-sentence-container bg-white border border-slate-200/60 rounded-2xl shadow-sm text-slate-800" style={{
              padding: '16px',
              fontSize: '1.20rem',
              lineHeight: '1.7rem',
              display: 'inline-block'
            }}>
              {renderSentenceWithDropdowns(activeQuestion.options.sentence)}
            </div>
          </div>
        )}

        {/* 5. CATEGORIZE */}
        {type === 'CATEGORIZE' && activeQuestion.options && (
          <div style={{ maxWidth: '750px', margin: '0 auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(activeQuestion.options.categories?.length || 2, 4)}, 1fr)`,
              gap: 12,
              marginBottom: 16
            }}>
              {activeQuestion.options.categories?.map((cat, idx) => {
                const colorSet = BUCKET_COLORS[idx % BUCKET_COLORS.length];
                return (
                  <div 
                    key={idx}
                    style={{
                      background: colorSet.background,
                      border: colorSet.border,
                      borderRadius: '12px',
                      padding: '12px 10px',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: colorSet.color,
                      boxShadow: colorSet.shadow
                    }}
                  >
                    {cat}
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {shuffledCategorizeItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.9rem',
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

      <div style={{ marginTop: 16, display: 'flex', gap: 16, justifyContent: 'center' }}>
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
