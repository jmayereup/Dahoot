import React, { useState } from 'react';

export function LogoContainer() {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <>
      <div className="logo-container">
        {!imgFailed ? (
          <img 
            src="/logo.png" 
            alt="Datdaruni School Logo" 
            className="logo-img"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="logo-rocket">🚀</span>
        )}
        <h1>Dahoot</h1>
      </div>
      <p className="subtitle">Self-Hosted Educational Quiz Platform</p>
    </>
  );
}
