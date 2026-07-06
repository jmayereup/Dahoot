import { useLandingPage } from '../hooks/useLandingPage';
import { LogoContainer } from './LogoContainer';
import { SchoolFooter } from './SchoolFooter';
import { PreviewModal } from './PreviewModal';
import { TeacherPortalHeader } from './TeacherPortalHeader';
import { JoinGamePanel } from './JoinGamePanel';
import { JoinGameViaUrlPanel } from './JoinGameViaUrlPanel';
import { GameFilters } from './GameFilters';
import { GameCardGrid } from './GameCardGrid';
import { GameSettings } from './GameSettings';
import { GameModeButtons } from './GameModeButtons';

export function LandingPageView({
  hasPinFromUrl,
  joinPin, setJoinPin,
  playerName, setPlayerName,
  loading, pocketbaseStatus, error,
  joinGame,
  startHosting, startSoloPractice, startMarathonHosting,
  setHasPinFromUrl, setView,
  gamesList = [],
  availableSubjects = [],
  availableCefrLevels = [],
  isAuthenticated, currentUser, userInfo = null,
  onLogout,
  selectedGameId, setSelectedGameId,
  shouldScrollToSettings = false,
  onSettingsScrolled = null,
}) {
  const landingPage = useLandingPage({
    selectedGameId,
    setSelectedGameId,
    shouldScrollToSettings,
    onSettingsScrolled,
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
                Open a new game lobby on this screen and project it for the class.
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
                selectedGameId={selectedGameId}
                setSelectedGameId={setSelectedGameId}
                setCurrentPage={landingPage.setCurrentPage}
                effectivePage={landingPage.effectivePage}
                totalPages={landingPage.totalPages}
                getPageNumbers={landingPage.getPageNumbers}
                itemsPerPage={landingPage.ITEMS_PER_PAGE}
                currentUser={currentUser}
                userInfo={userInfo}
              />

              <GameSettings
                settingsRef={landingPage.settingsRef}
                selectedGameId={selectedGameId}
                randomize={landingPage.randomize}
                setRandomize={landingPage.setRandomize}
                gameQuestions={landingPage.gameQuestions}
                totalQuestions={landingPage.totalQuestions}
                availableQuestionTypes={landingPage.availableQuestionTypes}
                selectedQuestionTypes={landingPage.selectedQuestionTypes}
                toggleQuestionType={landingPage.toggleQuestionType}
                getQuestionTypeLabel={landingPage.getQuestionTypeLabel}
                getQuestionTypeCount={landingPage.getQuestionTypeCount}
                maxQuestions={landingPage.maxQuestions}
                setMaxQuestions={landingPage.setMaxQuestions}
                timerDuration={landingPage.timerDuration}
                setTimerDuration={landingPage.setTimerDuration}
                copied={landingPage.copied}
                handleCopyShareLink={landingPage.handleCopyShareLink}
                handleOpenPreview={landingPage.handleOpenPreview}
              />

              <GameModeButtons
                loading={loading}
                pocketbaseStatus={pocketbaseStatus}
                selectedGameId={selectedGameId}
                totalQuestions={landingPage.totalQuestions}
                startHosting={startHosting}
                startMarathonHosting={startMarathonHosting}
                startSoloPractice={startSoloPractice}
                randomize={landingPage.randomize}
                maxQuestions={landingPage.maxQuestions}
                timerDuration={landingPage.timerDuration}
                selectedQuestionTypes={landingPage.selectedQuestionTypes}
              />
            </div>
          </div>
        </>
      )}

      <SchoolFooter status={pocketbaseStatus} />

      <PreviewModal
        isOpen={landingPage.isPreviewModalOpen}
        onClose={() => landingPage.setIsPreviewModalOpen(false)}
        game={gamesList.find(g => g.id === selectedGameId)}
        gameId={selectedGameId}
        canEdit={isAuthenticated && (userInfo?.role === 'TEACHER' || userInfo?.role === 'ADMIN')}
        currentUser={currentUser}
        userInfo={userInfo}
        standalone
      />
    </div>
  );
}
