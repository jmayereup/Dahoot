import React, { useState, useEffect, useMemo } from 'react';
import { PocketBaseStatusBanner } from './PocketBaseStatusBanner';
import { LogoContainer } from './LogoContainer';

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
              <div style={{
                background: 'rgba(15, 23, 42, 0.25)',
                border: '1px solid var(--panel-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                marginBottom: '20px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
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
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    Subject
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {availableSubjects.map(sub => {
                      const active = filterSubject.includes(sub);
                      return (
                        <button
                          key={sub}
                          onClick={() => toggleSubjectFilter(sub)}
                          style={{
                            background: active ? 'linear-gradient(135deg, #3b82f6 0%, #1368ce 100%)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid ' + (active ? '#3b82f6' : 'rgba(255,255,255,0.05)'),
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.75rem',
                            color: active ? '#ffffff' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CEFR Level Pills */}
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                    CEFR Level
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {availableCefrLevels.map(level => {
                      const active = filterCefr.includes(level);
                      return (
                        <button
                          key={level}
                          onClick={() => toggleCefrFilter(level)}
                          style={{
                            background: active ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid ' + (active ? 'var(--accent)' : 'rgba(255,255,255,0.05)'),
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '0.75rem',
                            color: active ? '#ffffff' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="form-group" style={{ textAlign: 'left', marginBottom: 20 }}>
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
                  <select 
                    className="form-input" 
                    value={selectedGameId} 
                    onChange={(e) => setSelectedGameId(e.target.value)}
                    disabled={loading}
                    style={{ cursor: 'pointer', marginBottom: 12 }}
                  >
                    {filteredGames.map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>

                  {/* Selected Game Metadata Badges */}
                  {selectedGameDetails && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '4px 2px' }}>
                      {selectedGameDetails.subject && (
                        <span style={{ 
                          background: 'rgba(59, 130, 246, 0.1)', 
                          border: '1px solid rgba(59, 130, 246, 0.3)', 
                          color: '#60a5fa', 
                          fontSize: '0.7rem', 
                          fontWeight: 600,
                          padding: '2px 8px', 
                          borderRadius: '12px' 
                        }}>
                          📚 {selectedGameDetails.subject}
                        </span>
                      )}
                      {selectedGameDetails.cefr_level && (
                        <span style={{ 
                          background: 'rgba(168, 85, 247, 0.1)', 
                          border: '1px solid rgba(168, 85, 247, 0.3)', 
                          color: '#c084fc', 
                          fontSize: '0.7rem', 
                          fontWeight: 600,
                          padding: '2px 8px', 
                          borderRadius: '12px' 
                        }}>
                          🎓 {selectedGameDetails.cefr_level}
                        </span>
                      )}
                      {selectedGameDetails.language && (
                        <span style={{ 
                          background: 'rgba(16, 185, 129, 0.1)', 
                          border: '1px solid rgba(16, 185, 129, 0.3)', 
                          color: '#34d399', 
                          fontSize: '0.7rem', 
                          fontWeight: 600,
                          padding: '2px 8px', 
                          borderRadius: '12px' 
                        }}>
                          🗣️ {selectedGameDetails.language}
                        </span>
                      )}
                      {selectedGameDetails.creator && (
                        <span style={{ 
                          background: 'rgba(245, 158, 11, 0.1)', 
                          border: '1px solid rgba(245, 158, 11, 0.3)', 
                          color: '#fbbf24', 
                          fontSize: '0.7rem', 
                          fontWeight: 600,
                          padding: '2px 8px', 
                          borderRadius: '12px' 
                        }}>
                          👤 {selectedGameDetails.creator}
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <button 
              className="btn btn-primary" 
              onClick={() => startHosting(selectedGameId)} 
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
    </div>
  );
}
