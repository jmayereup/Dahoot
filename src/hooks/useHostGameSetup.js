import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { pb } from '../pb';

const ALL_QUESTION_TYPES = ['MULTIPLE_CHOICE', 'SORTING', 'DRAG_DROP', 'DROP_DOWN', 'CATEGORIZE', 'DISCUSSION'];

const DEFAULT_SETUP = {
  randomize: true,
  selectedQuestionTypes: ALL_QUESTION_TYPES,
  maxQuestions: '',
  timerDuration: 20,
};

export function useHostGameSetup() {
  const [setupByGame, setSetupByGame] = useState({});
  const [gameQuestions, setGameQuestions] = useState([]);
  const [activeGameId, setActiveGameId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const settingsRef = useRef(null);

  const getSetup = useCallback((gameId) => {
    if (!gameId) return { ...DEFAULT_SETUP };
    return { ...DEFAULT_SETUP, ...(setupByGame[gameId] || {}) };
  }, [setupByGame]);

  const updateSetup = useCallback((gameId, patch) => {
    if (!gameId) return;
    setSetupByGame(prev => ({
      ...prev,
      [gameId]: { ...DEFAULT_SETUP, ...(prev[gameId] || {}), ...patch },
    }));
  }, []);

  const setActiveGame = useCallback((gameId) => {
    setActiveGameId(gameId || '');
  }, []);

  useEffect(() => {
    if (!activeGameId) {
      setGameQuestions([]);
      return;
    }

    let isMounted = true;
    pb.collection('dahoot_questions').getFullList({
      filter: pb.filter("game_id = {:gameId}", { gameId: activeGameId })
    })
    .then(res => {
      if (isMounted) setGameQuestions(res);
    })
    .catch(err => {
      console.error("Error fetching questions:", err);
      if (isMounted) setGameQuestions([]);
    });

    return () => {
      isMounted = false;
    };
  }, [activeGameId]);

  const setup = getSetup(activeGameId);

  const totalQuestions = useMemo(() => {
    return gameQuestions.filter(q => {
      const type = q.type || 'MULTIPLE_CHOICE';
      return setup.selectedQuestionTypes.includes(type);
    }).length;
  }, [gameQuestions, setup.selectedQuestionTypes]);

  const availableQuestionTypes = useMemo(() => {
    const types = new Set();
    gameQuestions.forEach(q => {
      types.add(q.type || 'MULTIPLE_CHOICE');
    });
    return Array.from(types);
  }, [gameQuestions]);

  const getQuestionTypeCount = (type) => {
    return gameQuestions.filter(q => (q.type || 'MULTIPLE_CHOICE') === type).length;
  };

  const toggleQuestionType = (type) => {
    updateSetup(activeGameId, {
      selectedQuestionTypes: setup.selectedQuestionTypes.includes(type)
        ? setup.selectedQuestionTypes.filter(t => t !== type)
        : [...setup.selectedQuestionTypes, type],
    });
  };

  const setRandomize = (val) => updateSetup(activeGameId, { randomize: val });
  const setTimerDuration = (val) => updateSetup(activeGameId, { timerDuration: val });
  const setMaxQuestions = (val) => updateSetup(activeGameId, { maxQuestions: val });

  const getQuestionTypeLabel = (type) => {
    const QUESTION_TYPE_LABELS = {
      MULTIPLE_CHOICE: 'Multiple Choice',
      SORTING: 'Sorting Order',
      DRAG_DROP: 'Drag & Drop (Blanks)',
      DROP_DOWN: 'Drop-Down (Select Blanks)',
      CATEGORIZE: 'Categorization Groups',
      DISCUSSION: 'Classroom Discussion (0 pts)'
    };
    return QUESTION_TYPE_LABELS[type] || type.replace('_', ' ');
  };

  const handleCopyShareLink = (gameId) => {
    if (!gameId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?quiz=${gameId}&openExternalBrowser=1`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error("Failed to copy share link:", err));
  };

  const handleOpenPreview = () => setIsPreviewModalOpen(true);
  const closePreview = () => setIsPreviewModalOpen(false);

  const reset = useCallback(() => {
    setSetupByGame({});
    setGameQuestions([]);
    setActiveGameId('');
    setCopied(false);
    setIsPreviewModalOpen(false);
  }, []);

  return {
    activeGameId,
    setActiveGame,
    setup,
    randomize: setup.randomize,
    setRandomize,
    timerDuration: setup.timerDuration,
    setTimerDuration,
    maxQuestions: setup.maxQuestions,
    setMaxQuestions,
    selectedQuestionTypes: setup.selectedQuestionTypes,
    toggleQuestionType,
    gameQuestions,
    totalQuestions,
    availableQuestionTypes,
    getQuestionTypeCount,
    getQuestionTypeLabel,
    copied,
    isPreviewModalOpen,
    closePreview,
    handleCopyShareLink,
    handleOpenPreview,
    settingsRef,
    reset,
  };
}
