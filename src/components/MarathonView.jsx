import React, { useState } from 'react';
import { QuestionInteraction } from './QuestionInteraction';
import { ConfirmModal } from './ConfirmModal';

export function MarathonView({
  marathonState,
  selectedGame,
  nickname,
  currentQuestion,
  totalAnswered,
  correctCount,
  currentStreak,
  bestStreak,
  elapsedTime,
  formattedTime,
  accuracy,
  playerSelectedIdx,
  playerFeedback,
  error,
  startSession,
  submitAnswer,
  nextQuestion,
  pauseSession,
  resumeSession,
  finishSession,
  exitMarathon,
  restartMarathon
}) {
  const [localNickname, setLocalNickname] = useState(nickname || 'Player');
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  if (marathonState === 'INTRO') {
    return (
      <div className="app-container">
        <div className="panel" style={{ maxWidth: '520px' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>🏃</span>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Marathon Mode</h2>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-light)', fontWeight: 'bold', marginBottom: '16px' }}>
            {selectedGame?.title}
          </h3>
          
          {selectedGame?.description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.45rem' }}>
              {selectedGame.description}
            </p>
          )}

          <div style={{ 
            background: 'rgba(99, 102, 241, 0.04)', 
            border: '1px solid rgba(99, 102, 241, 0.08)',
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'left',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Marathon Rules:
            </span>
            <div style={{ fontSize: '0.9rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>⏱️ <strong>Timed</strong>: Track your time as you answer questions.</div>
              <div>🔥 <strong>Streaks</strong>: Build your streak for bonus points!</div>
              <div>🏁 <strong>Endless</strong>: Answer as many questions as you want, then finish when ready.</div>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); startSession(localNickname); }}>
            <div className="form-group">
              <label className="form-label">Enter your Nickname</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. SpeedRunner"
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
                onClick={exitMarathon}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                className="btn btn-primary animate-pulse-glow"
                style={{ flex: 2 }}
              >
                Start Marathon
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
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
          <span>👤 <strong>{nickname}</strong> (Marathon Mode)</span>
          <span>⏱️ <strong>{formattedTime}</strong></span>
          <button 
            onClick={() => setShowQuitConfirm(true)}
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
            Quit Marathon
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255, 255, 255, 0.4)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Questions Answered: {totalAnswered}
            </span>
            <span style={{ color: '#6366f1' }}>
              Accuracy: {accuracy}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 'bold', marginTop: '4px' }}>
            <span style={{ color: '#f59e0b' }}>
              🔥 Current Streak: {currentStreak}
            </span>
            <span style={{ color: '#10b981' }}>
              🏆 Best Streak: {bestStreak}
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'rgba(93, 107, 130, 0.08)', borderRadius: '999px', overflow: 'hidden', display: 'flex', marginTop: '6px' }}>
            <div 
              style={{ 
                width: `${accuracy}%`, 
                height: '100%', 
                background: 'linear-gradient(to right, #6366f1, #8b5cf6)', 
                transition: 'width 0.4s ease-in-out'
              }} 
            />
          </div>
        </div>
      </div>

      <div className="panel panel-large animate-fade-in">
        
        {marathonState === 'QUESTION' && currentQuestion && (
          <QuestionInteraction
            question={currentQuestion}
            questionNumber={totalAnswered + 1}
            totalQuestions={null}
            mode="interactive"
            onSubmit={submitAnswer}
          />
        )}

        {marathonState === 'FEEDBACK' && playerFeedback && (
          <div className="feedback-screen animate-fade-in">
            {playerFeedback.correct ? (
              <div style={{ animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <div className="feedback-icon feedback-correct" style={{ fontSize: '4rem', marginBottom: '8px' }}>✓</div>
                <h2 style={{ color: '#10b981', fontSize: '2rem' }}>Correct!</h2>
                <div className="points-text feedback-correct" style={{ fontSize: '1.25rem', marginTop: '4px' }}>
                  +{playerFeedback.points} points
                </div>
                {currentStreak > 1 && (
                  <div style={{ color: '#f59e0b', fontSize: '1rem', marginTop: '8px', fontWeight: 'bold' }}>
                    🔥 {currentStreak}x Streak!
                  </div>
                )}
              </div>
            ) : (
              <div style={{ animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <div className="feedback-icon feedback-incorrect" style={{ fontSize: '4rem', marginBottom: '8px' }}>✗</div>
                <h2 style={{ color: '#f43f5e', fontSize: '2rem' }}>Incorrect</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '8px 0 16px' }}>
                  Keep going! Every mistake is a chance to learn.
                </p>
              </div>
            )}

            <QuestionInteraction
              question={currentQuestion}
              mode="review"
              playerAnswer={playerSelectedIdx}
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              <button 
                onClick={finishSession}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Finish Marathon
              </button>
              <button 
                onClick={nextQuestion} 
                className="btn btn-primary animate-pulse-glow"
                style={{ flex: 2 }}
              >
                Next Question
              </button>
            </div>
          </div>
        )}

        {marathonState === 'PAUSED' && (
          <div className="animate-fade-in" style={{ padding: '24px' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '16px' }}>⏸️</span>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Marathon Paused</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '24px' }}>
              Take a breather! Your progress is saved.
            </p>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px', 
              marginBottom: '32px'
            }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.08)', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Time Elapsed
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#6366f1' }}>
                  {formattedTime}
                </span>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.08)', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Current Streak
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>
                  {currentStreak}
                </span>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.08)', borderRadius: '16px', padding: '16px', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Accuracy
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>
                  {accuracy}%
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              <button 
                onClick={exitMarathon}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Exit Marathon
              </button>
              <button 
                onClick={resumeSession}
                className="btn btn-primary animate-pulse-glow"
                style={{ flex: 2 }}
              >
                Resume Marathon
              </button>
            </div>
          </div>
        )}

        {marathonState === 'FINISHED' && (
          <div className="animate-fade-in" style={{ padding: '32px 16px' }}>
            <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '16px', animation: 'bounce-slow 3s infinite ease-in-out' }}>🏁</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '900', background: 'linear-gradient(to right, #6366f1, #8b5cf6)', bgClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: '8px' }}>
              Marathon Complete!
            </h2>
            <p style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '32px', fontWeight: '500' }}>
              Great job, {nickname}! You've completed an amazing marathon run!
            </p>

            <div style={{ 
              display: 'grid', 
              grid: 'repeat(2, 1fr) / repeat(2, 1fr)', 
              gap: '12px', 
              marginBottom: '32px',
              textAlign: 'left'
            }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.08)', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Questions Answered
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#6366f1' }}>
                  {totalAnswered}
                </span>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129129, 0.08)', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Correct Answers
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#10b981' }}>
                  {correctCount}
                </span>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.08)', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Best Streak
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f59e0b' }}>
                  {bestStreak}
                </span>
              </div>

              <div style={{ background: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.08)', borderRadius: '16px', padding: '16px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Final Accuracy
                </span>
                <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#8b5cf6' }}>
                  {accuracy}%
                </span>
              </div>

              <div style={{ background: 'rgba(93, 107, 130, 0.04)', border: '1px solid rgba(93, 107, 130, 0.08)', borderRadius: '16px', padding: '16px', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Total Time
                </span>
                <span style={{ fontSize: '1.35rem', fontWeight: '800', color: '#475569' }}>
                  {formattedTime}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              <button 
                onClick={exitMarathon}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Exit Marathon
              </button>
              <button 
                onClick={restartMarathon}
                className="btn btn-primary animate-pulse-glow"
                style={{ flex: 2 }}
              >
                Run Again
              </button>
            </div>
          </div>
        )}

      </div>

      <ConfirmModal
        isOpen={showQuitConfirm}
        onClose={() => setShowQuitConfirm(false)}
        onConfirm={exitMarathon}
        title="Quit the marathon?"
        message="Your progress will be lost. Are you sure you want to return to the home screen?"
        confirmText="Quit Marathon"
        cancelText="Keep Playing"
        variant="warning"
        icon="🏃"
      />
    </div>
  );
}