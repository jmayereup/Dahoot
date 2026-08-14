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
import { QuestionFormFields } from './QuestionFormFields';
import {
  extractBracketedAnswers,
  categorizeGridToOptions
} from '../utils/questionSchema';

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
  dragDistractors, updateDragDistractor,
  dropdownSentence, setDropdownSentence,
  categorizeGrid, setCategorizeGrid,
  discussionPlaceholder, setDiscussionPlaceholder,
  discussionSampleAnswers, setDiscussionSampleAnswers,
  discussionMaxLength, setDiscussionMaxLength,
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
    const shareUrl = `${window.location.origin}${window.location.pathname}?quiz=${game.id}&openExternalBrowser=1`;
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
      const filledDistractors = mcDistractors.map(d => d.trim()).filter(Boolean).slice(0, 3);
      if (filledDistractors.length === 0) { setPreviewEditError('Please enter at least 1 distractor (incorrect option).'); return; }
      optionsPayload = { correct_answer: mcCorrectAnswer.trim(), distractors: filledDistractors };
    } else if (questionType === 'SORTING') {
      const filledItems = sortingItems.map(s => s.trim()).filter(Boolean);
      if (filledItems.length < 2) { setPreviewEditError('Sorting question requires at least 2 items.'); return; }
      optionsPayload = { correct_sequence: filledItems };
    } else if (questionType === 'DRAG_DROP') {
      if (!dragSentence.trim()) { setPreviewEditError('Sentence is required.'); return; }
      const answers = extractBracketedAnswers(dragSentence);
      if (answers.length === 0) { setPreviewEditError('The sentence must contain at least one bracketed answer (e.g. [hooks]).'); return; }
      const filledDistractors = dragDistractors.map(d => d.trim()).filter(Boolean);
      optionsPayload = {
        sentence: dragSentence.trim(),
        answers_in_order: answers,
        distractors: filledDistractors
      };
    } else if (questionType === 'DROP_DOWN') {
      if (!dropdownSentence.trim()) { setPreviewEditError('Sentence is required.'); return; }
      const dropdowns = extractBracketedAnswers(dropdownSentence);
      if (dropdowns.length === 0) { setPreviewEditError('The sentence must contain at least one bracketed answer (e.g. [Go]).'); return; }
      const filledDistractors = dragDistractors.map(d => d.trim()).filter(Boolean);
      optionsPayload = {
        sentence: dropdownSentence.trim(),
        dropdowns: dropdowns.map(correct => ({
          correct_answer: correct,
          distractors: filledDistractors
        }))
      };
    } else if (questionType === 'CATEGORIZE') {
      const { categories, items } = categorizeGridToOptions(categorizeGrid);
      if (categories.length < 2) { setPreviewEditError('Please enter at least 2 categories in the first row.'); return; }
      if (items.length === 0) { setPreviewEditError('Please add at least one item in any cell.'); return; }
      optionsPayload = { categories, items };
    } else if (questionType === 'DISCUSSION') {
      const sampleAnswersArr = typeof discussionSampleAnswers === 'string'
        ? discussionSampleAnswers.split('\n').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(discussionSampleAnswers) ? discussionSampleAnswers : []);
      optionsPayload = {
        placeholder: discussionPlaceholder ? discussionPlaceholder.trim() : '',
        sample_answers: sampleAnswersArr,
        max_length: parseInt(discussionMaxLength, 10) || 250
      };
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
Generate educational questions. You MUST respond with a single, valid JSON object matching the JSON schema and examples below.

Target Student Profile:
- Language of questions/answers: ${language || 'English'}
- CEFR Language Level: ${cefrLevel || 'A2'}
- Subject: ${subject || 'General'}

Generate the following question counts:
- Multiple Choice (MULTIPLE_CHOICE): ${counts.MULTIPLE_CHOICE || 0}
- Sorting (SORTING): ${counts.SORTING || 0}
- Categorization (CATEGORIZE): ${counts.CATEGORIZATION || counts.CATEGORIZE || 0}
- Drag & Drop (DRAG_DROP): ${counts.DRAG_DROP || 0}
- Drop Down (DROP_DOWN): ${counts.DROP_DOWN || 0}
- Discussion / Open-Ended (DISCUSSION): ${counts.DISCUSSION || 0}

JSON Response Schema:
{
  "description": "An engaging 1-2 sentence description for this game",
  "questions": [
    // ...one entry per question, using the exact "type" and "options" shape shown in the examples below
  ]
}

Question Type Examples (use these exact shapes):

1) MULTIPLE_CHOICE — single correct answer plus 2-3 distractors (maximum 3 distractors total)
{
  "text": "What is the past tense of 'go'?",
  "type": "MULTIPLE_CHOICE",
  "options": {
    "correct_answer": "went",
    "distractors": ["goed", "gone", "goes"]
  }
}

2) SORTING — items in the correct order (chronological, logical, alphabetical, size, etc.)
{
  "text": "Put these events in chronological order.",
  "type": "SORTING",
  "options": {
    "correct_sequence": ["Birth", "School", "University", "Career", "Retirement"]
  }
}

3) CATEGORIZE — items mapped to one of the given categories
{
  "text": "Sort each word into the correct part of speech.",
  "type": "CATEGORIZE",
  "options": {
    "categories": ["Noun", "Verb", "Adjective"],
    "items": [
      { "name": "happiness", "category": "Noun" },
      { "name": "run", "category": "Verb" },
      { "name": "beautiful", "category": "Adjective" },
      { "name": "teacher", "category": "Noun" }
    ]
  }
}

4) DRAG_DROP — fill missing words in a sentence; use [word] brackets in the sentence, list words in answers_in_order in left-to-right order, and add 1-3 unrelated distractors (maximum 3 distractors total)
{
  "text": "Fill in the missing words.",
  "type": "DRAG_DROP",
  "options": {
    "sentence": "She [drinks] coffee every [morning] before work.",
    "answers_in_order": ["drinks", "morning"],
    "distractors": ["drank", "evening", "tea"]
  }
}

5) DROP_DOWN — same idea, but each blank has its own small choice set (maximum 3 distractors total per dropdown)
{
  "text": "Select the correct word for each blank.",
  "type": "DROP_DOWN",
  "options": {
    "sentence": "If I [were] rich, I would [travel] the world.",
    "dropdowns": [
      { "correct_answer": "were", "distractors": ["was", "am", "be"] },
      { "correct_answer": "travel", "distractors": ["travels", "travelled", "traveling"] }
    ]
  }
}

6) DISCUSSION — open-ended opinion, reflection, or debate prompt (no correct answer, 0 points)
{
  "text": "Why do you think learning a second language is beneficial in today's world?",
  "type": "DISCUSSION",
  "options": {
    "placeholder": "Share your thoughts or personal experience...",
    "sample_answers": ["Global career opportunities", "Cultural appreciation", "Cognitive benefits"],
    "max_length": 250
  }
}

Important rules:
- The "type" field must be exactly one of: MULTIPLE_CHOICE, SORTING, CATEGORIZE, DRAG_DROP, DROP_DOWN, DISCUSSION.
- For MULTIPLE_CHOICE, DRAG_DROP, and DROP_DOWN questions, you MUST limit the number of distractors to a maximum of 3 distractors total per question or dropdown blank.
- For DRAG_DROP, every answer in answers_in_order must appear as a [word] bracket in the sentence, in the same order.
- For DROP_DOWN, the number of dropdowns must match the number of blanks in the sentence.
- Output ONLY a single valid JSON object. No prose, no markdown fences.`;

    const userPromptContent = prompt
      ? `Source text/Instructions:\n"""\n${prompt}\n"""\n\nGenerate the questions based on the source text/instructions above.`
      : `Generate high-quality educational questions for CEFR level ${cefrLevel}, Language ${language}, and Subject ${subject}.`;

    const authRecord = pb.authStore.record;
    const data = await pb.send("/api/dahoot/generate-questions", {
      method: "POST",
      body: {
        systemPrompt,
        userPromptContent,
        userId: authRecord?.id,
        userEmail: authRecord?.email,
        model: params.model || import.meta.env.VITE_DAHOOT_QUESTION_MODEL
      }
    });

    const choice = data?.choices?.[0]?.message?.content || (typeof data === 'string' ? data : data?.content || '');
    if (!choice) throw new Error('No content returned from AI generation service.');

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

    // Drop extra distractors for future requests (if the AI doesn't follow the directions)
    for (const q of questions) {
      if (q.type === 'MULTIPLE_CHOICE' && q.options && Array.isArray(q.options.distractors)) {
        q.options.distractors = q.options.distractors.slice(0, 3);
      } else if (q.type === 'DRAG_DROP' && q.options && Array.isArray(q.options.distractors)) {
        q.options.distractors = q.options.distractors.slice(0, 3);
      } else if (q.type === 'DROP_DOWN' && q.options && Array.isArray(q.options.dropdowns)) {
        q.options.dropdowns = q.options.dropdowns.map(d => {
          if (d && Array.isArray(d.distractors)) {
            return { ...d, distractors: d.distractors.slice(0, 3) };
          }
          return d;
        });
      }
    }

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
      try {
        parsed = parseAndValidateQuestions(importText);
        try {
          let clean = importText.trim();
          if (clean.startsWith('```json')) clean = clean.substring(7);
          else if (clean.startsWith('```')) clean = clean.substring(3);
          if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
          const rawObj = JSON.parse(clean.trim());
          if (rawObj?.description && !gameDescription?.trim()) {
            setGameDescription(rawObj.description.trim());
          }
        } catch (_) {}
      } catch (err) {
        setError(err.message);
        return;
      }
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

        <QuestionFormFields
          questionType={questionType} setQuestionType={setQuestionType}
          questionText={questionText} setQuestionText={setQuestionText}
          mcCorrectAnswer={mcCorrectAnswer} setMcCorrectAnswer={setMcCorrectAnswer}
          mcDistractors={mcDistractors} updateMcDistractor={updateMcDistractor}
          sortingItems={sortingItems} updateSortingItem={updateSortingItem}
          dragSentence={dragSentence} setDragSentence={setDragSentence}
          dragDistractors={dragDistractors} updateDragDistractor={updateDragDistractor}
          dropdownSentence={dropdownSentence} setDropdownSentence={setDropdownSentence}
          categorizeGrid={categorizeGrid} setCategorizeGrid={setCategorizeGrid}
          discussionPlaceholder={discussionPlaceholder} setDiscussionPlaceholder={setDiscussionPlaceholder}
          discussionSampleAnswers={discussionSampleAnswers} setDiscussionSampleAnswers={setDiscussionSampleAnswers}
          discussionMaxLength={discussionMaxLength} setDiscussionMaxLength={setDiscussionMaxLength}
          disabled={previewEditLoading}
        />

        <div style={{ display: 'flex', gap: 12, marginTop: '24px', justifyContent: 'flex-end', borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
          <button type="button" className="btn btn-secondary" onClick={closePreviewEditQuestion} style={{ width: 'auto', minWidth: 100 }} disabled={previewEditLoading}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={savePreviewQuestion} style={{ width: 'auto', minWidth: 150 }} disabled={previewEditLoading}>
            {previewEditLoading ? 'Saving...' : (previewEditingQuestion === 'new' ? '✓ Add Question' : '✓ Save Changes')}
          </button>
        </div>
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
          selectedGame={selectedGame}
          importText={importText}
          setImportText={setImportText}
          error={error}
          loading={loading}
          onSubmit={handleSaveImportedQuestions}
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
