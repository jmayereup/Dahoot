import React, { useState, useEffect } from 'react';
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
  refreshGames
}) {
  const [selectedGameId, setSelectedGameId] = useState('');

  useEffect(() => {
    if (gamesList.length > 0 && !selectedGameId) {
      setSelectedGameId(gamesList[0].id);
    }
  }, [gamesList, selectedGameId]);

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
          <div className="panel">
            <h2>Host a Quiz</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              Open a new game lobby on this screen and project it for the class.
            </p>

            <div className="form-group" style={{ textAlign: 'left', marginBottom: 24 }}>
              <label className="form-label">Select Game Collection</label>
              {gamesList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0' }}>
                  No games found. Click "Reset & Seed Demo Questions" to create one.
                </p>
              ) : (
                <select 
                  className="form-input" 
                  value={selectedGameId} 
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  disabled={loading}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">-- Choose a Game --</option>
                  {gamesList.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
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

          {/* Join/Player Panel */}
          <div className="panel">
            <h2>Join Game</h2>
            <form onSubmit={joinGame}>
              <div className="form-group">
                <label className="form-label">Game PIN</label>
                <input 
                  type="text" 
                  className="form-input pin-input"
                  placeholder="0000" 
                  maxLength={4}
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value.replace(/\D/g,''))}
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
