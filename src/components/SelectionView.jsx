import React, { useState, useEffect, useMemo } from 'react';
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
  startMarathonHosting,
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
  const [pacingMode, setPacingMode] = useState('student');

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

  // Filter games based on typed search query (by title, description, subject, or creator)
  const searchedGames = useMemo(() => {
    if (!searchQuery) return filteredGames.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return filteredGames.filter(game =>
      game.title.toLowerCase().includes(q) ||
      (game.description && game.description.toLowerCase().includes(q)) ||
      (game.subject && game.subject.toLowerCase().includes(q)) ||
      (game.creator && game.creator.toLowerCase().includes(q))
    );
  }, [filteredGames, searchQuery]);

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
            <h2>Host a Quiz</h2>
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
                    style={{ padding: '8px 12px', fontSize: '0.9rem', margin: 0 }}
                  />
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
            ) : searchedGames.length === 0 ? (
              <p style={{ color: '#ff4b60', fontSize: '0.85rem', margin: '4px 0 20px' }}>
                No games match your search.
              </p>
            ) : (
              <>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Showing {searchedGames.length} of {gamesList.length} games
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {searchedGames.map(g => {
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
                          {g.creator && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              👤 {g.creator}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

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

                {/* Pacing Mode Option */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#55657e' }}>
                    Pacing Mode:
                  </span>
                  <select
                    value={pacingMode}
                    onChange={(e) => setPacingMode(e.target.value)}
                    className="form-input"
                    style={{ width: '250px', maxWidth: '250px', cursor: 'pointer', height: 'auto', padding: '8px 12px', fontSize: '0.95rem' }}
                  >
                    <option value="student">Student-Paced (Players advance independently)</option>
                    <option value="teacher">Teacher-Paced (Host controls advancement)</option>
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
                className="btn btn-secondary w-full bg-[#FFB7B2]/10 hover:bg-[#FFB7B2]/20" 
                onClick={() => startSoloPractice(selectedGameId, { randomize, maxQuestions: parseInt(maxQuestions) || 0, questionTypes: selectedQuestionTypes })} 
                disabled={loading || !selectedGameId || !totalQuestions}
                style={{ 
                  border: '1.5px solid var(--color-school-primary)',
                  color: 'var(--text-secondary)'
                }}
              >
                Practice Solo (Self-Paced)
              </button>
              
              <button 
                className="btn btn-secondary w-full bg-blue-500/10 hover:bg-blue-500/20" 
                onClick={() => startMarathonHosting(selectedGameId, { randomize, maxQuestions: parseInt(maxQuestions) || 0, questionTypes: selectedQuestionTypes, pacingMode })} 
                disabled={loading || !selectedGameId || !totalQuestions}
                style={{ 
                  border: '1.5px solid #3b82f6',
                  color: 'var(--text-secondary)'
                }}
              >
                🏃 Host Marathon Mode
              </button>
            </div>
          </div>
        </div>
      </>
    )}
      <SchoolFooter status={pocketbaseStatus} />
    </div>
  );
}
