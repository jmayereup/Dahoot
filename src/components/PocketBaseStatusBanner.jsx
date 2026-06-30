import React from 'react';

export function PocketBaseStatusBanner({ status }) {
  const statusColorClass = status === 'connected' 
    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
    : status === 'checking' 
      ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
      : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';

  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 text-xs bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/50 shadow-sm z-50 transition-all duration-300">
      <span className={`w-2 h-2 rounded-full ${statusColorClass}`} />
      <span className="text-slate-600 font-semibold tracking-wide">
        PocketBase: {status === 'connected' ? 'Connected' : status === 'checking' ? 'Checking...' : 'Disconnected'}
      </span>
    </div>
  );
}
