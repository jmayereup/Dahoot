import { useState } from 'react';

export function GenerateModal({
  isOpen,
  onClose,
  language,
  cefrLevel,
  subject,
  missingFields = [],
  onGenerate
}) {
  const [genPrompt, setGenPrompt] = useState('');
  const [genMcCount, setGenMcCount] = useState(10);
  const [genSortingCount, setGenSortingCount] = useState(3);
  const [genCategorizeCount, setGenCategorizeCount] = useState(2);
  const [genDragDropCount, setGenDragDropCount] = useState(3);
  const [genDropDownCount, setGenDropDownCount] = useState(3);
  const [genDiscussionCount, setGenDiscussionCount] = useState(2);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');

  const isGenerateDisabled = missingFields.length > 0;

  const handleGenerate = async () => {
    if (!genPrompt.trim()) {
      setGenError('Custom Prompt or Source Text is required.');
      return;
    }

    setGenLoading(true);
    setGenError('');

    try {
      await onGenerate({
        prompt: genPrompt.trim(),
        counts: {
          MULTIPLE_CHOICE: genMcCount,
          SORTING: genSortingCount,
          CATEGORIZE: genCategorizeCount,
          DRAG_DROP: genDragDropCount,
          DROP_DOWN: genDropDownCount,
          DISCUSSION: genDiscussionCount
        },
        language,
        cefrLevel,
        subject
      });
      setGenPrompt('');
      onClose();
    } catch (err) {
      setGenError(err.message || 'An error occurred during generation.');
    } finally {
      setGenLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(9, 10, 15, 0.85)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px'
    }}>
      <div
        className="panel panel-large animate-join-focus p-4 sm:p-7"
        style={{
          width: '100%',
          maxWidth: '650px',
          maxHeight: '94vh',
          overflowY: 'auto',
          textAlign: 'left',
          border: '1px solid var(--panel-border-focus)',
          position: 'relative'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid var(--panel-border)',
          paddingBottom: '15px'
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI Quiz Generator
            </span>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Autogenerate Questions</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setGenError('');
              onClose();
            }}
            className="bg-black/[0.04] hover:bg-black/[0.08]"
            style={{
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.2rem',
              cursor: 'pointer',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            ✕
          </button>
        </div>

        {isGenerateDisabled && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#d97706',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: 20
          }}>
            ⚠️ Required fields missing: {missingFields.join(', ')}
          </div>
        )}

        {genError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ff4b60',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: 20
          }}>
            ⚠️ {genError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'rgba(93, 107, 130, 0.05)',
            border: '1px solid rgba(93, 107, 130, 0.1)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.9rem'
          }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>Language:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{language}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>CEFR Level:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{cefrLevel}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>Subject:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{subject}</strong>
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Prompt
              </label>
              <span style={{ fontSize: '0.8rem', color: genPrompt.length > 100000 ? '#ff4b60' : 'var(--text-secondary)' }}>
                {genPrompt.length.toLocaleString()} / 10,000 chars
              </span>
            </div>
            <textarea
              className="form-input"
              placeholder="e.g. Paste a reading passage, specific grammar exercises, sample quiz, or custom prompts like 'make it holiday themed'..."
              value={genPrompt}
              onChange={(e) => setGenPrompt(e.target.value)}
              disabled={genLoading}
              rows={6}
              maxLength={100000}
              required
              style={{
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}
            />
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
              Question Types & Counts
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '12px'
            }}>
              {[
                { label: 'Multiple Choice', value: genMcCount, setter: setGenMcCount },
                { label: 'Sorting', value: genSortingCount, setter: setGenSortingCount },
                { label: 'Categorization', value: genCategorizeCount, setter: setGenCategorizeCount },
                { label: 'Drag & Drop', value: genDragDropCount, setter: setGenDragDropCount },
                { label: 'Drop Down', value: genDropDownCount, setter: setGenDropDownCount },
                { label: 'Discussion (0 pts)', value: genDiscussionCount, setter: setGenDiscussionCount },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{item.label}</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={item.value}
                    onChange={(e) => item.setter(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={genLoading}
                    className="form-input"
                    style={{ textAlign: 'center' }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setGenError('');
                onClose();
              }}
              disabled={genLoading}
              style={{ width: 'auto', minWidth: 100 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={genLoading || isGenerateDisabled || !genPrompt.trim()}
              style={{
                width: 'auto',
                minWidth: 150,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {genLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-200 border-l-rose-300 rounded-full animate-spin inline-block mr-2"></span>
                  Generating...
                </>
              ) : (
                '✨ Generate'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
