import React, { useMemo, useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { QuestionResponseBreakdown } from './QuestionResponseBreakdown';

export function HostLeaderboard({
  qIndex,
  activeQuestion,
  hostPlayers,
  hostNextQuestion,
  hostEndGame,
  hostToggleTimer,
  hostRestoreTimer,
  timerDuration,
  configuredTimerDuration,
  questions,
  roomCode
}) {
  const isLastQuestion = qIndex + 1 >= questions.length;
  const type = activeQuestion.type || 'MULTIPLE_CHOICE';
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [spotlightItem, setSpotlightItem] = useState(null);

  // Discussion responses collection
  const discussionResponses = useMemo(() => {
    if (type !== 'DISCUSSION') return [];
    return hostPlayers
      .map(p => {
        const raw = p.answers?.[activeQuestion.id];
        let text = '';
        if (typeof raw === 'string') text = raw;
        else if (raw && typeof raw === 'object' && typeof raw.text === 'string') text = raw.text;
        return {
          id: p.id,
          name: p.name,
          text: text.trim()
        };
      })
      .filter(item => Boolean(item.text));
  }, [hostPlayers, activeQuestion.id, type]);

  return (
    <div>
      <h2 className="!mb-2">Leaderboard</h2>
      <p className="subtitle !-mt-1 !mb-4">Question {qIndex + 1} Complete</p>

      {/* Question Card */}
      {activeQuestion && activeQuestion.text && (
        <div className="question-card w-full text-center mb-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 shadow-xs">
          <div className="question-number inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-100/85 text-rose-500 font-extrabold text-[10px] tracking-widest uppercase rounded-full mb-2 shadow-xs">
            Question {qIndex + 1} of {questions.length} • {type.replace('_', ' ')}
          </div>
          <div className="question-title text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-snug max-w-3xl mx-auto px-2">
            {activeQuestion.text}
          </div>
        </div>
      )}

      {/* 1. DISCUSSION BOARD (FOR DISCUSSION QUESTIONS) */}
      {type === 'DISCUSSION' ? (
        <div className="mb-6 p-4 sm:p-5 bg-white border border-slate-200/90 rounded-2xl shadow-xs text-left">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight m-0">
                  Classroom Discussion Board
                </h3>
                <p className="text-xs font-semibold text-slate-400 m-0">
                  {discussionResponses.length} of {hostPlayers.length} students responded • Click any response to spotlight
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAnonymous
                    ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title="Toggle student names on/off"
              >
                <span>{isAnonymous ? '🕶️ Names Hidden' : '👤 Names Visible'}</span>
              </button>
            </div>
          </div>

          {/* Teacher Guide Note if Present */}
          {activeQuestion.options?.sample_answers && activeQuestion.options.sample_answers.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
              <span className="font-extrabold text-amber-800 uppercase tracking-wider block mb-1">
                Teacher Talking Points & Ideas:
              </span>
              <div className="flex flex-wrap gap-2">
                {activeQuestion.options.sample_answers.map((idea, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-white border border-amber-200 text-amber-900 font-semibold rounded-lg shadow-2xs">
                    💡 {idea}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Student Cards Grid */}
          {discussionResponses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {discussionResponses.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => setSpotlightItem(item)}
                  className="group relative p-3.5 bg-slate-50 hover:bg-rose-50/40 border border-slate-200 hover:border-rose-300 rounded-xl transition-all cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between"
                  title="Click to spotlight this response on screen"
                >
                  <div className="text-slate-800 text-sm font-medium leading-relaxed mb-3">
                    <span className="text-rose-400 font-serif text-lg mr-1">“</span>
                    {item.text}
                    <span className="text-rose-400 font-serif text-lg ml-1">”</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 inline-flex items-center gap-1">
                      <span>{isAnonymous ? '👤' : '🎓'}</span>
                      <span>{isAnonymous ? `Student ${idx + 1}` : item.name}</span>
                    </span>
                    <span className="text-[10px] font-bold text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      🔍 Spotlight
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm italic">
              No written responses submitted for this question.
            </div>
          )}
        </div>
      ) : (
        /* ANSWER KEY & PER-OPTION RESPONSE BREAKDOWN (FOR GRADED QUESTIONS) */
        <QuestionResponseBreakdown
          question={activeQuestion}
          players={hostPlayers}
          roomCode={roomCode}
        />
      )}

      {/* Spotlight Overlay Modal */}
      {spotlightItem && (
        <div 
          onClick={() => setSpotlightItem(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-2 border-rose-300 rounded-3xl p-6 sm:p-10 max-w-2xl w-full shadow-2xl animate-join-focus relative text-left"
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200 rounded-full text-rose-600 font-extrabold text-xs tracking-wider uppercase">
                <span>💬 Discussion Spotlight</span>
                <span>•</span>
                <span>{isAnonymous ? 'Anonymous' : spotlightItem.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setSpotlightItem(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Question: {activeQuestion.text}
            </p>

            <div className="p-6 bg-slate-50/80 border border-slate-200/80 rounded-2xl mb-6">
              <p className="text-2xl sm:text-3xl font-black text-slate-800 leading-snug tracking-tight">
                <span className="text-rose-500 font-serif text-4xl mr-1.5">“</span>
                {spotlightItem.text}
                <span className="text-rose-500 font-serif text-4xl ml-1.5">”</span>
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-primary !py-2.5 !px-6 !text-sm"
                onClick={() => setSpotlightItem(null)}
              >
                Done Discussing (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="leaderboard-list !my-4 !gap-2">
        {hostPlayers.slice(0, 5).map((player, idx) => (
          <div key={player.id} className="leaderboard-item !py-2.5 !px-4 !rounded-xl">
            <span className={`leaderboard-rank leaderboard-rank-${idx + 1} !text-base`}>
              {idx + 1}
            </span>
            <span className="leaderboard-name !text-base">{player.name}</span>
            <span className="leaderboard-score !text-base">{player.score} pts</span>
          </div>
        ))}
      </div>

      {!isLastQuestion && (
        <div className="flex items-center justify-center gap-2 mt-4 mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Next Question Timer:</span>
          <button
            onClick={() => hostToggleTimer ? hostToggleTimer() : (hostRestoreTimer && hostRestoreTimer())}
            className={`px-3 py-1 text-xs font-extrabold rounded-full transition-all flex items-center gap-1.5 cursor-pointer border ${
              (configuredTimerDuration > 0 || timerDuration > 0)
                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
            title="Click to toggle timer on/off for future questions"
          >
            <span>⏱ {(configuredTimerDuration || timerDuration || 20)}s {(configuredTimerDuration > 0 || timerDuration > 0) ? 'ON' : 'OFF'}</span>
            <span className="text-[10px] underline">(Toggle)</span>
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={hostNextQuestion} style={{ minWidth: 160 }}>
          {isLastQuestion ? 'Show Standings' : 'Next Question'}
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowCancelConfirm(true)}
          style={{ minWidth: 160 }}
        >
          Cancel Game
        </button>
      </div>

      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={hostEndGame}
        title="Cancel the game?"
        message="This will end the game for all players and display the final scored board. Are you sure you want to cancel?"
        confirmText="Cancel Game"
        cancelText="Keep Going"
        variant="danger"
        icon="🛑"
      />
    </div>
  );
}
