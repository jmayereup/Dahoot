import {
  splitCurlyTokens,
  getCurlyIndex,
  getCurlyInner,
  splitBracketTokens,
  getBlankIndex,
  getBracketInner
} from '../utils/blankParsing';
import { getDragDropCorrect, getDropDownCorrect, normalizeQuestion, getMcOptions, unionDropDownDistractors } from '../utils/questionSchema';

function renderPreviewSentenceWithBlanks(sentence, editingQuestion) {
  if (!sentence) return '';
  const correctAnswers = getDragDropCorrect(editingQuestion || {});
  const parts = splitBracketTokens(sentence);
  return parts.map((part, idx) => {
    const numericIdx = getBlankIndex(part);
    const inner = getBracketInner(part);
    if (numericIdx !== null) {
      const blankIdx = numericIdx;
      const correctWord = correctAnswers[blankIdx] || '';
      return (
        <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
          {correctWord || '_____'}
        </span>
      );
    }
    if (inner) {
      const mappedIdx = correctAnswers.findIndex(c => c === inner);
      const blankIdx = mappedIdx !== -1 ? mappedIdx : 0;
      const correctWord = correctAnswers[blankIdx] || inner;
      return (
        <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
          {correctWord || inner}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function renderPreviewSentenceWithDropdowns(sentence, editingQuestion) {
  if (!sentence) return '';
  const dropdowns = normalizeQuestion(editingQuestion || {})?.options?.dropdowns || [];
  const parts = splitCurlyTokens(sentence);
  let sequentialDrop = 0;
  return parts.map((part, idx) => {
    const dropIdx = getCurlyIndex(part);
    const inner = getCurlyInner(part);
    if (dropIdx !== null) {
      const correctVal = getDropDownCorrect(editingQuestion || {}, dropIdx);
      return (
        <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
          {correctVal || '_____'}
        </span>
      );
    }
    if (inner) {
      const mappedIdx = dropdowns.findIndex(d => d.correct_answer === inner || d.correct === inner);
      const idxToUse = mappedIdx !== -1 ? mappedIdx : sequentialDrop;
      if (mappedIdx === -1) sequentialDrop += 1;
      const config = dropdowns[idxToUse] || { correct_answer: inner };
      const correctVal = config.correct_answer || config.correct || inner;
      return (
        <span key={idx} className="mx-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg whitespace-nowrap">
          {correctVal}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function renderPreviewCategorize(options) {
  if (!options) return null;
  const categories = options.categories || [];
  const items = options.items || [];
  return (
    <div className="grid grid-cols-2 gap-3 mt-2">
      {categories.map((cat, cIdx) => {
        const catItems = items.filter(item => item.category === cat);
        return (
          <div key={cIdx} className="bg-slate-50 border border-slate-200/60 rounded-xl p-3">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 border-b pb-1 truncate" title={cat}>
              Category: <span className="text-slate-800">{cat}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {catItems.map((item, iIdx) => (
                <span key={iIdx} className="px-2 py-0.5 bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10px] font-semibold rounded-lg truncate max-w-full">
                  {item.name}
                </span>
              ))}
              {catItems.length === 0 && (
                <span className="text-[10px] text-slate-400 italic">No items</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PreviewOptions({ question, editingQuestion }) {
  if (!question) return null;
  const type = question.type || 'MULTIPLE_CHOICE';
  const n = normalizeQuestion(question);

  if (type === 'MULTIPLE_CHOICE') {
    const opts = getMcOptions(question);
    const correct = n.options?.correct_answer || '';
    return (
      <div className="flex flex-col gap-2">
        {opts.map((opt, oIdx) => {
          const isCorrect = opt === correct;
          return (
            <div
              key={oIdx}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs transition-colors ${
                isCorrect
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold shadow-xs'
                  : 'border-slate-100 bg-slate-50/50 text-slate-500'
              }`}
            >
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                isCorrect
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {isCorrect ? '✓' : ['A', 'B', 'C', 'D'][oIdx]}
              </span>
              <span className="truncate" title={opt}>{opt}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'SORTING') {
    const opts = n.options?.correct_sequence || [];
    return (
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1">
          <span>✨ Correct Sorted Order:</span>
        </div>
        {opts.map((opt, oIdx) => (
          <div
            key={oIdx}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium text-xs shadow-xs"
          >
            <span className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 bg-emerald-500 text-white">
              {oIdx + 1}
            </span>
            <span className="truncate" title={opt}>{opt}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'DRAG_DROP' && question.options) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sentence:</div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
          {renderPreviewSentenceWithBlanks(question.options.sentence, editingQuestion || question)}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mr-1">Blanks:</span>
          {(n.options?.answers_in_order || []).map((word, wIdx) => (
            <span key={wIdx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
              {word}
            </span>
          ))}
        </div>
        {n.options?.distractors && n.options.distractors.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mr-1">Distractors:</span>
            {n.options.distractors.map((word, wIdx) => (
              <span key={wIdx} className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 font-bold rounded-md text-[10px]">
                {word}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'DROP_DOWN' && question.options) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sentence:</div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
          {renderPreviewSentenceWithDropdowns(question.options.sentence, editingQuestion || question)}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mr-1">Dropdowns:</span>
          {(n.options?.dropdowns || []).map((d, dIdx) => (
            <span key={dIdx} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
              {d.correct_answer || d.correct}
            </span>
          ))}
        </div>
        {n.options?.dropdowns && unionDropDownDistractors(n.options.dropdowns).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mr-1">Distractors:</span>
            {unionDropDownDistractors(n.options.dropdowns).map((word, wIdx) => (
              <span key={wIdx} className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 font-bold rounded-md text-[10px]">
                {word}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'CATEGORIZE' && question.options) {
    return renderPreviewCategorize(question.options);
  }

  return null;
}
