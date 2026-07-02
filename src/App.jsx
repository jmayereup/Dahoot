import { useState, useEffect } from 'react';
import { pb } from './pb';
import { useHostGame } from './hooks/useHostGame';
import { usePlayerGame } from './hooks/usePlayerGame';
import { useTeacherDashboard } from './hooks/useTeacherDashboard';
import { SelectionView } from './components/SelectionView';
import { HostView } from './components/HostView';
import { PlayerView } from './components/PlayerView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { AuthView } from './components/AuthView';
import { usePracticeGame } from './hooks/usePracticeGame';
import { PracticeView } from './components/PracticeView';

function App() {
  const [view, setView] = useState('selection'); // 'selection' | 'host' | 'player' | 'teacher'
  const [selectedGameId, setSelectedGameId] = useState('');
  const [pocketbaseStatus, setPocketbaseStatus] = useState('checking');
  const [availableSubjects, setAvailableSubjects] = useState(['Math', 'Science', 'English', 'History', 'Geography', 'Foreign Languages', 'Other']);
  const [availableCefrLevels, setAvailableCefrLevels] = useState(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
  const [availableLanguages, setAvailableLanguages] = useState(['English', 'Thai', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Other']);
  
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid);
  const [currentUser, setCurrentUser] = useState(pb.authStore.record);

  // Sync auth state and listen to auth changes
  useEffect(() => {
    return pb.authStore.onChange((token, record) => {
      setIsAuthenticated(pb.authStore.isValid);
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
  const playerGame = usePlayerGame(view, setView);
  const teacherDashboard = useTeacherDashboard(view, currentUser);
  const practiceGame = usePracticeGame(view, setView);

  // 1. SELECTION VIEW
  if (view === 'selection') {
    // Combine loading and error states for selection rendering
    const loading = hostGame.loading || playerGame.loading;
    const error = playerGame.error || hostGame.error;

    return (
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
    );
  }

  // 2. HOST VIEW
  if (view === 'host' && hostGame.hostRoom) {
    return (
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
    );
  }

  // 3. PLAYER VIEW
  if (view === 'player' && playerGame.playerRoom && playerGame.playerRecord) {
    return (
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
    );
  }

  // 4. TEACHER/ADMIN VIEW
  if (view === 'teacher') {
    if (!isAuthenticated) {
      return (
        <AuthView 
          onSuccess={() => setView('teacher')}
          onCancel={() => setView('selection')}
        />
      );
    }

    return (
      <TeacherDashboard
        // Games List State
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
        
        // Multiple Choice & Sorting
        options={teacherDashboard.options}
        updateOptionValue={teacherDashboard.updateOptionValue}
        correctOptionIndex={teacherDashboard.correctOptionIndex}
        setCorrectOptionIndex={teacherDashboard.setCorrectOptionIndex}

        // Drag & Drop
        dragSentence={teacherDashboard.dragSentence}
        setDragSentence={teacherDashboard.setDragSentence}
        dragChoices={teacherDashboard.dragChoices}
        updateDragChoice={teacherDashboard.updateDragChoice}

        // Drop Down
        dropdownSentence={teacherDashboard.dropdownSentence}
        setDropdownSentence={teacherDashboard.setDropdownSentence}
        dropdownOptions={teacherDashboard.dropdownOptions}
        updateDropdownOption={teacherDashboard.updateDropdownOption}

        // Categorize
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
    );
  }

  // 5. PRACTICE VIEW (SOLO SELF-PACED MASTERY)
  if (view === 'practice') {
    return (
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
    );
  }

  // Fallback loading / unexpected state
  return (
    <div className="app-container">
      <div className="panel">
        <div className="spinner" />
        <h2>Synchronizing...</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Setting up connection to PocketBase backend.</p>
      </div>
    </div>
  );
}

export default App;
