import { ArrowUpDown } from 'lucide-react';

export function GameFilters({
  searchQuery, setSearchQuery,
  sortBy, setSortBy,
  filterSubject, toggleSubjectFilter,
  filterCefr, toggleCefrFilter,
  hasActiveFilters, clearFilters,
  availableSubjects, availableCefrLevels,
  loading
}) {
  return (
    <div className="filter-panel" style={{ padding: '12px 16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: availableSubjects.length || availableCefrLevels.length ? '10px' : '0' }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔍</span>
        <input
          type="text"
          className="form-input"
          placeholder="Search games by title, subject, creator..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={loading}
          style={{ padding: '8px 12px', fontSize: '0.9rem', margin: 0, flex: 1 }}
        />
        <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm hover:border-slate-300 transition-all">
          <ArrowUpDown className="text-slate-400 w-3.5 h-3.5" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            disabled={loading}
            className="text-xs font-semibold text-slate-600 bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 p-0"
            style={{ outline: 'none', WebkitAppearance: 'menulist', border: 'none', background: 'transparent', margin: 0, padding: 0 }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alphabetical">Title (A-Z)</option>
          </select>
        </div>
        {(searchQuery || hasActiveFilters) && (
          <button
            type="button"
            onClick={() => { setSearchQuery(''); clearFilters(); }}
            style={{
              border: 'none',
              background: 'none',
              color: '#ff4b60',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            Clear
          </button>
        )}
      </div>

      {(availableSubjects.length > 0 || availableCefrLevels.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {availableSubjects.map(sub => {
            const active = filterSubject.includes(sub);
            return (
              <button
                key={sub}
                onClick={() => toggleSubjectFilter(sub)}
                className={`filter-btn ${active ? 'active-subject' : ''}`}
                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
              >
                {sub}
              </button>
            );
          })}
          {availableCefrLevels.map(level => {
            const active = filterCefr.includes(level);
            return (
              <button
                key={level}
                onClick={() => toggleCefrFilter(level)}
                className={`filter-btn ${active ? 'active-cefr' : ''}`}
                style={{ padding: '2px 8px', fontSize: '0.7rem' }}
              >
                {level}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
