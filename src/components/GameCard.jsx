export function GameCard({ game, onClick, currentUser, userInfo }) {
  return (
    <div
      onClick={onClick}
      className="group relative p-4 rounded-xl border-2 border-slate-200 bg-white cursor-pointer transition-all hover:border-rose-300 hover:shadow-md hover:-translate-y-0.5"
    >
      <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Open →
      </span>
      <h3 className="font-bold text-slate-800 text-sm mb-1.5">{game.title}</h3>
      {game.description && (
        <p className="text-xs text-slate-600 mb-2 line-clamp-2">{game.description}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {game.subject && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            📚 {game.subject}
          </span>
        )}
        {game.cefr_level && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            🎓 {game.cefr_level}
          </span>
        )}
        {game.creator && (() => {
          const creatorName = game.creator.toLowerCase().trim();
          const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
          const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
          const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
          const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';

          const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                           (myName && creatorName === myName) ||
                           (myEmail && creatorName === myEmail) ||
                           (myUsername && creatorName === myUsername) ||
                           (currentUser?.id && creatorName === currentUser.id);

          const displayCreator = (isMyGame && userInfo?.dahoot_username) ? userInfo.dahoot_username : game.creator;
          return (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              👤 {displayCreator}
            </span>
          );
        })()}
      </div>
    </div>
  );
}
