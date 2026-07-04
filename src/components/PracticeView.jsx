import React, { useState } from 'react';
import { QuestionInteraction } from './QuestionInteraction';
import { ConfirmModal } from './ConfirmModal';

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
  const [localNickname, setLocalNickname] = useState(nickname || 'Student');
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

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

  const masteryPercentage = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

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
          <span>👤 <strong>{nickname}</strong> (Practice Mode)</span>
          <span>Score: <strong>{score}</strong></span>
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
            Quit Session
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255, 255, 255, 0.4)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Round {roundNumber}: Question {currentQuestionIdx + 1} of {questionsQueue.length}
            </span>
            <span style={{ color: '#10b981' }}>
              Mastery: {masteredCount} / {totalCount} ({masteryPercentage}%)
            </span>
          </div>
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
        
        {practiceState === 'QUESTION' && activeQuestion && (
          <QuestionInteraction
            question={activeQuestion}
            questionNumber={currentQuestionIdx + 1}
            totalQuestions={questionsQueue.length}
            roundNumber={roundNumber}
            mode="interactive"
            onSubmit={submitAnswer}
          />
        )}

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

            <QuestionInteraction
              question={activeQuestion}
              mode="review"
              playerAnswer={playerSelectedIdx}
            />

            <button 
              onClick={nextQuestion} 
              className="btn btn-primary animate-pulse-glow"
              style={{ marginTop: '32px', maxWidth: '320px', marginLeft: 'auto', marginRight: 'auto' }}
            >
              {currentQuestionIdx + 1 < questionsQueue.length ? 'Next Question' : 'Complete Round'}
            </button>
          </div>
        )}

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

        {practiceState === 'FINISHED' && (
          <div className="animate-fade-in" style={{ padding: '32px 16px' }}>
            <span style={{ fontSize: '4.5rem', display: 'block', marginBottom: '16px', animation: 'bounce-slow 3s infinite ease-in-out' }}>🏆</span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: '900', background: 'linear-gradient(to right, #10b981, #059669)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent', marginBottom: '8px' }}>
              Mastery Attained!
            </h2>
            <p style={{ color: '#475569', fontSize: '1.1rem', marginBottom: '32px', fontWeight: '500' }}>
              Outstanding, {nickname}! You've successfully answered every single question correctly!
            </p>

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

      <ConfirmModal
        isOpen={showQuitConfirm}
        onClose={() => setShowQuitConfirm(false)}
        onConfirm={exitPractice}
        title="Quit practice session?"
        message="Your progress will be lost. Are you sure you want to return to the home screen?"
        confirmText="Quit Session"
        cancelText="Keep Practicing"
        variant="warning"
        icon="🎯"
      />
    </div>
  );
}
