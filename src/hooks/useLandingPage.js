import { useState, useEffect, useMemo } from 'react';

export function useLandingPage({
  selectedGameId,
  setSelectedGameId,
  gamesList = [],
  currentUser,
  userInfo = null,
}) {
  const [filterSubject, setFilterSubject] = useState([]);
  const [filterCefr, setFilterCefr] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

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

  return {
    filterSubject, setFilterSubject,
    filterCefr, setFilterCefr,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    currentPage, setCurrentPage,
    ITEMS_PER_PAGE,
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
  };
}
