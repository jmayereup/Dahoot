import React, { useMemo, useState } from 'react';
import { OPTION_CLASSES, BUCKET_COLORS } from '../constants';
import { deterministicShuffle } from '../utils/shuffle';
import { splitCurlyTokens, getCurlyIndex, getCurlyInner, splitBracketTokens, getBlankIndex, getBracketInner } from '../utils/blankParsing';
import { ConfirmModal } from './ConfirmModal';
import { getMcOptions, getMcCorrectAnswer, getDragDropCorrect, getDropDownCorrect, getSortingCorrect, normalizeQuestion } from '../utils/questionSchema';

export function HostLeaderboard({
  qIndex,
  activeQuestion,
  hostPlayers,
  hostNextQuestion,
  hostEndGame,
  questions,
  roomCode
}) {
  const isLastQuestion = qIndex + 1 >= questions.length;
  const type = activeQuestion.type || 'MULTIPLE_CHOICE';
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Shuffle multiple choice options deterministically based on roomCode and question ID
  const shuffledMultipleChoiceOptions = useMemo(() => {
    if (type !== 'MULTIPLE_CHOICE') return [];
    const opts = getMcOptions(activeQuestion);
    return deterministicShuffle(opts, `${roomCode}-${activeQuestion.id}`).map(o => ({ item: o.item, originalIdx: opts.indexOf(o.item) }));
  }, [activeQuestion.id, activeQuestion.options, roomCode, type]);

  const correctShuffledIdx = useMemo(() => {
    const correct = getMcCorrectAnswer(activeQuestion);
    return shuffledMultipleChoiceOptions.findIndex(item => item.item === correct);
  }, [shuffledMultipleChoiceOptions, activeQuestion]);

  // Helper to fill blanks in Drag & Drop sentence
  const fillSentenceBlanks = (sentence) => {
    if (!sentence) return '';
    const correctAnswers = getDragDropCorrect(activeQuestion);
    const parts = splitBracketTokens(sentence);
    let sequential = 0;
    return parts.map((part, idx) => {
      const numericIdx = getBlankIndex(part);
      const inner = getBracketInner(part);
      if (numericIdx !== null) {
        const valIdx = numericIdx;
        return (
          <span key={idx} style={{
            color: 'var(--accent-light)',
            fontWeight: 700,
            borderBottom: '2px solid var(--accent-light)',
            padding: '0 6px',
            margin: '0 4px'
          }}>
            {correctAnswers[valIdx] || '???'}
          </span>
        );
      }
      if (inner) {
        const mapped = correctAnswers.findIndex(c => c === inner);
        const valIdx = mapped !== -1 ? mapped : sequential;
        if (mapped === -1) sequential += 1;
        return (
          <span key={idx} style={{
            color: 'var(--accent-light)',
            fontWeight: 700,
            borderBottom: '2px solid var(--accent-light)',
            padding: '0 6px',
            margin: '0 4px'
          }}>
            {correctAnswers[valIdx] || inner || '???'}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Helper to fill dropdowns in Drop Down sentence
  const fillSentenceDropdowns = (sentence) => {
    if (!sentence) return '';
    const dropdowns = normalizeQuestion(activeQuestion)?.options?.dropdowns || [];
    const parts = splitCurlyTokens(sentence);
    let sequential = 0;
    return parts.map((part, idx) => {
      const valIdx = getCurlyIndex(part);
      const inner = getCurlyInner(part);
      if (valIdx !== null) {
        return (
          <span key={idx} style={{
            color: 'var(--accent-light)',
            fontWeight: 700,
            borderBottom: '2px solid var(--accent-light)',
            padding: '0 6px',
            margin: '0 4px'
          }}>
            {getDropDownCorrect(activeQuestion, valIdx) || '???'}
          </span>
        );
      }
      if (inner) {
        const mapped = dropdowns.findIndex(d => d.correct_answer === inner || d.correct === inner);
        const idxToUse = mapped !== -1 ? mapped : sequential;
        if (mapped === -1) sequential += 1;
        const cfg = dropdowns[idxToUse];
        const correctVal = cfg ? (cfg.correct_answer || cfg.correct || inner) : inner;
        return (
          <span key={idx} style={{
            color: 'var(--accent-light)',
            fontWeight: 700,
            borderBottom: '2px solid var(--accent-light)',
            padding: '0 6px',
            margin: '0 4px'
          }}>
            {correctVal}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Helper to get categorized items
  const categorizedMap = React.useMemo(() => {
    if (type !== 'CATEGORIZE' || !activeQuestion.options) return {};
    const categories = activeQuestion.options.categories || [];
    const items = activeQuestion.options.items || [];
    const map = {};
    categories.forEach(cat => {
      map[cat] = items.filter(item => item.category === cat);
    });
    return map;
  }, [activeQuestion, type]);

  return (
    <div>
      <h2 className="!mb-2">Leaderboard</h2>
      <p className="subtitle !-mt-1 !mb-4">Question {qIndex + 1} Complete</p>

      {/* Show Correct Answer breakdown */}
      <div style={{ marginBottom: 16, textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)', padding: '14px 20px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.05em' }}>
          Correct Answer Key:
        </div>

        {/* 1. MULTIPLE CHOICE */}
        {type === 'MULTIPLE_CHOICE' && correctShuffledIdx !== -1 && (
          <div className={`option-card ${OPTION_CLASSES[correctShuffledIdx]} !p-3 !rounded-xl !text-base`} style={{ maxWidth: '450px', cursor: 'default' }}>
            <div className="option-icon !w-8 !h-8 !text-base">{String.fromCharCode(65 + correctShuffledIdx)}</div>
            <span>{shuffledMultipleChoiceOptions[correctShuffledIdx].item}</span>
          </div>
        )}

        {/* 2. SORTING */}
        {type === 'SORTING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '450px' }}>
            {getSortingCorrect(activeQuestion).map((opt, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: '#10b981',
                  fontWeight: 600,
                  fontSize: '0.95rem'
                }}
              >
                <span style={{ fontSize: '0.85rem', background: '#10b981', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {idx + 1}
                </span>
                {opt}
              </div>
            ))}
          </div>
        )}

        {/* 3. DRAG AND DROP */}
        {type === 'DRAG_DROP' && activeQuestion.options && (
          <div style={{ fontSize: '1.05rem', lineHeight: '1.5rem', color: 'var(--text-primary)' }}>
            {fillSentenceBlanks(activeQuestion.options.sentence)}
          </div>
        )}

        {/* 4. DROP DOWN */}
        {type === 'DROP_DOWN' && activeQuestion.options && (
          <div style={{ fontSize: '1.05rem', lineHeight: '1.5rem', color: 'var(--text-primary)' }}>
            {fillSentenceDropdowns(activeQuestion.options.sentence)}
          </div>
        )}

        {/* 5. CATEGORIZE */}
        {type === 'CATEGORIZE' && activeQuestion.options && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${Math.min(activeQuestion.options.categories?.length || 2, 4)}, 1fr)`,
            gap: 10 
          }}>
            {Object.keys(categorizedMap).map((cat, idx) => {
              const catIdx = activeQuestion.options.categories?.indexOf(cat);
              const colorSet = BUCKET_COLORS[catIdx !== -1 ? catIdx % BUCKET_COLORS.length : idx % BUCKET_COLORS.length];
              return (
                <div 
                  key={idx}
                  style={{
                    background: colorSet.background,
                    border: colorSet.border,
                    borderRadius: '12px',
                    padding: '12px 10px',
                    boxShadow: colorSet.shadow
                  }}
                >
                  <div style={{ fontWeight: 800, color: colorSet.color, marginBottom: 6, borderBottom: `1.5px solid ${colorSet.color}33`, paddingBottom: 4 }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {categorizedMap[cat].map((item, iIdx) => (
                      <div key={iIdx} style={{ fontSize: '0.9rem', color: colorSet.color, fontWeight: 500 }}>
                        • {item.name}
                      </div>
                    ))}
                    {categorizedMap[cat].length === 0 && (
                      <div style={{ fontSize: '0.8rem', color: colorSet.color, opacity: 0.6, fontStyle: 'italic' }}>
                        No items
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="leaderboard-list !my-4 !gap-2">
        {hostPlayers.slice(0, 5).map((player, idx) => (
          <div key={player.id} className="leaderboard-item !py-2.5 !px-4 !rounded-xl">
            <span className={`leaderboard-rank leaderboard-rank-${idx + 1} !text-base`}>
              {idx + 1}
            </span>
            <span className="leaderboard-name !text-base">{player.name}</span>
            <span className="leaderboard-score !text-base">{player.score} pts</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={hostNextQuestion} style={{ minWidth: 160 }}>
          {isLastQuestion ? 'Show Standings' : 'Next Question'}
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowCancelConfirm(true)}
          style={{ minWidth: 160 }}
        >
          Cancel Game
        </button>
      </div>

      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={hostEndGame}
        title="Cancel the game?"
        message="This will end the game for all players and display the final scored board. Are you sure you want to cancel?"
        confirmText="Cancel Game"
        cancelText="Keep Going"
        variant="danger"
        icon="🛑"
      />
    </div>
  );
}
