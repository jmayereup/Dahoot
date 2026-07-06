import { useState, useEffect, useMemo, useRef } from 'react';
import { pb } from '../pb';

export function useLandingPage({
  selectedGameId,
  setSelectedGameId,
  shouldScrollToSettings,
  onSettingsScrolled,
  gamesList = [],
  currentUser,
  userInfo = null,
}) {
  const [randomize, setRandomize] = useState(true);
  const [copied, setCopied] = useState(false);
  const [gameQuestions, setGameQuestions] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([
    'MULTIPLE_CHOICE', 'SORTING', 'DRAG_DROP', 'DROP_DOWN', 'CATEGORIZE'
  ]);
  const [maxQuestions, setMaxQuestions] = useState('');
  const [timerDuration, setTimerDuration] = useState(20);
  const settingsRef = useRef(null);
  const [filterSubject, setFilterSubject] = useState([]);
  const [filterCefr, setFilterCefr] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const refreshQuestions = async () => {
    if (!selectedGameId) return;
    try {
      const res = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: selectedGameId })
      });
      setGameQuestions(res);
      setMaxQuestions(prev => {
        const prevNum = parseInt(prev);
        if (isNaN(prevNum) || prevNum > res.length || prev === '') {
          return res.length.toString();
        }
        return prev;
      });
    } catch (err) {
      console.error("Error refreshing questions:", err);
    }
  };

  useEffect(() => {
    if (shouldScrollToSettings && gameQuestions.length > 0 && settingsRef.current) {
      const timer = setTimeout(() => {
        settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (onSettingsScrolled) {
          onSettingsScrolled();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldScrollToSettings, gameQuestions, onSettingsScrolled]);

  useEffect(() => {
    if (!selectedGameId) {
      setGameQuestions([]);
      setMaxQuestions('');
      return;
    }

    let isMounted = true;
    pb.collection('dahoot_questions').getFullList({
      filter: pb.filter("game_id = {:gameId}", { gameId: selectedGameId })
    })
    .then(res => {
      if (isMounted) {
        setGameQuestions(res);
        setMaxQuestions(res.length.toString());
        setSelectedQuestionTypes(['MULTIPLE_CHOICE', 'SORTING', 'DRAG_DROP', 'DROP_DOWN', 'CATEGORIZE']);
      }
    })
    .catch(err => {
      console.error("Error fetching questions:", err);
      if (isMounted) {
        setGameQuestions([]);
        setMaxQuestions('');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedGameId]);

  const totalQuestions = useMemo(() => {
    return gameQuestions.filter(q => {
      const type = q.type || 'MULTIPLE_CHOICE';
      return selectedQuestionTypes.includes(type);
    }).length;
  }, [gameQuestions, selectedQuestionTypes]);

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
    setSelectedQuestionTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const getQuestionTypeLabel = (type) => {
    const QUESTION_TYPE_LABELS = {
      MULTIPLE_CHOICE: 'Multiple Choice',
      SORTING: 'Sorting Order',
      DRAG_DROP: 'Drag & Drop (Blanks)',
      DROP_DOWN: 'Drop-Down (Select Blanks)',
      CATEGORIZE: 'Categorization Groups'
    };
    return QUESTION_TYPE_LABELS[type] || type.replace('_', ' ');
  };

  useEffect(() => {
    setMaxQuestions(prev => {
      const prevNum = parseInt(prev);
      if (isNaN(prevNum) || prevNum >= totalQuestions || prev === '') {
        return totalQuestions.toString();
      }
      return prev;
    });
  }, [totalQuestions]);

  const toggleSubjectFilter = (sub) => {
    setFilterSubject(prev => prev.includes(sub) ? prev.filter(x => x !== sub) : [...prev, sub]);
  };

  const toggleCefrFilter = (level) => {
    setFilterCefr(prev => prev.includes(level) ? prev.filter(x => x !== level) : [...prev, level]);
  };

  const hasActiveFilters = filterSubject.length > 0 || filterCefr.length > 0;

  const clearFilters = () => {
    setFilterSubject([]);
    setFilterCefr([]);
  };

  const filteredGames = useMemo(() => {
    return gamesList.filter(game => {
      if (filterSubject.length > 0 && !filterSubject.includes(game.subject)) return false;
      if (filterCefr.length > 0 && !filterCefr.includes(game.cefr_level)) return false;
      return true;
    });
  }, [gamesList, filterSubject, filterCefr]);

  useEffect(() => {
    if (gamesList.length === 0) return;
    if (filteredGames.length > 0) {
      if (selectedGameId) {
        const isStillAvailable = filteredGames.some(g => g.id === selectedGameId);
        if (!isStillAvailable) {
          setSelectedGameId(filteredGames[0].id);
        }
      }
    } else {
      setSelectedGameId('');
    }
  }, [filteredGames, selectedGameId, gamesList, setSelectedGameId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSubject, filterCefr, sortBy]);

  const searchedGames = useMemo(() => {
    if (!searchQuery) return filteredGames;
    const q = searchQuery.toLowerCase();
    return filteredGames.filter(game => {
      const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
      const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
      const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
      const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
      const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';

      const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                       (myName && creatorName === myName) ||
                       (myEmail && creatorName === myEmail) ||
                       (myUsername && creatorName === myUsername) ||
                       (currentUser?.id && creatorName === currentUser.id);

      const effectiveCreator = (isMyGame && userInfo?.dahoot_username) ? userInfo.dahoot_username : (game.creator || '');

      return game.title.toLowerCase().includes(q) ||
        (game.description && game.description.toLowerCase().includes(q)) ||
        (game.subject && game.subject.toLowerCase().includes(q)) ||
        (effectiveCreator && effectiveCreator.toLowerCase().includes(q));
    });
  }, [filteredGames, searchQuery, currentUser, userInfo]);

  const sortedGames = useMemo(() => {
    const list = [...searchedGames];
    if (sortBy === 'newest') {
      return list.sort((a, b) => new Date(b.created) - new Date(a.created));
    }
    if (sortBy === 'oldest') {
      return list.sort((a, b) => new Date(a.created) - new Date(b.created));
    }
    if (sortBy === 'alphabetical') {
      return list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [searchedGames, sortBy]);

  const totalPages = Math.ceil(sortedGames.length / ITEMS_PER_PAGE);
  const effectivePage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const paginatedGames = useMemo(() => {
    const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
    return sortedGames.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedGames, effectivePage]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (effectivePage > 3) pages.push('...');
      const start = Math.max(2, effectivePage - 1);
      const end = Math.min(totalPages - 1, effectivePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (effectivePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handleCopyShareLink = () => {
    const game = gamesList.find(g => g.id === selectedGameId);
    if (game) {
      const shareUrl = `${window.location.origin}${window.location.pathname}?quiz=${game.id}`;
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error("Failed to copy share link:", err));
    }
  };

  const handleOpenPreview = () => {
    setIsPreviewModalOpen(true);
  };

  return {
    randomize, setRandomize,
    copied, setCopied,
    gameQuestions,
    isPreviewModalOpen, setIsPreviewModalOpen,
    selectedQuestionTypes, setSelectedQuestionTypes,
    maxQuestions, setMaxQuestions,
    timerDuration, setTimerDuration,
    settingsRef,
    filterSubject, setFilterSubject,
    filterCefr, setFilterCefr,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    currentPage, setCurrentPage,
    ITEMS_PER_PAGE,
    refreshQuestions,
    totalQuestions,
    availableQuestionTypes,
    getQuestionTypeCount,
    toggleQuestionType,
    getQuestionTypeLabel,
    hasActiveFilters,
    clearFilters,
    toggleSubjectFilter,
    toggleCefrFilter,
    filteredGames,
    searchedGames,
    sortedGames,
    paginatedGames,
    totalPages,
    effectivePage,
    getPageNumbers,
    handleCopyShareLink,
    handleOpenPreview,
  };
}
