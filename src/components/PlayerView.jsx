import React from 'react';
import { PlayerLobby } from './PlayerLobby';
import { PlayerQuestion } from './PlayerQuestion';
import { PlayerFeedback } from './PlayerFeedback';
import { PlayerFinished } from './PlayerFinished';

export function PlayerView({
  playerRoom,
  playerRecord,
  playerQuestions,
  playerTimeLeft,
  playerSelectedIdx,
  playerFeedback,
  error,
  submitAnswer,
  disconnectSession
}) {
  const qIndex = playerRoom.current_question_index;
  const activeQuestion = playerQuestions[qIndex];
  const hasAnswered = playerRecord.last_answered_index === qIndex;

  return (
    <div className="app-container">
      
      {/* Connection status header for players */}
      <div style={{ width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'space-between', padding: '0 12px 12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        <span>👤 {playerRecord.name}</span>
        <span>Score: <strong>{playerRecord.score}</strong></span>
      </div>

      <div className="panel">
        
        {playerRoom.status === 'LOBBY' && (
          <PlayerLobby
            playerRecord={playerRecord}
            disconnectSession={disconnectSession}
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
          />
        )}

        {playerRoom.status === 'LEADERBOARD' && activeQuestion && (
          <PlayerFeedback
            playerFeedback={playerFeedback}
            activeQuestion={activeQuestion}
            playerRecord={playerRecord}
          />
        )}

        {playerRoom.status === 'FINISHED' && (
          <PlayerFinished
            playerRecord={playerRecord}
            disconnectSession={disconnectSession}
          />
        )}

      </div>
    </div>
  );
}
