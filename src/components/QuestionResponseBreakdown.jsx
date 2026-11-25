import React, { useMemo } from 'react';
import { BUCKET_COLORS } from '../constants';
import { deterministicShuffle } from '../utils/shuffle';
import {
  splitCurlyTokens,
  getCurlyIndex,
  getCurlyInner,
  splitBracketTokens,
  getBlankIndex,
  getBracketInner
} from '../utils/blankParsing';
import {
  getMcOptions,
  getMcCorrectAnswer,
  getDragDropCorrect,
  getDropDownCorrect,
  getSortingCorrect,
  isScrambleSentence,
  normalizeQuestion,
  isStoredAnswerCorrect,
  isStoredAnswerIncorrect,
  getStoredAnswerChoice
} from '../utils/questionSchema';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];
const OPTION_ACCENTS = [
  { badge: 'bg-rose-100 text-rose-700', bar: 'bg-rose-200/70' },
  { badge: 'bg-sky-100 text-sky-700', bar: 'bg-sky-200/70' },
  { badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-200/70' },
  { badge: 'bg-violet-100 text-violet-700', bar: 'bg-violet-200/70' }
];

function extractMcChoiceText(choice) {
  if (typeof choice === 'string') return choice;
  if (choice && typeof choice === 'object' && typeof choice.item === 'string') {
    return choice.item;
  }
  return null;
}

export function QuestionResponseBreakdown({
  question,
  players = [],
  roomCode = '',
  compact = false
}) {
  const type = question?.type || 'MULTIPLE_CHOICE';
  const normalized = useMemo(() => normalizeQuestion(question), [question]);

  // Overall response counts for this question
  const summary = useMemo(() => {
    let correctCount = 0;
    let wrongCount = 0;
    const choices = [];

    for (const p of players) {
      const raw = p.answers?.[question?.id];
      if (isStoredAnswerCorrect(raw)) {
        correctCount++;
      } else if (isStoredAnswerIncorrect(raw)) {
        wrongCount++;
      }
      const choice = getStoredAnswerChoice(raw);
      if (choice !== null) {
        choices.push(choice);
      }
    }

    const answeredCount = correctCount + wrongCount;
    const unansweredCount = Math.max(0, players.length - answeredCount);
    return {
      totalPlayers: players.length,
      correctCount,
      wrongCount,
      answeredCount,
      unansweredCount,
      choices
    };
  }, [players, question?.id]);

  // 1. MULTIPLE CHOICE options + counts
  const mcBreakdown = useMemo(() => {
    if (type !== 'MULTIPLE_CHOICE' || !question) return [];
    const opts = getMcOptions(question);
    const correctAnswer = getMcCorrectAnswer(question);
    const shuffled = deterministicShuffle(opts, `${roomCode}-${question.id}`);

    const countsByOption = new Map();
    for (const c of summary.choices) {
      const text = extractMcChoiceText(c);
      if (text !== null) {
        countsByOption.set(text, (countsByOption.get(text) || 0) + 1);
      }
    }

    const denom = summary.answeredCount > 0 ? summary.answeredCount : 0;
    return shuffled.map((entry, idx) => {
      const count = countsByOption.get(entry.item) || 0;
      const pct = denom > 0 ? Math.round((count / denom) * 100) : 0;
      return {
        letter: OPTION_LETTERS[idx] || String.fromCharCode(65 + idx),
        text: entry.item,
        isCorrect: entry.item === correctAnswer,
        count,
        pct,
        accent: OPTION_ACCENTS[idx % OPTION_ACCENTS.length]
      };
    });
  }, [type, question, roomCode, summary.choices, summary.answeredCount]);

  // 2. DROP_DOWN per-blank counts
  const dropDownBreakdown = useMemo(() => {
    if (type !== 'DROP_DOWN' || !normalized?.options?.dropdowns) return [];
    const dropdowns = normalized.options.dropdowns;
    const arrayChoices = summary.choices.filter(c => Array.isArray(c));
    if (arrayChoices.length === 0) return [];

    return dropdowns.map((dd, bIdx) => {
      const correct = dd.correct_answer || '';
      const counts = new Map();
      for (const arr of arrayChoices) {
        const picked = arr[bIdx];
        if (typeof picked === 'string' && picked) {
          counts.set(picked, (counts.get(picked) || 0) + 1);
        }
      }

      const knownOptions = [correct, ...(dd.distractors || [])].filter(Boolean);
      for (const picked of counts.keys()) {
        if (!knownOptions.includes(picked)) knownOptions.push(picked);
      }

      const totalForBlank = arrayChoices.length;
      return {
        blankNum: bIdx + 1,
        correct,
        options: knownOptions.map(opt => {
          const count = counts.get(opt) || 0;
          return {
            text: opt,
            isCorrect: opt === correct,
            count,
            pct: totalForBlank > 0 ? Math.round((count / totalForBlank) * 100) : 0
          };
        })
      };
    });
  }, [type, normalized, summary.choices]);

  // 3. DRAG_DROP per-blank counts (for non-scramble sentences with <= 4 blanks)
  const dragDropBreakdown = useMemo(() => {
    if (type !== 'DRAG_DROP' || !question || isScrambleSentence(question)) return [];
    const correctAnswers = getDragDropCorrect(question);
    if (correctAnswers.length === 0 || correctAnswers.length > 4) return [];
    const arrayChoices = summary.choices.filter(c => Array.isArray(c));
    if (arrayChoices.length === 0) return [];

    return correctAnswers.map((correct, bIdx) => {
      const counts = new Map();
      for (const arr of arrayChoices) {
        const picked = arr[bIdx];
        if (typeof picked === 'string' && picked) {
          counts.set(picked, (counts.get(picked) || 0) + 1);
        }
      }

      const totalForBlank = arrayChoices.length;
      const wrongEntries = Array.from(counts.entries())
        .filter(([word]) => word !== correct)
        .sort((a, b) => b[1] - a[1]);

      const options = [
        {
          text: correct,
          isCorrect: true,
          count: counts.get(correct) || 0,
          pct: totalForBlank > 0 ? Math.round(((counts.get(correct) || 0) / totalForBlank) * 100) : 0
        },
        ...wrongEntries.map(([word, count]) => ({
          text: word,
          isCorrect: false,
          count,
          pct: totalForBlank > 0 ? Math.round((count / totalForBlank) * 100) : 0
        }))
      ];

      return {
        blankNum: bIdx + 1,
        correct,
        options
      };
    });
  }, [type, question, summary.choices]);

  // 4. CATEGORIZE per-item category breakdown
  const categorizeData = useMemo(() => {
    if (type !== 'CATEGORIZE' || !question?.options) return { map: {}, itemStats: {}, hasData: false };
    const categories = question.options.categories || [];
    const items = question.options.items || [];
    const map = {};
    categories.forEach(cat => {
      map[cat] = items.filter(item => item.category === cat);
    });

    const objChoices = summary.choices.filter(c => c && typeof c === 'object' && !Array.isArray(c));
    const itemStats = {};
    if (objChoices.length > 0) {
      for (const item of items) {
        let right = 0;
        const wrongCats = new Map();
        for (const assignments of objChoices) {
          const chosenCat = assignments[item.name];
          if (!chosenCat) continue;
          if (chosenCat === item.category) {
            right++;
          } else {
            wrongCats.set(chosenCat, (wrongCats.get(chosenCat) || 0) + 1);
          }
        }
        itemStats[item.name] = {
          right,
          total: objChoices.length,
          wrongList: Array.from(wrongCats.entries()).sort((a, b) => b[1] - a[1])
        };
      }
    }

    return { map, itemStats, hasData: objChoices.length > 0 };
  }, [type, question, summary.choices]);

  // 5. SORTING per-position accuracy
  const sortingPositionStats = useMemo(() => {
    if (type !== 'SORTING' || !question) return [];
    const seq = getSortingCorrect(question);
    const arrayChoices = summary.choices.filter(c => Array.isArray(c));
    if (arrayChoices.length === 0) return [];

    return seq.map((item, idx) => {
      let inRightSpot = 0;
      for (const arr of arrayChoices) {
        if (arr[idx] === item) inRightSpot++;
      }
      return {
        right: inRightSpot,
        total: arrayChoices.length,
        pct: Math.round((inRightSpot / arrayChoices.length) * 100)
      };
    });
  }, [type, question, summary.choices]);

  // Helper to fill blanks in Drag & Drop sentence
  const renderFilledDragDropSentence = (sentence) => {
    if (!sentence) return '';
    const correctAnswers = getDragDropCorrect(question);
    const parts = splitBracketTokens(sentence);
    let sequential = 0;
    return parts.map((part, idx) => {
      const numericIdx = getBlankIndex(part);
      const inner = getBracketInner(part);
      if (numericIdx !== null || inner) {
        const valIdx = numericIdx !== null ? numericIdx : sequential++;
        return (
          <span
            key={idx}
            className="text-emerald-700 font-bold border-b-2 border-emerald-400 px-1.5 mx-0.5 bg-emerald-50/70 rounded-t"
          >
            {correctAnswers[valIdx] || inner || '???'}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // Helper to fill dropdowns in Drop Down sentence
  const renderFilledDropDownSentence = (sentence) => {
    if (!sentence) return '';
    const dropdowns = normalized?.options?.dropdowns || [];
    const parts = splitCurlyTokens(sentence);
    let sequential = 0;
    return parts.map((part, idx) => {
      const valIdx = getCurlyIndex(part);
      const inner = getCurlyInner(part);
      if (valIdx !== null || inner) {
        const idxToUse = valIdx !== null ? valIdx : sequential++;
        const cfg = dropdowns[idxToUse];
        const correctVal =
          getDropDownCorrect(question, idxToUse) ||
          (cfg ? (cfg.correct_answer || cfg.correct || inner) : inner);
        return (
          <span
            key={idx}
            className="text-emerald-700 font-bold border-b-2 border-emerald-400 px-1.5 mx-0.5 bg-emerald-50/70 rounded-t"
          >
            {correctVal || '???'}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  if (!question) return null;

  return (
    <div
      className={
        compact
          ? 'mt-3 pt-3 border-t border-slate-100 text-left'
          : 'mb-4 text-left bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs'
      }
    >
      {/* Header + Class Accuracy Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          {type === 'MULTIPLE_CHOICE'
            ? 'Answer Key & Student Choices'
            : 'Correct Answer Key & Class Responses'}
        </span>

        {summary.totalPlayers > 0 && !compact && (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ {summary.correctCount} correct
            </span>
            {summary.wrongCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                ✗ {summary.wrongCount} wrong
              </span>
            )}
            {summary.unansweredCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                — {summary.unansweredCount} unanswered
              </span>
            )}
          </div>
        )}
      </div>

      {/* 1. MULTIPLE CHOICE */}
      {type === 'MULTIPLE_CHOICE' && (
        <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2 gap-2' : 'md:grid-cols-2 gap-2.5'}`}>
          {mcBreakdown.map((opt) => {
            const hasResponses = opt.count > 0;
            return (
              <div
                key={opt.text}
                className={`relative overflow-hidden rounded-xl border transition-all ${
                  opt.isCorrect
                    ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-200/70 shadow-xs'
                    : hasResponses
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-150 bg-slate-50/50 opacity-75'
                }`}
              >
                {/* Proportional background fill bar */}
                {opt.pct > 0 && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                      opt.isCorrect ? 'bg-emerald-200/45' : 'bg-rose-100/65'
                    }`}
                    style={{ width: `${opt.pct}%` }}
                  />
                )}

                <div className={`relative flex items-center justify-between gap-3 ${compact ? 'p-2.5' : 'p-3.5'}`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`shrink-0 flex items-center justify-center rounded-lg font-extrabold ${
                        compact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm'
                      } ${
                        opt.isCorrect
                          ? 'bg-emerald-500 text-white shadow-2xs'
                          : opt.accent.badge
                      }`}
                    >
                      {opt.isCorrect ? '✓' : opt.letter}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-bold break-words ${compact ? 'text-xs' : 'text-sm sm:text-base'} ${
                            opt.isCorrect ? 'text-emerald-950' : 'text-slate-700'
                          }`}
                        >
                          {opt.text}
                        </span>
                        {opt.isCorrect && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                            Correct
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Student count + percentage */}
                  <div className="shrink-0 flex items-center gap-1.5 text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold tabular-nums ${
                        compact ? 'text-[11px]' : 'text-xs sm:text-sm'
                      } ${
                        opt.isCorrect
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : hasResponses
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <span>{opt.count}</span>
                      {summary.answeredCount > 0 && (
                        <span className="opacity-80 font-semibold text-[10px]">
                          ({opt.pct}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. DROP DOWN */}
      {type === 'DROP_DOWN' && question.options && (
        <div className="space-y-3">
          <div className={`${compact ? 'text-xs p-3' : 'text-base p-3.5'} leading-relaxed text-slate-800 bg-slate-50/70 border border-slate-200/70 rounded-xl font-medium`}>
            {renderFilledDropDownSentence(question.options.sentence)}
          </div>

          {dropDownBreakdown.length > 0 && (
            <div className={`grid grid-cols-1 ${dropDownBreakdown.length > 1 ? 'sm:grid-cols-2' : ''} gap-2.5`}>
              {dropDownBreakdown.map((blank) => (
                <div
                  key={blank.blankNum}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3"
                >
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Blank #{blank.blankNum}
                  </div>
                  <div className="space-y-1.5">
                    {blank.options.map((opt) => (
                      <div
                        key={opt.text}
                        className={`relative overflow-hidden rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs ${
                          opt.isCorrect
                            ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 font-bold'
                            : opt.count > 0
                              ? 'border-rose-200/80 bg-white text-slate-700 font-semibold'
                              : 'border-slate-150 bg-white/60 text-slate-400'
                        }`}
                      >
                        {opt.pct > 0 && (
                          <div
                            className={`absolute inset-y-0 left-0 ${
                              opt.isCorrect ? 'bg-emerald-200/40' : 'bg-rose-100/60'
                            }`}
                            style={{ width: `${opt.pct}%` }}
                          />
                        )}
                        <span className="relative flex items-center gap-1.5 truncate">
                          <span>{opt.isCorrect ? '✓' : '✗'}</span>
                          <span className="truncate">{opt.text}</span>
                        </span>
                        <span className="relative shrink-0 font-extrabold tabular-nums">
                          {opt.count} <span className="opacity-70 font-semibold text-[10px]">({opt.pct}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. DRAG AND DROP */}
      {type === 'DRAG_DROP' && question.options && (
        <div className="space-y-3">
          <div className={`${compact ? 'text-xs p-3' : 'text-base p-3.5'} leading-relaxed text-slate-800 bg-slate-50/70 border border-slate-200/70 rounded-xl font-medium`}>
            {renderFilledDragDropSentence(question.options.sentence)}
          </div>

          {dragDropBreakdown.length > 0 && (
            <div className={`grid grid-cols-1 ${dragDropBreakdown.length > 1 ? 'sm:grid-cols-2' : ''} gap-2.5`}>
              {dragDropBreakdown.map((blank) => (
                <div
                  key={blank.blankNum}
                  className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3"
                >
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Blank #{blank.blankNum}
                  </div>
                  <div className="space-y-1.5">
                    {blank.options.map((opt) => (
                      <div
                        key={opt.text}
                        className={`relative overflow-hidden rounded-lg border px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs ${
                          opt.isCorrect
                            ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 font-bold'
                            : 'border-rose-200/80 bg-white text-slate-700 font-semibold'
                        }`}
                      >
                        {opt.pct > 0 && (
                          <div
                            className={`absolute inset-y-0 left-0 ${
                              opt.isCorrect ? 'bg-emerald-200/40' : 'bg-rose-100/60'
                            }`}
                            style={{ width: `${opt.pct}%` }}
                          />
                        )}
                        <span className="relative flex items-center gap-1.5 truncate">
                          <span>{opt.isCorrect ? '✓' : '✗'}</span>
                          <span className="truncate">{opt.text}</span>
                        </span>
                        <span className="relative shrink-0 font-extrabold tabular-nums">
                          {opt.count} <span className="opacity-70 font-semibold text-[10px]">({opt.pct}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. CATEGORIZE */}
      {type === 'CATEGORIZE' && question.options && (
        <div
          className="grid gap-2.5"
          style={{
            gridTemplateColumns: `repeat(${Math.min(question.options.categories?.length || 2, compact ? 2 : 4)}, minmax(0, 1fr))`
          }}
        >
          {Object.keys(categorizeData.map).map((cat, idx) => {
            const catIdx = question.options.categories?.indexOf(cat);
            const colorSet =
              BUCKET_COLORS[catIdx !== -1 ? catIdx % BUCKET_COLORS.length : idx % BUCKET_COLORS.length];
            const itemsInCat = categorizeData.map[cat] || [];
            return (
              <div
                key={idx}
                className="rounded-xl p-3"
                style={{
                  background: colorSet.background,
                  border: colorSet.border,
                  boxShadow: colorSet.shadow
                }}
              >
                <div
                  className="font-extrabold text-xs sm:text-sm mb-2 pb-1"
                  style={{
                    color: colorSet.color,
                    borderBottom: `1.5px solid ${colorSet.color}33`
                  }}
                >
                  {cat}
                </div>
                <div className="flex flex-col gap-1.5">
                  {itemsInCat.map((item, iIdx) => {
                    const stats = categorizeData.itemStats[item.name];
                    return (
                      <div
                        key={iIdx}
                        className="rounded-lg bg-white/70 px-2 py-1.5 text-xs"
                        style={{ color: colorSet.color }}
                      >
                        <div className="flex items-center justify-between gap-1.5 font-semibold">
                          <span className="truncate">• {item.name}</span>
                          {stats && (
                            <span
                              className={`shrink-0 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full tabular-nums ${
                                stats.right === stats.total
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : stats.right >= stats.total / 2
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              ✓ {stats.right}/{stats.total}
                            </span>
                          )}
                        </div>
                        {stats && stats.wrongList.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {stats.wrongList.map(([wrongCat, count]) => (
                              <span
                                key={wrongCat}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/80"
                              >
                                → {wrongCat}: {count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {itemsInCat.length === 0 && (
                    <div className="text-xs opacity-60 italic" style={{ color: colorSet.color }}>
                      No items
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. SORTING */}
      {type === 'SORTING' && (
        <div className="flex flex-col gap-1.5 max-w-lg">
          {getSortingCorrect(question).map((opt, idx) => {
            const posStat = sortingPositionStats[idx];
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-3 bg-emerald-50/50 border border-emerald-200/80 rounded-lg px-3 py-2 text-emerald-900 font-semibold text-xs sm:text-sm"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="truncate">{opt}</span>
                </div>
                {posStat && (
                  <span className="shrink-0 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-700 tabular-nums">
                    {posStat.right}/{posStat.total} in #{idx + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
