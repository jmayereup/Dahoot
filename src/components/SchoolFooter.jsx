import React from 'react';

export function SchoolFooter() {
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
        <span className="text-slate-300">|</span>
        <span>Want to self-host? Dahoot is open source on</span>
        <a 
          href="https://github.com/jmayereup/Dahoot" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-slate-600 hover:text-rose-400 font-bold underline transition-colors inline-flex items-center gap-1"
        >
          GitHub 🚀
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
      </p>
    </footer>
  );
}
