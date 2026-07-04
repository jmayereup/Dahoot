import React, { useEffect, useRef } from 'react';

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon = null
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const palette = {
    danger: {
      iconBg: 'rgba(239, 68, 68, 0.1)',
      iconColor: '#EF4444',
      button: 'btn-danger',
      accent: '#EF4444'
    },
    warning: {
      iconBg: 'rgba(245, 158, 11, 0.12)',
      iconColor: '#F59E0B',
      button: 'btn-warning',
      accent: '#F59E0B'
    },
    primary: {
      iconBg: 'rgba(139, 92, 246, 0.12)',
      iconColor: '#8B5CF6',
      button: 'btn-primary',
      accent: '#8B5CF6'
    }
  }[variant] || {
    iconBg: 'rgba(239, 68, 68, 0.1)',
    iconColor: '#EF4444',
    button: 'btn-danger',
    accent: '#EF4444'
  };

  return (
    <div
      ref={containerRef}
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 10, 15, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fade-in 0.2s ease-out'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel animate-pop-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '28px 24px',
          textAlign: 'center',
          position: 'relative',
          border: '1px solid var(--panel-border)'
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="bg-black/[0.04] hover:bg-black/[0.08]"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '1rem',
            cursor: 'pointer',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          ✕
        </button>

        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: palette.iconBg,
            color: palette.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 16px',
            fontWeight: '700'
          }}
        >
          {icon || (variant === 'danger' ? '⚠️' : variant === 'warning' ? '⚠️' : '❓')}
        </div>

        <h2
          id="confirm-modal-title"
          style={{
            fontSize: '1.35rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}
        >
          {title}
        </h2>

        {message && (
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              marginBottom: '24px'
            }}
          >
            {message}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ flex: 1, minWidth: '120px' }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`btn ${palette.button}`}
            style={{ flex: 1, minWidth: '120px' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
