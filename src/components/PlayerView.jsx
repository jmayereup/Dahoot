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
  exitGame
}) {
  const qIndex = playerRoom.current_question_index;
  const activeQuestion = playerQuestions[qIndex];
  const hasAnswered = playerRecord.last_answered_index === qIndex || playerSelectedIdx !== null;
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
          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs border border-red-500/25 hover:border-red-500/40 px-3 py-1 rounded-full cursor-pointer transition-all duration-200"
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
