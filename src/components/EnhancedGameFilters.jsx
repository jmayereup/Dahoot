import { ArrowUpDown } from 'lucide-react';
import { MultiSelectDropdown } from './FilterChipGroup';

export function EnhancedGameFilters({
  searchQuery, setSearchQuery,
  sortBy, setSortBy,
  filterSubject, toggleSubjectFilter,
  filterCefr, toggleCefrFilter,
  filterLanguage, toggleLanguageFilter,
  filterCreator, toggleCreatorFilter,
  hasActiveFilters, clearFilters,
  availableSubjects = [],
  availableCefrLevels = [],
  uniqueLanguages = [],
  uniqueCreators = [],
  loading = false,
  enableSearch = true,
  enableLanguageFilter = true,
  enableCreatorFilter = true,
  enableTabFilter = false,
  libraryTab = 'all',
  setLibraryTab = null,
  myGamesCount = 0,
  totalGamesCount = 0,
  sortedGamesCount = 0
}) {
  const toggleByColor = (color, value) => {
    switch (color) {
      case 'subject': return toggleSubjectFilter(value);
      case 'cefr': return toggleCefrFilter(value);
      case 'language': return toggleLanguageFilter(value);
      case 'creator': return toggleCreatorFilter(value);
      default: return;
    }
  };

  const groups = [
    { label: 'Subject', color: 'subject', options: availableSubjects, selected: filterSubject },
    { label: 'CEFR Level', color: 'cefr', options: availableCefrLevels, selected: filterCefr },
    ...(enableLanguageFilter ? [{ label: 'Language', color: 'language', options: uniqueLanguages, selected: filterLanguage }] : []),
    ...(enableCreatorFilter ? [{ label: 'Creator', color: 'creator', options: uniqueCreators, selected: filterCreator }] : []),
  ].filter(g => g.options.length > 0);

  return (
    <div className="filter-panel">
      {enableTabFilter && (
        <div style={{ display: 'flex', borderBottom: '2px solid rgba(93, 107, 130, 0.1)', marginBottom: '24px', gap: '24px' }}>
          <button
            onClick={() => setLibraryTab('all')}
            style={{
              padding: '12px 8px', fontSize: '0.95rem', fontWeight: 700,
              color: libraryTab === 'all' ? 'var(--accent-light)' : 'var(--text-secondary)',
              borderBottom: libraryTab === 'all' ? '3px solid var(--accent-light)' : '3px solid transparent',
              background: 'none', border: 'none', cursor: 'pointer', marginBottom: '-2px',
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            🌐 All Games ({totalGamesCount})
          </button>
          <button
            onClick={() => setLibraryTab('my')}
            style={{
              padding: '12px 8px', fontSize: '0.95rem', fontWeight: 700,
              color: libraryTab === 'my' ? 'var(--accent-light)' : 'var(--text-secondary)',
              borderBottom: libraryTab === 'my' ? '3px solid var(--accent-light)' : '3px solid transparent',
              background: 'none', border: 'none', cursor: 'pointer', marginBottom: '-2px',
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            👤 My Games ({myGamesCount})
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          🔍 Filter Games {hasActiveFilters && <span style={{ color: 'var(--accent-light)', fontSize: '0.85rem' }}>({sortedGamesCount} matches)</span>}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          {hasActiveFilters && (
            <button
              onClick={() => { setSearchQuery(''); clearFilters(); }}
              style={{ background: 'none', border: 'none', color: '#ff4b60', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {enableSearch && (
        <div style={{ marginBottom: '16px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search games by title, description, subject, creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
            style={{ padding: '10px 14px', fontSize: '0.9rem', width: '100%' }}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {groups.map((g) => (
          <MultiSelectDropdown
            key={g.color}
            label={g.label}
            color={g.color}
            options={g.options}
            selected={g.selected}
            onToggle={(value) => toggleByColor(g.color, value)}
            onClear={() => g.selected.forEach((value) => toggleByColor(g.color, value))}
            disabled={loading}
          />
        ))}
      </div>
    </div>
  );
}
