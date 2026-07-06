export function GameSettings({
  settingsRef,
  selectedGameId,
  randomize, setRandomize,
  gameQuestions,
  totalQuestions,
  availableQuestionTypes,
  selectedQuestionTypes,
  toggleQuestionType,
  getQuestionTypeLabel,
  getQuestionTypeCount,
  maxQuestions, setMaxQuestions,
  timerDuration, setTimerDuration,
  copied, handleCopyShareLink, handleOpenPreview,
}) {
  if (!selectedGameId || gameQuestions.length === 0) return null;

  return (
    <div
      ref={settingsRef}
      className="animate-fade-in relative"
      style={{
        position: 'relative',
        textAlign: 'left',
        marginBottom: 20,
        padding: '16px',
        background: 'rgba(93, 107, 130, 0.04)',
        borderRadius: '16px',
        border: '1px solid rgba(93, 107, 130, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <span className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        ⚙️ Game Settings
      </span>
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCopyShareLink();
          }}
          className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
        >
          {copied ? '✅ Link Copied!' : '🔗 Share Quiz'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPreview();
          }}
          className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
        >
          Preview / Edit
        </button>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={randomize}
          onChange={(e) => setRandomize(e.target.checked)}
          style={{
            width: '18px',
            height: '18px',
            accentColor: '#FFB7B2',
            cursor: 'pointer'
          }}
        />
        <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#334155' }}>
          Randomize question order
        </span>
      </label>

      {availableQuestionTypes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#55657e' }}>
            Question Types to Include:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
            {availableQuestionTypes.map(type => {
              const count = getQuestionTypeCount(type);
              const isChecked = selectedQuestionTypes.includes(type);
              return (
                <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleQuestionType(type)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#FFB7B2',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#475569' }}>
                    {getQuestionTypeLabel(type)} <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>({count})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#55657e' }}>
          Number of questions to use:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            className="form-input"
            min={1}
            max={totalQuestions || 1}
            disabled={totalQuestions === 0}
            value={totalQuestions === 0 ? '' : maxQuestions}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setMaxQuestions('');
              } else {
                const num = Math.min(totalQuestions, Math.max(1, parseInt(val) || 1));
                setMaxQuestions(num.toString());
              }
            }}
            style={{
              maxWidth: '90px',
              padding: '6px 12px',
              fontSize: '1rem',
              height: 'auto',
              textAlign: 'center'
            }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            out of {totalQuestions} available
          </span>
        </div>
        {totalQuestions === 0 && (
          <span style={{ color: '#ff4b60', fontSize: '0.8rem', marginTop: '2px' }}>
            ⚠️ Please select at least one question type.
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#55657e' }}>
          Question Timer Limit:
        </span>
        <select
          value={timerDuration}
          onChange={(e) => setTimerDuration(parseInt(e.target.value))}
          className="form-input"
          style={{ width: '230px', maxWidth: '230px', cursor: 'pointer', height: 'auto', padding: '8px 12px', fontSize: '0.95rem' }}
        >
          <option value={10}>10 Seconds</option>
          <option value={20}>20 Seconds (Default)</option>
          <option value={30}>30 Seconds</option>
          <option value={60}>60 Seconds</option>
          <option value={0}>No Timer (Unlimited)</option>
        </select>
      </div>
    </div>
  );
}
