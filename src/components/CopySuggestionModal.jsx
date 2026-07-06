export function CopySuggestionModal({ game, onClose, onEditOriginal, onCopyAnyway }) {
  if (!game) return null;

  const hasEditPermission = onEditOriginal != null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 10, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fade-in 0.2s ease-out'
      }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="panel animate-pop-in"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '28px 24px',
          textAlign: 'center',
          position: 'relative',
          border: '1px solid var(--panel-border)'
        }}
      >
        <button
          type="button"
          onClick={onClose}
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
          aria-label="Close"
        >
          ✕
        </button>

        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.12)',
            color: '#8B5CF6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 16px',
            fontWeight: '700'
          }}
        >
          📋
        </div>

        <h2
          style={{
            fontSize: '1.35rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}
        >
          Copy this game?
        </h2>

        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '0.95rem',
            lineHeight: 1.5,
            marginBottom: '24px'
          }}
        >
          {hasEditPermission ? (
            <>
              Are you copying <strong>"{game.title}"</strong> to fix mistakes or improve it? If so, please consider editing the original directly so everyone benefits from the corrections!
            </>
          ) : (
            <>
              A duplicate of <strong>"{game.title}"</strong> will be created with "(Copy)" appended to its title. If you notice any mistakes, you can edit your copy or let the creator know.
            </>
          )}
        </p>

        <div className="flex flex-col gap-2.5 w-full">
          {hasEditPermission && (
            <button
              type="button"
              onClick={onEditOriginal}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95 border-none"
            >
              ✏️ Edit Original (Fix Mistakes)
            </button>
          )}
          <button
            type="button"
            onClick={onCopyAnyway}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
          >
            📋 Copy Game Anyway
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold bg-transparent border-none cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
