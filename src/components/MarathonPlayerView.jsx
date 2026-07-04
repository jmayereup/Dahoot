import React, { useState } from 'react';
import { QuestionInteraction } from './QuestionInteraction';
import { ConfirmModal } from './ConfirmModal';

export function MarathonPlayerView({
  playerRoom,
  playerRecord,
  currentQuestion,
  playerQuestionIndex,
  totalQuestions,
  currentLap,
  playerFeedback,
  hasMoreQuestions,
  isFinished,
  submitAnswer,
  advanceToNextQuestion,
  exitGame,
  wrapUpTimeLeft
}) {
  const marathonStats = playerRecord?.marathon_stats || {};
  const currentStreak = marathonStats.current_streak || 0;
  const bestStreak = marathonStats.best_streak || 0;
  const totalAnswered = marathonStats.total_answered || 0;
  const correctCount = marathonStats.correct_count || 0;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  const [showExitConfirm, setShowExitConfirm] = useState(false);

  return (
    <div className="app-container">

      <div style={{
        width: '100%',
        maxWidth: '600px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 12px 12px',
        fontSize: '0.9rem',
        color: 'var(--text-secondary)'
      }}>
        <span>👤 {playerRecord.name} — Lap {currentLap}</span>
        <span>Score: <strong>{playerRecord.score}</strong></span>
        <button 
          onClick={() => setShowExitConfirm(true)}
          className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-semibold text-xs border border-purple-500/25 hover:border-purple-500/40 px-3 py-1 rounded-full cursor-pointer transition-all duration-200"
        >
          Exit Marathon
        </button>
      </div>

      <div className="panel" style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.02) 0%, rgba(167, 139, 250, 0.01) 100%)',
        borderColor: 'rgba(139, 92, 246, 0.1)'
      }}>

        {isFinished && (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', color: '#8B5CF6' }}>Marathon Complete!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '24px' }}>
              Great job, {playerRecord.name}! The marathon has ended.
            </p>

            <div style={{
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Final Results
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Final Score
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {playerRecord.score}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Best Streak
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {bestStreak}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Correct
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {correctCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Accuracy
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {accuracy}%
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={exitGame}
              className="btn btn-primary"
              style={{
                background: '#8B5CF6',
                borderColor: '#8B5CF6',
                minWidth: '180px'
              }}
            >
              Exit Marathon
            </button>
          </div>
        )}

        {!isFinished && currentQuestion && !playerFeedback && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '12px 16px',
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Streak
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {currentStreak}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Best
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {bestStreak}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Correct
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {correctCount}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Accuracy
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {accuracy}%
                  </div>
                </div>
              </div>
            </div>

            <QuestionInteraction
              question={currentQuestion}
              questionNumber={playerQuestionIndex + 1}
              totalQuestions={totalQuestions}
              mode="interactive"
              onSubmit={submitAnswer}
            />
          </div>
        )}

        {!isFinished && playerFeedback && (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
              {playerFeedback.correct ? '✅' : '❌'}
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: playerFeedback.correct ? '#10B981' : '#EF4444' }}>
              {playerFeedback.correct ? 'Correct!' : 'Incorrect'}
            </h2>
            {playerFeedback.correct && (
              <p style={{ color: '#8B5CF6', fontWeight: '600', fontSize: '1.1rem', marginBottom: '8px' }}>
                +{playerFeedback.points} points
              </p>
            )}

            <div style={{
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '12px',
              padding: '20px',
              margin: '24px 0'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Marathon Stats
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Streak
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {currentStreak}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Best
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {bestStreak}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Correct
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {correctCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Accuracy
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {accuracy}%
                  </div>
                </div>
              </div>
            </div>

            {hasMoreQuestions && (
              <button
                onClick={advanceToNextQuestion}
                className="btn btn-primary"
                style={{
                  background: '#8B5CF6',
                  borderColor: '#8B5CF6',
                  minWidth: '200px'
                }}
              >
                {playerQuestionIndex >= totalQuestions ? `Start Round ${currentLap + 1}` : 'Next Question'}
              </button>
            )}
          </div>
        )}

        {!isFinished && !currentQuestion && (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading question...</p>
          </div>
        )}

        {playerRoom.status === 'WRAP_UP' && (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⏱️</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#8B5CF6' }}>Wrap-Up Time</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
              Take a moment to review your answer before we continue!
            </p>

            {wrapUpTimeLeft !== null && (
              <div style={{
                fontSize: '2.5rem',
                fontWeight: '800',
                color: '#8B5CF6',
                marginBottom: '24px'
              }}>
                {wrapUpTimeLeft}s
              </div>
            )}

            <div style={{
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Your Marathon Stats
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Current Streak
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {currentStreak}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Best Streak
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {bestStreak}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Correct
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {correctCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Accuracy
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {accuracy}%
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              <span>Waiting for teacher to continue...</span>
            </div>
          </div>
        )}

        {playerRoom.status === 'LEADERBOARD' && (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏆</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#8B5CF6' }}>Marathon Leaderboard</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
              See how you rank against other players!
            </p>

            <div style={{
              background: 'rgba(139, 92, 246, 0.06)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Your Performance
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Score
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {playerRecord.score}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Best Streak
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {bestStreak}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Correct
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {correctCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Accuracy
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {accuracy}%
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
              <span>Waiting for teacher to continue...</span>
            </div>
          </div>
        )}

      </div>

      <ConfirmModal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={exitGame}
        title="Leave the marathon?"
        message="Your progress in this session will be lost. Are you sure you want to return to the home screen?"
        confirmText="Leave Marathon"
        cancelText="Stay"
        variant="warning"
        icon="🏃"
      />
    </div>
  );
}
