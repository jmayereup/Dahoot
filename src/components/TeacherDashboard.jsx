import React, { useState, useEffect } from 'react';
import { pb } from '../pb';
import { useConfirm } from '../hooks/useConfirm.jsx';
import { PreviewModal } from './PreviewModal';
import { GamesLibrary } from './GamesLibrary';
import { GameForm } from './GameForm';
import { BulkImportBuilder } from './BulkImportBuilder';
import { AdminPanel } from './AdminPanel';
import { ProfileModal } from './ProfileModal';
import { GenerateModal } from './GenerateModal';
import { CopySuggestionModal } from './CopySuggestionModal';

export function TeacherDashboard({
  gamesList = [],
  selectedGame,
  setSelectedGame,
  isEditingGame,
  selectedGameForEdit,
  gameTitle, setGameTitle,
  gameDescription, setGameDescription,
  gameCreator, setGameCreator,
  gameLanguage, setGameLanguage,
  gameCefrLevel, setGameCefrLevel,
  gameSubject, setGameSubject,
  startCreatingGame,
  startEditingGame,
  cancelEditingGame,
  saveGame,
  deleteGame,
  copyGame,
  questionsList = [],
  loading,
  error,
  setError = () => {},
  isEditing,
  selectedQuestion,
  questionType, setQuestionType,
  questionText, setQuestionText,
  isImporting,
  importText, setImportText,
  startImporting,
  cancelImporting,
  saveImportedQuestions,
  parseAndValidateQuestions,
  mcCorrectAnswer, setMcCorrectAnswer,
  mcDistractors, updateMcDistractor,
  sortingItems, updateSortingItem,
  dragSentence, setDragSentence,
  dragAnswers, updateDragAnswer,
  dragDistractors, updateDragDistractor,
  dropdownSentence, setDropdownSentence,
  dropdownConfig, updateDropdownCorrect,
  updateDropdownDistractor,
  categorizeCategories, setCategorizeCategories,
  categorizeItemsText, setCategorizeItemsText,
  startCreating,
  startEditing,
  cancelEditing,
  saveQuestion,
  deleteQuestion,
  setView,
  availableSubjects = [],
  availableCefrLevels = [],
  availableLanguages = [],
  setAvailableSubjects,
  setAvailableCefrLevels,
  setAvailableLanguages,
  currentUser = null,
  userInfo = null,
  setUserInfo = null,
  onLogout = null,
  startHosting = null
}) {
  const { confirm, ConfirmDialog } = useConfirm();

  // Role state
  const [userRole, setUserRole] = useState('TEACHER');

  // Modal visibility
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [previewGame, setPreviewGame] = useState(null);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedGameId, setCopiedGameId] = useState('');
  const [copySuggestionGame, setCopySuggestionGame] = useState(null);

  // Preview inline question editing state (only for GameForm flow with 'temp' games)
  const [previewEditingQuestion, setPreviewEditingQuestion] = useState(null);
  const [previewEditError, setPreviewEditError] = useState('');
  const [previewEditLoading, setPreviewEditLoading] = useState(false);

  useEffect(() => {
    if (userInfo && userInfo.role) setUserRole(userInfo.role);
  }, [userInfo]);

  useEffect(() => {
    let active = true;
    if (currentUser && currentUser.dahoot_info) {
      pb.collection('dahoot_user_info').getOne(currentUser.dahoot_info)
        .then(record => { if (active && record && record.role) setUserRole(record.role); })
        .catch(err => console.error("Error fetching user role:", err));
    }
    return () => { active = false; };
  }, [currentUser]);

  const canEditGame = (game) => {
    if (!game) return false;
    if (userRole === 'TEACHER' || userRole === 'ADMIN') return true;
    const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
    const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
    const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
    const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
    const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
    return (myDahootUsername && creatorName === myDahootUsername) ||
           (myName && creatorName === myName) ||
           (myEmail && creatorName === myEmail) ||
           (myUsername && creatorName === myUsername) ||
           (currentUser?.id && creatorName === currentUser.id);
  };

  const canDeleteGame = (game) => {
    if (!game) return false;
    if (userRole === 'ADMIN') return true;
    const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
    const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
    const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
    const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
    const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
    return (myDahootUsername && creatorName === myDahootUsername) ||
           (myName && creatorName === myName) ||
           (myEmail && creatorName === myEmail) ||
           (myUsername && creatorName === myUsername) ||
           (currentUser?.id && creatorName === currentUser.id);
  };

  const handleDeleteGame = async (id, e) => {
    if (e) e.stopPropagation();
    const ok = await confirm({
      title: 'Delete this game?',
      message: 'This will also delete all of its questions. This action cannot be undone.',
      confirmText: 'Delete Game', cancelText: 'Keep Game', variant: 'danger', icon: '🗑️'
    });
    if (ok) deleteGame(id);
  };

  const handleCopyGame = (game, e) => {
    if (e) e.stopPropagation();
    setCopySuggestionGame(game);
  };

  const handleShareQuiz = (game, e) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}?quiz=${game.id}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => { setCopiedGameId(game.id); setTimeout(() => setCopiedGameId(''), 2000); })
      .catch(err => console.error("Failed to copy share link:", err));
  };

  const handleStartCreatingGame = () => {
    startCreatingGame();
    setPreviewGame({ id: 'temp', title: 'New Dahoot' });
    setPreviewQuestions([]);
  };

  const handleStartEditingGame = async (game, e) => {
    if (e) e.stopPropagation();
    await startEditingGame(game, e);
    setPreviewGame(game);
    setPreviewLoading(true);
    try {
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: game.id }), sort: 'created'
      });
      setPreviewQuestions(qList);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmitGame = async (e) => {
    e.preventDefault();
    const createdGame = await saveGame(e, previewQuestions);
    if (createdGame) {
      setPreviewGame(createdGame);
    } else {
      setPreviewGame(null);
      setPreviewQuestions([]);
    }
  };

  const startPreviewGame = async (game) => {
    setPreviewGame(game);
    setPreviewLoading(true);
    try {
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: game.id }), sort: 'created'
      });
      setPreviewQuestions(qList);
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreviewGame = () => {
    setPreviewGame(null);
    setPreviewQuestions([]);
  };

  const requireFieldsOrWarn = async (action) => {
    const missingFields = [];
    if (!gameLanguage || gameLanguage === 'Select Language...') missingFields.push('Language');
    if (!gameCefrLevel) missingFields.push('CEFR Level');
    if (!gameSubject) missingFields.push('Subject');
    if (missingFields.length > 0) {
      await confirm({
        title: 'Required Fields Missing',
        message: `Please fill in the ${missingFields.join(', ')} fields above before managing questions. These are needed for game metadata and AI generation context.`,
        confirmText: 'OK', cancelText: null, variant: 'warning', icon: '⚠️'
      });
      return;
    }
    action();
  };

  // ── Preview question editing (for GameForm flow with 'temp' games) ──

  const openPreviewAddQuestion = () => {
    setPreviewEditError('');
    startCreating();
    setPreviewEditingQuestion('new');
  };

  const openPreviewEditQuestion = (question) => {
    setPreviewEditError('');
    startEditing(question);
    setPreviewEditingQuestion(question);
  };

  const closePreviewEditQuestion = () => {
    setPreviewEditingQuestion(null);
    setPreviewEditError('');
    cancelEditing();
  };

  const savePreviewQuestion = async () => {
    setPreviewEditError('');
    if (!canEditGame(previewGame)) { setPreviewEditError('You do not have permission to edit this game.'); return; }
    if (!questionText.trim()) { setPreviewEditError('Question text is required.'); return; }

    let optionsPayload = null;
    if (questionType === 'MULTIPLE_CHOICE') {
      if (!mcCorrectAnswer.trim()) { setPreviewEditError('Correct answer is required.'); return; }
      if (mcDistractors.some(d => !d.trim())) { setPreviewEditError('All 3 distractors must be filled out.'); return; }
      optionsPayload = { correct_answer: mcCorrectAnswer.trim(), distractors: mcDistractors.map(d => d.trim()) };
    } else if (questionType === 'SORTING') {
      if (sortingItems.some(s => !s.trim())) { setPreviewEditError('All 4 sorting items must be filled out.'); return; }
      optionsPayload = { correct_sequence: sortingItems.map(s => s.trim()) };
    } else if (questionType === 'DRAG_DROP') {
      if (!dragSentence.trim()) { setPreviewEditError('Sentence with blanks is required.'); return; }
      const numBlanks = (dragSentence.match(/\[[^\]]+\]/g) || []).length;
      if (numBlanks === 0) { setPreviewEditError('The sentence must contain at least one blank placeholder.'); return; }
      const activeAnswers = dragAnswers.slice(0, numBlanks);
      if (activeAnswers.some(a => !a.trim())) { setPreviewEditError(`Please define all ${numBlanks} correct blank answers.`); return; }
      if (dragDistractors.some(d => !d.trim())) { setPreviewEditError('All distractor words must be filled out.'); return; }
      optionsPayload = { sentence: dragSentence.trim(), answers_in_order: activeAnswers.map(a => a.trim()), distractors: dragDistractors.map(d => d.trim()) };
    } else if (questionType === 'DROP_DOWN') {
      if (!dropdownSentence.trim()) { setPreviewEditError('Sentence with dropdowns is required.'); return; }
      const numDropdowns = (dropdownSentence.match(/\{\{\d+\}\}/g) || []).length;
      if (numDropdowns === 0) { setPreviewEditError('The sentence must contain at least one dropdown placeholder (e.g. {{0}}).'); return; }
      const activeDropdowns = dropdownConfig.slice(0, numDropdowns);
      for (let i = 0; i < activeDropdowns.length; i++) {
        if (!activeDropdowns[i].correct_answer.trim()) { setPreviewEditError(`Please define the correct answer for dropdown {{${i}}}.`); return; }
        if ((activeDropdowns[i].distractors || []).filter(d => d.trim()).length < 1) { setPreviewEditError(`Please add at least 1 distractor for dropdown {{${i}}}.`); return; }
      }
      optionsPayload = { sentence: dropdownSentence.trim(), dropdowns: activeDropdowns.map(d => ({ correct_answer: d.correct_answer.trim(), distractors: (d.distractors || []).filter(x => x.trim()) })) };
    } else if (questionType === 'CATEGORIZE') {
      if (!categorizeCategories.trim()) { setPreviewEditError('Categories list is required.'); return; }
      if (!categorizeItemsText.trim()) { setPreviewEditError('Items list is required.'); return; }
      const categoriesList = categorizeCategories.split(',').map(c => c.trim()).filter(Boolean);
      if (categoriesList.length < 2) { setPreviewEditError('Please enter at least 2 categories, separated by commas.'); return; }
      try {
        const itemsList = categorizeItemsText.split('\n').map(line => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const cat = parts[1].trim();
            if (!categoriesList.includes(cat)) throw new Error(`Category "${cat}" does not match defined categories.`);
            return { name: parts[0].trim(), category: cat };
          }
          if (line.trim()) throw new Error(`Invalid line: "${line}". Must be "ItemName: CategoryName".`);
          return null;
        }).filter(Boolean);
        if (itemsList.length === 0) { setPreviewEditError('Please enter at least one item.'); return; }
        optionsPayload = { categories: categoriesList, items: itemsList };
      } catch (err) { setPreviewEditError(err.message); return; }
    }

    setPreviewEditLoading(true);
    const questionData = { game_id: previewGame.id, text: questionText.trim(), options: optionsPayload, type: questionType };
    try {
      if (previewGame.id === 'temp') {
        if (previewEditingQuestion && previewEditingQuestion !== 'new') {
          setPreviewQuestions(prev => prev.map(q => q.id === previewEditingQuestion.id ? { ...q, ...questionData } : q));
        } else {
          setPreviewQuestions(prev => [...prev, { id: 'local_' + Date.now(), ...questionData }]);
        }
        closePreviewEditQuestion();
      } else {
        if (previewEditingQuestion && previewEditingQuestion !== 'new') {
          await pb.collection('dahoot_questions').update(previewEditingQuestion.id, questionData);
        } else {
          await pb.collection('dahoot_questions').create(questionData);
        }
        closePreviewEditQuestion();
        const qList = await pb.collection('dahoot_questions').getFullList({
          filter: pb.filter("game_id = {:gameId}", { gameId: previewGame.id }), sort: 'created'
        });
        setPreviewQuestions(qList);
      }
    } catch (err) {
      setPreviewEditError('Failed to save question: ' + err.message);
    } finally {
      setPreviewEditLoading(false);
    }
  };

  const deletePreviewQuestion = async (questionId) => {
    if (!canEditGame(previewGame)) return;
    const ok = await confirm({ title: 'Delete this question?', message: 'This action cannot be undone.', confirmText: 'Delete Question', cancelText: 'Keep Question', variant: 'danger', icon: '🗑️' });
    if (!ok) return;
    try {
      if (previewGame.id === 'temp') {
        setPreviewQuestions(prev => prev.filter(q => q.id !== questionId));
      } else {
        await pb.collection('dahoot_questions').delete(questionId);
        const qList = await pb.collection('dahoot_questions').getFullList({
          filter: pb.filter("game_id = {:gameId}", { gameId: previewGame.id }), sort: 'created'
        });
        setPreviewQuestions(qList);
      }
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  };

  const handleGenerateQuestions = async (params) => {
    const { prompt, counts, language, cefrLevel, subject } = params;
    const systemPrompt = `You are an expert curriculum designer and language/subject assessment expert.
Generate educational questions. You MUST respond with a single, valid JSON object matching the JSON schema below.

Target Student Profile:
- Language of questions/answers: ${language || 'English'}
- CEFR Language Level: ${cefrLevel || 'A2'}
- Subject: ${subject || 'General'}

Generate the following question counts:
- Multiple Choice (MULTIPLE_CHOICE): ${counts.MULTIPLE_CHOICE}
- Sorting (SORTING): ${counts.SORTING}
- Categorization (CATEGORIZE): ${counts.CATEGORIZE}
- Drag & Drop (DRAG_DROP): ${counts.DRAG_DROP}
- Drop Down (DROP_DOWN): ${counts.DROP_DOWN}

JSON Response Schema:
{
  "description": "An engaging 1-2 sentence description for this game",
  "questions": []
}`;

    const userPromptContent = prompt
      ? `Source text/Instructions:\n"""\n${prompt}\n"""\n\nGenerate the questions based on the source text/instructions above.`
      : `Generate high-quality educational questions for CEFR level ${cefrLevel}, Language ${language}, and Subject ${subject}.`;

    const data = await pb.send("/api/generate-questions", {
      method: "POST",
      body: { systemPrompt, userPromptContent }
    });

    const choice = data.choices?.[0]?.message?.content;
    if (!choice) throw new Error('No content returned from OpenRouter API.');

    let choiceText = choice.trim();
    if (choiceText.startsWith("```json")) choiceText = choiceText.substring(7);
    else if (choiceText.startsWith("```")) choiceText = choiceText.substring(3);
    if (choiceText.endsWith("```")) choiceText = choiceText.substring(0, choiceText.length - 3);
    choiceText = choiceText.trim();

    let parsedData;
    try {
      parsedData = JSON.parse(choiceText);
    } catch (parseErr) {
      const jsonMatch = choice.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
      else throw new Error('Failed to parse JSON from AI response.');
    }

    const questions = parsedData.questions || [];
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('No valid questions could be generated.');

    const aiDescription = parsedData.description || '';
    if (!gameDescription?.trim() && aiDescription) setGameDescription(aiDescription);

    if (isImporting) {
      setImportText(prev => prev ? prev + '\n\n' + JSON.stringify(questions, null, 2) : JSON.stringify(questions, null, 2));
    } else {
      const newQs = questions.map((q, idx) => ({
        id: 'local_' + (Date.now() + idx),
        text: q.text, options: q.options, type: q.type
      }));
      setPreviewQuestions(prev => [...prev, ...newQs]);
    }
  };

  const handleCancelImporting = () => {
    const gameToPreview = selectedGame;
    cancelImporting();
    setSelectedGame(null);
    if (gameToPreview && gameToPreview.id !== 'temp') startPreviewGame(gameToPreview);
  };

  const handleSaveImportedQuestions = async (e) => {
    e.preventDefault();
    const gameToPreview = selectedGame;
    if (gameToPreview && gameToPreview.id === 'temp') {
      let parsed;
      try { parsed = parseAndValidateQuestions(importText); } catch (err) { setError(err.message); return; }
      const newQs = parsed.map((q, idx) => ({ id: 'local_' + (Date.now() + idx), text: q.text, options: q.options, type: q.type }));
      setPreviewQuestions(prev => [...prev, ...newQs]);
      cancelImporting();
      setSelectedGame(null);
    } else {
      await saveImportedQuestions(e);
      setSelectedGame(null);
      if (gameToPreview) startPreviewGame(gameToPreview);
    }
  };

  const editingSubModal = previewEditingQuestion && (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9, 10, 15, 0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
      <div className="panel panel-large animate-join-focus p-4 sm:p-7" style={{ width: '100%', maxWidth: '750px', maxHeight: '94vh', overflowY: 'auto', textAlign: 'left', border: '1px solid var(--panel-border-focus)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '15px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question Editor</span>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>{previewEditingQuestion === 'new' ? 'Add New Question' : 'Edit Question'}</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{previewGame?.title}</p>
          </div>
          <button type="button" onClick={closePreviewEditQuestion} style={{ background: 'rgba(93,107,130,0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '1rem' }}>✕</button>
        </div>
        {previewEditError && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ff4b60', padding: '12px 16px', borderRadius: '8px', marginBottom: 20 }}>{previewEditError}</div>}
        <button type="button" className="btn btn-primary" onClick={savePreviewQuestion} style={{ width: 'auto' }} disabled={previewEditLoading}>
          {previewEditLoading ? 'Saving...' : (previewEditingQuestion === 'new' ? '✓ Add Question' : '✓ Save Changes')}
        </button>
      </div>
    </div>
  );

  // ── Disabled User Block ──
  if (userRole === 'DISABLED') {
    return (
      <div className="app-container">
        <div className="panel animate-join-focus" style={{ maxWidth: '440px', margin: '40px auto', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 16px', fontWeight: '700' }}>⚠️</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Account Disabled</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>Your account has been disabled by an administrator.</p>
          <button onClick={onLogout} className="btn btn-danger" style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)' }}>Log Out</button>
        </div>
        {ConfirmDialog}
      </div>
    );
  }

  // ── Bulk Import View ──
  if (isImporting) {
    return (
      <div className="app-container">
        <BulkImportBuilder
          game={selectedGame}
          importText={importText}
          setImportText={setImportText}
          error={error}
          loading={loading}
          onSave={handleSaveImportedQuestions}
          onCancel={handleCancelImporting}
        />
        {ConfirmDialog}
      </div>
    );
  }

  // ── Game Editing View ──
  if (!selectedGame && isEditingGame) {
    return (
      <div className="app-container">
        <GameForm
          gameTitle={gameTitle} setGameTitle={setGameTitle}
          gameDescription={gameDescription} setGameDescription={setGameDescription}
          gameCreator={gameCreator} setGameCreator={setGameCreator}
          gameLanguage={gameLanguage} setGameLanguage={setGameLanguage}
          gameCefrLevel={gameCefrLevel} setGameCefrLevel={setGameCefrLevel}
          gameSubject={gameSubject} setGameSubject={setGameSubject}
          error={error}
          loading={loading}
          selectedGameForEdit={selectedGameForEdit}
          userInfo={userInfo}
          currentUser={currentUser}
          availableSubjects={availableSubjects}
          availableCefrLevels={availableCefrLevels}
          availableLanguages={availableLanguages}
          showCefrTips={false}
          setShowCefrTips={() => {}}
          previewQuestions={previewQuestions}
          previewLoading={previewLoading}
          onSubmit={handleSubmitGame}
          onCancel={() => { cancelEditingGame(); setPreviewGame(null); setPreviewQuestions([]); }}
          onAddQuestion={() => requireFieldsOrWarn(openPreviewAddQuestion)}
          onEditQuestion={(q) => openPreviewEditQuestion(q)}
          onDeleteQuestion={(id) => deletePreviewQuestion(id)}
          onGenerate={() => requireFieldsOrWarn(() => setIsGenModalOpen(true))}
          onImport={() => requireFieldsOrWarn(() => { setSelectedGame(selectedGameForEdit || previewGame); startImporting(); })}
        />
        {editingSubModal}
        <GenerateModal
          isOpen={isGenModalOpen}
          onClose={() => setIsGenModalOpen(false)}
          language={gameLanguage}
          cefrLevel={gameCefrLevel}
          subject={gameSubject}
          onGenerate={handleGenerateQuestions}
        />
        {ConfirmDialog}
      </div>
    );
  }

  // ── Games Library View (Default) ──
  return (
    <>
      <GamesLibrary
        gamesList={gamesList}
        availableSubjects={availableSubjects}
        availableCefrLevels={availableCefrLevels}
        availableLanguages={availableLanguages}
        currentUser={currentUser}
        userInfo={userInfo}
        userRole={userRole}
        canEditGame={canEditGame}
        canDeleteGame={canDeleteGame}
        onLogout={onLogout}
        onProfileOpen={() => setIsProfileModalOpen(true)}
        onAdminOpen={() => setIsAdminPanelOpen(true)}
        onCreateGame={handleStartCreatingGame}
        onEditGame={handleStartEditingGame}
        onPreviewGame={startPreviewGame}
        onCopyGame={handleCopyGame}
        onDeleteGame={handleDeleteGame}
        onShareGame={handleShareQuiz}
        onHostGame={startHosting}
        copiedGameId={copiedGameId}
        onBack={() => setView('selection')}
      />

      <PreviewModal
        isOpen={!!previewGame}
        onClose={closePreviewGame}
        game={previewGame}
        gameId={previewGame?.id}
        canEdit={canEditGame(previewGame)}
        currentUser={currentUser}
        userInfo={userInfo}
        standalone
      />

      <CopySuggestionModal
        game={copySuggestionGame}
        onClose={() => setCopySuggestionGame(null)}
        onEditOriginal={async () => {
          const game = copySuggestionGame;
          setCopySuggestionGame(null);
          await handleStartEditingGame(game);
        }}
        onCopyAnyway={() => {
          const game = copySuggestionGame;
          setCopySuggestionGame(null);
          copyGame(game);
        }}
      />

      <AdminPanel
        isOpen={isAdminPanelOpen}
        onClose={() => setIsAdminPanelOpen(false)}
        availableSubjects={availableSubjects}
        setAvailableSubjects={setAvailableSubjects}
        availableCefrLevels={availableCefrLevels}
        setAvailableCefrLevels={setAvailableCefrLevels}
        availableLanguages={availableLanguages}
        setAvailableLanguages={setAvailableLanguages}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        userInfo={userInfo}
        setUserInfo={setUserInfo}
      />

      {ConfirmDialog}
    </>
  );
}
