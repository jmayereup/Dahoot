import React, { useMemo } from 'react';
import { OPTION_CLASSES, OPTION_SHAPES, BUCKET_COLORS } from '../constants';
import { deterministicShuffle } from '../utils/shuffle';

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

  // Shuffle multiple choice options deterministically based on roomCode and question ID
  const shuffledMultipleChoiceOptions = useMemo(() => {
    if (type !== 'MULTIPLE_CHOICE' || !Array.isArray(activeQuestion.options)) return [];
    return deterministicShuffle(activeQuestion.options, `${roomCode}-${activeQuestion.id}`);
  }, [activeQuestion.id, activeQuestion.options, roomCode, type]);

  const correctShuffledIdx = useMemo(() => {
    return shuffledMultipleChoiceOptions.findIndex(item => item.originalIdx === activeQuestion.correct_option_index);
  }, [shuffledMultipleChoiceOptions, activeQuestion.correct_option_index]);

  // Helper to fill blanks in Drag & Drop sentence
  const fillSentenceBlanks = (sentence, correctAnswers) => {
    if (!sentence || !Array.isArray(correctAnswers)) return '';
    const parts = sentence.split(/(\[blank\d+\])/g);
    return parts.map((part, idx) => {
      const match = part.match(/\[blank(\d+)\]/);
      if (match) {
        const valIdx = parseInt(match[1]);
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
      <h2>Leaderboard</h2>
      <p className="subtitle">Question {qIndex + 1} Complete</p>

      {/* Show Correct Answer breakdown */}
      <div style={{ marginBottom: 32, textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)', padding: '24px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16, letterSpacing: '0.05em' }}>
          Correct Answer Key:
        </div>

        {/* 1. MULTIPLE CHOICE */}
        {type === 'MULTIPLE_CHOICE' && Array.isArray(activeQuestion.options) && correctShuffledIdx !== -1 && (
          <div className={`option-card ${OPTION_CLASSES[correctShuffledIdx]}`} style={{ maxWidth: '500px', cursor: 'default' }}>
            <div className="option-icon">{['A', 'B', 'C', 'D'][correctShuffledIdx]}</div>
            <span>{shuffledMultipleChoiceOptions[correctShuffledIdx].item}</span>
          </div>
        )}

        {/* 2. SORTING */}
        {type === 'SORTING' && Array.isArray(activeQuestion.options) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '500px' }}>
            {activeQuestion.options.map((opt, idx) => (
              <div 
                key={idx} 
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: '#10b981',
                  fontWeight: 600
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
          <div style={{ fontSize: '1.2rem', lineHeight: '1.8rem', color: 'var(--text-primary)' }}>
            {fillSentenceBlanks(activeQuestion.options.sentence, activeQuestion.options.correct)}
          </div>
        )}

        {/* 4. CATEGORIZE */}
        {type === 'CATEGORIZE' && activeQuestion.options && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${Math.min(activeQuestion.options.categories?.length || 2, 4)}, 1fr)`,
            gap: 16 
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
                    borderRadius: '16px',
                    padding: '20px 16px',
                    boxShadow: colorSet.shadow
                  }}
                >
                  <div style={{ fontWeight: 800, color: colorSet.color, marginBottom: 12, borderBottom: `1.5px solid ${colorSet.color}33`, paddingBottom: 6 }}>
                    {cat}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {categorizedMap[cat].map((item, iIdx) => (
                      <div key={iIdx} style={{ fontSize: '0.95rem', color: colorSet.color, fontWeight: 500 }}>
                        • {item.name}
                      </div>
                    ))}
                    {categorizedMap[cat].length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: colorSet.color, opacity: 0.6, fontStyle: 'italic' }}>
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

      <div className="leaderboard-list">
        {hostPlayers.slice(0, 5).map((player, idx) => (
          <div key={player.id} className="leaderboard-item">
            <span className={`leaderboard-rank leaderboard-rank-${idx + 1}`}>
              {idx + 1}
            </span>
            <span className="leaderboard-name">{player.name}</span>
            <span className="leaderboard-score">{player.score} pts</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={hostNextQuestion} style={{ minWidth: 160 }}>
          {isLastQuestion ? 'Show Standings' : 'Next Question'}
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            if (window.confirm("Are you sure you want to stop and exit the game? This will end the session for all players.")) {
              hostEndGame();
            }
          }}
          style={{ minWidth: 160 }}
        >
          Cancel Game
        </button>
      </div>
    </div>
  );
}
