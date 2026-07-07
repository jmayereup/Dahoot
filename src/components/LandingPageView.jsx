import { useLandingPage } from '../hooks/useLandingPage';
import { LogoContainer } from './LogoContainer';
import { SchoolFooter } from './SchoolFooter';
import { TeacherPortalHeader } from './TeacherPortalHeader';
import { JoinGamePanel } from './JoinGamePanel';
import { JoinGameViaUrlPanel } from './JoinGameViaUrlPanel';
import { GameFilters } from './GameFilters';
import { GameCardGrid } from './GameCardGrid';

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
  const landingPage = useLandingPage({
    selectedGameId,
    setSelectedGameId,
    gamesList,
    currentUser,
    userInfo,
  });

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
                <GameFilters
                  searchQuery={landingPage.searchQuery}
                  setSearchQuery={landingPage.setSearchQuery}
                  sortBy={landingPage.sortBy}
                  setSortBy={landingPage.setSortBy}
                  filterSubject={landingPage.filterSubject}
                  toggleSubjectFilter={landingPage.toggleSubjectFilter}
                  filterCefr={landingPage.filterCefr}
                  toggleCefrFilter={landingPage.toggleCefrFilter}
                  hasActiveFilters={landingPage.hasActiveFilters}
                  clearFilters={landingPage.clearFilters}
                  availableSubjects={availableSubjects}
                  availableCefrLevels={availableCefrLevels}
                  loading={loading}
                />
              )}

              <GameCardGrid
                gamesList={gamesList}
                sortedGames={landingPage.sortedGames}
                paginatedGames={landingPage.paginatedGames}
                setCurrentPage={landingPage.setCurrentPage}
                effectivePage={landingPage.effectivePage}
                totalPages={landingPage.totalPages}
                getPageNumbers={landingPage.getPageNumbers}
                itemsPerPage={landingPage.ITEMS_PER_PAGE}
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
