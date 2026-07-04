import React, { useState, useMemo } from 'react';
import { BUCKET_COLORS } from '../constants';
import { splitCurlyTokens, getCurlyIndex, getCurlyInner, splitBracketTokens, getBracketInner } from '../utils/blankParsing';

export function HostFinished({ hostPlayers = [], hostEndGame, questions = [] }) {
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);

  const streakChampion = useMemo(() => {
    if (!hostPlayers.length) return null;
    let best = null;
    let bestVal = 0;
    hostPlayers.forEach(p => {
      const s = p.marathon_stats || {};
      if ((s.best_streak || 0) > bestVal) {
        bestVal = s.best_streak || 0;
        best = p;
      }
    });
    return best ? { player: best, streak: bestVal } : null;
  }, [hostPlayers]);

  const mostCorrectChampion = useMemo(() => {
    if (!hostPlayers.length) return null;
    let best = null;
    let bestVal = 0;
    hostPlayers.forEach(p => {
      const c = p.marathon_stats || {};
      if ((c.correct_count || 0) > bestVal) {
        bestVal = c.correct_count || 0;
        best = p;
      }
    });
    return best ? { player: best, count: bestVal } : null;
  }, [hostPlayers]);

  // Compute stats for each question
  const questionStats = useMemo(() => {
    if (!questions || !hostPlayers) return [];

    return questions.map((q) => {
      let correctCount = 0;
      let wrongCount = 0;
      let unansweredCount = 0;

      hostPlayers.forEach((player) => {
        const playerAnswers = player.answers || {};
        if (playerAnswers[q.id] === true) {
          correctCount++;
        } else if (playerAnswers[q.id] === false) {
          wrongCount++;
        } else {
          unansweredCount++;
        }
      });

      const totalPlayers = hostPlayers.length;
      const totalMissed = wrongCount + unansweredCount;
      const wrongPercentage = totalPlayers > 0 ? Math.round((totalMissed / totalPlayers) * 100) : 0;

      return {
        question: q,
        correctCount,
        wrongCount,
        unansweredCount,
        totalMissed,
        wrongPercentage,
      };
    })
    .sort((a, b) => b.totalMissed - a.totalMissed || b.wrongPercentage - a.wrongPercentage);
  }, [questions, hostPlayers]);

  const toggleExpand = (qId) => {
    setExpandedQuestionId(expandedQuestionId === qId ? null : qId);
  };

  const renderCorrectAnswer = (q) => {
    const type = q.type || 'MULTIPLE_CHOICE';

    if (type === 'MULTIPLE_CHOICE') {
      const idx = q.correct_option_index;
      const optionText = Array.isArray(q.options) ? q.options[idx] : '';
      return (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Correct Option:</div>
          <div className="flex items-center gap-2 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-slate-700 font-semibold text-sm max-w-md">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold">✓</span>
            {optionText}
          </div>
        </div>
      );
    }

    if (type === 'SORTING') {
      return (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Correct Sequence:</div>
          <div className="flex flex-col gap-1.5 max-w-md">
            {q.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-emerald-50/30 border border-emerald-100/50 rounded-lg p-2 text-slate-700 font-semibold text-xs">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                  {idx + 1}
                </span>
                {opt}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (type === 'DRAG_DROP') {
      const sentence = q.options.sentence || '';
      const correctAnswers = q.options.correct || [];
      const parts = splitBracketTokens(sentence);
      let sequential = 0;
      return (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Correct Statement:</div>
          <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3 text-slate-700 leading-relaxed max-w-xl text-xs font-semibold">
            {parts.map((part, idx) => {
              const numericIdx = part && part.match(/\[blank(\d+)\]/i);
              const inner = getBracketInner(part);
              if (numericIdx) {
                const valIdx = parseInt(numericIdx[1]);
                return (
                  <strong key={idx} className="text-emerald-600 underline decoration-2 underline-offset-2 decoration-emerald-350 px-0.5">
                    {correctAnswers[valIdx] || '???'}
                  </strong>
                );
              }
              if (inner) {
                let mapped = -1;
                if (Array.isArray(correctAnswers)) mapped = correctAnswers.findIndex(c => c === inner);
                const valIdx = mapped !== -1 ? mapped : sequential;
                if (mapped === -1) sequential += 1;
                return (
                  <strong key={idx} className="text-emerald-600 underline decoration-2 underline-offset-2 decoration-emerald-350 px-0.5">
                    {Array.isArray(correctAnswers) ? (correctAnswers[valIdx] || '???') : (inner || '???')}
                  </strong>
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </div>
        </div>
      );
    }

    if (type === 'DROP_DOWN') {
      const sentence = q.options.sentence || '';
      const dropdowns = q.options.dropdowns || [];
      const parts = sentence.split(/(\\{\\{\\d+\\}\\}|\\{\\{\\d+\\}\\}|\\{\\d+\\})/g);
      // Wait, let's make sure the regex works for both standard bracket and curly braces
      // Let's use simple match for drop down sentence template:
        const partsDropdown = splitCurlyTokens(sentence);
        let sequential = 0;
        return (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Correct Statement:</div>
          <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3 text-slate-700 leading-relaxed max-w-xl text-xs font-semibold">
            {partsDropdown.map((part, idx) => {
              const valIdx = getCurlyIndex(part);
              const inner = getCurlyInner(part);
              if (valIdx !== null) {
                return (
                  <strong key={idx} className="text-emerald-600 underline decoration-2 underline-offset-2 decoration-emerald-350 px-0.5">
                    {dropdowns[valIdx]?.correct || '???'}
                  </strong>
                );
              }
              if (inner) {
                let mapped = dropdowns.findIndex(d => d.correct === inner);
                const idxToUse = mapped !== -1 ? mapped : sequential;
                if (mapped === -1) sequential += 1;
                return (
                  <strong key={idx} className="text-emerald-600 underline decoration-2 underline-offset-2 decoration-emerald-350 px-0.5">
                    {dropdowns[idxToUse]?.correct || inner}
                  </strong>
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </div>
        </div>
      );
    }

    if (type === 'CATEGORIZE') {
      const categories = q.options.categories || [];
      const items = q.options.items || [];
      const map = {};
      categories.forEach(cat => {
        map[cat] = items.filter(item => item.category === cat);
      });

      return (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Correct Classifications:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-w-xl">
            {categories.map((cat, idx) => {
              const colorSet = BUCKET_COLORS[idx % BUCKET_COLORS.length];
              return (
                <div key={idx} className="border border-slate-100 rounded-lg p-2.5 bg-white shadow-xs">
                  <div className="font-extrabold text-[10px] mb-1.5 pb-0.5 border-b border-slate-50 uppercase tracking-wider" style={{ color: colorSet.color || '#334155' }}>
                    {cat}
                  </div>
                  <div className="space-y-0.5">
                    {map[cat]?.map((item, iIdx) => (
                      <div key={iIdx} className="text-[11px] text-slate-600 font-semibold">
                        • {item.name}
                      </div>
                    ))}
                    {(!map[cat] || map[cat].length === 0) && (
                      <div className="text-[10px] text-slate-450 italic">No items</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full text-left">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">🏆 Game Over!</h1>
        <h2 className="text-xl font-bold text-slate-700 mt-1">Final Standings & Performance Review</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-stretch justify-center">
        {/* Left Column: Podium Standings & Control */}
        <div className="lg:w-5/12 flex flex-col items-center bg-white border border-slate-150 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-2">Podium Finishers</h3>
          <div className="podium-container mx-auto">
            {/* 2nd Place */}
            {hostPlayers[1] && (
              <div className="podium-step podium-step-2">
                <div className="podium-player-info" style={{ animationDelay: '0.9s', animationFillMode: 'both' }}>
                  <div className="podium-avatar podium-avatar-2">
                    {hostPlayers[1].name.charAt(0).toUpperCase()}
                  </div>
                  <span className="podium-player-name">{hostPlayers[1].name}</span>
                  <span className="podium-player-score-badge podium-player-score-badge-2">
                    {hostPlayers[1].score} pts
                  </span>
                </div>
                <div className="podium-block podium-block-2">
                  <span className="podium-number">2</span>
                  <div className="absolute bottom-2 text-[9px] uppercase font-black text-slate-500 tracking-wider">Silver</div>
                </div>
              </div>
            )}
            {/* 1st Place */}
            {hostPlayers[0] && (
              <div className="podium-step podium-step-1">
                <div className="podium-player-info" style={{ animationDelay: '1.2s', animationFillMode: 'both' }}>
                  <div className="absolute -top-7 text-2xl animate-crown-drop">👑</div>
                  <div className="podium-avatar podium-avatar-1">
                    {hostPlayers[0].name.charAt(0).toUpperCase()}
                  </div>
                  <span className="podium-player-name">{hostPlayers[0].name}</span>
                  <span className="podium-player-score-badge podium-player-score-badge-1">
                    {hostPlayers[0].score} pts
                  </span>
                </div>
                <div className="podium-block podium-block-1">
                  <span className="podium-number">1</span>
                  <div className="absolute bottom-2.5 text-[9px] uppercase font-black text-amber-700 tracking-wider">Champion</div>
                </div>
              </div>
            )}
            {/* 3rd Place */}
            {hostPlayers[2] && (
              <div className="podium-step podium-step-3">
                <div className="podium-player-info" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
                  <div className="podium-avatar podium-avatar-3">
                    {hostPlayers[2].name.charAt(0).toUpperCase()}
                  </div>
                  <span className="podium-player-name">{hostPlayers[2].name}</span>
                  <span className="podium-player-score-badge podium-player-score-badge-3">
                    {hostPlayers[2].score} pts
                  </span>
                </div>
                <div className="podium-block podium-block-3">
                  <span className="podium-number">3</span>
                  <div className="absolute bottom-2 text-[9px] uppercase font-black text-orange-800 tracking-wider">Bronze</div>
                </div>
              </div>
            )}
            {!hostPlayers[0] && (
              <div className="text-slate-400 italic text-sm my-auto">No players finished the game.</div>
            )}
          </div>

          {(streakChampion || mostCorrectChampion) && (
            <div className="w-full mt-4 space-y-2">
              {streakChampion && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">Streak Champion</span>
                  <span className="text-sm font-bold text-amber-800">
                    {streakChampion.player.name} — {streakChampion.streak} in a row
                  </span>
                </div>
              )}
              {mostCorrectChampion && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600">Most Correct</span>
                  <span className="text-sm font-bold text-emerald-800">
                    {mostCorrectChampion.player.name} — {mostCorrectChampion.count} correct
                  </span>
                </div>
              )}
            </div>
          )}

          <button className="btn btn-primary w-full mt-auto" onClick={hostEndGame}>
            Close Room & Return Home
          </button>
        </div>

        {/* Right Column: Question Difficulty Insights */}
        <div className="lg:w-7/12 bg-slate-50/50 border border-slate-150 rounded-2xl p-6 shadow-inner flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>📊</span> Class Performance Review
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Questions are sorted by difficulty (most missed first). Click any question to reveal details and the correct answer key.
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
            {questionStats.map((stats, idx) => {
              const q = stats.question;
              const isExpanded = expandedQuestionId === q.id;
              const total = hostPlayers.length;

              const correctPercent = total > 0 ? (stats.correctCount / total) * 100 : 0;
              const wrongPercent = total > 0 ? (stats.wrongCount / total) * 100 : 0;
              const unansweredPercent = total > 0 ? (stats.unansweredCount / total) * 100 : 0;

              // Color of the difficulty badge
              let badgeClass = "bg-amber-50 text-amber-600 border border-amber-200";
              if (stats.totalMissed === 0) {
                badgeClass = "bg-emerald-50 text-emerald-600 border border-emerald-100";
              } else if (stats.wrongPercentage >= 50) {
                badgeClass = "bg-rose-50 text-rose-600 border border-rose-200";
              }

              return (
                <div key={q.id} className="transition-all duration-200">
                  {/* Question Row Clickable Header */}
                  <button
                    onClick={() => toggleExpand(q.id)}
                    className={`w-full text-left bg-white border hover:border-slate-300 hover:shadow-xs rounded-xl p-4 transition-all flex flex-col gap-2 cursor-pointer ${
                      isExpanded ? 'border-slate-300 shadow-xs' : 'border-slate-150'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-[#ff85a2] uppercase tracking-wider bg-pink-50 px-2 py-0.5 rounded-md">
                            Q{idx + 1}
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {q.type?.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-slate-800 font-bold text-sm line-clamp-2 mt-1">
                          {q.text}
                        </span>
                      </div>

                      {/* Difficulty Badge */}
                      <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full shrink-0 ${badgeClass}`}>
                        {stats.totalMissed === 0 ? (
                          "100% Correct 🎉"
                        ) : (
                          `${stats.totalMissed} Missed (${stats.wrongPercentage}%)`
                        )}
                      </span>
                    </div>

                    {/* Progress Bar of Correctness */}
                    {total > 0 && (
                      <div className="mt-1 w-full">
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          {correctPercent > 0 && <div className="bg-emerald-400 h-full" style={{ width: `${correctPercent}%` }} />}
                          {wrongPercent > 0 && <div className="bg-rose-400 h-full" style={{ width: `${wrongPercent}%` }} />}
                          {unansweredPercent > 0 && <div className="bg-slate-300 h-full" style={{ width: `${unansweredPercent}%` }} />}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-450 font-bold mt-1">
                          <span className="text-emerald-600">{stats.correctCount} correct</span>
                          <span className="text-rose-500">{stats.wrongCount} incorrect</span>
                          {stats.unansweredCount > 0 && <span className="text-slate-500">{stats.unansweredCount} unanswered</span>}
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Expanded Content Details */}
                  {isExpanded && (
                    <div className="bg-slate-50 border border-slate-300 border-t-0 -mt-2 mb-3 rounded-b-xl p-4 text-xs shadow-inner animate-fade-in">
                      {renderCorrectAnswer(q)}
                    </div>
                  )}
                </div>
              );
            })}

            {questions.length === 0 && (
              <div className="text-center py-10 text-slate-400 italic text-sm">
                No questions found to review.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
