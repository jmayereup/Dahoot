import { PreviewOptions } from './PreviewOptions';

export function QuestionPreviewCard({
  question,
  index,
  canEdit,
  onEdit,
  onDelete,
  editingQuestion
}) {
  return (
    <div
      className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between"
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex justify-between items-start gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="bg-rose-50 text-rose-600 border border-rose-100 font-bold px-2.5 py-0.5 rounded-full text-xs">
                Q{index + 1}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {(question.type || 'MULTIPLE_CHOICE').replace('_', ' ')}
              </span>
            </div>
            {canEdit && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(question)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-lg transition-colors cursor-pointer"
                  title="Edit question"
                >
                  ✏️ Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(question.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg transition-colors cursor-pointer"
                  title="Delete question"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>

          <div className="text-sm font-semibold text-slate-800 mb-4 line-clamp-3" title={question.text}>
            {question.text}
          </div>
        </div>

        <div className="text-xs text-slate-600 space-y-2 mt-auto">
          <PreviewOptions question={question} editingQuestion={editingQuestion} />
        </div>
      </div>
    </div>
  );
}
