export function UserStatusBar({
  currentUser,
  userInfo,
  userRole,
  onProfileOpen,
  onAdminOpen,
  onLogout,
  isAdmin = false,
  children
}) {
  if (!currentUser) return null;
  const displayName = userInfo?.dahoot_username || currentUser.name || currentUser.email;
  const displaySchool = userInfo?.school || '';

  return (
    <div className="flex justify-between items-center bg-slate-50 border-b border-slate-200/80 px-6 py-3 -mx-10 -mt-10 mb-6 text-xs text-slate-500 rounded-t-2xl shadow-inner w-[calc(100%+80px)]">
      <span className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap min-w-0 mr-4 scrollbar-none">
        👤 <strong className="text-slate-700 font-bold shrink-0">
          {displayName === currentUser.email ? displayName : `${displayName} (${currentUser.email})`}
        </strong>
        {displaySchool && (
          <span className="text-slate-400 font-medium shrink-0 ml-1">
            • {displaySchool}
          </span>
        )}
        {userRole === 'ADMIN' && (
          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border border-amber-200/60 shrink-0">
            Admin
          </span>
        )}
      </span>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onProfileOpen}
          className="p-1 text-slate-400 hover:text-slate-600 transition-all cursor-pointer hover:bg-slate-100 rounded-full active:scale-95 flex items-center justify-center border-none outline-none bg-transparent"
          title="Edit Profile"
        >
          ⚙️
        </button>
        {userRole === 'ADMIN' && (
          <button
            type="button"
            onClick={onAdminOpen}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center justify-center border-none outline-none whitespace-nowrap"
          >
            🛠 Manage
          </button>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="px-3 py-1 bg-white hover:bg-rose-50 border border-slate-200/80 text-rose-500 hover:text-rose-600 font-bold text-xs rounded-full transition-all cursor-pointer shadow-xs active:scale-95 inline-flex items-center justify-center outline-none whitespace-nowrap"
        >
          Log Out
        </button>
      </div>
      {children}
    </div>
  );
}
