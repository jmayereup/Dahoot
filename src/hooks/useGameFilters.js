import { useState, useEffect, useMemo } from 'react';

export function useGameFilters({
  gamesList = [],
  currentUser,
  userInfo = null,
  config = {}
}) {
  const {
    enableSearch = true,
    enableLanguageFilter = true,
    enableCreatorFilter = true,
    enableTabFilter = false,
    itemsPerPage = 10,
    defaultSort = 'newest',
    defaultTab = 'all'
  } = config;

  const [filterSubject, setFilterSubject] = useState([]);
  const [filterCefr, setFilterCefr] = useState([]);
  const [filterLanguage, setFilterLanguage] = useState([]);
  const [filterCreator, setFilterCreator] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort);
  const [currentPage, setCurrentPage] = useState(1);
  const [libraryTab, setLibraryTab] = useState(defaultTab);

  const toggleSubjectFilter = (sub) => {
    setFilterSubject(prev => prev.includes(sub) ? prev.filter(x => x !== sub) : [...prev, sub]);
  };

  const toggleCefrFilter = (level) => {
    setFilterCefr(prev => prev.includes(level) ? prev.filter(x => x !== level) : [...prev, level]);
  };

  const toggleLanguageFilter = (lang) => {
    setFilterLanguage(prev => prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]);
  };

  const toggleCreatorFilter = (creator) => {
    setFilterCreator(prev => prev.includes(creator) ? prev.filter(x => x !== creator) : [...prev, creator]);
  };

  const hasActiveFilters = filterSubject.length > 0 || filterCefr.length > 0 || 
                          filterLanguage.length > 0 || filterCreator.length > 0 || searchQuery.length > 0;

  const clearFilters = () => {
    setFilterSubject([]);
    setFilterCefr([]);
    setFilterLanguage([]);
    setFilterCreator([]);
    setSearchQuery('');
  };

  const uniqueLanguages = useMemo(() => {
    if (!enableLanguageFilter) return [];
    const langs = new Set();
    gamesList.forEach(g => { if (g.language) langs.add(g.language); });
    return Array.from(langs);
  }, [gamesList, enableLanguageFilter]);

  const uniqueCreators = useMemo(() => {
    if (!enableCreatorFilter) return [];
    const creators = new Set();
    gamesList.forEach(g => {
      if (g.creator) {
        const creatorName = g.creator.toLowerCase().trim();
        const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
        const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
        const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
        const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
        const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                         (myName && creatorName === myName) || 
                         (myEmail && creatorName === myEmail) || 
                         (myUsername && creatorName === myUsername) || 
                         (currentUser?.id && creatorName === currentUser.id);
        if (isMyGame && userInfo?.dahoot_username) {
          creators.add(userInfo.dahoot_username);
        } else {
          creators.add(g.creator);
        }
      }
    });
    return Array.from(creators);
  }, [gamesList, currentUser, userInfo, enableCreatorFilter]);

  const myGamesCount = useMemo(() => {
    if (!enableTabFilter) return 0;
    return gamesList.filter(game => {
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
    }).length;
  }, [gamesList, currentUser, userInfo, enableTabFilter]);

  const getEffectiveCreator = (game) => {
    if (!game.creator) return '';
    const creatorName = game.creator.toLowerCase().trim();
    const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
    const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
    const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
    const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
    const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                     (myName && creatorName === myName) || 
                     (myEmail && creatorName === myEmail) || 
                     (myUsername && creatorName === myUsername) || 
                     (currentUser?.id && creatorName === currentUser.id);
    return (isMyGame && userInfo?.dahoot_username) ? userInfo.dahoot_username : game.creator;
  };

  const filteredGames = useMemo(() => {
    return gamesList.filter(game => {
      if (enableTabFilter && libraryTab === 'my') {
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
        if (!isMyGame) return false;
      }
      if (filterSubject.length > 0 && !filterSubject.includes(game.subject)) return false;
      if (filterCefr.length > 0 && !filterCefr.includes(game.cefr_level)) return false;
      if (enableLanguageFilter && filterLanguage.length > 0 && !filterLanguage.includes(game.language)) return false;
      if (enableCreatorFilter && filterCreator.length > 0) {
        const effectiveCreator = getEffectiveCreator(game);
        if (!filterCreator.includes(effectiveCreator)) return false;
      }
      return true;
    });
  }, [gamesList, libraryTab, currentUser, userInfo, filterSubject, filterCefr, filterLanguage, filterCreator, enableTabFilter, enableLanguageFilter, enableCreatorFilter, getEffectiveCreator]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSubject, filterCefr, filterLanguage, filterCreator, libraryTab, sortBy]);

  const searchedGames = useMemo(() => {
    if (!enableSearch || !searchQuery) return filteredGames;
    const q = searchQuery.toLowerCase();
    return filteredGames.filter(game => {
      const effectiveCreator = getEffectiveCreator(game);
      return game.title.toLowerCase().includes(q) ||
        (game.description && game.description.toLowerCase().includes(q)) ||
        (game.subject && game.subject.toLowerCase().includes(q)) ||
        (effectiveCreator && effectiveCreator.toLowerCase().includes(q));
    });
  }, [filteredGames, searchQuery, enableSearch, getEffectiveCreator]);

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

  const totalPages = Math.ceil(sortedGames.length / itemsPerPage);
  const effectivePage = Math.max(1, Math.min(currentPage, totalPages || 1));

  const paginatedGames = useMemo(() => {
    const startIndex = (effectivePage - 1) * itemsPerPage;
    return sortedGames.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedGames, effectivePage, itemsPerPage]);

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
    filterLanguage, setFilterLanguage,
    filterCreator, setFilterCreator,
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    currentPage, setCurrentPage,
    libraryTab, setLibraryTab,
    itemsPerPage,
    hasActiveFilters,
    clearFilters,
    toggleSubjectFilter,
    toggleCefrFilter,
    toggleLanguageFilter,
    toggleCreatorFilter,
    filteredGames,
    searchedGames,
    sortedGames,
    paginatedGames,
    totalPages,
    effectivePage,
    getPageNumbers,
    uniqueLanguages,
    uniqueCreators,
    myGamesCount,
    getEffectiveCreator
  };
}