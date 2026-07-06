import { useState, useEffect } from 'react';
import { pb } from '../pb';
import { normalizeQuestion } from '../utils/questionSchema';
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
  const [dragAnswers, setDragAnswers] = useState(['', '', '']);
  const [dragDistractors, setDragDistractors] = useState(['', '']);

  // DROP_DOWN
  const [dropdownSentence, setDropdownSentence] = useState('');
  const [dropdownConfig, setDropdownConfig] = useState([
    { correct_answer: '', distractors: ['', ''] },
    { correct_answer: '', distractors: ['', ''] }
  ]);

  // CATEGORIZE
  const [categorizeCategories, setCategorizeCategories] = useState('');
  const [categorizeItemsText, setCategorizeItemsText] = useState('');

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
    setQuestionText('');
    setQuestionType('MULTIPLE_CHOICE');
    setMcCorrectAnswer('');
    setMcDistractors(['', '', '']);
    setSortingItems(['', '', '', '']);
    setDragSentence('');
    setDragAnswers(['', '', '']);
    setDragDistractors(['', '']);
    setDropdownSentence('');
    setDropdownConfig([
      { correct_answer: '', distractors: ['', ''] },
      { correct_answer: '', distractors: ['', ''] }
    ]);
    setCategorizeCategories('');
    setCategorizeItemsText('');
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
    setQuestionText('');
    setMcCorrectAnswer('');
    setMcDistractors(['', '', '']);
    setSortingItems(['', '', '', '']);
    setDragSentence('');
    setDragAnswers(['', '', '']);
    setDragDistractors(['', '']);
    setDropdownSentence('');
    setDropdownConfig([
      { correct_answer: '', distractors: ['', ''] },
      { correct_answer: '', distractors: ['', ''] }
    ]);
    setCategorizeCategories('');
    setCategorizeItemsText('');
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
      while (seq.length < 4) seq.push('');
      setSortingItems(seq);
    } else if (type === 'DRAG_DROP') {
      setDragSentence(n.options?.sentence || '');
      const ans = [...(n.options?.answers_in_order || [])];
      while (ans.length < 3) ans.push('');
      setDragAnswers(ans);
      const dists = [...(n.options?.distractors || [])];
      while (dists.length < 2) dists.push('');
      setDragDistractors(dists);
    } else if (type === 'DROP_DOWN') {
      setDropdownSentence(n.options?.sentence || '');
      const dds = Array.isArray(n.options?.dropdowns) ? n.options.dropdowns : [];
      const padded = dds.map(d => ({
        correct_answer: d.correct_answer || '',
        distractors: [...(d.distractors || [])]
      }));
      while (padded.length < 2) padded.push({ correct_answer: '', distractors: ['', ''] });
      padded.forEach(d => { while (d.distractors.length < 2) d.distractors.push(''); });
      setDropdownConfig(padded);
    } else if (type === 'CATEGORIZE') {
      const cats = Array.isArray(n.options?.categories) ? n.options.categories.join(', ') : '';
      setCategorizeCategories(cats);
      const items = Array.isArray(n.options?.items) ? n.options.items : [];
      const itemsLines = items.map(item => `${item.name}: ${item.category}`).join('\n');
      setCategorizeItemsText(itemsLines);
    }

    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setSelectedQuestion(null);
    setError('');
  };

  const updateMcDistractor = (index, value) => {
    const updated = [...mcDistractors];
    updated[index] = value;
    setMcDistractors(updated);
  };

  const updateSortingItem = (index, value) => {
    const updated = [...sortingItems];
    updated[index] = value;
    setSortingItems(updated);
  };

  const updateDragAnswer = (index, value) => {
    const updated = [...dragAnswers];
    updated[index] = value;
    setDragAnswers(updated);
  };

  const updateDragDistractor = (index, value) => {
    const updated = [...dragDistractors];
    updated[index] = value;
    setDragDistractors(updated);
  };

  const updateDropdownCorrect = (idx, value) => {
    const updated = [...dropdownConfig];
    updated[idx] = { ...updated[idx], correct_answer: value };
    setDropdownConfig(updated);
  };

  const updateDropdownDistractor = (idx, distIdx, value) => {
    const updated = [...dropdownConfig];
    const dists = [...(updated[idx].distractors || [])];
    dists[distIdx] = value;
    updated[idx] = { ...updated[idx], distractors: dists };
    setDropdownConfig(updated);
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    setError('');

    if (!questionText.trim()) {
      setError('Question text is required.');
      return;
    }

    let optionsPayload = null;

    if (questionType === 'MULTIPLE_CHOICE') {
      if (!mcCorrectAnswer.trim()) {
        setError('Correct answer is required.');
        return;
      }
      if (mcDistractors.some(d => !d.trim())) {
        setError('All 3 distractors must be filled out.');
        return;
      }
      const seen = new Set([mcCorrectAnswer.trim().toLowerCase(), ...mcDistractors.map(d => d.trim().toLowerCase())]);
      if (seen.size < 4) {
        setError('Correct answer and distractors must all be unique.');
        return;
      }
      optionsPayload = {
        correct_answer: mcCorrectAnswer.trim(),
        distractors: mcDistractors.map(d => d.trim())
      };
    } 
    
    else if (questionType === 'SORTING') {
      if (sortingItems.some(opt => !opt.trim())) {
        setError('All 4 sorting items must be filled out.');
        return;
      }
      optionsPayload = {
        correct_sequence: sortingItems.map(o => o.trim())
      };
    } 
    
    else if (questionType === 'DRAG_DROP') {
      if (!dragSentence.trim()) {
        setError('Sentence with blanks is required.');
        return;
      }
      const numBlanks = (dragSentence.match(/\[[^\]]+\]/g) || []).length;
      if (numBlanks === 0) {
        setError('The sentence must contain at least one blank placeholder (e.g. [blank0] or [word]).');
        return;
      }
      const activeAnswers = dragAnswers.slice(0, numBlanks);
      if (activeAnswers.some(answer => !answer.trim())) {
        setError(`Please define all ${numBlanks} correct blank answers.`);
        return;
      }
      if (dragDistractors.some(d => !d.trim())) {
        setError('All distractor words must be filled out.');
        return;
      }
      optionsPayload = {
        sentence: dragSentence.trim(),
        answers_in_order: activeAnswers.map(a => a.trim()),
        distractors: dragDistractors.map(d => d.trim())
      };
    } 
    
    else if (questionType === 'DROP_DOWN') {
      if (!dropdownSentence.trim()) {
        setError('Sentence with dropdowns is required.');
        return;
      }
      const numDropdowns = (dropdownSentence.match(/\{\{\d+\}\}/g) || []).length;
      if (numDropdowns === 0) {
        setError('The sentence must contain at least one dropdown placeholder (e.g. {{0}}).');
        return;
      }
      const activeDropdowns = dropdownConfig.slice(0, numDropdowns);
      for (let i = 0; i < activeDropdowns.length; i++) {
        if (!activeDropdowns[i].correct_answer.trim()) {
          setError(`Please define the correct answer for dropdown {{${i}}}.`);
          return;
        }
        const filledDistractors = (activeDropdowns[i].distractors || []).filter(d => d.trim());
        if (filledDistractors.length < 1) {
          setError(`Please add at least 1 distractor for dropdown {{${i}}}.`);
          return;
        }
      }
      optionsPayload = {
        sentence: dropdownSentence.trim(),
        dropdowns: activeDropdowns.map(d => ({
          correct_answer: d.correct_answer.trim(),
          distractors: (d.distractors || []).filter(x => x.trim())
        }))
      };
    } 
    
    else if (questionType === 'CATEGORIZE') {
      if (!categorizeCategories.trim()) {
        setError('Categories list is required.');
        return;
      }
      if (!categorizeItemsText.trim()) {
        setError('Items list is required.');
        return;
      }

      const categoriesList = categorizeCategories.split(',').map(c => c.trim()).filter(Boolean);
      if (categoriesList.length < 2) {
        setError('Please enter at least 2 categories, separated by commas.');
        return;
      }

      try {
        const itemsList = categorizeItemsText
          .split('\n')
          .map(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
              const cat = parts[1].trim();
              if (!categoriesList.includes(cat)) {
                throw new Error(`Category "${cat}" in item "${parts[0].trim()}" does not match defined categories.`);
              }
              return {
                name: parts[0].trim(),
                category: cat
              };
            }
            if (line.trim()) {
              throw new Error(`Invalid line format: "${line}". Must be "ItemName: CategoryName".`);
            }
            return null;
          })
          .filter(Boolean);

        if (itemsList.length === 0) {
          setError('Please enter at least one item mapped to a category.');
          return;
        }

        optionsPayload = {
          categories: categoriesList,
          items: itemsList
        };
      } catch (err) {
        setError(err.message);
        return;
      }
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
      if (!q.type || !q.text || !q.options) {
        throw new Error(`Question ${i + 1} is missing required fields (type, text, options).`);
      }
      const validTypes = ['MULTIPLE_CHOICE', 'SORTING', 'DRAG_DROP', 'DROP_DOWN', 'CATEGORIZE'];
      if (!validTypes.includes(q.type)) {
        throw new Error(`Question ${i + 1} has invalid type "${q.type}". Must be one of: ${validTypes.join(', ')}`);
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

    setLoading(true);
    try {
      const parsed = parseAndValidateQuestions(importText);

      await Promise.all(parsed.map(q =>
        pb.collection('dahoot_questions').create({
          game_id: selectedGame.id,
          text: q.text,
          options: q.options,
          type: q.type
        })
      ));

      setIsImporting(false);
      setImportText('');
      await fetchQuestions(selectedGame.id);
    } catch (err) {
      console.error("Error saving imported questions:", err);
      setError("Import failed: " + err.message);
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
    dragAnswers,
    setDragAnswers,
    updateDragAnswer,
    dragDistractors,
    setDragDistractors,
    updateDragDistractor,

    // Drop Down
    dropdownSentence,
    setDropdownSentence,
    dropdownConfig,
    setDropdownConfig,
    updateDropdownCorrect,
    updateDropdownDistractor,

    // Categorize
    categorizeCategories,
    setCategorizeCategories,
    categorizeItemsText,
    setCategorizeItemsText,

    startCreating,
    startEditing,
    cancelEditing,
    saveQuestion,
    deleteQuestion,

    parseAndValidateQuestions,
    refreshList: () => selectedGame ? fetchQuestions(selectedGame.id) : fetchGames()
  };
}
