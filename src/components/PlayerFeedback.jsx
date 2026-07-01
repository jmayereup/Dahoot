import React, { useMemo } from 'react';
import { deterministicShuffle } from '../utils/shuffle';

export function PlayerFeedback({ playerFeedback, activeQuestion, playerRecord, playerSelectedIdx, roomCode }) {
  const type = activeQuestion.type || 'MULTIPLE_CHOICE';

  // Shuffle multiple choice options deterministically based on roomCode and question ID
  const shuffledMultipleChoiceOptions = useMemo(() => {
    if (type !== 'MULTIPLE_CHOICE' || !Array.isArray(activeQuestion.options)) return [];
    return deterministicShuffle(activeQuestion.options, `${roomCode}-${activeQuestion.id}`);
  }, [activeQuestion.id, activeQuestion.options, roomCode, type]);

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

  const renderFeedbackSentenceDropdowns = (sentence, dropdowns, playerAnswer) => {
    if (!sentence || !Array.isArray(dropdowns)) return '';
    const parts = sentence.split(/(\{\{\d+\}\})/g);
    return parts.map((part, idx) => {
      const match = part.match(/\{\{(\d+)\}\}/);
      if (match) {
        const dropIdx = parseInt(match[1]);
        const config = dropdowns[dropIdx];
        const playerChoice = playerAnswer ? playerAnswer[dropIdx] : '';
        const correctChoice = config.correct;
        const isCorrect = playerChoice === correctChoice;
        
        return (
          <span 
            key={idx} 
            className={`player-sentence-blank feedback-blank ${playerChoice ? (isCorrect ? 'correct' : 'incorrect') : 'unanswered'}`}
          >
            {playerChoice ? (
              <span>
                {playerChoice} {isCorrect ? '✓' : `(Correct: ${correctChoice})`}
              </span>
            ) : (
              <span>_____ (Correct: {correctChoice})</span>
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
        <h3 style={{ fontSize: '1rem', color: '#334155', marginBottom: 12 }}>
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
            {shuffledMultipleChoiceOptions.map((item, idx) => {
              const isCorrectAnswer = item.originalIdx === activeQuestion.correct_option_index;
              const isPlayerChoice = item.originalIdx === playerSelectedIdx;
              
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
                  key={item.originalIdx} 
                  className={`option-card ${cardClass}`}
                >
                  <div className="option-icon">
                    {isCorrectAnswer ? '✓' : (isPlayerChoice ? '✗' : ['A', 'B', 'C', 'D'][idx])}
                  </div>
                  <span>{item.item}</span>
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
              // Unanswered Sorting correct order
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

        {/* 4. DROP DOWN */}
        {type === 'DROP_DOWN' && activeQuestion.options && (
          <div className="player-sentence-container bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm text-slate-800" style={{
            lineHeight: '2.8rem',
            fontSize: '1.15rem'
          }}>
            {renderFeedbackSentenceDropdowns(
              activeQuestion.options.sentence, 
              activeQuestion.options.dropdowns, 
              playerSelectedIdx
            )}
          </div>
        )}

        {/* 5. CATEGORIZE */}
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

  return (
    <div className="feedback-screen">
      {playerFeedback ? (
        <div>
          {playerFeedback.correct ? (
            <div>
              <div className="feedback-icon feedback-correct">✓</div>
              <h2>Correct!</h2>
              <div className="points-text feedback-correct">+{playerFeedback.points} pts</div>
            </div>
          ) : (
            <div>
              <div className="feedback-icon feedback-incorrect">✗</div>
              <h2>Incorrect</h2>
              <div className="points-text feedback-incorrect">+0 pts</div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="feedback-icon feedback-incorrect">✗</div>
          <h2>No Answer</h2>
          <div className="points-text feedback-incorrect">+0 pts</div>
          <p style={{ color: '#334155', marginBottom: 12 }}>
            You did not submit an answer in time!
          </p>
        </div>
      )}

      {renderQuestionReview()}

      <div className="score-display" style={{ marginTop: 24 }}>
        Current Score: <strong>{playerRecord.score} points</strong>
      </div>
      <p style={{ color: '#475569', fontSize: '0.85rem', marginTop: 32 }}>
        Look at the screen to see current rankings.
      </p>
    </div>
  );
}
