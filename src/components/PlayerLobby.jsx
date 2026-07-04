import React, { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';

export function PlayerLobby({ playerRecord, exitGame }) {
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  return (
    <div>
      <div className="spinner" />
      <h2>You're in!</h2>
      <p className="waiting-message">See your nickname <strong>{playerRecord.name}</strong> on the projector.</p>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Waiting for the host to start the game...</p>
      
      <button 
        className="btn btn-secondary btn-sm" 
        onClick={() => setShowLeaveConfirm(true)} 
        style={{ marginTop: 32 }}
      >
        Leave Game
      </button>

      <ConfirmModal
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={exitGame}
        title="Leave the game?"
        message="You'll be disconnected from this game session. Are you sure you want to leave?"
        confirmText="Leave Game"
        cancelText="Stay"
        variant="warning"
        icon="🚪"
      />
    </div>
  );
}
