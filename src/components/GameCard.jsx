export function GameCard({ game, isSelected, onClick, currentUser, userInfo }) {
  return (
    <div
      key={game.id}
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-rose-300 bg-rose-50/50 shadow-md'
          : 'border-slate-200 bg-white hover:border-rose-200 hover:shadow-sm'
      }`}
    >
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
