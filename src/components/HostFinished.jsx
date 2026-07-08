import React, { useState, useMemo, useEffect } from 'react';
import { pb } from '../pb';
import { GameSettings } from './GameSettings';
import { BUCKET_COLORS } from '../constants';
import { splitCurlyTokens, getCurlyIndex, getCurlyInner, splitBracketTokens, getBracketInner } from '../utils/blankParsing';
import { getMcOptions, getMcCorrectAnswer, getDragDropCorrect, getDropDownCorrect, getSortingCorrect, normalizeQuestion } from '../utils/questionSchema';
import { RotateCcw, Shuffle, Home } from 'lucide-react';

export function HostFinished({ 
  hostPlayers = [], 
  hostEndGame, 
  questions = [],
  hostPlayAgain,
  hostChangeGame,
  gamesList = []
}) {
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [showChangeGameModal, setShowChangeGameModal] = useState(false);
  const [selectedNewGameId, setSelectedNewGameId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newRandomize, setNewRandomize] = useState(true);
  const [newTimerDuration, setNewTimerDuration] = useState(20);
  const [newMaxQuestions, setNewMaxQuestions] = useState('');
  const [newPacingMode, setNewPacingMode] = useState('teacher');
  const [isRestarting, setIsRestarting] = useState(false);
  const [modalQuestions, setModalQuestions] = useState([]);
  const [newSelectedQuestionTypes, setNewSelectedQuestionTypes] = useState(['MULTIPLE_CHOICE', 'SORTING', 'DRAG_DROP', 'DROP_DOWN', 'CATEGORIZE']);

  useEffect(() => {
    if (!selectedNewGameId) {
      setModalQuestions([]);
      return;
    }
    let isMounted = true;
    pb.collection('dahoot_questions').getFullList({
      filter: pb.filter("game_id = {:gameId}", { gameId: selectedNewGameId })
    })
    .then(res => {
      if (isMounted) {
        setModalQuestions(res);
        // Pre-populate available question types
        const types = new Set();
        res.forEach(q => types.add(q.type || 'MULTIPLE_CHOICE'));
        setNewSelectedQuestionTypes(Array.from(types));
        // Reset maxQuestions when game changes
        setNewMaxQuestions('');
      }
    })
    .catch(err => {
      console.error(err);
      if (isMounted) setModalQuestions([]);
    });
    return () => {
      isMounted = false;
    };
  }, [selectedNewGameId]);

  const availableQuestionTypes = useMemo(() => {
    const types = new Set();
    modalQuestions.forEach(q => {
      types.add(q.type || 'MULTIPLE_CHOICE');
    });
    return Array.from(types);
  }, [modalQuestions]);

  const getQuestionTypeCount = (type) => {
    return modalQuestions.filter(q => (q.type || 'MULTIPLE_CHOICE') === type).length;
  };

  const getQuestionTypeLabel = (type) => {
    const QUESTION_TYPE_LABELS = {
      MULTIPLE_CHOICE: 'Multiple Choice',
      SORTING: 'Sorting Order',
      DRAG_DROP: 'Drag & Drop (Blanks)',
      DROP_DOWN: 'Drop-Down (Select Blanks)',
      CATEGORIZE: 'Categorization Groups'
    };
    return QUESTION_TYPE_LABELS[type] || type.replace('_', ' ');
  };

  const toggleQuestionType = (type) => {
    setNewSelectedQuestionTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const totalQuestions = useMemo(() => {
    return modalQuestions.filter(q => {
      const type = q.type || 'MULTIPLE_CHOICE';
      return newSelectedQuestionTypes.includes(type);
    }).length;
  }, [modalQuestions, newSelectedQuestionTypes]);

  const filteredGames = useMemo(() => {
    if (!gamesList) return [];
    return gamesList.filter(g => 
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.subject && g.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [gamesList, searchQuery]);

  const handleStartChangeGame = async () => {
    if (!selectedNewGameId) return;
    setIsRestarting(true);
    try {
      const options = {
        randomize: newRandomize,
        timerDuration: newTimerDuration,
        maxQuestions: newMaxQuestions ? parseInt(newMaxQuestions) : null,
        questionTypes: newSelectedQuestionTypes,
        marathonMode: newPacingMode === 'student'
      };
      await hostChangeGame(selectedNewGameId, options);
      setShowChangeGameModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRestarting(false);
    }
  };

  const handlePlayAgain = async () => {
    if (!hostPlayAgain) return;
    setIsRestarting(true);
    try {
      await hostPlayAgain();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRestarting(false);
    }
  };

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
      const correctText = getMcCorrectAnswer(q);
      return (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Correct Option:</div>
          <div className="flex items-center gap-2 bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-slate-700 font-semibold text-sm max-w-md">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold">✓</span>
            {correctText}
          </div>
        </div>
      );
    }

    if (type === 'SORTING') {
      return (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Correct Sequence:</div>
          <div className="flex flex-col gap-1.5 max-w-md">
            {getSortingCorrect(q).map((opt, idx) => (
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
      const correctAnswers = getDragDropCorrect(q);
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
                const mapped = correctAnswers.findIndex(c => c === inner);
                const valIdx = mapped !== -1 ? mapped : sequential;
                if (mapped === -1) sequential += 1;
                return (
                  <strong key={idx} className="text-emerald-600 underline decoration-2 underline-offset-2 decoration-emerald-350 px-0.5">
                    {correctAnswers[valIdx] || inner || '???'}
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
      const dropdowns = normalizeQuestion(q)?.options?.dropdowns || [];
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
                    {getDropDownCorrect(q, valIdx) || '???'}
                  </strong>
                );
              }
              if (inner) {
                const mapped = dropdowns.findIndex(d => d.correct_answer === inner || d.correct === inner);
                const idxToUse = mapped !== -1 ? mapped : sequential;
                if (mapped === -1) sequential += 1;
                const cfg = dropdowns[idxToUse];
                const correctVal = cfg ? (cfg.correct_answer || cfg.correct || inner) : inner;
                return (
                  <strong key={idx} className="text-emerald-600 underline decoration-2 underline-offset-2 decoration-emerald-350 px-0.5">
                    {correctVal}
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

          <div className="w-full mt-auto flex flex-col gap-3 pt-6">
            {hostPlayAgain && (
              <button 
                className="btn btn-primary"
                onClick={handlePlayAgain}
                disabled={isRestarting}
              >
                {isRestarting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent shrink-0" />
                    Resetting Session...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    Play Again (Same Quiz)
                  </>
                )}
              </button>
            )}
            
            {hostChangeGame && gamesList && gamesList.length > 0 && (
              <button 
                className="btn btn-secondary"
                onClick={() => setShowChangeGameModal(true)}
                disabled={isRestarting}
              >
                <Shuffle className="w-4 h-4 shrink-0" />
                Host a Different Quiz
              </button>
            )}

            <button 
              className="btn bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-800 hover:shadow-md"
              onClick={hostEndGame}
              disabled={isRestarting}
            >
              <Home className="w-4 h-4 shrink-0" />
              Close Room & Return Home
            </button>
          </div>
        </div>

        {/* Right Column: Question Difficulty Insights */}
        <div className="lg:w-7/12 bg-slate-50/50 border border-slate-150 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>📊</span> Class Performance Review
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Questions are sorted by difficulty (most missed first). Click any question to reveal details and the correct answer key.
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
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

      {showChangeGameModal && (
        <div 
          className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[1300] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowChangeGameModal(false)}
        >
          <div 
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col p-6 shadow-xl animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="text-left">
                <h2 className="text-xl font-bold text-slate-800">Host a Different Game</h2>
                <p className="text-xs text-slate-500 mt-1">Select a game and customize settings. Students will automatically transition.</p>
              </div>
              <button 
                onClick={() => setShowChangeGameModal(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent"
              >
                ✕
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Search bar */}
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 focus:border-rose-500 focus:bg-white rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                />
              </div>

              {/* Games list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-1">
                {filteredGames.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-slate-400 italic text-sm">
                    No games found.
                  </div>
                ) : (
                  filteredGames.map((game) => {
                    const isSelected = selectedNewGameId === game.id;
                    return (
                      <button
                        key={game.id}
                        onClick={() => setSelectedNewGameId(game.id)}
                        className={`text-left p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected 
                            ? 'border-rose-500 bg-rose-50/30 ring-1 ring-rose-500' 
                            : 'border-slate-150 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{game.title}</h4>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{game.description || 'No description.'}</p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-3">
                          {game.subject && (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              📚 {game.subject}
                            </span>
                          )}
                          {game.cefr_level && (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              🎓 {game.cefr_level}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Settings Section (only if game selected) */}
              {selectedNewGameId && modalQuestions.length > 0 && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 text-left">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Pacing Mode
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input 
                          type="radio" 
                          name="new-pacing" 
                          value="teacher"
                          checked={newPacingMode === 'teacher'}
                          onChange={() => setNewPacingMode('teacher')}
                          className="h-4 w-4 text-rose-500 focus:ring-rose-500 cursor-pointer"
                        />
                        🏫 Teacher-Paced (Class Game)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input 
                          type="radio" 
                          name="new-pacing" 
                          value="student"
                          checked={newPacingMode === 'student'}
                          onChange={() => setNewPacingMode('student')}
                          className="h-4 w-4 text-rose-500 focus:ring-rose-500 cursor-pointer"
                        />
                        🏃 Student-Paced (Marathon)
                      </label>
                    </div>
                  </div>

                  <GameSettings
                    selectedGameId={selectedNewGameId}
                    randomize={newRandomize}
                    setRandomize={setNewRandomize}
                    gameQuestions={modalQuestions}
                    totalQuestions={totalQuestions}
                    availableQuestionTypes={availableQuestionTypes}
                    selectedQuestionTypes={newSelectedQuestionTypes}
                    toggleQuestionType={toggleQuestionType}
                    getQuestionTypeLabel={getQuestionTypeLabel}
                    getQuestionTypeCount={getQuestionTypeCount}
                    maxQuestions={newMaxQuestions}
                    setMaxQuestions={setNewMaxQuestions}
                    timerDuration={newTimerDuration}
                    setTimerDuration={setNewTimerDuration}
                    pacingMode={newPacingMode}
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setShowChangeGameModal(false)}
                className="btn btn-secondary cursor-pointer"
                disabled={isRestarting}
              >
                Cancel
              </button>
              <button 
                onClick={handleStartChangeGame}
                disabled={!selectedNewGameId || isRestarting}
                className="btn btn-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRestarting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    Starting...
                  </>
                ) : (
                  'Start Hosting Quiz'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
