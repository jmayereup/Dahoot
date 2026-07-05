import { useState, useEffect } from 'react';
import { pb } from './pb';
import { useHostGame } from './hooks/useHostGame';
import { usePlayerGame } from './hooks/usePlayerGame';
import { useTeacherDashboard } from './hooks/useTeacherDashboard';
import { usePracticeGame } from './hooks/usePracticeGame';
import { useMarathonGame } from './hooks/useMarathonGame';
import { useMarathonHost } from './hooks/useMarathonHost';
import { useMarathonPlayer } from './hooks/useMarathonPlayer';
import { useAdSense } from './hooks/useAdSense';
import { SelectionView } from './components/SelectionView';
import { HostView } from './components/HostView';
import { PlayerView } from './components/PlayerView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AuthView } from './components/AuthView';
import { PracticeView } from './components/PracticeView';
import { MarathonView } from './components/MarathonView';
import { MarathonHostView } from './components/MarathonHostView';
import { MarathonPlayerView } from './components/MarathonPlayerView';
import { CookieConsent } from './components/CookieConsent';

function App() {
  const [view, setView] = useState('selection');
  const [selectedGameId, setSelectedGameId] = useState('');
  const [pocketbaseStatus, setPocketbaseStatus] = useState('checking');
  const [availableSubjects, setAvailableSubjects] = useState(['Math', 'Science', 'English', 'History', 'Geography', 'Foreign Languages', 'Other']);
  const [availableCefrLevels, setAvailableCefrLevels] = useState(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  const [availableLanguages, setAvailableLanguages] = useState(['English', 'Thai', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Other']);
  
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid && !!pb.authStore.record);
  const [currentUser, setCurrentUser] = useState(pb.authStore.record);
  const [showSyncReset, setShowSyncReset] = useState(false);

  useAdSense();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSyncReset(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Sync auth state and listen to auth changes
  useEffect(() => {
    return pb.authStore.onChange((token, record) => {
      setIsAuthenticated(pb.authStore.isValid && !!record);
      setCurrentUser(record);
    });
  }, []);

  const handleLogout = () => {
    pb.authStore.clear();
    setSelectedGameId('');
    setView('selection');
  };

  // Check PocketBase connection and fetch options on mount
  useEffect(() => {
    pb.collection('dahoot_rooms').getList(1, 1)
      .then(() => {
        setPocketbaseStatus('connected');
        pb.collection('dahoot_options').getFullList()
          .then((records) => {
            const subjects = records.filter(r => r.type === 'subject').map(r => r.value);
            const cefr = records.filter(r => r.type === 'cefr_level').map(r => r.value);
            const langs = records.filter(r => r.type === 'language').map(r => r.value);
            if (subjects.length > 0) setAvailableSubjects(subjects);
            if (cefr.length > 0) setAvailableCefrLevels(cefr);
            if (langs.length > 0) setAvailableLanguages(langs);
          })
          .catch((err) => {
            console.error("Failed to load options from dahoot_options collection:", err);
          });
      })
      .catch((err) => {
        console.error("PocketBase connection check failed:", err);
        setPocketbaseStatus('disconnected');
      });
  }, []);

  // Initialize hooks
  const hostGame = useHostGame(view, setView);
  const playerGame = usePlayerGame(view, setView, (pin, name) => {
    marathonPlayer.joinMarathon(pin, name);
  });
  const teacherDashboard = useTeacherDashboard(view, currentUser);
  const practiceGame = usePracticeGame(view, setView);
  const marathonGame = useMarathonGame(view, setView);
  const marathonHost = useMarathonHost(view, setView);
  const marathonPlayer = useMarathonPlayer(view, setView);

  // 1. SELECTION VIEW
  if (view === 'selection') {
    const loading = hostGame.loading || playerGame.loading;
    const error = playerGame.error || hostGame.error;

    return (
      <>
        <SelectionView
          hasPinFromUrl={playerGame.hasPinFromUrl}
          joinPin={playerGame.joinPin}
          setJoinPin={playerGame.setJoinPin}
          playerName={playerGame.playerName}
          setPlayerName={playerGame.setPlayerName}
          loading={loading}
          pocketbaseStatus={pocketbaseStatus}
          error={error}
          joinGame={playerGame.joinGame}
          startHosting={hostGame.startHosting}
          startSoloPractice={practiceGame.startSoloPractice}
          startMarathon={marathonGame.startMarathon}
          startMarathonHosting={marathonHost.startMarathonHosting}
          setHasPinFromUrl={playerGame.setHasPinFromUrl}
          setView={setView}
          gamesList={hostGame.gamesList}
          refreshGames={hostGame.refreshGames}
          availableSubjects={availableSubjects}
          availableCefrLevels={availableCefrLevels}
          isAuthenticated={isAuthenticated}
          currentUser={currentUser}
          onLogout={handleLogout}
          selectedGameId={selectedGameId}
          setSelectedGameId={setSelectedGameId}
        />
        <CookieConsent />
      </>
    );
  }

  // 2. HOST VIEW
  if (view === 'host' && hostGame.hostRoom) {
    return (
      <>
        <HostView
          hostRoom={hostGame.hostRoom}
          hostPlayers={hostGame.hostPlayers}
          questions={hostGame.questions}
          hostTimeLeft={hostGame.hostTimeLeft}
          qrCodeUrl={hostGame.qrCodeUrl}
          copied={hostGame.copied}
          joinUrl={hostGame.joinUrl}
          handleCopyLink={hostGame.handleCopyLink}
          hostStartGame={hostGame.hostStartGame}
          hostShowLeaderboard={hostGame.hostShowLeaderboard}
          hostNextQuestion={hostGame.hostNextQuestion}
          hostEndGame={hostGame.hostEndGame}
          hostCancelTimer={hostGame.hostCancelTimer}
        />
        <CookieConsent />
      </>
    );
  }

  // 3. PLAYER VIEW
  if (view === 'player' && playerGame.playerRoom && playerGame.playerRecord) {
    return (
      <>
        <PlayerView
          playerRoom={playerGame.playerRoom}
          playerRecord={playerGame.playerRecord}
          playerQuestions={playerGame.playerQuestions}
          playerTimeLeft={playerGame.playerTimeLeft}
          playerSelectedIdx={playerGame.playerSelectedIdx}
          playerFeedback={playerGame.playerFeedback}
          error={playerGame.error}
          submitAnswer={playerGame.submitAnswer}
          disconnectSession={playerGame.disconnectSession}
          exitGame={playerGame.exitGame}
        />
        <CookieConsent />
      </>
    );
  }

  // 4. TEACHER/ADMIN VIEW
  if (view === 'teacher') {
    if (!isAuthenticated || !currentUser?.dahoot_info) {
      return (
        <>
          <AuthView 
            onSuccess={() => setView('teacher')}
            onCancel={() => setView('selection')}
            pocketbaseStatus={pocketbaseStatus}
          />
          <CookieConsent />
        </>
      );
    }

    return (
      <>
        <TeacherDashboard
          gamesList={teacherDashboard.gamesList}
          selectedGame={teacherDashboard.selectedGame}
          setSelectedGame={teacherDashboard.setSelectedGame}
          isEditingGame={teacherDashboard.isEditingGame}
          selectedGameForEdit={teacherDashboard.selectedGameForEdit}
          gameTitle={teacherDashboard.gameTitle}
          setGameTitle={teacherDashboard.setGameTitle}
          gameDescription={teacherDashboard.gameDescription}
          setGameDescription={teacherDashboard.setGameDescription}
          gameCreator={teacherDashboard.gameCreator}
          setGameCreator={teacherDashboard.setGameCreator}
          gameLanguage={teacherDashboard.gameLanguage}
          setGameLanguage={teacherDashboard.setGameLanguage}
          gameCefrLevel={teacherDashboard.gameCefrLevel}
          setGameCefrLevel={teacherDashboard.setGameCefrLevel}
          gameSubject={teacherDashboard.gameSubject}
          setGameSubject={teacherDashboard.setGameSubject}
          startCreatingGame={teacherDashboard.startCreatingGame}
          startEditingGame={teacherDashboard.startEditingGame}
          cancelEditingGame={teacherDashboard.cancelEditingGame}
          saveGame={teacherDashboard.saveGame}
          deleteGame={teacherDashboard.deleteGame}
          copyGame={teacherDashboard.copyGame}

          questionsList={teacherDashboard.questionsList}
          loading={teacherDashboard.loading}
          error={teacherDashboard.error}
          isEditing={teacherDashboard.isEditing}
          selectedQuestion={teacherDashboard.selectedQuestion}
          questionType={teacherDashboard.questionType}
          setQuestionType={teacherDashboard.setQuestionType}
          questionText={teacherDashboard.questionText}
          setQuestionText={teacherDashboard.setQuestionText}
          
          options={teacherDashboard.options}
          setOptions={teacherDashboard.setOptions}
          updateOptionValue={teacherDashboard.updateOptionValue}
          correctOptionIndex={teacherDashboard.correctOptionIndex}
          setCorrectOptionIndex={teacherDashboard.setCorrectOptionIndex}

          dragSentence={teacherDashboard.dragSentence}
          setDragSentence={teacherDashboard.setDragSentence}
          dragChoices={teacherDashboard.dragChoices}
          setDragChoices={teacherDashboard.setDragChoices}
          updateDragChoice={teacherDashboard.updateDragChoice}

          dropdownSentence={teacherDashboard.dropdownSentence}
          setDropdownSentence={teacherDashboard.setDropdownSentence}
          dropdownOptions={teacherDashboard.dropdownOptions}
          setDropdownOptions={teacherDashboard.setDropdownOptions}
          updateDropdownOption={teacherDashboard.updateDropdownOption}

          categorizeCategories={teacherDashboard.categorizeCategories}
          setCategorizeCategories={teacherDashboard.setCategorizeCategories}
          categorizeItemsText={teacherDashboard.categorizeItemsText}
          setCategorizeItemsText={teacherDashboard.setCategorizeItemsText}

          startCreating={teacherDashboard.startCreating}
          startEditing={teacherDashboard.startEditing}
          cancelEditing={teacherDashboard.cancelEditing}
          saveQuestion={teacherDashboard.saveQuestion}
          deleteQuestion={teacherDashboard.deleteQuestion}
          
          isImporting={teacherDashboard.isImporting}
          importText={teacherDashboard.importText}
          setImportText={teacherDashboard.setImportText}
          startImporting={teacherDashboard.startImporting}
          cancelImporting={teacherDashboard.cancelImporting}
          saveImportedQuestions={teacherDashboard.saveImportedQuestions}
          pendingQuestions={teacherDashboard.pendingQuestions}
          creationQuestionsTab={teacherDashboard.creationQuestionsTab}
          setCreationQuestionsTab={teacherDashboard.setCreationQuestionsTab}
          addPendingQuestion={teacherDashboard.addPendingQuestion}
          removePendingQuestion={teacherDashboard.removePendingQuestion}
          updatePendingQuestion={teacherDashboard.updatePendingQuestion}
          availableSubjects={availableSubjects}
          availableCefrLevels={availableCefrLevels}
          setAvailableSubjects={setAvailableSubjects}
          setAvailableCefrLevels={setAvailableCefrLevels}
          availableLanguages={availableLanguages}
          setAvailableLanguages={setAvailableLanguages}
          setView={setView}
          currentUser={currentUser}
          onLogout={handleLogout}
          startHosting={(gameId) => {
            setSelectedGameId(gameId);
            setView('selection');
          }}
        />
        <CookieConsent />
      </>
    );
  }

  // 5. PRACTICE VIEW (SOLO SELF-PACED MASTERY)
  if (view === 'practice') {
    return (
      <>
        <PracticeView
          practiceState={practiceGame.practiceState}
          selectedGame={practiceGame.selectedGame}
          nickname={practiceGame.nickname}
          setNickname={practiceGame.setNickname}
          questionsQueue={practiceGame.questionsQueue}
          currentQuestionIdx={practiceGame.currentQuestionIdx}
          failedQuestions={practiceGame.failedQuestions}
          masteredCount={practiceGame.masteredCount}
          totalCount={practiceGame.totalCount}
          roundNumber={practiceGame.roundNumber}
          score={practiceGame.score}
          playerSelectedIdx={practiceGame.playerSelectedIdx}
          playerFeedback={practiceGame.playerFeedback}
          error={practiceGame.error}
          loading={practiceGame.loading}
          firstTryCorrectCount={practiceGame.firstTryCorrectCount}
          startPractice={practiceGame.startPractice}
          submitAnswer={practiceGame.submitAnswer}
          nextQuestion={practiceGame.nextQuestion}
          startNextRound={practiceGame.startNextRound}
          exitPractice={practiceGame.exitPractice}
        />
        <CookieConsent />
      </>
    );
  }

  // 6. MARATHON HOST VIEW
  if (view === 'marathonHost' && marathonHost.hostRoom) {
    return (
      <>
        <MarathonHostView
          hostRoom={marathonHost.hostRoom}
          hostPlayers={marathonHost.hostPlayers}
          questions={marathonHost.questions}
          wrapUpTimeLeft={marathonHost.wrapUpTimeLeft}
          currentLap={marathonHost.currentLap}
          qrCodeUrl={marathonHost.qrCodeUrl}
          copied={marathonHost.copied}
          joinUrl={marathonHost.joinUrl}
          handleCopyLink={marathonHost.handleCopyLink}
          isStudentPaced={marathonHost.isStudentPaced}
          marathonStats={marathonHost.marathonStats}
          hostStartMarathon={marathonHost.hostStartMarathon}
          hostStartWrapUp={marathonHost.hostStartWrapUp}
          hostShowLeaderboard={marathonHost.hostShowLeaderboard}
          hostShowMarathonLeaderboard={marathonHost.hostShowMarathonLeaderboard}
          hostNextQuestion={marathonHost.hostNextQuestion}
          hostCancelTimer={marathonHost.hostCancelTimer}
          hostEndMarathon={marathonHost.hostEndMarathon}
          exitMarathon={marathonHost.exitMarathon}
        />
        <CookieConsent />
      </>
    );
  }

  // 7. MARATHON PLAYER VIEW
  if (view === 'marathonPlayer' && marathonPlayer.playerRoom && marathonPlayer.playerRecord) {
    return (
      <>
        <MarathonPlayerView
          playerRoom={marathonPlayer.playerRoom}
          playerRecord={marathonPlayer.playerRecord}
          currentQuestion={marathonPlayer.currentQuestion}
          playerQuestionIndex={marathonPlayer.playerQuestionIndex}
          totalQuestions={marathonPlayer.allQuestions.length}
          currentLap={marathonPlayer.currentLap}
          playerSelectedIdx={marathonPlayer.playerSelectedIdx}
          playerFeedback={marathonPlayer.playerFeedback}
          isStudentPaced={marathonPlayer.isStudentPaced}
          hasMoreQuestions={marathonPlayer.hasMoreQuestions}
          isFinished={marathonPlayer.isFinished}
          submitAnswer={marathonPlayer.submitAnswer}
          advanceToNextQuestion={marathonPlayer.advanceToNextQuestion}
          exitGame={marathonPlayer.exitMarathon}
        />
        <CookieConsent />
      </>
    );
  }

  // 6. MARATHON VIEW (ENDLESS PRACTICE)
  if (view === 'marathon') {
    return (
      <>
        <MarathonView
          marathonState={marathonGame.marathonState}
          selectedGame={marathonGame.selectedGame}
          nickname={marathonGame.nickname}
          setNickname={marathonGame.setNickname}
          currentQuestion={marathonGame.currentQuestion}
          totalAnswered={marathonGame.totalAnswered}
          correctCount={marathonGame.correctCount}
          currentStreak={marathonGame.currentStreak}
          bestStreak={marathonGame.bestStreak}
          elapsedTime={marathonGame.elapsedTime}
          formattedTime={marathonGame.formattedTime}
          accuracy={marathonGame.accuracy}
          playerSelectedIdx={marathonGame.playerSelectedIdx}
          playerFeedback={marathonGame.playerFeedback}
          error={marathonGame.error}
          questionHistory={marathonGame.questionHistory}
          startSession={marathonGame.startSession}
          submitAnswer={marathonGame.submitAnswer}
          nextQuestion={marathonGame.nextQuestion}
          pauseSession={marathonGame.pauseSession}
          resumeSession={marathonGame.resumeSession}
          finishSession={marathonGame.finishSession}
          exitMarathon={marathonGame.exitMarathon}
          restartMarathon={marathonGame.restartMarathon}
        />
        <CookieConsent />
      </>
    );
  }

  // Fallback loading / unexpected state
  return (
    <div className="app-container">
      <div className="panel">
        <div className="spinner" />
        <h2>Synchronizing...</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Setting up connection to PocketBase backend.</p>
        {showSyncReset && (
          <div className="flex flex-col gap-2 mt-4 w-full">
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary w-full cursor-pointer"
            >
              Retry Connection
            </button>
            <button 
              onClick={() => setView('selection')} 
              className="btn btn-secondary w-full cursor-pointer"
            >
              Go to Home Screen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
