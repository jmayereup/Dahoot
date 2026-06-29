import React from 'react';

export function HostFinished({ hostPlayers, hostEndGame }) {
  return (
    <div>
      <h1>🏆 Game Over!</h1>
      <h2>Final Standings</h2>

      <div className="podium-container">
        {/* 2nd Place */}
        {hostPlayers[1] && (
          <div className="podium-step podium-step-2">
            <span className="podium-player-score">{hostPlayers[1].score} pts</span>
            <span className="podium-player-name">{hostPlayers[1].name}</span>
            <div className="podium-block">2</div>
          </div>
        )}
        {/* 1st Place */}
        {hostPlayers[0] && (
          <div className="podium-step podium-step-1">
            <span className="podium-player-score">{hostPlayers[0].score} pts</span>
            <span className="podium-player-name">{hostPlayers[0].name}</span>
            <div className="podium-block">1</div>
          </div>
        )}
        {/* 3rd Place */}
        {hostPlayers[2] && (
          <div className="podium-step podium-step-3">
            <span className="podium-player-score">{hostPlayers[2].score} pts</span>
            <span className="podium-player-name">{hostPlayers[2].name}</span>
            <div className="podium-block">3</div>
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={hostEndGame} style={{ marginTop: 24 }}>
        Close Room & Return Home
      </button>
    </div>
  );
}
