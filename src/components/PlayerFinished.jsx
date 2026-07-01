import React from 'react';

export function PlayerFinished({ playerRecord, exitGame }) {
  return (
    <div>
      <div style={{ fontSize: '5rem', marginBottom: 16 }}>🏁</div>
      <h2>Game Finished!</h2>
      <div className="points-text" style={{ color: 'var(--accent-light)' }}>
        {playerRecord.score} pts
      </div>
      <p className="waiting-message">Check the host screen to see the final podium standings.</p>
      
      <button className="btn btn-primary" onClick={exitGame} style={{ marginTop: 24 }}>
        Back to Home Screen
      </button>
    </div>
  );
}
