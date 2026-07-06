export function JoinGameViaUrlPanel({ joinPin, setJoinPin, playerName, setPlayerName, loading, pocketbaseStatus, error, joinGame, setHasPinFromUrl }) {
  return (
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
  );
}
