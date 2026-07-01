import React from 'react';
import { HostLobby } from './HostLobby';
import { HostQuestion } from './HostQuestion';
import { HostLeaderboard } from './HostLeaderboard';
import { HostFinished } from './HostFinished';

export function HostView({
  hostRoom,
  hostPlayers,
  questions,
  hostTimeLeft,
  qrCodeUrl,
  copied,
  joinUrl,
  handleCopyLink,
  hostStartGame,
  hostShowLeaderboard,
  hostNextQuestion,
  hostEndGame,
  hostCancelTimer
}) {
  const qIndex = hostRoom.current_question_index;
  const activeQuestion = questions[qIndex];
  const answeredCount = hostPlayers.filter(p => p.last_answered_index === qIndex).length;

  return (
    <div className="app-container">
      <div className="panel panel-large">
        
        {hostRoom.status === 'LOBBY' && (
          <HostLobby
            hostRoom={hostRoom}
            hostPlayers={hostPlayers}
            qrCodeUrl={qrCodeUrl}
            joinUrl={joinUrl}
            copied={copied}
            handleCopyLink={handleCopyLink}
            hostStartGame={hostStartGame}
            hostEndGame={hostEndGame}
          />
        )}

        {hostRoom.status === 'QUESTION' && activeQuestion && (
          <HostQuestion
            qIndex={qIndex}
            questions={questions}
            activeQuestion={activeQuestion}
            hostTimeLeft={hostTimeLeft}
            answeredCount={answeredCount}
            hostPlayers={hostPlayers}
            hostShowLeaderboard={hostShowLeaderboard}
            hostCancelTimer={hostCancelTimer}
            timerDuration={hostRoom.timer_duration}
            roomCode={hostRoom.code}
            hostEndGame={hostEndGame}
          />
        )}

        {hostRoom.status === 'LEADERBOARD' && activeQuestion && (
          <HostLeaderboard
            qIndex={qIndex}
            activeQuestion={activeQuestion}
            hostPlayers={hostPlayers}
            hostNextQuestion={hostNextQuestion}
            hostEndGame={hostEndGame}
            questions={questions}
            roomCode={hostRoom.code}
          />
        )}

        {hostRoom.status === 'FINISHED' && (
          <HostFinished
            hostPlayers={hostPlayers}
            hostEndGame={hostEndGame}
          />
        )}

      </div>
    </div>
  );
}
