import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PocketBaseStatusBanner } from './PocketBaseStatusBanner';
import { LogoContainer } from './LogoContainer';
import { SchoolFooter } from './SchoolFooter';
import { pb } from '../pb';


export function SelectionView({
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
  setHasPinFromUrl,
  setView,
  gamesList = [],
  refreshGames,
  availableSubjects = [],
  availableCefrLevels = [],
  isAuthenticated,
  currentUser,
  onLogout,
  selectedGameId,
  setSelectedGameId
}) {

  // Custom game options
  const [randomize, setRandomize] = useState(true);
  const [gameQuestions, setGameQuestions] = useState([]);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState([
    'MULTIPLE_CHOICE',
    'SORTING',
    'DRAG_DROP',
    'DROP_DOWN',
    'CATEGORIZE'
  ]);
  const [maxQuestions, setMaxQuestions] = useState('');
  const [timerDuration, setTimerDuration] = useState(20);

  // Fetch questions when game is selected
  useEffect(() => {
    if (!selectedGameId) {
      setGameQuestions([]);
      setMaxQuestions('');
      return;
    }

    let isMounted = true;
    pb.collection('dahoot_questions').getFullList({
      filter: `game_id = "${selectedGameId}"`
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

  // Find currently selected game details to display metadata below dropdown
  const selectedGameDetails = useMemo(() => {
    return gamesList.find(g => g.id === selectedGameId) || null;
  }, [gamesList, selectedGameId]);

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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Clear search query when a different game is selected
  useEffect(() => {
    setSearchQuery('');
  }, [selectedGameId]);

  // Handle click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter games based on typed search query (by title, description, subject, or creator)
  const searchedGames = useMemo(() => {
    return filteredGames.filter(game => {
      // If the query matches the current selection exactly, show all options on focus rather than filtering to just one
      if (!searchQuery || (selectedGameDetails && searchQuery === selectedGameDetails.title)) {
        return true;
      }
      const q = searchQuery.toLowerCase();
      return (
        game.title.toLowerCase().includes(q) ||
        (game.description && game.description.toLowerCase().includes(q)) ||
        (game.subject && game.subject.toLowerCase().includes(q)) ||
        (game.creator && game.creator.toLowerCase().includes(q))
      );
    });
  }, [filteredGames, searchQuery, selectedGameDetails]);

  return (
    <div className="app-container">
      <PocketBaseStatusBanner status={pocketbaseStatus} />
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
              ← Join with different PIN / Host a quiz
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
                    Logged in as: <strong className="text-slate-700 font-semibold">{currentUser?.email}</strong>
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
          {/* Host Panel */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2>Host a Quiz</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Open a new game lobby on this screen and project it for the class.
            </p>

            {/* Filter Pills inside Selection View */}
            {gamesList.length > 0 && (
              <div className="filter-panel" style={{ padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🔍 Filter Games List
                  </span>
                  {hasActiveFilters && (
                    <button 
                      onClick={clearFilters}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff4b60',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Subject Pills */}
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Subject
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {availableSubjects.map(sub => {
                      const active = filterSubject.includes(sub);
                      return (
                        <button
                          key={sub}
                          onClick={() => toggleSubjectFilter(sub)}
                          className={`filter-btn ${active ? 'active-subject' : ''}`}
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CEFR Level Pills */}
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    CEFR Level
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {availableCefrLevels.map(level => {
                      const active = filterCefr.includes(level);
                      return (
                        <button
                          key={level}
                          onClick={() => toggleCefrFilter(level)}
                          className={`filter-btn ${active ? 'active-cefr' : ''}`}
                          style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group" style={{ textAlign: 'left', marginBottom: 20, position: 'relative' }} ref={dropdownRef}>
              <label className="form-label">Select Dahoot</label>
              {gamesList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0' }}>
                  No games found. Click "Reset & Seed Demo Questions" to create one.
                </p>
              ) : filteredGames.length === 0 ? (
                <p style={{ color: '#ff4b60', fontSize: '0.85rem', margin: '4px 0' }}>
                  No games match your selected filters.
                </p>
              ) : (
                <>
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder={selectedGameDetails ? selectedGameDetails.title : "Type to search games..."}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsOpen(true);
                      }}
                      onFocus={() => setIsOpen(true)}
                      disabled={loading}
                      style={{ 
                        paddingRight: (searchQuery || selectedGameId) ? '60px' : '40px',
                        cursor: 'text'
                      }}
                    />
                    {(searchQuery || selectedGameId) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery('');
                          setSelectedGameId('');
                          setIsOpen(true);
                        }}
                        style={{
                          position: 'absolute',
                          right: '36px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          border: 'none',
                          background: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ff4b60'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                        aria-label="Clear search"
                      >
                        ✕
                      </button>
                    )}
                    <div 
                      onClick={() => !loading && setIsOpen(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: isOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0deg)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        pointerEvents: loading ? 'none' : 'auto',
                        fontSize: '0.8rem',
                        transition: 'transform 0.2s'
                      }}
                    >
                      ▼
                    </div>

                    {isOpen && !loading && (
                      <div 
                        className="animate-pop-in"
                        style={{
                          position: 'absolute',
                          top: '105%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          zIndex: 1000,
                          maxHeight: '220px',
                          overflowY: 'auto',
                          backdropFilter: 'blur(8px)'
                        }}
                      >
                        {searchedGames.length === 0 ? (
                          <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                            No Dahoots found
                          </div>
                        ) : (
                          searchedGames.map(g => {
                            const isSelected = g.id === selectedGameId;
                            return (
                              <div
                                key={g.id}
                                onClick={() => {
                                  setSelectedGameId(g.id);
                                  setIsOpen(false);
                                }}
                                style={{
                                  padding: '12px 16px',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s',
                                  backgroundColor: isSelected ? 'rgba(255, 183, 178, 0.15)' : 'transparent',
                                  borderLeft: isSelected ? '4px solid var(--accent-light)' : '4px solid transparent',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(93, 107, 130, 0.04)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>
                                  {g.title}
                                </div>
                                {g.description && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {g.description}
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', marginTop: '2px', color: 'var(--text-secondary)' }}>
                                  {g.subject && <span>📚 {g.subject}</span>}
                                  {g.cefr_level && <span>🎓 {g.cefr_level}</span>}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Game Metadata Badges */}
                  {selectedGameDetails && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 2px' }}>
                      {selectedGameDetails.subject && (
                        <span className="game-tag">
                          📚 {selectedGameDetails.subject}
                        </span>
                      )}
                      {selectedGameDetails.cefr_level && (
                        <span className="game-tag">
                          🎓 {selectedGameDetails.cefr_level}
                        </span>
                      )}
                      {selectedGameDetails.language && (
                        <span className="game-tag">
                          🗣️ {selectedGameDetails.language}
                        </span>
                      )}
                      {selectedGameDetails.creator && (
                        <span className="game-tag">
                          👤 {selectedGameDetails.creator}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {selectedGameId && gameQuestions.length > 0 && (
              <div 
                className="animate-fade-in" 
                style={{ 
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
                {loading ? 'Initializing...' : 'Host Live Room'}
              </button>
              
              <button 
                className="btn btn-secondary" 
                onClick={() => startSoloPractice(selectedGameId, { randomize, maxQuestions: parseInt(maxQuestions) || 0, questionTypes: selectedQuestionTypes })} 
                disabled={loading || !selectedGameId || !totalQuestions}
                style={{ 
                  width: '100%',
                  background: 'rgba(255, 183, 178, 0.1)', 
                  border: '1.5px solid var(--color-school-primary)',
                  color: 'var(--text-secondary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 183, 178, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 183, 178, 0.1)';
                }}
              >
                Practice Solo (Self-Paced)
              </button>
            </div>
          </div>

          {/* Join Panel */}
          <div className="panel">
            <h2>Join Game</h2>
            <div style={{ marginBottom: 20 }}>
              <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full mb-3 border border-emerald-200/50">
                ⚡ Student: No account required
              </span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Participate as a player in an active classroom quiz.
              </p>
            </div>
            <form onSubmit={joinGame}>
              <div className="form-group">
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
          </div>
        </div>
      </>
    )}
      <SchoolFooter />
    </div>
  );
}
