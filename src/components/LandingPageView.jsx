import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LogoContainer } from './LogoContainer';
import { SchoolFooter } from './SchoolFooter';
import { pb } from '../pb';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { QuestionsPreviewModal } from './QuestionsPreviewModal';


export function LandingPageView({
  hasPinFromUrl,
  joinPin,
  setJoinPin,
  playerName,
  setPlayerName,
  loading,
  pocketbaseStatus,
  error,
  joinGame,
  startHosting,
  startSoloPractice,
  startMarathonHosting,
  setHasPinFromUrl,
  setView,
  gamesList = [],
  refreshGames,
  availableSubjects = [],
  availableCefrLevels = [],
  isAuthenticated,
  currentUser,
  userInfo = null,
  onLogout,
  selectedGameId,
  setSelectedGameId,
  shouldScrollToSettings = false,
  onSettingsScrolled = null
}) {

  // Custom game options
  const [randomize, setRandomize] = useState(true);
  const [copied, setCopied] = useState(false);
  const [gameQuestions, setGameQuestions] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

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
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([
    'MULTIPLE_CHOICE',
    'SORTING',
    'DRAG_DROP',
    'DROP_DOWN',
    'CATEGORIZE'
  ]);
  const [maxQuestions, setMaxQuestions] = useState('');
  const [timerDuration, setTimerDuration] = useState(20);
  const settingsRef = useRef(null);

  // Scroll to game settings when shared quiz is loaded
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

  // Fetch questions when game is selected
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

  // Derived properties and helper functions
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

  // Clamp/sync maxQuestions when totalQuestions changes
  useEffect(() => {
    setMaxQuestions(prev => {
      const prevNum = parseInt(prev);
      if (isNaN(prevNum) || prevNum >= totalQuestions || prev === '') {
        return totalQuestions.toString();
      }
      return prev;
    });
  }, [totalQuestions]);

  
  // Filter states
  const [filterSubject, setFilterSubject] = useState([]);
  const [filterCefr, setFilterCefr] = useState([]);

  // Toggle filter arrays
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

  // Filtered games
  const filteredGames = useMemo(() => {
    return gamesList.filter(game => {
      if (filterSubject.length > 0 && !filterSubject.includes(game.subject)) return false;
      if (filterCefr.length > 0 && !filterCefr.includes(game.cefr_level)) return false;
      return true;
    });
  }, [gamesList, filterSubject, filterCefr]);

  // Automatically update selected game when the filtered list changes
  useEffect(() => {
    if (gamesList.length === 0) return;
    if (filteredGames.length > 0) {
      // If a game was selected but is no longer in the filtered list, set it to the first filtered game
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'alphabetical'
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination when filters, search query, or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSubject, filterCefr, sortBy]);

  // Filter games based on typed search query (by title, description, subject, or creator)
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
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (effectivePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="app-container">
      <LogoContainer />

      {hasPinFromUrl ? (
        <div className="panel animate-join-focus" style={{ maxWidth: '480px' }}>
          <h2>Join Game</h2>
          <div className="joined-pin-banner">
            Room PIN: <strong>{joinPin}</strong>
          </div>
          <form onSubmit={joinGame}>
            <div className="form-group">
              <label className="form-label">Nickname</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Einstein"
                maxLength={15}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <p style={{ color: '#ff4b60', marginBottom: 16, fontSize: '0.95rem' }}>{error}</p>}

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || pocketbaseStatus !== 'connected'}
            >
              {loading ? 'Joining...' : 'Enter Game'}
            </button>
          </form>
          
          <div className="change-pin-link">
            <button 
              className="btn-link"
              onClick={() => {
                setHasPinFromUrl(false);
                setJoinPin('');
                window.history.replaceState({}, document.title, window.location.pathname);
              }}
            >
              ← Join with different PIN / Host a Dahoot
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Prominent Teacher Signup/Login Header */}
          <header className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 p-4 bg-white/70 backdrop-blur-md border border-slate-200/60 rounded-2xl shadow-sm animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="bg-rose-100 p-2.5 rounded-xl text-xl">
                🏫
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">Teacher Portal</h3>
                <p className="text-xs text-slate-500">Create & manage classroom games</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              {isAuthenticated ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center sm:justify-end">
                  <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                    Logged in as: <strong className="text-slate-700 font-semibold">{userInfo?.dahoot_username || currentUser?.name || currentUser?.email}</strong>
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => setView('teacher')}
                      className="px-5 py-2.5 text-xs font-bold rounded-full bg-gradient-to-r from-school-primary to-school-accent text-slate-700 shadow-sm hover:scale-105 transition-all cursor-pointer flex-grow sm:flex-grow-0"
                    >
                      📚 Library
                    </button>
                    <button 
                      onClick={onLogout}
                      className="px-4 py-2.5 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setView('teacher')}
                  className="px-6 py-2.5 text-sm font-bold rounded-full bg-gradient-to-r from-rose-400 to-orange-400 text-white shadow-md hover:shadow-rose-100 hover:scale-105 active:scale-95 transition-all cursor-pointer w-full sm:w-auto text-center"
                >
                  Teacher Sign Up / Login
                </button>
              )}
            </div>
          </header>

          <div className="selection-grid">
          {/* Join Panel */}
          <div className="panel" style={{ padding: '24px 32px', maxWidth: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <h2 style={{ margin: 0 }}>Join Game</h2>
              <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200/50">
                ⚡ No account required
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Enter a game PIN to join an active classroom quiz.
            </p>
            <form onSubmit={joinGame} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: '1', minWidth: '120px' }}>
                <label className="form-label">Game PIN</label>
                <input 
                  type="text" 
                  className="form-input text-center" 
                  placeholder="e.g. 1234"
                  maxLength={4}
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, flex: '2', minWidth: '180px' }}>
                <label className="form-label">Nickname</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Einstein"
                  maxLength={15}
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading || pocketbaseStatus !== 'connected'}
                style={{ marginBottom: 0, height: '44px' }}
              >
                {loading ? 'Joining...' : 'Enter Game'}
              </button>
            </form>
            {error && <p style={{ color: '#ff4b60', marginTop: 12, fontSize: '0.9rem' }}>{error}</p>}
          </div>

          {/* Host Panel */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0 }}>Host a Game</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Open a new game lobby on this screen and project it for the class.
            </p>

            {/* Search / Filter Box */}
            {gamesList.length > 0 && (
              <div className="filter-panel" style={{ padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: availableSubjects.length || availableCefrLevels.length ? '10px' : '0' }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔍</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search games by title, subject, creator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={loading}
                    style={{ padding: '8px 12px', fontSize: '0.9rem', margin: 0, flex: 1 }}
                  />
                  <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm hover:border-slate-300 transition-all">
                    <ArrowUpDown className="text-slate-400 w-3.5 h-3.5" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      disabled={loading}
                      className="text-xs font-semibold text-slate-600 bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 p-0"
                      style={{ outline: 'none', WebkitAppearance: 'menulist', border: 'none', background: 'transparent', margin: 0, padding: 0 }}
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="alphabetical">Title (A-Z)</option>
                    </select>
                  </div>
                  {(searchQuery || hasActiveFilters) && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); clearFilters(); }}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#ff4b60',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {(availableSubjects.length > 0 || availableCefrLevels.length > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {availableSubjects.map(sub => {
                      const active = filterSubject.includes(sub);
                      return (
                        <button
                          key={sub}
                          onClick={() => toggleSubjectFilter(sub)}
                          className={`filter-btn ${active ? 'active-subject' : ''}`}
                          style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                        >
                          {sub}
                        </button>
                      );
                    })}
                    {availableCefrLevels.map(level => {
                      const active = filterCefr.includes(level);
                      return (
                        <button
                          key={level}
                          onClick={() => toggleCefrFilter(level)}
                          className={`filter-btn ${active ? 'active-cefr' : ''}`}
                          style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Game Cards Grid */}
            {gamesList.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 20px' }}>
                No games found. Click "Reset & Seed Demo Questions" to create one.
              </p>
            ) : sortedGames.length === 0 ? (
              <p style={{ color: '#ff4b60', fontSize: '0.85rem', margin: '4px 0 20px' }}>
                No games match your search.
              </p>
            ) : (
              <>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Showing {sortedGames.length === 0 ? 0 : (effectivePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(sortedGames.length, effectivePage * ITEMS_PER_PAGE)} of {sortedGames.length} games {sortedGames.length < gamesList.length && `(filtered from ${gamesList.length} total)`}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {paginatedGames.map(g => {
                    const isSelected = g.id === selectedGameId;
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedGameId(g.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-rose-300 bg-rose-50/50 shadow-md' 
                            : 'border-slate-200 bg-white hover:border-rose-200 hover:shadow-sm'
                        }`}
                      >
                        <h3 className="font-bold text-slate-800 text-sm mb-1.5">{g.title}</h3>
                        {g.description && (
                          <p className="text-xs text-slate-600 mb-2 line-clamp-2">{g.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {g.subject && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              📚 {g.subject}
                            </span>
                          )}
                          {g.cefr_level && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              🎓 {g.cefr_level}
                            </span>
                          )}
                          {g.creator && (() => {
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
                            
                            const displayCreator = (isMyGame && userInfo?.dahoot_username) ? userInfo.dahoot_username : g.creator;
                            return (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                👤 {displayCreator}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-100 bg-white/50 px-4 py-3 sm:px-6 mt-4 rounded-xl shadow-xs">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={effectivePage === 1}
                        className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={effectivePage === totalPages}
                        className="relative ml-3 inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-xs text-slate-500">
                          Showing <span className="font-semibold text-slate-700">{(effectivePage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                          <span className="font-semibold text-slate-700">
                            {Math.min(effectivePage * ITEMS_PER_PAGE, sortedGames.length)}
                          </span>{' '}
                          of <span className="font-semibold text-slate-700">{sortedGames.length}</span> results
                        </p>
                      </div>
                      <div>
                        <nav className="isolate inline-flex -space-x-px rounded-lg border border-slate-200 bg-white shadow-xs" aria-label="Pagination">
                          <button
                            type="button"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={effectivePage === 1}
                            className="relative inline-flex items-center rounded-l-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                          >
                            <span className="sr-only">Previous</span>
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          
                          {getPageNumbers().map((page, idx) => {
                            if (page === '...') {
                              return (
                                <span
                                  key={`ellipsis-${idx}`}
                                  className="relative inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-400 border-l border-slate-200 select-none"
                                >
                                  ...
                                </span>
                              );
                            }
                            const isCurrent = page === effectivePage;
                            return (
                              <button
                                key={page}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={`relative inline-flex items-center px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'z-10 bg-rose-500 text-white hover:bg-rose-600'
                                    : 'text-slate-600 hover:bg-slate-50 border-l border-slate-200'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={effectivePage === totalPages}
                            className="relative inline-flex items-center rounded-r-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-l border-slate-200 transition-all cursor-pointer"
                          >
                            <span className="sr-only">Next</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {selectedGameId && gameQuestions.length > 0 && (
              <div 
                ref={settingsRef}
                className="animate-fade-in relative" 
                style={{ 
                  position: 'relative',
                  textAlign: 'left', 
                  marginBottom: 20, 
                  padding: '16px', 
                  background: 'rgba(93, 107, 130, 0.04)', 
                  borderRadius: '16px',
                  border: '1px solid rgba(93, 107, 130, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <span className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  ⚙️ Game Settings
                </span>
                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
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
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {copied ? '✅ Link Copied!' : '🔗 Share Quiz'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPreviewModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    Preview / Edit
                  </button>
                </div>
                
                {/* Randomize Option */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={randomize} 
                    onChange={(e) => setRandomize(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: '#FFB7B2',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#334155' }}>
                    Randomize question order
                  </span>
                </label>

                {/* Question Types Option */}
                {availableQuestionTypes.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#55657e' }}>
                      Question Types to Include:
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                      {availableQuestionTypes.map(type => {
                        const count = getQuestionTypeCount(type);
                        const isChecked = selectedQuestionTypes.includes(type);
                        return (
                          <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => toggleQuestionType(type)}
                              style={{
                                width: '16px',
                                height: '16px',
                                accentColor: '#FFB7B2',
                                cursor: 'pointer'
                              }}
                            />
                            <span style={{ fontSize: '0.9rem', color: '#475569' }}>
                              {getQuestionTypeLabel(type)} <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({count})</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Limit Option */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#55657e' }}>
                    Number of questions to use:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      min={1} 
                      max={totalQuestions || 1}
                      disabled={totalQuestions === 0}
                      value={totalQuestions === 0 ? '' : maxQuestions}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setMaxQuestions('');
                        } else {
                          const num = Math.min(totalQuestions, Math.max(1, parseInt(val) || 1));
                          setMaxQuestions(num.toString());
                        }
                      }}
                      style={{ 
                        maxWidth: '90px', 
                        padding: '6px 12px', 
                        fontSize: '1rem', 
                        height: 'auto',
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      out of {totalQuestions} available
                    </span>
                  </div>
                  {totalQuestions === 0 && (
                    <span style={{ color: '#ff4b60', fontSize: '0.8rem', marginTop: '2px' }}>
                      ⚠️ Please select at least one question type.
                    </span>
                  )}
                </div>

                {/* Timer Duration Option */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#55657e' }}>
                    Question Timer Limit:
                  </span>
                  <select
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(parseInt(e.target.value))}
                    className="form-input"
                    style={{ width: '230px', maxWidth: '230px', cursor: 'pointer', height: 'auto', padding: '8px 12px', fontSize: '0.95rem' }}
                  >
                    <option value={10}>10 Seconds</option>
                    <option value={20}>20 Seconds (Default)</option>
                    <option value={30}>30 Seconds</option>
                    <option value={60}>60 Seconds</option>
                    <option value={0}>No Timer (Unlimited)</option>
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginBottom: 16 }}>
              <button 
                className="btn btn-primary" 
                onClick={() => startHosting(selectedGameId, { randomize, maxQuestions: parseInt(maxQuestions) || 0, timerDuration, questionTypes: selectedQuestionTypes })} 
                disabled={loading || pocketbaseStatus !== 'connected' || !selectedGameId || !totalQuestions}
                style={{ width: '100%' }}
              >
                {loading ? 'Initializing...' : 'Class Game (Teacher-Paced)'}
              </button>
              
              <button 
                className="btn btn-secondary w-full bg-blue-500/10 hover:bg-blue-500/20" 
                onClick={() => startMarathonHosting(selectedGameId, { randomize, maxQuestions: parseInt(maxQuestions) || 0, questionTypes: selectedQuestionTypes, pacingMode: 'student' })} 
                disabled={loading || !selectedGameId || !totalQuestions}
                style={{ 
                  border: '1.5px solid #3b82f6',
                  color: 'var(--text-secondary)'
                }}
              >
                Class Game (Student-Paced)
              </button>

              <button 
                className="btn btn-secondary w-full bg-[#FFB7B2]/10 hover:bg-[#FFB7B2]/20" 
                onClick={() => startSoloPractice(selectedGameId, { randomize, maxQuestions: parseInt(maxQuestions) || 0, questionTypes: selectedQuestionTypes })} 
                disabled={loading || !selectedGameId || !totalQuestions}
                style={{ 
                  border: '1.5px solid var(--color-school-primary)',
                  color: 'var(--text-secondary)'
                }}
              >
                Single Player Game
              </button>
            </div>
          </div>
        </div>
      </>
    )}
      <SchoolFooter status={pocketbaseStatus} />

      <QuestionsPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        gameId={selectedGameId}
        gamesList={gamesList}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        userInfo={userInfo}
        gameQuestions={gameQuestions}
        refreshQuestions={refreshQuestions}
      />
    </div>
  );
}
