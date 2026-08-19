import React, { useMemo } from 'react';
import { deterministicShuffle } from '../utils/shuffle';
import { splitCurlyTokens, getCurlyIndex, getCurlyInner, splitBracketTokens, getBlankIndex, getBracketInner } from '../utils/blankParsing';
import { getMcOptions, getMcCorrectAnswer, getDragDropCorrect, getDropDownCorrect, getSortingCorrect, normalizeQuestion } from '../utils/questionSchema';

export function PlayerFeedback({ playerFeedback, activeQuestion, playerRecord, playerSelectedIdx, roomCode }) {
  const type = activeQuestion.type || 'MULTIPLE_CHOICE';

  // Shuffle multiple choice options deterministically based on roomCode and question ID
  const shuffledMultipleChoiceOptions = useMemo(() => {
    if (type !== 'MULTIPLE_CHOICE') return [];
    const opts = getMcOptions(activeQuestion);
    return deterministicShuffle(opts, `${roomCode}-${activeQuestion.id}`).map(o => ({ item: o.item, originalIdx: opts.indexOf(o.item) }));
  }, [activeQuestion.id, activeQuestion.options, roomCode, type]);

  const correctMcAnswer = useMemo(() => getMcCorrectAnswer(activeQuestion), [activeQuestion]);

  const renderFeedbackSentenceBlanks = (sentence, playerAnswer) => {
    if (!sentence) return '';
    const correctAnswers = getDragDropCorrect(activeQuestion);
    const parts = splitBracketTokens(sentence);
    let sequentialBlank = 0;
    return parts.map((part, idx) => {
      const numericIdx = getBlankIndex(part);
      const inner = getBracketInner(part);
      if (numericIdx !== null || inner) {
        const blankIdx = numericIdx !== null ? numericIdx : sequentialBlank++;
        const playerWord = playerAnswer ? playerAnswer[blankIdx] : null;
        const correctWord = correctAnswers[blankIdx] || inner || '';
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

  const renderFeedbackSentenceDropdowns = (sentence, playerAnswer) => {
    if (!sentence) return '';
    const dropdowns = normalizeQuestion(activeQuestion)?.options?.dropdowns || [];
    const parts = splitCurlyTokens(sentence);
    let sequentialDrop = 0;
    return parts.map((part, idx) => {
      const dropIdx = getCurlyIndex(part);
      const inner = getCurlyInner(part);
      if (dropIdx !== null || inner) {
        const idxToUse = dropIdx !== null ? dropIdx : sequentialDrop++;
        const config = dropdowns[idxToUse] || { correct_answer: inner };
        const correctChoice = getDropDownCorrect(activeQuestion, idxToUse) || config.correct_answer || config.correct || inner;
        const playerChoice = playerAnswer ? playerAnswer[idxToUse] : '';
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
              <span>_____ (Correct: ${correctChoice})</span>
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
        {type === 'MULTIPLE_CHOICE' && (
          <div className="options-grid">
            {shuffledMultipleChoiceOptions.map((item, idx) => {
              const isCorrectAnswer = item.item === correctMcAnswer;
              const isPlayerChoice = item.item === playerSelectedIdx;

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
                  key={item.item}
                  className={`option-card ${cardClass}`}
                >
                  <div className="option-icon">
                    {isCorrectAnswer ? '✓' : (isPlayerChoice ? '✗' : String.fromCharCode(65 + idx))}
                  </div>
                  <span>{item.item}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. SORTING */}
        {type === 'SORTING' && (() => {
          const seq = getSortingCorrect(activeQuestion);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
              {playerSelectedIdx && Array.isArray(playerSelectedIdx) ? (
                playerSelectedIdx.map((item, idx) => {
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

        {/* 3. DRAG & DROP */}
        {type === 'DRAG_DROP' && activeQuestion.options && (
          <div className="player-sentence-container bg-white border border-slate-200/60 rounded-2xl p-5 relative shadow-sm text-slate-800" style={{
            lineHeight: '2.5rem',
            fontSize: '1.15rem'
          }}>
            {renderFeedbackSentenceBlanks(
              activeQuestion.options.sentence,
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
                        Chosen: <strong>{playerCat}</strong> {isCorrect ? '✓ [Correct]' : `✗ [Incorrect] (Correct: ${correctCat})`}
                      </span>
                    ) : (
                      <span>✗ [Unanswered] (Correct: {correctCat})</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. DISCUSSION */}
        {type === 'DISCUSSION' && (
          <div className="flex flex-col gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Your Shared Response:
              </span>
              {playerSelectedIdx || playerRecord.answers?.[activeQuestion.id]?.text || (typeof playerRecord.answers?.[activeQuestion.id] === 'string' ? playerRecord.answers[activeQuestion.id] : null) ? (
                <p className="text-sm font-semibold text-slate-800 italic">
                  "{typeof playerSelectedIdx === 'string' ? playerSelectedIdx : (playerSelectedIdx?.text || playerRecord.answers?.[activeQuestion.id]?.text || playerRecord.answers?.[activeQuestion.id])}"
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  [No response submitted]
                </p>
              )}
            </div>

            {activeQuestion.options?.sample_answers && activeQuestion.options.sample_answers.length > 0 && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-left text-xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                  Talking Points / Ideas:
                </span>
                <ul className="list-disc list-inside text-amber-900/80 space-y-0.5 text-[11px]">
                  {activeQuestion.options.sample_answers.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>
    );
  };

  const hasAnswered = playerRecord.answers && playerRecord.answers[activeQuestion.id] !== undefined;
  const isDiscussion = type === 'DISCUSSION';

  return (
    <div className="feedback-screen">
      {isDiscussion ? (
        <div>
          {hasAnswered || playerFeedback ? (
            <div>
              <div className="feedback-icon !bg-sky-50 !text-sky-600 !border-sky-200">💬</div>
              <h2>Response Shared!</h2>
              <div className="points-text !text-sky-600">Discussion • 0 pts</div>
              <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: 8 }}>
                Check the main screen for class discussion!
              </p>
            </div>
          ) : (
            <div>
              <div className="feedback-icon !bg-slate-100 !text-slate-500 !border-slate-200">💬</div>
              <h2>No Response</h2>
              <div className="points-text !text-slate-500">+0 pts</div>
              <p style={{ color: '#475569', fontSize: '0.9rem', marginTop: 8 }}>
                Join the classroom discussion on the main screen!
              </p>
            </div>
          )}
        </div>
      ) : playerFeedback ? (
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
          {hasAnswered ? (
            <div>
              <div className="feedback-icon feedback-correct">✓</div>
              <h2>Answer Submitted</h2>
              <div className="points-text feedback-correct">Result on host screen</div>
              <p style={{ color: '#334155', marginBottom: 12 }}>
                You have successfully reconnected!
              </p>
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
