import { GameCard } from './GameCard';
import { PaginationControls } from './PaginationControls';

export function GameCardGrid({
  gamesList,
  sortedGames,
  paginatedGames,
  selectedGameId,
  setSelectedGameId,
  setCurrentPage,
  effectivePage, totalPages,
  getPageNumbers, itemsPerPage,
  currentUser, userInfo
}) {
  if (gamesList.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 20px' }}>
        No games found. Click "Reset & Seed Demo Questions" to create one.
      </p>
    );
  }

  if (sortedGames.length === 0) {
    return (
      <p style={{ color: '#ff4b60', fontSize: '0.85rem', margin: '4px 0 20px' }}>
        No games match your search.
      </p>
    );
  }

  return (
    <>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Showing {sortedGames.length === 0 ? 0 : (effectivePage - 1) * itemsPerPage + 1}-{Math.min(sortedGames.length, effectivePage * itemsPerPage)} of {sortedGames.length} games {sortedGames.length < gamesList.length && `(filtered from ${gamesList.length} total)`}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {paginatedGames.map(g => (
          <GameCard
            key={g.id}
            game={g}
            isSelected={g.id === selectedGameId}
            onClick={() => setSelectedGameId(g.id)}
            currentUser={currentUser}
            userInfo={userInfo}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <PaginationControls
          setCurrentPage={setCurrentPage}
          effectivePage={effectivePage}
          totalPages={totalPages}
          getPageNumbers={getPageNumbers}
          totalResults={sortedGames.length}
          itemsPerPage={itemsPerPage}
        />
      )}
    </>
  );
}
