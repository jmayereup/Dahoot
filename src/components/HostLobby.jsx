import React from 'react';

export function HostLobby({
  hostRoom,
  hostPlayers,
  qrCodeUrl,
  joinUrl,
  copied,
  handleCopyLink,
  hostStartGame,
  hostEndGame
}) {
  return (
    <div>
      <div className="room-header">
        <div className="room-pin-display">
          <span className="pin-label">Join at Dahoot with Game PIN:</span>
          <span className="pin-value">{hostRoom.code}</span>
        </div>
        <div className="room-stats">
          <div className="stat-box">
            <div className="stat-num">{hostPlayers.length}</div>
            <div className="stat-label">Players</div>
          </div>
        </div>
      </div>

      <div className="lobby-content-layout">
        {/* Left Side: QR Code and Join Link */}
        <div className="lobby-share-panel">
          <div className="qr-container-card">
            {qrCodeUrl ? (
              <div className="qr-image-wrapper">
                <img src={qrCodeUrl} alt="QR Code to Join" className="lobby-qr-img" />
              </div>
            ) : (
              <div className="qr-placeholder">Generating QR Code...</div>
            )}
            <p className="qr-subtitle">Scan to join on your device</p>
          </div>

          <div className="share-link-card">
            <div className="share-link-label">Or share this direct link:</div>
            <div className="share-link-input-group">
              <div 
                className="share-link-input"
                onClick={handleCopyLink}
                title="Click to copy"
              >
                {joinUrl}
              </div>
              <button 
                className={`btn ${copied ? 'btn-success' : 'btn-secondary'} btn-copy`}
                onClick={handleCopyLink}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Players List */}
        <div className="lobby-players-panel">
          <h2>Waiting for Players...</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            Students will appear here as they enter the PIN.
          </p>

          <div className="players-grid">
            {hostPlayers.length === 0 ? (
              <div className="empty-state">
                No players in the lobby yet.
                <br />
                Scan the QR code or enter Game PIN <strong>{hostRoom.code}</strong> to join!
              </div>
            ) : (
              hostPlayers.map((player) => (
                <div key={player.id} className="player-badge">
                  {player.name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 32, justifyContent: 'center' }}>
        <button 
          className="btn btn-start-game btn-lg" 
          onClick={hostStartGame}
          disabled={hostPlayers.length === 0}
          style={{ minWidth: 200 }}
        >
          Start Game
        </button>
        <button className="btn btn-secondary btn-lg" onClick={hostEndGame}>
          Cancel Game
        </button>
      </div>
    </div>
  );
}
