import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { UserStatusBar } from './UserStatusBar';

function GameCard({ game, canEdit, canDelete, onEdit, onPreview, onCopy, onDelete, onShare, onHost, copiedGameId, userInfo, currentUser }) {
  const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
  const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
  const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
  const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
  const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
  
  const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                   (myName && creatorName === myName) || 
                   (myEmail && creatorName === myEmail) || 
                   (myUsername && creatorName === myUsername) || 
                   (currentUser?.id && creatorName === currentUser.id);
  
  const displayCreator = (isMyGame && userInfo?.dahoot_username) ? userInfo.dahoot_username : game.creator;

  return (
    <div className="game-card animate-pop-in">
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>
            {game.title}
          </h3>
          <span className="game-tag">
            {game.questionCount ?? 0} Qs
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '8px 0 12px 0' }}>
          {game.subject && <span className="game-tag">📚 {game.subject}</span>}
          {game.cefr_level && <span className="game-tag">🎓 {game.cefr_level}</span>}
          {game.language && <span className="game-tag">🗣️ {game.language}</span>}
          {game.creator && <span className="game-tag">👤 {displayCreator}</span>}
        </div>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          margin: 0,
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {game.description || <em>No description provided.</em>}
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-3.5">
        <div className="grid grid-cols-2 gap-2">
          {onHost ? (
            <>
              <button className="btn-card-action btn-card-action-primary py-2 text-xs font-semibold" onClick={(e) => { e.stopPropagation(); onHost(game.id); }}>🚀 Host Game</button>
              <button className="btn-card-action btn-card-action-secondary py-2 text-xs font-semibold" onClick={(e) => { e.stopPropagation(); onPreview(game); }}>📋 Preview</button>
            </>
          ) : (
            <button className="btn-card-action btn-card-action-secondary py-2 text-xs font-semibold col-span-2" onClick={(e) => { e.stopPropagation(); onPreview(game); }}>
              {canEdit(game) ? '📋 View / Edit Questions' : '📋 View Questions'}
            </button>
          )}
        </div>

        <div className={
          canEdit(game)
            ? (canDelete(game) ? "grid grid-cols-[1fr_1fr_1fr_40px] gap-1.5" : "grid grid-cols-[1fr_1fr_1fr] gap-1.5")
            : "grid grid-cols-[1fr_1fr] gap-1.5"
        }>
          {canEdit(game) && (
            <button className="btn-card-action btn-card-action-secondary py-1.5 px-1 text-[11px] font-semibold" onClick={(e) => onEdit(game, e)} title="Edit lesson title, description, and metadata">✏️ Edit</button>
          )}
          <button className="btn-card-action btn-card-action-secondary py-1.5 px-1 text-[11px] font-semibold" onClick={(e) => onCopy(game, e)}>📋 Copy</button>
          <button className="btn-card-action btn-card-action-secondary py-1.5 px-1 text-[11px] font-semibold" onClick={(e) => onShare(game, e)} title="Copy share link for other teachers">
            {copiedGameId === game.id ? '✅ Copied' : '🔗 Share'}
          </button>
          {canDelete(game) && (
            <button className="btn-card-action btn-card-action-danger py-1.5 text-xs" onClick={(e) => onDelete(game.id, e)}>🗑️</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GamesLibrary({
  gamesList = [],
  availableSubjects = [],
  availableCefrLevels = [],
  availableLanguages = [],
  currentUser,
  userInfo,
  userRole,
  canEditGame,
  canDeleteGame,
  onLogout,
  onProfileOpen,
  onAdminOpen,
  onCreateGame,
  onEditGame,
  onPreviewGame,
  onCopyGame,
  onDeleteGame,
  onShareGame,
  onHostGame,
  copiedGameId,
  onBack
}) {
  const [filterSubject, setFilterSubject] = useState([]);
  const [filterCefr, setFilterCefr] = useState([]);
  const [filterLanguage, setFilterLanguage] = useState([]);
  const [filterCreator, setFilterCreator] = useState([]);
  const [libraryTab, setLibraryTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const toggleSubjectFilter = (sub) => setFilterSubject(prev => prev.includes(sub) ? prev.filter(x => x !== sub) : [...prev, sub]);
  const toggleCefrFilter = (level) => setFilterCefr(prev => prev.includes(level) ? prev.filter(x => x !== level) : [...prev, level]);
  const toggleLanguageFilter = (lang) => setFilterLanguage(prev => prev.includes(lang) ? prev.filter(x => x !== lang) : [...prev, lang]);
  const toggleCreatorFilter = (creator) => setFilterCreator(prev => prev.includes(creator) ? prev.filter(x => x !== creator) : [...prev, creator]);
  const clearAllFilters = () => { setFilterSubject([]); setFilterCefr([]); setFilterLanguage([]); setFilterCreator([]); };
  const hasActiveFilters = filterSubject.length > 0 || filterCefr.length > 0 || filterLanguage.length > 0 || filterCreator.length > 0;

  const uniqueLanguages = useMemo(() => {
    const langs = new Set();
    gamesList.forEach(g => { if (g.language) langs.add(g.language); });
    return Array.from(langs);
  }, [gamesList]);

  const uniqueCreators = useMemo(() => {
    const creators = new Set();
    gamesList.forEach(g => {
      if (g.creator) {
        const creatorName = g.creator.toLowerCase().trim();
        const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
        const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
        const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
        const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
        const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                         (myName && creatorName === myName) || 
                         (myEmail && creatorName === myEmail) || 
                         (myUsername && creatorName === myUsername) || 
                         (currentUser?.id && creatorName === currentUser.id);
        if (isMyGame && userInfo?.dahoot_username) {
          creators.add(userInfo.dahoot_username);
        } else {
          creators.add(g.creator);
        }
      }
    });
    return Array.from(creators);
  }, [gamesList, currentUser, userInfo]);

  const myGamesCount = useMemo(() => {
    return gamesList.filter(game => {
      const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
      const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
      const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
      const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
      const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
      return (myDahootUsername && creatorName === myDahootUsername) ||
             (myName && creatorName === myName) || 
             (myEmail && creatorName === myEmail) || 
             (myUsername && creatorName === myUsername) || 
             (currentUser?.id && creatorName === currentUser.id);
    }).length;
  }, [gamesList, currentUser, userInfo]);

  const filteredGamesList = useMemo(() => {
    return gamesList.filter(game => {
      if (libraryTab === 'my') {
        const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
        const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
        const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
        const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
        const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
        const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                         (myName && creatorName === myName) || 
                         (myEmail && creatorName === myEmail) || 
                         (myUsername && creatorName === myUsername) || 
                         (currentUser?.id && creatorName === currentUser.id);
        if (!isMyGame) return false;
      }
      if (filterSubject.length > 0 && !filterSubject.includes(game.subject)) return false;
      if (filterCefr.length > 0 && !filterCefr.includes(game.cefr_level)) return false;
      if (filterLanguage.length > 0 && !filterLanguage.includes(game.language)) return false;
      if (filterCreator.length > 0) {
        const creatorName = game.creator ? game.creator.toLowerCase().trim() : '';
        const myDahootUsername = userInfo?.dahoot_username ? userInfo.dahoot_username.toLowerCase().trim() : '';
        const myName = currentUser?.name ? currentUser.name.toLowerCase().trim() : '';
        const myEmail = currentUser?.email ? currentUser.email.toLowerCase().trim() : '';
        const myUsername = currentUser?.username ? currentUser.username.toLowerCase().trim() : '';
        const isMyGame = (myDahootUsername && creatorName === myDahootUsername) ||
                         (myName && creatorName === myName) || 
                         (myEmail && creatorName === myEmail) || 
                         (myUsername && creatorName === myUsername) || 
                         (currentUser?.id && creatorName === currentUser.id);
        const effectiveCreator = (isMyGame && userInfo?.dahoot_username) ? userInfo.dahoot_username : game.creator;
        if (!filterCreator.includes(effectiveCreator)) return false;
      }
      return true;
    });
  }, [gamesList, libraryTab, currentUser, userInfo, filterSubject, filterCefr, filterLanguage, filterCreator]);

  useEffect(() => { setCurrentPage(1); }, [filterSubject, filterCefr, filterLanguage, filterCreator, libraryTab, sortBy]);

  const sortedGamesList = useMemo(() => {
    const list = [...filteredGamesList];
    if (sortBy === 'newest') return list.sort((a, b) => new Date(b.created) - new Date(a.created));
    if (sortBy === 'oldest') return list.sort((a, b) => new Date(a.created) - new Date(b.created));
    if (sortBy === 'alphabetical') return list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [filteredGamesList, sortBy]);

  const totalPages = Math.ceil(sortedGamesList.length / ITEMS_PER_PAGE);
  const effectivePage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const paginatedGamesList = useMemo(() => {
    const startIndex = (effectivePage - 1) * ITEMS_PER_PAGE;
    return sortedGamesList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedGamesList, effectivePage]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (effectivePage > 3) pages.push('...');
      const start = Math.max(2, effectivePage - 1);
      const end = Math.min(totalPages - 1, effectivePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (effectivePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="app-container">
      <div className="panel panel-large animate-join-focus">
        <UserStatusBar
          currentUser={currentUser}
          userInfo={userInfo}
          userRole={userRole}
          onProfileOpen={onProfileOpen}
          onAdminOpen={onAdminOpen}
          onLogout={onLogout}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ marginBottom: 4 }}>Dahoots</h2>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Manage groups of quiz questions that can be played, copied, and edited.
            </p>
          </div>
          <button className="btn btn-primary" onClick={onCreateGame} style={{ width: 'auto', minWidth: 180 }}>
            + Create Dahoot
          </button>
        </div>

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
            🌐 All Games ({gamesList.length})
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

        <div className="filter-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              🔍 Filter Dahoots {hasActiveFilters && <span style={{ color: 'var(--accent-light)', fontSize: '0.85rem' }}>({sortedGamesList.length} matches)</span>}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-sm hover:border-slate-300 transition-all">
                <ArrowUpDown className="text-slate-400 w-3.5 h-3.5" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs font-semibold text-slate-600 bg-transparent border-none cursor-pointer focus:outline-none focus:ring-0 p-0"
                  style={{ outline: 'none', WebkitAppearance: 'menulist', border: 'none', background: 'transparent', margin: 0, padding: 0 }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="alphabetical">Title (A-Z)</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', color: '#ff4b60', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Subject</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availableSubjects.map(sub => {
                  const active = filterSubject.includes(sub);
                  return <button key={sub} onClick={() => toggleSubjectFilter(sub)} className={`filter-btn ${active ? 'active-subject' : ''}`}>{sub}</button>;
                })}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>CEFR Level</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availableCefrLevels.map(level => {
                  const active = filterCefr.includes(level);
                  return <button key={level} onClick={() => toggleCefrFilter(level)} className={`filter-btn ${active ? 'active-cefr' : ''}`}>{level}</button>;
                })}
              </div>
            </div>
            {uniqueLanguages.length > 0 && (
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Language</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {uniqueLanguages.map(lang => {
                    const active = filterLanguage.includes(lang);
                    return <button key={lang} onClick={() => toggleLanguageFilter(lang)} className={`filter-btn ${active ? 'active-language' : ''}`}>{lang}</button>;
                  })}
                </div>
              </div>
            )}
            {uniqueCreators.length > 0 && (
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Creator</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {uniqueCreators.map(creator => {
                    const active = filterCreator.includes(creator);
                    return <button key={creator} onClick={() => toggleCreatorFilter(creator)} className={`filter-btn ${active ? 'active-creator' : ''}`}>{creator}</button>;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 32, textAlign: 'left' }}>
          {sortedGamesList.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)', borderRadius: 'var(--radius-md)' }}>
              No Dahoots match the selected filters. Clear filters or create a new Dahoot.
            </div>
          ) : (
            paginatedGamesList.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                canEdit={canEditGame}
                canDelete={canDeleteGame}
                onEdit={onEditGame}
                onPreview={onPreviewGame}
                onCopy={onCopyGame}
                onDelete={onDeleteGame}
                onShare={onShareGame}
                onHost={onHostGame}
                copiedGameId={copiedGameId}
                userInfo={userInfo}
                currentUser={currentUser}
              />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-white/50 px-4 py-3 sm:px-6 mb-6 rounded-xl shadow-xs">
            <div className="flex flex-1 justify-between sm:hidden">
              <button type="button" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={effectivePage === 1} className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">Previous</button>
              <button type="button" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={effectivePage === totalPages} className="relative ml-3 inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">Next</button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{(effectivePage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-semibold text-slate-700">{Math.min(effectivePage * ITEMS_PER_PAGE, sortedGamesList.length)}</span>{' '}
                  of <span className="font-semibold text-slate-700">{sortedGamesList.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-lg border border-slate-200 bg-white shadow-xs" aria-label="Pagination">
                  <button type="button" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={effectivePage === 1} className="relative inline-flex items-center rounded-l-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">
                    <span className="sr-only">Previous</span><ChevronLeft className="h-4 w-4" />
                  </button>
                  {getPageNumbers().map((page, idx) => {
                    if (page === '...') {
                      return <span key={`ellipsis-${idx}`} className="relative inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-400 border-l border-slate-200 select-none">...</span>;
                    }
                    const isCurrent = page === effectivePage;
                    return (
                      <button key={page} type="button" onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${isCurrent ? 'z-10 bg-rose-500 text-white hover:bg-rose-600' : 'text-slate-600 hover:bg-slate-50 border-l border-slate-200'}`}>
                        {page}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={effectivePage === totalPages} className="relative inline-flex items-center rounded-r-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-l border-slate-200 transition-all cursor-pointer">
                    <span className="sr-only">Next</span><ChevronRight className="h-4 w-4" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ width: 'auto', minWidth: 200 }}>
            ← Back to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
