import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SchoolFooter } from './SchoolFooter';
import { GameSettings } from './GameSettings';
import { GameModeButtons } from './GameModeButtons';
import { PreviewModal } from './PreviewModal';

export function HostGameView({
  selectedGameId,
  game = null,
  loading,
  pocketbaseStatus,
  onBack,
  startHosting,
  startMarathonHosting,
  startSoloPractice,
  currentUser,
  userInfo = null,
  setup,
  setActiveGame,
  randomize, setRandomize,
  gameQuestions,
  totalQuestions,
  availableQuestionTypes,
  selectedQuestionTypes,
  toggleQuestionType,
  getQuestionTypeLabel,
  getQuestionTypeCount,
  maxQuestions, setMaxQuestions,
  timerDuration, setTimerDuration,
  copied, handleCopyShareLink, handleOpenPreview,
  isPreviewModalOpen, closePreview,
  settingsRef,
}) {
  useEffect(() => {
    if (selectedGameId && selectedGameId !== setup?.activeGameId) {
      setActiveGame(selectedGameId);
    }
  }, [selectedGameId, setup?.activeGameId, setActiveGame]);

  if (!game) {
    return (
      <div className="app-container">
        <button
          onClick={onBack}
          className="self-start mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-rose-500 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to game library
        </button>
        <div className="panel">
          <h2>Game not found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            This quiz could not be loaded. It may have been removed or the link is incorrect.
          </p>
          <button onClick={onBack} className="btn btn-primary w-full cursor-pointer">
            Back to game library
          </button>
        </div>
        <SchoolFooter status={pocketbaseStatus} />
      </div>
    );
  }

  const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
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
    <div className="app-container">
      <button
        onClick={onBack}
        className="self-start mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-rose-500 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to game library
      </button>

      <div className="panel" style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
        <div className="flex flex-col gap-3 mb-4">
          <h2 className="m-0">{game.title}</h2>
          {game.description && (
            <p className="text-sm text-slate-600 m-0 whitespace-pre-wrap">{game.description}</p>
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
            {game.creator && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                👤 {displayCreator}
              </span>
            )}
          </div>
        </div>

        <GameSettings
          settingsRef={settingsRef}
          selectedGameId={selectedGameId}
          randomize={randomize}
          setRandomize={setRandomize}
          gameQuestions={gameQuestions}
          totalQuestions={totalQuestions}
          availableQuestionTypes={availableQuestionTypes}
          selectedQuestionTypes={selectedQuestionTypes}
          toggleQuestionType={toggleQuestionType}
          getQuestionTypeLabel={getQuestionTypeLabel}
          getQuestionTypeCount={getQuestionTypeCount}
          maxQuestions={maxQuestions}
          setMaxQuestions={setMaxQuestions}
          timerDuration={timerDuration}
          setTimerDuration={setTimerDuration}
          copied={copied}
          handleCopyShareLink={() => handleCopyShareLink(selectedGameId)}
          handleOpenPreview={handleOpenPreview}
        />

        <GameModeButtons
          loading={loading}
          pocketbaseStatus={pocketbaseStatus}
          selectedGameId={selectedGameId}
          totalQuestions={totalQuestions}
          startHosting={startHosting}
          startMarathonHosting={startMarathonHosting}
          startSoloPractice={startSoloPractice}
          randomize={randomize}
          maxQuestions={maxQuestions}
          timerDuration={timerDuration}
          selectedQuestionTypes={selectedQuestionTypes}
        />
      </div>

      <SchoolFooter status={pocketbaseStatus} />

      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={closePreview}
        game={game}
        gameId={selectedGameId}
        canEdit={!!currentUser && (userInfo?.role === 'TEACHER' || userInfo?.role === 'ADMIN')}
        currentUser={currentUser}
        userInfo={userInfo}
        standalone
      />
    </div>
  );
}
