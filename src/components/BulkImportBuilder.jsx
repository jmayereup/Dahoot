export function BulkImportBuilder({
  selectedGame,
  error,
  loading,
  importText,
  setImportText,
  onSubmit,
  onCancel
}) {
  return (
    <div className="app-container">
      <div className="panel panel-large animate-join-focus" style={{ textAlign: 'left' }}>
        <div style={{ marginBottom: 24 }}>
          <h2>Import Questions in Bulk</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
            Paste a JSON array of questions below to load them into: <strong>{selectedGame?.title}</strong>
          </p>
          <p style={{ margin: 0, fontSize: '0.9rem', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <a
              href="/import-instructions.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}
            >
              📖 View JSON format guide & AI prompt template
            </a>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <a
              href="https://gemini.google.com/gem/7c73c716f677"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-light)', textDecoration: 'underline', fontWeight: '600' }}
            >
              💎 Use Dahoot Quiz Generator Gem
            </a>
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ff4b60',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: 20
          }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>JSON Data</label>
            <textarea
              className="form-input"
              placeholder={`[
  {
    "type": "MULTIPLE_CHOICE",
    "text": "What is the capital of France?",
    "options": {
      "correct_answer": "Paris",
      "distractors": ["Berlin", "London", "Rome"]
    }
  }
]`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              disabled={loading}
              rows={15}
              style={{ fontFamily: 'monospace', fontSize: '0.9rem', lineHeight: '1.5' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading} style={{ width: 'auto', minWidth: 120 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !importText.trim()} style={{ width: 'auto', minWidth: 150 }}>
              {loading ? 'Importing...' : 'Save & Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
