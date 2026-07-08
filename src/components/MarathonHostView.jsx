import React, { useState } from 'react';
import { HostLobby } from './HostLobby';
import { HostQuestion } from './HostQuestion';
import { HostFinished } from './HostFinished';
import { GameMusicController } from './GameMusicController';
import { ConfirmModal } from './ConfirmModal';

export function MarathonHostView({
  hostRoom,
  hostPlayers,
  questions,
  wrapUpTimeLeft,
  currentLap,
  qrCodeUrl,
  copied,
  joinUrl,
  handleCopyLink,
  isStudentPaced,
  marathonStats,
  hostStartMarathon,
  hostShowLeaderboard,
  hostNextQuestion,
  hostEndMarathon,
  exitMarathon,
  hostCancelTimer,
  hostShowMarathonLeaderboard,
  hostStartWrapUp,
  hostRemovePlayer,
  hostPlayAgain,
  hostChangeGame,
  gamesList
}) {
  const qIndex = hostRoom.current_question_index;
  const activeQuestion = questions[qIndex];
  const answeredCount = hostPlayers.filter(p => p.last_answered_index === qIndex).length;
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const handleEndMarathon = () => {
    setShowEndConfirm(false);
    hostEndMarathon();
  };

  const totalAnswered = marathonStats?.totalAnswered || 0;
  const classAccuracy = marathonStats?.accuracy || 0;
  const bestStreak = marathonStats?.bestStreak || 0;
  const activeStudents = marathonStats?.activeStudents || 0;

  return (
    <div className="app-container">
      <GameMusicController gameStatus={hostRoom.status} />
      <div className="panel panel-large" style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(167, 139, 250, 0.02) 100%)',
        borderColor: 'rgba(139, 92, 246, 0.15)'
      }}>

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
            hostStartGame={hostStartMarathon}
            hostEndGame={hostEndMarathon}
            hostRemovePlayer={hostRemovePlayer}
          />
        )}

        {isStudentPaced && hostRoom.status === 'QUESTION' && (
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              padding: '16px 20px',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', gap: '24px', flex: 1, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Lap
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {currentLap}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Questions Answered
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {totalAnswered}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Class Accuracy
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {classAccuracy}%
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Best Streak
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {bestStreak}
                  </div>
                  {marathonStats?.bestStreakPlayer && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {marathonStats.bestStreakPlayer.name}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Most Correct
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {marathonStats?.mostCorrectCount || 0}
                  </div>
                  {marathonStats?.mostCorrectPlayer && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {marathonStats.mostCorrectPlayer.name}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Students
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {activeStudents}/{hostPlayers.length}
                  </div>
                </div>
              </div>
            </div>

            <h3 style={{ color: '#8B5CF6', marginBottom: '16px', fontSize: '1.2rem' }}>
              Student Progress — Self-Paced Marathon (Lap {currentLap})
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Students are advancing through {questions.length} questions at their own pace. Questions reshuffle each lap.
            </p>

            {hostPlayers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👤</div>
                <p>Waiting for players to join...</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {hostPlayers.map((player, idx) => {
                  const stats = player.marathon_stats || {};
                  const playerLap = (stats.lap || 0) + 1;
                  const lastAnsweredIdx = player.last_answered_index ?? -1;
                  const playerInLapAnswered = lastAnsweredIdx + 1;
                  const playerCorrect = stats.correct_count || 0;
                  const playerTotalAnswered = stats.total_answered || 0;
                  const playerAccuracy = playerTotalAnswered > 0 ? Math.round((playerCorrect / playerTotalAnswered) * 100) : 0;
                  const playerStreak = stats.current_streak || 0;
                  const playerBestStreak = stats.best_streak || 0;
                  const progressPercent = questions.length > 0 ? Math.round((playerInLapAnswered / questions.length) * 100) : 0;

                  return (
                    <div
                      key={player.id}
                      style={{
                        background: 'white',
                        border: `1px solid rgba(139, 92, 246, 0.2)`,
                        borderRadius: '12px',
                        padding: '16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: idx < 3 ? '#8B5CF6' : '#A78BFA',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.8rem'
                          }}>
                            {idx + 1}
                          </div>
                          <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{player.name}</span>
                          <span style={{ fontSize: '0.7rem', background: '#EDE9FE', color: '#6D28D9', padding: '2px 8px', borderRadius: '9999px', fontWeight: '600' }}>
                            Lap {playerLap}
                          </span>
                        </div>
                        <span style={{ fontWeight: '800', color: '#8B5CF6', fontSize: '1.1rem' }}>{player.score}</span>
                      </div>

                      <div style={{
                        marginTop: '8px',
                        background: '#f1f5f9',
                        borderRadius: '6px',
                        height: '8px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          background: '#8B5CF6',
                          borderRadius: '6px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                        {playerInLapAnswered}/{questions.length} in lap {playerLap}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <span>Streak: <strong>{playerStreak}</strong></span>
                        <span>Best: <strong>{playerBestStreak}</strong></span>
                        <span>Correct: <strong>{playerCorrect}</strong></span>
                        <span>Acc: <strong>{playerAccuracy}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={hostShowMarathonLeaderboard}
                style={{ minWidth: '180px' }}
              >
                Show Leaderboard
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setShowEndConfirm(true)}
                style={{ minWidth: '180px' }}
              >
                End Marathon
              </button>
            </div>
          </div>
        )}

        {!isStudentPaced && hostRoom.status === 'QUESTION' && activeQuestion && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              padding: '16px 20px',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px'
            }}>
              <div style={{ display: 'flex', gap: '24px', flex: 1, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Lap {currentLap}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    Q{qIndex + 1}/{questions.length}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Questions Answered
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {totalAnswered}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Class Accuracy
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {classAccuracy}%
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Best Streak
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {bestStreak}
                  </div>
                  {marathonStats?.bestStreakPlayer && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {marathonStats.bestStreakPlayer.name}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Most Correct
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {marathonStats?.mostCorrectCount || 0}
                  </div>
                  {marathonStats?.mostCorrectPlayer && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {marathonStats.mostCorrectPlayer.name}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Active Students
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8B5CF6' }}>
                    {activeStudents}
                  </div>
                </div>
              </div>
            </div>

            <HostQuestion
              qIndex={qIndex}
              questions={questions}
              activeQuestion={activeQuestion}
              hostTimeLeft={hostRoom.timer_duration}
              answeredCount={answeredCount}
              hostPlayers={hostPlayers}
              hostShowLeaderboard={hostShowLeaderboard}
              hostCancelTimer={hostCancelTimer}
              timerDuration={hostRoom.timer_duration}
              roomCode={hostRoom.code}
              hostEndGame={hostEndMarathon}
            />
          </div>
        )}

        {hostRoom.status === 'WRAP_UP' && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>⏱️</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '8px', color: '#8B5CF6' }}>1-Minute Wrap-Up</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '32px' }}>
              Quick review time! Students can review their answers and prepare for the next question.
            </p>

            <div style={{
              fontSize: '3rem',
              fontWeight: '800',
              color: '#8B5CF6',
              marginBottom: '24px'
            }}>
              {wrapUpTimeLeft}s
            </div>

            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                className="btn btn-primary"
                onClick={hostNextQuestion}
                style={{
                  background: '#8B5CF6',
                  borderColor: '#8B5CF6',
                  minWidth: '180px'
                }}
              >
                Next Question
              </button>
              <button
                className="btn btn-secondary"
                onClick={hostShowMarathonLeaderboard}
                style={{ minWidth: '180px' }}
              >
                Show Leaderboard
              </button>
              <button
                className="btn btn-danger"
                onClick={() => setShowEndConfirm(true)}
                style={{ minWidth: '180px' }}
              >
                End Marathon
              </button>
            </div>
          </div>
        )}

        {hostRoom.status === 'LEADERBOARD' && (
          <div>
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '12px'
            }}>
              <h3 style={{ color: '#8B5CF6', marginBottom: '8px', textAlign: 'center' }}>Marathon Leaderboard</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                {hostPlayers.slice(0, 10).map((player, idx) => {
                  const stats = player.marathon_stats || {};
                  const pCorrect = stats.correct_count || 0;
                  const pAnswered = stats.total_answered || 0;
                  const pAccuracy = pAnswered > 0 ? Math.round((pCorrect / pAnswered) * 100) : 0;
                  const pBestStreak = stats.best_streak || 0;
                  const isStreakLeader = marathonStats?.bestStreakPlayer?.id === player.id;
                  const isCorrectLeader = marathonStats?.mostCorrectPlayer?.id === player.id;
                  return (
                    <div
                      key={player.id}
                      style={{
                        background: 'white',
                        border: `1px solid ${isStreakLeader || isCorrectLeader ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.2)'}`,
                        borderRadius: '12px',
                        padding: '10px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: idx < 3 ? '#8B5CF6' : '#A78BFA',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        margin: '0 auto 4px'
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: '0.95rem' }}>{player.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <div>Score: <strong>{player.score}</strong></div>
                        <div>Best Streak: <strong>{pBestStreak}</strong>{isStreakLeader && ' *'}</div>
                        <div>Correct: <strong>{pCorrect}</strong>{isCorrectLeader && ' *'}</div>
                        <div>Accuracy: <strong>{pAccuracy}%</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              {!isStudentPaced && (
                <button
                  className="btn btn-primary"
                  onClick={hostNextQuestion}
                  style={{
                    background: '#8B5CF6',
                    borderColor: '#8B5CF6',
                    minWidth: '160px'
                  }}
                >
                  Continue Marathon
                </button>
              )}
              {isStudentPaced && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (hostRoom) {
                      hostStartMarathon();
                    }
                  }}
                  style={{
                    background: '#8B5CF6',
                    borderColor: '#8B5CF6',
                    minWidth: '160px'
                  }}
                >
                  Back to Progress
                </button>
              )}
              <button
                className="btn btn-danger"
                onClick={() => setShowEndConfirm(true)}
                style={{ minWidth: '180px' }}
              >
                End Marathon
              </button>
            </div>
          </div>
        )}

        {hostRoom.status === 'FINISHED' && (
          <HostFinished
            hostPlayers={hostPlayers}
            hostEndGame={exitMarathon}
            questions={questions}
            hostPlayAgain={hostPlayAgain}
            hostChangeGame={hostChangeGame}
            gamesList={gamesList}
          />
        )}

      </div>

      <ConfirmModal
        isOpen={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleEndMarathon}
        title="End the marathon?"
        message="This will end the marathon for all players. Any progress in the current session will be lost."
        confirmText="End Marathon"
        cancelText="Keep Playing"
        variant="danger"
        icon="🏁"
      />
    </div>
  );
}
