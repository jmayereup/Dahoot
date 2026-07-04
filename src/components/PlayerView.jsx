import React, { useState } from 'react';
import { PlayerLobby } from './PlayerLobby';
import { PlayerQuestion } from './PlayerQuestion';
import { PlayerFeedback } from './PlayerFeedback';
import { PlayerFinished } from './PlayerFinished';
import { ConfirmModal } from './ConfirmModal';

export function PlayerView({
  playerRoom,
  playerRecord,
  playerQuestions,
  playerTimeLeft,
  playerSelectedIdx,
  playerFeedback,
  error,
  submitAnswer,
  disconnectSession,
  exitGame
}) {
  const qIndex = playerRoom.current_question_index;
  const activeQuestion = playerQuestions[qIndex];
  const hasAnswered = playerRecord.last_answered_index === qIndex;
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  return (
    <div className="app-container">
      
      {/* Connection status header for players */}
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
        <span>👤 {playerRecord.name}</span>
        <span>Score: <strong>{playerRecord.score}</strong></span>
        <button 
          onClick={() => setShowLeaveConfirm(true)}
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.8rem',
            padding: '4px 12px',
            borderRadius: '9999px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.18)';
            e.target.style.color = '#f87171';
            e.target.style.borderColor = 'rgba(239, 68, 68, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.08)';
            e.target.style.color = '#f87171';
            e.target.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          }}
        >
          Exit Game
        </button>
      </div>

      <div className="panel">
        
        {playerRoom.status === 'LOBBY' && (
          <PlayerLobby
            playerRecord={playerRecord}
            exitGame={exitGame}
          />
        )}

        {playerRoom.status === 'QUESTION' && activeQuestion && (
          <PlayerQuestion
            qIndex={qIndex}
            activeQuestion={activeQuestion}
            hasAnswered={hasAnswered}
            playerTimeLeft={playerTimeLeft}
            error={error}
            submitAnswer={submitAnswer}
            timerDuration={playerRoom.timer_duration}
            roomCode={playerRoom.code}
          />
        )}

        {playerRoom.status === 'LEADERBOARD' && activeQuestion && (
          <PlayerFeedback
            playerFeedback={playerFeedback}
            activeQuestion={activeQuestion}
            playerRecord={playerRecord}
            playerSelectedIdx={playerSelectedIdx}
            roomCode={playerRoom.code}
          />
        )}

        {playerRoom.status === 'FINISHED' && (
          <PlayerFinished
            playerRecord={playerRecord}
            exitGame={exitGame}
          />
        )}

      </div>

      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={exitGame}
        title="Leave the game?"
        message="You'll be disconnected from this game session. Are you sure you want to leave?"
        confirmText="Leave Game"
        cancelText="Stay"
        variant="warning"
        icon="🚪"
      />
    </div>
  );
}
