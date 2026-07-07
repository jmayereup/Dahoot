import { useGameFilters } from '../hooks/useGameFilters';
import { LogoContainer } from './LogoContainer';
import { SchoolFooter } from './SchoolFooter';
import { TeacherPortalHeader } from './TeacherPortalHeader';
import { JoinGamePanel } from './JoinGamePanel';
import { JoinGameViaUrlPanel } from './JoinGameViaUrlPanel';
import { EnhancedGameFilters } from './EnhancedGameFilters';
import { GameCardGrid } from './GameCardGrid';
import { useEffect } from 'react';

export function LandingPageView({
  hasPinFromUrl,
  joinPin, setJoinPin,
  playerName, setPlayerName,
  loading, pocketbaseStatus, error,
  joinGame,
  setHasPinFromUrl, setView,
  gamesList = [],
  availableSubjects = [],
  availableCefrLevels = [],
  isAuthenticated, currentUser, userInfo = null,
  onLogout,
  selectedGameId, setSelectedGameId,
  onGameClick,
}) {
  const gameFilters = useGameFilters({
    gamesList,
    currentUser,
    userInfo,
    config: {
      enableSearch: true,
      enableLanguageFilter: true,
      enableCreatorFilter: true,
      enableTabFilter: false,
      itemsPerPage: 10,
      defaultSort: 'newest'
    }
  });

  useEffect(() => {
    if (gamesList.length === 0) return;
    if (gameFilters.sortedGames.length > 0) {
      if (selectedGameId) {
        const isStillAvailable = gameFilters.sortedGames.some(g => g.id === selectedGameId);
        if (!isStillAvailable) {
          setSelectedGameId(gameFilters.sortedGames[0].id);
        }
      }
    } else {
      setSelectedGameId('');
    }
  }, [gameFilters.sortedGames, selectedGameId, gamesList, setSelectedGameId]);

  return (
    <div className="app-container">
      <LogoContainer />

      {hasPinFromUrl ? (
        <JoinGameViaUrlPanel
          joinPin={joinPin}
          setJoinPin={setJoinPin}
          playerName={playerName}
          setPlayerName={setPlayerName}
          loading={loading}
          pocketbaseStatus={pocketbaseStatus}
          error={error}
          joinGame={joinGame}
          setHasPinFromUrl={setHasPinFromUrl}
        />
      ) : (
        <>
          <TeacherPortalHeader
            isAuthenticated={isAuthenticated}
            userInfo={userInfo}
            currentUser={currentUser}
            onLogout={onLogout}
            setView={setView}
          />

          <div className="selection-grid">
            <JoinGamePanel
              joinPin={joinPin}
              setJoinPin={setJoinPin}
              playerName={playerName}
              setPlayerName={setPlayerName}
              loading={loading}
              error={error}
              joinGame={joinGame}
              pocketbaseStatus={pocketbaseStatus}
            />

            <div className="panel" style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ margin: 0 }}>Host a Game</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                Pick a quiz to open its host lobby. You can configure game settings before starting.
              </p>

              {gamesList.length > 0 && (
                <EnhancedGameFilters
                  searchQuery={gameFilters.searchQuery}
                  setSearchQuery={gameFilters.setSearchQuery}
                  sortBy={gameFilters.sortBy}
                  setSortBy={gameFilters.setSortBy}
                  filterSubject={gameFilters.filterSubject}
                  toggleSubjectFilter={gameFilters.toggleSubjectFilter}
                  filterCefr={gameFilters.filterCefr}
                  toggleCefrFilter={gameFilters.toggleCefrFilter}
                  filterLanguage={gameFilters.filterLanguage}
                  toggleLanguageFilter={gameFilters.toggleLanguageFilter}
                  filterCreator={gameFilters.filterCreator}
                  toggleCreatorFilter={gameFilters.toggleCreatorFilter}
                  hasActiveFilters={gameFilters.hasActiveFilters}
                  clearFilters={gameFilters.clearFilters}
                  availableSubjects={availableSubjects}
                  availableCefrLevels={availableCefrLevels}
                  uniqueLanguages={gameFilters.uniqueLanguages}
                  uniqueCreators={gameFilters.uniqueCreators}
                  loading={loading}
                  enableSearch={true}
                  enableLanguageFilter={true}
                  enableCreatorFilter={true}
                  enableTabFilter={false}
                  sortedGamesCount={gameFilters.sortedGames.length}
                />
              )}

              <GameCardGrid
                gamesList={gamesList}
                sortedGames={gameFilters.sortedGames}
                paginatedGames={gameFilters.paginatedGames}
                setCurrentPage={gameFilters.setCurrentPage}
                effectivePage={gameFilters.effectivePage}
                totalPages={gameFilters.totalPages}
                getPageNumbers={gameFilters.getPageNumbers}
                itemsPerPage={gameFilters.itemsPerPage}
                currentUser={currentUser}
                userInfo={userInfo}
                onGameClick={onGameClick}
              />
            </div>
          </div>
        </>
      )}

      <SchoolFooter status={pocketbaseStatus} />
    </div>
  );
}
