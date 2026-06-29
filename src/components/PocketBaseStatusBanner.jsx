import React from 'react';

export function PocketBaseStatusBanner({ status }) {
  return (
    <div style={{
      position: 'absolute',
      top: 16,
      right: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: '0.85rem',
      background: 'rgba(255, 255, 255, 0.05)',
      padding: '6px 12px',
      borderRadius: '20px',
      border: '1px solid rgba(255, 255, 255, 0.08)'
    }}>
      <span style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: status === 'connected' ? '#10b981' : status === 'checking' ? '#f59e0b' : '#ef4444'
      }} />
      <span style={{ color: 'var(--text-secondary)' }}>
        PocketBase: {status === 'connected' ? 'Connected' : status === 'checking' ? 'Checking...' : 'Disconnected'}
      </span>
    </div>
  );
}
