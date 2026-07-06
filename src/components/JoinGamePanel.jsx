export function JoinGamePanel({ joinPin, setJoinPin, playerName, setPlayerName, loading, error, joinGame, pocketbaseStatus }) {
  return (
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
  );
}
