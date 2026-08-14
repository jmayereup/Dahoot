import { useState, useEffect } from 'react';
import { pb } from '../pb';
import {
  normalizeQuestion,
  extractBracketedAnswers,
  legacyDragSentenceToBracketed,
  legacyDropDownSentenceToBracketed,
  unionDropDownDistractors,
  categorizeOptionsToGrid,
  categorizeGridToOptions,
  QUESTION_TYPE_PROMPTS
} from '../utils/questionSchema';
import { useUserInfo } from './useUserInfo';

export function useTeacherDashboard(view, currentUser) {
  const [gamesList, setGamesList] = useState([]);
  const { userInfo, setUserInfo } = useUserInfo(currentUser);
  const [selectedGame, setSelectedGame] = useState(null); // The game whose questions we are currently viewing/editing

  const [questionsList, setQuestionsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Game Form states
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [selectedGameForEdit, setSelectedGameForEdit] = useState(null); // null if creating, game object if editing
  const [gameTitle, setGameTitle] = useState('');
  const [gameDescription, setGameDescription] = useState('');
  const [gameCreator, setGameCreator] = useState('');
  const [gameLanguage, setGameLanguage] = useState('English');
  const [gameCefrLevel, setGameCefrLevel] = useState('');
  const [gameSubject, setGameSubject] = useState('');



  // Question Form states
  const [isEditing, setIsEditing] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null); // null if creating, question object if editing
  const [questionType, setQuestionType] = useState('MULTIPLE_CHOICE');
  const [questionText, setQuestionText] = useState('');

  // Bulk Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');

  // Type-specific helper states
  // MULTIPLE_CHOICE
  const [mcCorrectAnswer, setMcCorrectAnswer] = useState('');
  const [mcDistractors, setMcDistractors] = useState(['', '', '']);

  // SORTING
  const [sortingItems, setSortingItems] = useState(['', '', '', '']);

  // DRAG_DROP
  const [dragSentence, setDragSentence] = useState('');
  const [dragDistractors, setDragDistractors] = useState(['']);

  // DROP_DOWN (shared distractor list reused from dragDistractors at save time)
  const [dropdownSentence, setDropdownSentence] = useState('');

  // CATEGORIZE (row 0 = categories, row 1+ = items per cell, newline-separated)
  const [categorizeGrid, setCategorizeGrid] = useState([['', ''], ['', '']]);

  // DISCUSSION (open-ended / no points)
  const [discussionPlaceholder, setDiscussionPlaceholder] = useState('');
  const [discussionSampleAnswers, setDiscussionSampleAnswers] = useState('');
  const [discussionMaxLength, setDiscussionMaxLength] = useState(250);

  // Fetch games from PocketBase (including question count per game)
  const fetchGames = async () => {
    setLoading(true);
    setError('');
    try {
      const games = await pb.collection('dahoot_games').getFullList({
        sort: '-created'
      });

      // Fetch question counts for each game
      const gamesWithCounts = await Promise.all(games.map(async (game) => {
        try {
          const questions = await pb.collection('dahoot_questions').getList(1, 1, {
            filter: pb.filter("game_id = {:gameId}", { gameId: game.id })
          });
          return {
            ...game,
            questionCount: questions.totalItems
          };
        } catch (e) {
          return {
            ...game,
            questionCount: 0
          };
        }
      }));

      setGamesList(gamesWithCounts);
    } catch (err) {
      console.error("Error fetching games:", err);
      setError("Failed to load games: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch questions for selected game
  const fetchQuestions = async (gameId) => {
    if (!gameId) return;
    setLoading(true);
    setError('');
    try {
      const list = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId }),
        sort: 'created'
      });
      setQuestionsList(list);
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError("Failed to load questions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'teacher') {
      if (selectedGame) {
        fetchQuestions(selectedGame.id);
      } else {
        fetchGames();
      }
    }
  }, [view, selectedGame]);

  // Game Actions
  const startCreatingGame = () => {
    setSelectedGameForEdit(null);
    setGameTitle('');
    setGameDescription('');
    setGameCreator(userInfo?.dahoot_username || currentUser?.name || currentUser?.email || '');
    setGameLanguage('English');
    setGameCefrLevel('');
    setGameSubject('');
    setIsEditingGame(true);
    setError('');

    setImportText('');

    // Reset individual question fields
    setQuestionText(QUESTION_TYPE_PROMPTS.MULTIPLE_CHOICE);
    setQuestionType('MULTIPLE_CHOICE');
    setMcCorrectAnswer('');
    setMcDistractors(['', '', '']);
    setSortingItems(['', '', '', '']);
    setDragSentence('');
    setDragDistractors(['']);
    setDropdownSentence('');
    setCategorizeGrid([['', ''], ['', '']]);
  };

  const startEditingGame = async (game, e) => {
    if (e) e.stopPropagation();
    setSelectedGameForEdit(game);
    setGameTitle(game.title);
    setGameDescription(game.description || '');
    setGameCreator(game.creator || '');
    setGameLanguage(game.language || 'English');
    setGameCefrLevel(game.cefr_level || '');
    setGameSubject(game.subject || '');
    setError('');
    setIsEditingGame(true);
  };

  const cancelEditingGame = () => {
    setIsEditingGame(false);
    setSelectedGameForEdit(null);
    setError('');
    setImportText('');
  };

  const saveGame = async (e, questionsToSave = []) => {
    e.preventDefault();
    setError('');

    if (!gameTitle.trim()) {
      setError('Game title is required.');
      return;
    }
    if (!gameDescription.trim()) {
      setError('Description is required.');
      return;
    }
    if (!gameCreator.trim()) {
      setError('Creator / Author is required.');
      return;
    }
    if (!gameLanguage.trim()) {
      setError('Language is required.');
      return;
    }
    if (!gameCefrLevel) {
      setError('CEFR Language Level is required.');
      return;
    }
    if (!gameSubject) {
      setError('Subject is required.');
      return;
    }

    setLoading(true);
    try {
      const gameData = {
        title: gameTitle.trim(),
        description: gameDescription.trim(),
        creator: gameCreator.trim(),
        language: gameLanguage.trim(),
        cefr_level: gameCefrLevel || null,
        subject: gameSubject || null
      };

      if (selectedGameForEdit) {
        await pb.collection('dahoot_games').update(selectedGameForEdit.id, gameData);
      } else {
        const createdGame = await pb.collection('dahoot_games').create(gameData);
        // Save associated questions if we have any
        for (const q of questionsToSave) {
          await pb.collection('dahoot_questions').create({
            game_id: createdGame.id,
            text: q.text,
            options: q.options,
            type: q.type
          });
        }
        setIsEditingGame(false);
        setSelectedGameForEdit(null);
        setImportText('');
        await fetchGames();
        return createdGame;
      }
      setIsEditingGame(false);
      setSelectedGameForEdit(null);
      setImportText('');
      await fetchGames();
    } catch (err) {
      console.error("Error saving game:", err);
      setError("Failed to save game: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteGame = async (id, e) => {
    if (e) e.stopPropagation();
    setLoading(true);
    setError('');
    try {
      await pb.collection('dahoot_games').delete(id);
      await fetchGames();
    } catch (err) {
      console.error("Error deleting game:", err);
      setError("Failed to delete game: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyGame = async (game, e) => {
    if (e) e.stopPropagation();
    setLoading(true);
    setError('');
    try {
      const copiedGame = await pb.collection('dahoot_games').create({
        title: `${game.title} (Copy)`,
        description: game.description || '',
        creator: game.creator || '',
        language: game.language || '',
        cefr_level: game.cefr_level || null,
        subject: game.subject || null
      });

      // Get all questions
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: game.id }),
        sort: 'created'
      });

      await Promise.all(qList.map(q =>
        pb.collection('dahoot_questions').create({
          game_id: copiedGame.id,
          text: q.text,
          options: q.options,
          type: q.type
        })
      ));

      await fetchGames();
    } catch (err) {
      console.error("Error copying game:", err);
      setError("Failed to copy game: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Question Actions
  const startCreating = () => {
    setSelectedQuestion(null);
    setQuestionType('MULTIPLE_CHOICE');
    setQuestionText(QUESTION_TYPE_PROMPTS.MULTIPLE_CHOICE);
    setMcCorrectAnswer('');
    setMcDistractors(['', '', '']);
    setSortingItems(['', '', '', '']);
    setDragSentence('');
    setDragDistractors(['']);
    setDropdownSentence('');
    setCategorizeGrid([['', ''], ['', '']]);
    setDiscussionPlaceholder('');
    setDiscussionSampleAnswers('');
    setDiscussionMaxLength(250);
    setIsEditing(true);
    setError('');
  };

  const startEditing = (question) => {
    setSelectedQuestion(question);
    const type = question.type || 'MULTIPLE_CHOICE';
    setQuestionType(type);
    setQuestionText(question.text);
    setError('');
    const n = normalizeQuestion(question);

    if (type === 'MULTIPLE_CHOICE') {
      setMcCorrectAnswer(n.options?.correct_answer || '');
      const dists = [...(n.options?.distractors || [])];
      while (dists.length < 3) dists.push('');
      setMcDistractors(dists);
    } else if (type === 'SORTING') {
      const seq = [...(n.options?.correct_sequence || [])];
      while (seq.length < 2) seq.push('');
      setSortingItems(seq);
    } else if (type === 'DRAG_DROP') {
      const rawSentence = n.options?.sentence || '';
      const answers = n.options?.answers_in_order || [];
      setDragSentence(legacyDragSentenceToBracketed(rawSentence, answers));
      const dists = (n.options?.distractors || []).filter(d => (d || '').trim());
      setDragDistractors(dists.length ? dists : ['']);
    } else if (type === 'DROP_DOWN') {
      const rawSentence = n.options?.sentence || '';
      const dds = Array.isArray(n.options?.dropdowns) ? n.options.dropdowns : [];
      setDropdownSentence(legacyDropDownSentenceToBracketed(rawSentence, dds));
      const union = unionDropDownDistractors(dds);
      setDragDistractors(union.length ? union : ['']);
    } else if (type === 'CATEGORIZE') {
      setCategorizeGrid(categorizeOptionsToGrid(n.options));
    } else if (type === 'DISCUSSION') {
      setDiscussionPlaceholder(n.options?.placeholder || '');
      const samples = Array.isArray(n.options?.sample_answers) ? n.options.sample_answers.join('\n') : (n.options?.sample_answers || '');
      setDiscussionSampleAnswers(samples);
      setDiscussionMaxLength(n.options?.max_length || 250);
    }

    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSelectedQuestion(null);
    setError('');
  };

  const updateMcDistractor = (index, value) => {
    if (Array.isArray(index)) {
      setMcDistractors(index);
    } else {
      const updated = [...mcDistractors];
      updated[index] = value;
      setMcDistractors(updated);
    }
  };

  const updateSortingItem = (index, value) => {
    if (Array.isArray(index)) {
      setSortingItems(index);
    } else {
      const updated = [...sortingItems];
      updated[index] = value;
      setSortingItems(updated);
    }
  };

  const updateDragDistractor = (index, value) => {
    if (Array.isArray(index)) {
      setDragDistractors(index);
    } else {
      const updated = [...dragDistractors];
      updated[index] = value;
      setDragDistractors(updated);
    }
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    setError('');

    if (!questionText.trim()) {
      setError('Question prompt is required.');
      return;
    }

    let optionsPayload = {};

    if (questionType === 'MULTIPLE_CHOICE') {
      if (!mcCorrectAnswer.trim()) {
        setError('Correct answer is required.');
        return;
      }
      const filledDistractors = mcDistractors.map(d => d.trim()).filter(Boolean).slice(0, 3);
      if (filledDistractors.length === 0) {
        setError('Please enter at least 1 distractor (incorrect option).');
        return;
      }
      optionsPayload = {
        correct_answer: mcCorrectAnswer.trim(),
        distractors: filledDistractors
      };
    }

    else if (questionType === 'SORTING') {
      const filledItems = sortingItems.map(item => item.trim()).filter(Boolean);
      if (filledItems.length < 2) {
        setError('Sorting question requires at least 2 items.');
        return;
      }
      optionsPayload = {
        correct_sequence: filledItems
      };
    }

    else if (questionType === 'DRAG_DROP') {
      if (!dragSentence.trim()) {
        setError('Sentence is required.');
        return;
      }
      const answers = extractBracketedAnswers(dragSentence);
      if (answers.length === 0) {
        setError('The sentence must contain at least one bracketed answer (e.g. [dog]).');
        return;
      }
      const filledDistractors = dragDistractors.map(d => d.trim()).filter(Boolean).slice(0, 3);
      optionsPayload = {
        sentence: dragSentence.trim(),
        answers_in_order: answers,
        distractors: filledDistractors
      };
    }

    else if (questionType === 'DROP_DOWN') {
      if (!dropdownSentence.trim()) {
        setError('Sentence is required.');
        return;
      }
      const dropdowns = extractBracketedAnswers(dropdownSentence);
      if (dropdowns.length === 0) {
        setError('The sentence must contain at least one bracketed answer (e.g. [Go]).');
        return;
      }
      const filledDistractors = dragDistractors.map(d => d.trim()).filter(Boolean).slice(0, 3);
      optionsPayload = {
        sentence: dropdownSentence.trim(),
        dropdowns: dropdowns.map(correct => ({
          correct_answer: correct,
          distractors: filledDistractors
        }))
      };
    }

    else if (questionType === 'CATEGORIZE') {
      const { categories, items } = categorizeGridToOptions(categorizeGrid);
      if (categories.length < 2) {
        setError('Please enter at least 2 categories in the first row.');
        return;
      }
      if (items.length === 0) {
        setError('Please add at least one item in any cell.');
        return;
      }
      optionsPayload = { categories, items };
    }

    else if (questionType === 'DISCUSSION') {
      const sampleAnswersArr = typeof discussionSampleAnswers === 'string'
        ? discussionSampleAnswers.split('\n').map(s => s.trim()).filter(Boolean)
        : (Array.isArray(discussionSampleAnswers) ? discussionSampleAnswers : []);
      optionsPayload = {
        placeholder: discussionPlaceholder.trim(),
        sample_answers: sampleAnswersArr,
        max_length: parseInt(discussionMaxLength, 10) || 250
      };
    }

    setLoading(true);
    const questionData = {
      game_id: selectedGame.id,
      text: questionText.trim(),
      options: optionsPayload,
      type: questionType
    };

    try {
      if (selectedQuestion) {
        await pb.collection('dahoot_questions').update(selectedQuestion.id, questionData);
      } else {
        await pb.collection('dahoot_questions').create(questionData);
      }
      setIsEditing(false);
      setSelectedQuestion(null);
      await fetchQuestions(selectedGame.id);
    } catch (err) {
      console.error("Error saving question:", err);
      setError("Failed to save question: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = async (id) => {
    setLoading(true);
    setError('');
    try {
      await pb.collection('dahoot_questions').delete(id);
      await fetchQuestions(selectedGame.id);
    } catch (err) {
      console.error("Error deleting question:", err);
      setError("Failed to delete question: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  // Bulk Import Actions
  const startImporting = () => {
    setIsImporting(true);
    setImportText('');
    setError('');
  };

  const cancelImporting = () => {
    setIsImporting(false);
    setImportText('');
    setError('');
  };

  const parseAndValidateQuestions = (text) => {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error('Invalid JSON: ' + err.message);
    }
    if (!Array.isArray(parsed)) {
      throw new Error('JSON must be an array of question objects.');
    }
    for (let i = 0; i < parsed.length; i++) {
      const q = parsed[i];
      if (!q.type || !q.text) {
        throw new Error(`Question ${i + 1} is missing required fields (type, text).`);
      }
      const validTypes = ['MULTIPLE_CHOICE', 'SORTING', 'DRAG_DROP', 'DROP_DOWN', 'CATEGORIZE', 'DISCUSSION'];
      if (!validTypes.includes(q.type)) {
        throw new Error(`Question ${i + 1} has invalid type "${q.type}". Must be one of: ${validTypes.join(', ')}`);
      }

      // Drop extra distractors for future requests (if it doesn't follow the directions)
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
    return parsed;
  };

  const saveImportedQuestions = async (e) => {
    e.preventDefault();
    setError('');

    if (!importText.trim()) {
      setError('Please provide questions in the text area.');
      return;
    }

    try {
      const questionsToSave = parseAndValidateQuestions(importText);
      setLoading(true);

      for (const q of questionsToSave) {
        const questionData = {
          game_id: selectedGame.id,
          text: q.text,
          type: q.type,
          options: q.options || {}
        };
        await pb.collection('dahoot_questions').create(questionData);
      }

      setIsImporting(false);
      setImportText('');
      await fetchQuestions(selectedGame.id);
    } catch (err) {
      console.error("Error bulk saving questions:", err);
      setError(err.message || 'Failed to save imported questions.');
    } finally {
      setLoading(false);
    }
  };

  return {
    userInfo,
    setUserInfo,
    gamesList,
    selectedGame,
    setSelectedGame,
    isEditingGame,
    selectedGameForEdit,
    gameTitle,
    setGameTitle,
    gameDescription,
    setGameDescription,
    gameCreator,
    setGameCreator,
    gameLanguage,
    setGameLanguage,
    gameCefrLevel,
    setGameCefrLevel,
    gameSubject,
    setGameSubject,
    startCreatingGame,
    startEditingGame,
    cancelEditingGame,
    saveGame,
    deleteGame,
    copyGame,

    questionsList,
    loading,
    error,
    setError,
    isEditing,
    selectedQuestion,
    questionType,
    setQuestionType,
    questionText,
    setQuestionText,

    isImporting,
    importText,
    setImportText,
    startImporting,
    cancelImporting,
    saveImportedQuestions,

    // Multiple Choice
    mcCorrectAnswer,
    setMcCorrectAnswer,
    mcDistractors,
    setMcDistractors,
    updateMcDistractor,

    // Sorting
    sortingItems,
    setSortingItems,
    updateSortingItem,

    // Drag & Drop
    dragSentence,
    setDragSentence,
    dragDistractors,
    setDragDistractors,
    updateDragDistractor,

    // Drop Down
    dropdownSentence,
    setDropdownSentence,

    // Categorize
    categorizeGrid,
    setCategorizeGrid,

    // Discussion
    discussionPlaceholder,
    setDiscussionPlaceholder,
    discussionSampleAnswers,
    setDiscussionSampleAnswers,
    discussionMaxLength,
    setDiscussionMaxLength,

    startCreating,
    startEditing,
    cancelEditing,
    saveQuestion,
    deleteQuestion,

    parseAndValidateQuestions,
    refreshList: () => selectedGame ? fetchQuestions(selectedGame.id) : fetchGames()
  };
}
