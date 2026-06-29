import { useState, useEffect } from 'react';
import { pb } from './pb';
import { useHostGame } from './hooks/useHostGame';
import { usePlayerGame } from './hooks/usePlayerGame';
import { useTeacherDashboard } from './hooks/useTeacherDashboard';
import { SelectionView } from './components/SelectionView';
import { HostView } from './components/HostView';
import { PlayerView } from './components/PlayerView';
import { TeacherDashboard } from './components/TeacherDashboard';

function App() {
  const [view, setView] = useState('selection'); // 'selection' | 'host' | 'player' | 'teacher'
  const [pocketbaseStatus, setPocketbaseStatus] = useState('checking');

  // Check PocketBase connection on mount
  useEffect(() => {
    pb.collection('rooms').getList(1, 1)
      .then(() => setPocketbaseStatus('connected'))
      .catch((err) => {
        console.error("PocketBase connection check failed:", err);
        setPocketbaseStatus('disconnected');
      });
  }, []);

  // Initialize hooks
  const hostGame = useHostGame(view, setView);
  const playerGame = usePlayerGame(view, setView);
  const teacherDashboard = useTeacherDashboard(view);

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
        seedQuestions={hostGame.seedQuestions}
        setHasPinFromUrl={playerGame.setHasPinFromUrl}
        setView={setView}
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
      />
    );
  }

  // 4. TEACHER/ADMIN VIEW
  if (view === 'teacher') {
    return (
      <TeacherDashboard
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
        setView={setView}
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
