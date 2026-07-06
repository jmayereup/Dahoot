export function TeacherPortalHeader({ isAuthenticated, userInfo, currentUser, onLogout, setView }) {
  return (
    <header className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 p-4 bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="bg-rose-100 p-2.5 rounded-xl text-xl">
          🏫
        </div>
        <div className="text-left">
          <h3 className="font-bold text-slate-800 text-sm sm:text-base">Teacher Portal</h3>
          <p className="text-xs text-slate-500">Create & manage classroom games</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
        {isAuthenticated ? (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Logged in as: <strong className="text-slate-700 font-semibold">{userInfo?.dahoot_username || currentUser?.name || currentUser?.email}</strong>
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setView('teacher')}
                className="px-5 py-2.5 text-xs font-bold rounded-full bg-gradient-to-r from-school-primary to-school-accent text-slate-700 shadow-sm hover:scale-105 transition-all cursor-pointer flex-grow sm:flex-grow-0"
              >
                📚 Library
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2.5 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setView('teacher')}
            className="px-6 py-2.5 text-sm font-bold rounded-full bg-gradient-to-r from-rose-400 to-orange-400 text-white shadow-md hover:shadow-rose-100 hover:scale-105 active:scale-95 transition-all cursor-pointer w-full sm:w-auto text-center"
          >
            Teacher Sign Up / Login
          </button>
        )}
      </div>
    </header>
  );
}
