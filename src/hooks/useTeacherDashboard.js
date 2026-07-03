import { useState, useEffect } from 'react';
import { pb } from '../pb';
import { parseMarkdownQuestions } from '../utils/markdownParser';

export function useTeacherDashboard(view, currentUser) {
  const [gamesList, setGamesList] = useState([]);
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

  // Questions added during collection creation
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [creationQuestionsTab, setCreationQuestionsTab] = useState('individual'); // 'individual' or 'bulk'

  // Question Form states
  const [isEditing, setIsEditing] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null); // null if creating, question object if editing
  const [questionType, setQuestionType] = useState('MULTIPLE_CHOICE');
  const [questionText, setQuestionText] = useState('');
  
  // Bulk Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');

  // Type-specific helper states
  // MULTIPLE_CHOICE & SORTING
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

  // DRAG_DROP
  const [dragSentence, setDragSentence] = useState('');
  const [dragChoices, setDragChoices] = useState(['', '', '', '']);

  // DROP_DOWN
  const [dropdownSentence, setDropdownSentence] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState(['', '', '', '']);

  // CATEGORIZE
  const [categorizeCategories, setCategorizeCategories] = useState('');
  const [categorizeItemsText, setCategorizeItemsText] = useState('');

  // Fetch games from PocketBase (including question count per game)
  const fetchGames = async () => {
    setLoading(true);
    setError('');
    try {
      const games = await pb.collection('dahoot_games').getFullList({
        sort: 'created'
      });
      
      // Fetch question counts for each game
      const gamesWithCounts = await Promise.all(games.map(async (game) => {
        try {
          const questions = await pb.collection('dahoot_questions').getList(1, 1, {
            filter: `game_id = "${game.id}"`
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
        filter: `game_id = "${gameId}"`,
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
    setGameCreator(currentUser?.name || currentUser?.email || '');
    setGameLanguage('English');
    setGameCefrLevel('');
    setGameSubject('');
    setIsEditingGame(true);
    setError('');

    // Reset pending questions and tab
    setPendingQuestions([]);
    setCreationQuestionsTab('individual');
    setImportText('');

    // Reset individual question fields
    setQuestionText('');
    setQuestionType('MULTIPLE_CHOICE');
    setOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
    setDragSentence('');
    setDragChoices(['', '', '', '']);
    setDropdownSentence('');
    setDropdownOptions(['', '', '', '']);
    setCategorizeCategories('');
    setCategorizeItemsText('');
  };

  const startEditingGame = (game, e) => {
    if (e) e.stopPropagation();
    setSelectedGameForEdit(game);
    setGameTitle(game.title);
    setGameDescription(game.description || '');
    setGameCreator(game.creator || '');
    setGameLanguage(game.language || 'English');
    setGameCefrLevel(game.cefr_level || '');
    setGameSubject(game.subject || '');
    setIsEditingGame(true);
    setError('');
  };

  const cancelEditingGame = () => {
    setIsEditingGame(false);
    setSelectedGameForEdit(null);
    setError('');
    setPendingQuestions([]);
    setImportText('');
  };

  const saveGame = async (e) => {
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

      let createdGame = null;
      if (selectedGameForEdit) {
        await pb.collection('dahoot_games').update(selectedGameForEdit.id, gameData);
      } else {
        // If creating a game in bulk mode, validate first before saving the game collection
        let questionsToSave = [];
        if (creationQuestionsTab === 'bulk') {
          if (importText.trim()) {
            questionsToSave = parseMarkdownQuestions(importText);
            if (questionsToSave.length === 0) {
              throw new Error('Could not parse any valid questions. Please verify your bulk import formatting.');
            }
          }
        } else {
          // 'individual' tab
          questionsToSave = pendingQuestions;
        }

        createdGame = await pb.collection('dahoot_games').create(gameData);

        // Save associated questions if we have any
        for (const q of questionsToSave) {
          await pb.collection('dahoot_questions').create({
            game_id: createdGame.id,
            text: q.text,
            options: q.options,
            correct_option_index: q.correct_option_index,
            type: q.type
          });
        }
      }
      setIsEditingGame(false);
      setSelectedGameForEdit(null);
      setPendingQuestions([]);
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
    if (!window.confirm("Are you sure you want to delete this game? This will also delete all its questions.")) {
      return;
    }
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
    if (!window.confirm(`Are you sure you want to copy the game "${game.title}"?`)) {
      return;
    }
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
        filter: `game_id = "${game.id}"`,
        sort: 'created'
      });

      for (const q of qList) {
        await pb.collection('dahoot_questions').create({
          game_id: copiedGame.id,
          text: q.text,
          options: q.options,
          correct_option_index: q.correct_option_index,
          type: q.type
        });
      }

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
    setOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
    setDragSentence('');
    setDragChoices(['', '', '', '']);
    setDropdownSentence('');
    setDropdownOptions(['', '', '', '']);
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

    if (type === 'MULTIPLE_CHOICE' || type === 'SORTING') {
      const opts = Array.isArray(question.options) ? [...question.options] : [];
      while (opts.length < 4) opts.push('');
      setOptions(opts);
      setCorrectOptionIndex(question.correct_option_index ?? 0);
    } else if (type === 'DRAG_DROP') {
      setDragSentence(question.options?.sentence || '');
      const choices = Array.isArray(question.options?.choices) ? [...question.options.choices] : [];
      while (choices.length < 4) choices.push('');
      setDragChoices(choices);
    } else if (type === 'DROP_DOWN') {
      setDropdownSentence(question.options?.sentence || '');
      const dropdowns = Array.isArray(question.options?.dropdowns) ? question.options.dropdowns : [];
      const choiceLines = dropdowns.map(d => Array.isArray(d.choices) ? d.choices.join(', ') : '');
      while (choiceLines.length < 4) choiceLines.push('');
      setDropdownOptions(choiceLines);
    } else if (type === 'CATEGORIZE') {
      const cats = Array.isArray(question.options?.categories) ? question.options.categories.join(', ') : '';
      setCategorizeCategories(cats);
      const items = Array.isArray(question.options?.items) ? question.options.items : [];
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

  const updateOptionValue = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const updateDragChoice = (index, value) => {
    const updated = [...dragChoices];
    updated[index] = value;
    setDragChoices(updated);
  };

  const updateDropdownOption = (index, value) => {
    const updated = [...dropdownOptions];
    updated[index] = value;
    setDropdownOptions(updated);
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    setError('');

    if (!questionText.trim()) {
      setError('Question text is required.');
      return;
    }

    let optionsPayload = null;

    if (questionType === 'MULTIPLE_CHOICE' || questionType === 'SORTING') {
      if (options.some(opt => !opt.trim())) {
        setError('All 4 option choices must be filled out.');
        return;
      }
      optionsPayload = options.map(o => o.trim());
    } 
    
    else if (questionType === 'DRAG_DROP') {
      if (!dragSentence.trim()) {
        setError('Sentence with blanks is required.');
        return;
      }
      if (dragChoices.some(choice => !choice.trim())) {
        setError('All 4 choices must be filled out.');
        return;
      }
      // Accept either numeric placeholders like [blank0] or bracketed tokens like [word]
      const numBlanks = (dragSentence.match(/\[[^\]]+\]/g) || []).length;
      if (numBlanks === 0) {
        setError('The sentence must contain at least one blank placeholder (e.g. [blank0] or [word]).');
        return;
      }
      optionsPayload = {
        sentence: dragSentence.trim(),
        choices: dragChoices.map(c => c.trim()),
        correct: dragChoices.slice(0, numBlanks).map(c => c.trim())
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
      
      const activeLines = dropdownOptions.slice(0, numDropdowns);
      if (activeLines.some(line => !line.trim())) {
        setError(`Please define choices for all ${numDropdowns} dropdowns.`);
        return;
      }

      const dropdownsConfig = activeLines.map(line => {
        const choices = line.split(',').map(c => c.trim()).filter(Boolean);
        return {
          choices,
          correct: choices[0] || ''
        };
      });

      if (dropdownsConfig.some(d => d.choices.length < 2)) {
        setError('Each dropdown must have at least 2 comma-separated options (e.g. "Yes, No").');
        return;
      }

      optionsPayload = {
        sentence: dropdownSentence.trim(),
        dropdowns: dropdownsConfig
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
      correct_option_index: questionType === 'MULTIPLE_CHOICE' ? correctOptionIndex : 0,
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
    if (!window.confirm("Are you sure you want to delete this question?")) {
      return;
    }

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

  const addPendingQuestion = () => {
    setError('');

    if (!questionText.trim()) {
      setError('Question text is required.');
      return false;
    }

    let optionsPayload = null;

    if (questionType === 'MULTIPLE_CHOICE' || questionType === 'SORTING') {
      if (options.some(opt => !opt.trim())) {
        setError('All 4 option choices must be filled out.');
        return false;
      }
      optionsPayload = options.map(o => o.trim());
    } 
    
    else if (questionType === 'DRAG_DROP') {
      if (!dragSentence.trim()) {
        setError('Sentence with blanks is required.');
        return false;
      }
      if (dragChoices.some(choice => !choice.trim())) {
        setError('All 4 choices must be filled out.');
        return false;
      }
      const numBlanks = (dragSentence.match(/\[[^\]]+\]/g) || []).length;
      if (numBlanks === 0) {
        setError('The sentence must contain at least one blank placeholder (e.g. [blank0] or [word]).');
        return false;
      }
      optionsPayload = {
        sentence: dragSentence.trim(),
        choices: dragChoices.map(c => c.trim()),
        correct: dragChoices.slice(0, numBlanks).map(c => c.trim())
      };
    } 
    
    else if (questionType === 'DROP_DOWN') {
      if (!dropdownSentence.trim()) {
        setError('Sentence with dropdowns is required.');
        return false;
      }
      const numDropdowns = (dropdownSentence.match(/\{\{\d+\}\}/g) || []).length;
      if (numDropdowns === 0) {
        setError('The sentence must contain at least one dropdown placeholder (e.g. {{0}}).');
        return false;
      }
      
      const activeLines = dropdownOptions.slice(0, numDropdowns);
      if (activeLines.some(line => !line.trim())) {
        setError(`Please define choices for all ${numDropdowns} dropdowns.`);
        return false;
      }

      const dropdownsConfig = activeLines.map(line => {
        const choices = line.split(',').map(c => c.trim()).filter(Boolean);
        return {
          choices,
          correct: choices[0] || ''
        };
      });

      if (dropdownsConfig.some(d => d.choices.length < 2)) {
        setError('Each dropdown must have at least 2 comma-separated options (e.g. "Yes, No").');
        return false;
      }

      optionsPayload = {
        sentence: dropdownSentence.trim(),
        dropdowns: dropdownsConfig
      };
    } 
    
    else if (questionType === 'CATEGORIZE') {
      if (!categorizeCategories.trim()) {
        setError('Categories list is required.');
        return false;
      }
      if (!categorizeItemsText.trim()) {
        setError('Items list is required.');
        return false;
      }

      const categoriesList = categorizeCategories.split(',').map(c => c.trim()).filter(Boolean);
      if (categoriesList.length < 2) {
        setError('Please enter at least 2 categories, separated by commas.');
        return false;
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
          return false;
        }

        optionsPayload = {
          categories: categoriesList,
          items: itemsList
        };
      } catch (err) {
        setError(err.message);
        return false;
      }
    }

    const newQuestion = {
      text: questionText.trim(),
      type: questionType,
      options: optionsPayload,
      correct_option_index: questionType === 'MULTIPLE_CHOICE' ? correctOptionIndex : 0
    };

    setPendingQuestions(prev => [...prev, newQuestion]);

    // Reset question builder fields
    setQuestionText('');
    setQuestionType('MULTIPLE_CHOICE');
    setOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
    setDragSentence('');
    setDragChoices(['', '', '', '']);
    setDropdownSentence('');
    setDropdownOptions(['', '', '', '']);
    setCategorizeCategories('');
    setCategorizeItemsText('');
    return true;
  };

  const removePendingQuestion = (index) => {
    setPendingQuestions(prev => prev.filter((_, i) => i !== index));
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

  const saveImportedQuestions = async (e) => {
    e.preventDefault();
    setError('');

    if (!importText.trim()) {
      setError('Please provide questions in the text area.');
      return;
    }

    setLoading(true);
    try {
      const parsed = parseMarkdownQuestions(importText);
      if (parsed.length === 0) {
        throw new Error('Could not parse any valid questions. Check formatting.');
      }

      for (const q of parsed) {
        await pb.collection('dahoot_questions').create({
          game_id: selectedGame.id,
          text: q.text,
          options: q.options,
          correct_option_index: q.correct_option_index,
          type: q.type
        });
      }

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
    
    // Multiple Choice & Sorting
    options,
    updateOptionValue,
    correctOptionIndex,
    setCorrectOptionIndex,

    // Drag & Drop
    dragSentence,
    setDragSentence,
    dragChoices,
    updateDragChoice,

    // Drop Down
    dropdownSentence,
    setDropdownSentence,
    dropdownOptions,
    updateDropdownOption,

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
    pendingQuestions,
    setPendingQuestions,
    creationQuestionsTab,
    setCreationQuestionsTab,
    addPendingQuestion,
    removePendingQuestion,
    refreshList: () => selectedGame ? fetchQuestions(selectedGame.id) : fetchGames()
  };
}
