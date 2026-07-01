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
  seedQuestions,
  setHasPinFromUrl,
  setView,
  gamesList = [],
  refreshGames,
  availableSubjects = [],
  availableCefrLevels = []
}) {
  const [selectedGameId, setSelectedGameId] = useState('');

  // Custom game options
  const [randomize, setRandomize] = useState(false);
  const [maxQuestions, setMaxQuestions] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timerDuration, setTimerDuration] = useState(20);

  // Fetch total questions count when game is selected
  useEffect(() => {
    if (!selectedGameId) {
      setTotalQuestions(0);
      setMaxQuestions('');
      return;
    }

    let isMounted = true;
    pb.collection('dahoot_questions').getList(1, 1, {
      filter: `game_id = "${selectedGameId}"`
    })
    .then(res => {
      if (isMounted) {
        setTotalQuestions(res.totalItems);
        setMaxQuestions(res.totalItems.toString());
      }
    })
    .catch(err => {
      console.error("Error fetching questions count:", err);
      if (isMounted) {
        setTotalQuestions(0);
        setMaxQuestions('');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedGameId]);

  
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
    if (filteredGames.length > 0) {
      // If current selection is not in the filtered list, set it to the first filtered game
      const isStillAvailable = filteredGames.some(g => g.id === selectedGameId);
      if (!isStillAvailable) {
        setSelectedGameId(filteredGames[0].id);
      }
    } else {
      setSelectedGameId('');
    }
  }, [filteredGames, selectedGameId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Sync searchQuery when selectedGameDetails changes
  useEffect(() => {
    if (selectedGameDetails) {
      setSearchQuery(selectedGameDetails.title);
    } else {
      setSearchQuery('');
    }
  }, [selectedGameDetails]);

  // Handle click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        if (selectedGameDetails) {
          setSearchQuery(selectedGameDetails.title);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedGameDetails]);

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
              <label className="form-label">Select Game Collection</label>
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
                      placeholder="Type to search games..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsOpen(true);
                      }}
                      onFocus={() => setIsOpen(true)}
                      disabled={loading}
                      style={{ 
                        paddingRight: '40px',
                        cursor: 'text'
                      }}
                    />
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
                            No collections found
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

            {selectedGameId && totalQuestions > 0 && (
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
                      max={totalQuestions}
                      value={maxQuestions}
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

            <button 
              className="btn btn-primary" 
              onClick={() => startHosting(selectedGameId, { randomize, maxQuestions: parseInt(maxQuestions) || 0, timerDuration })} 
              disabled={loading || pocketbaseStatus !== 'connected' || !selectedGameId}
              style={{ marginBottom: 16 }}
            >
              {loading ? 'Initializing...' : 'Create Game Lobby'}
            </button>
            
            <div className="divider">OR ADMIN</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setView('teacher')}
                disabled={loading || pocketbaseStatus !== 'connected'}
              >
                ⚙ Manage Games & Questions
              </button>
              
              <button 
                className="btn btn-link btn-sm"
                onClick={seedQuestions}
                disabled={loading || pocketbaseStatus !== 'connected'}
                style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}
              >
                Reset & Seed Demo Questions
              </button>
            </div>
          </div>

          {/* Join Panel */}
          <div className="panel">
            <h2>Join Game</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
              Participate as a player in an active classroom quiz.
            </p>
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
      )}
      <SchoolFooter />
    </div>
  );
}
