import React from 'react';

export function SchoolFooter({ status }) {
  const statusColorClass = status === 'connected' 
    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
    : status === 'checking' 
      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
      : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';

  return (
    <footer className="mt-12 py-6 border-t border-dashed border-slate-200/60 w-full text-center max-w-4xl animate-fade-in select-none">
      <p className="text-sm font-medium text-slate-500 flex flex-wrap items-center justify-center gap-2">
        <span>Created for</span>
        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-slate-100/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs border border-slate-200/50">
          <img
            src="/logo.png"
            alt="DDN Logo"
            className="w-4 h-4 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          Datdaruni School
        </span>
        <span>by</span>
        <a
          href="https://www.teacherjake.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-rose-50/80 hover:bg-rose-100/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs border border-rose-200/50 transition-colors"
        >
          <img
            src="/tj-logo.png"
            alt="TJ Logo"
            className="w-4 h-4 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          Teacher Jake
        </a>
      </p>
      <p className="text-xs text-slate-400 mt-3 flex flex-wrap items-center justify-center gap-3">
        <a 
          href="https://www.teacherjake.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-rose-400 transition-colors"
        >
          More Worksheets & Materials
        </a>
        <span className="text-slate-300">|</span>
        <a 
          href="https://www.teacherjake.com/privacy/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-rose-400 transition-colors"
        >
          Privacy Policy
        </a>
        <span className="text-slate-300">|</span>
                <a 
          href="https://github.com/jmayereup/Dahoot" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-rose-400  transition-colors inline-flex items-center gap-1"
        >
          Self-Hosting Available
        </a>
      </p>
      {status && (
        <p className="text-xs text-slate-400 mt-3 flex flex-wrap items-center justify-center gap-2">
          <span>Powered by</span>
          <a 
            href="https://pocketbase.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-semibold text-slate-500 hover:text-rose-400 transition-colors inline-flex items-center gap-1"
          >
            PocketBase
          </a>
          <span className="text-slate-300">|</span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full ${statusColorClass}`} />
            <span className="text-slate-500 capitalize">{status}</span>
          </span>
        </p>
      )}
    </footer>
  );
}
