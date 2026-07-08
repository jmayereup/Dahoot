import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const COLOR_MAP = {
  subject: {
    active: 'bg-blue-50 border-blue-200 text-blue-700',
    ring: 'focus-visible:ring-blue-300',
    checkbox: 'accent-blue-600',
  },
  cefr: {
    active: 'bg-purple-50 border-purple-200 text-purple-700',
    ring: 'focus-visible:ring-purple-300',
    checkbox: 'accent-purple-600',
  },
  language: {
    active: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    ring: 'focus-visible:ring-emerald-300',
    checkbox: 'accent-emerald-600',
  },
  creator: {
    active: 'bg-amber-50 border-amber-200 text-amber-700',
    ring: 'focus-visible:ring-amber-300',
    checkbox: 'accent-amber-600',
  },
};

export function MultiSelectDropdown({
  label,
  color = 'subject',
  options = [],
  selected = [],
  onToggle,
  onClear,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const colors = COLOR_MAP[color] || COLOR_MAP.subject;
  const hasSelection = selected.length > 0;

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div className="relative min-w-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
          hasSelection
            ? `${colors.active} ${colors.ring}`
            : `bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 ${colors.ring}`
        }`}
      >
        <span className="flex items-center gap-1.5 truncate">
          {hasSelection && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[0.65rem] rounded-full bg-white/70 border border-current/20">
              {selected.length}
            </span>
          )}
          <span className="truncate">
            {hasSelection ? selected.join(', ') : label}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute z-30 mt-1 left-0 right-0 min-w-[14rem] max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg p-1"
        >
          {hasSelection && (
            <div className="flex justify-end px-1.5 py-1 border-b border-slate-100 mb-1">
              <button
                type="button"
                onClick={() => onClear?.()}
                className="text-[0.7rem] font-semibold text-slate-500 hover:text-rose-600 underline"
              >
                Clear {label.toLowerCase()}
              </button>
            </div>
          )}
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">No options available</div>
          ) : (
            options.map((option) => {
              const active = selected.includes(option);
              return (
                <label
                  key={option}
                  className={`flex items-center gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer hover:bg-slate-50 ${
                    active ? `${colors.active} font-semibold` : 'text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => onToggle(option)}
                    className={`w-3.5 h-3.5 rounded border-slate-300 ${colors.checkbox}`}
                  />
                  <span className="truncate">{option}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
