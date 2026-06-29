import { useState, useEffect } from 'react';
import { pb } from '../pb';

export function useTeacherDashboard(view) {
  const [questionsList, setQuestionsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null); // null if creating, question object if editing
  const [questionType, setQuestionType] = useState('MULTIPLE_CHOICE');
  const [questionText, setQuestionText] = useState('');
  
  // Type-specific helper states
  // MULTIPLE_CHOICE & SORTING
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);

  // DRAG_DROP
  const [dragSentence, setDragSentence] = useState('');
  const [dragChoices, setDragChoices] = useState(['', '', '', '']);

  // DROP_DOWN
  const [dropdownSentence, setDropdownSentence] = useState('');
  const [dropdownOptions, setDropdownOptions] = useState(['', '', '', '']); // Comma-separated choice lines

  // CATEGORIZE
  const [categorizeCategories, setCategorizeCategories] = useState(''); // Comma-separated categories
  const [categorizeItemsText, setCategorizeItemsText] = useState(''); // "Item: Category" lines

  // Fetch questions from PocketBase
  const fetchQuestions = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await pb.collection('questions').getFullList({
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
      fetchQuestions();
    }
  }, [view]);

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

    // Prepopulate type-specific states
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

    // Validate and build payload based on type
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
      const numBlanks = (dragSentence.match(/\[blank\d+\]/g) || []).length;
      if (numBlanks === 0) {
        setError('The sentence must contain at least one blank placeholder (e.g. [blank0]).');
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
    }

    setLoading(true);
    const questionData = {
      text: questionText.trim(),
      options: optionsPayload,
      correct_option_index: questionType === 'MULTIPLE_CHOICE' ? correctOptionIndex : 0,
      type: questionType
    };

    try {
      if (selectedQuestion) {
        await pb.collection('questions').update(selectedQuestion.id, questionData);
      } else {
        await pb.collection('questions').create(questionData);
      }
      setIsEditing(false);
      setSelectedQuestion(null);
      await fetchQuestions();
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
      await pb.collection('questions').delete(id);
      await fetchQuestions();
    } catch (err) {
      console.error("Error deleting question:", err);
      setError("Failed to delete question: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    questionsList,
    loading,
    error,
    isEditing,
    selectedQuestion,
    questionType,
    setQuestionType,
    questionText,
    setQuestionText,
    
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
    refreshList: fetchQuestions
  };
}
