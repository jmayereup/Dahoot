import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PaginationControls({
  setCurrentPage,
  effectivePage, totalPages,
  getPageNumbers, totalResults,
  itemsPerPage
}) {
  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-white/50 px-4 py-3 sm:px-6 mt-4 rounded-xl shadow-xs">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          type="button"
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={effectivePage === 1}
          className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={effectivePage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{(effectivePage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-semibold text-slate-700">
              {Math.min(effectivePage * itemsPerPage, totalResults)}
            </span>{' '}
            of <span className="font-semibold text-slate-700">{totalResults}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-lg border border-slate-200 bg-white shadow-xs" aria-label="Pagination">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={effectivePage === 1}
              className="relative inline-flex items-center rounded-l-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers().map((page, idx) => {
              if (page === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="relative inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-400 border-l border-slate-200 select-none"
                  >
                    ...
                  </span>
                );
              }
              const isCurrent = page === effectivePage;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`relative inline-flex items-center px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    isCurrent
                      ? 'z-10 bg-rose-500 text-white hover:bg-rose-600'
                      : 'text-slate-600 hover:bg-slate-50 border-l border-slate-200'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={effectivePage === totalPages}
              className="relative inline-flex items-center rounded-r-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-l border-slate-200 transition-all cursor-pointer"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
