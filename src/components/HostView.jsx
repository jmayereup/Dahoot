import React from 'react';
import { HostLobby } from './HostLobby';
import { HostQuestion } from './HostQuestion';
import { HostLeaderboard } from './HostLeaderboard';
import { HostFinished } from './HostFinished';
import { GameMusicController } from './GameMusicController';

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
  hostCancelTimer,
  hostRemovePlayer
}) {
  const qIndex = hostRoom.current_question_index;
  const activeQuestion = questions[qIndex];
  const answeredCount = hostPlayers.filter(p => p.last_answered_index === qIndex).length;

  return (
    <div className="app-container">
      <GameMusicController gameStatus={hostRoom.status} />
      <div className="panel panel-large">
        
        {/* Persistent Join PIN & Link Bar for late joiners / reconnects */}
        {hostRoom.status !== 'LOBBY' && hostRoom.status !== 'FINISHED' && (
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-5 text-slate-600 w-full animate-fade-in">
            <div className="flex items-center gap-2 text-xs md:text-sm font-bold">
              <span className="text-slate-400 uppercase tracking-wider">Join Link:</span>
              <button
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg border font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  copied
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Click to copy join link"
              >
                <span>{copied ? '✓ Copied Link' : window.location.host}</span>
                {!copied && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm font-bold">
              <span className="text-slate-400 uppercase tracking-wider">Game PIN:</span>
              <span className="font-mono text-lg md:text-xl font-black text-rose-500 tracking-wider bg-rose-50 border border-rose-100 px-3.5 py-0.5 rounded-lg shadow-xs">
                {hostRoom.code}
              </span>
            </div>
          </div>
        )}

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
            hostRemovePlayer={hostRemovePlayer}
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
            questions={questions}
          />
        )}

      </div>
    </div>
  );
}
