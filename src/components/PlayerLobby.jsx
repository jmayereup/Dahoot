import React from 'react';

export function PlayerLobby({ playerRecord, exitGame }) {
  return (
    <div>
      <div className="spinner" />
      <h2>You're in!</h2>
      <p className="waiting-message">See your nickname <strong>{playerRecord.name}</strong> on the projector.</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Waiting for the host to start the game...</p>
      
      <button 
        className="btn btn-secondary btn-sm" 
        onClick={() => {
          if (window.confirm("Are you sure you want to leave the game?")) {
            exitGame();
          }
        }} 
        style={{ marginTop: 32 }}
      >
        Leave Game
      </button>
    </div>
  );
}
