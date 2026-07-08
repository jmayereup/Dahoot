import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { UserStatusBar } from './UserStatusBar';
import { useGameFilters } from '../hooks/useGameFilters';
import { EnhancedGameFilters } from './EnhancedGameFilters';

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
  const gameFilters = useGameFilters({
    gamesList,
    currentUser,
    userInfo,
    config: {
      enableSearch: true,
      enableLanguageFilter: true,
      enableCreatorFilter: true,
      enableTabFilter: true,
      itemsPerPage: 9,
      defaultSort: 'newest',
      defaultTab: 'my'
    }
  });

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

        <EnhancedGameFilters
          searchQuery={gameFilters.searchQuery}
          setSearchQuery={gameFilters.setSearchQuery}
          sortBy={gameFilters.sortBy}
          setSortBy={gameFilters.setSortBy}
          filterSubject={gameFilters.filterSubject}
          toggleSubjectFilter={gameFilters.toggleSubjectFilter}
          filterCefr={gameFilters.filterCefr}
          toggleCefrFilter={gameFilters.toggleCefrFilter}
          filterLanguage={gameFilters.filterLanguage}
          toggleLanguageFilter={gameFilters.toggleLanguageFilter}
          filterCreator={gameFilters.filterCreator}
          toggleCreatorFilter={gameFilters.toggleCreatorFilter}
          hasActiveFilters={gameFilters.hasActiveFilters}
          clearFilters={gameFilters.clearFilters}
          availableSubjects={availableSubjects}
          availableCefrLevels={availableCefrLevels}
          uniqueLanguages={gameFilters.uniqueLanguages}
          uniqueCreators={gameFilters.uniqueCreators}
          loading={false}
          enableSearch={true}
          enableLanguageFilter={true}
          enableCreatorFilter={true}
          enableTabFilter={true}
          libraryTab={gameFilters.libraryTab}
          setLibraryTab={gameFilters.setLibraryTab}
          myGamesCount={gameFilters.myGamesCount}
          totalGamesCount={gamesList.length}
          sortedGamesCount={gameFilters.sortedGames.length}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 32, textAlign: 'left' }}>
          {gameFilters.sortedGames.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', border: '1px dashed var(--panel-border)', borderRadius: 'var(--radius-md)' }}>
              No Dahoots match the selected filters. Clear filters or create a new Dahoot.
            </div>
          ) : (
            gameFilters.paginatedGames.map((game) => (
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

        {gameFilters.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-white/50 px-4 py-3 sm:px-6 mb-6 rounded-xl shadow-xs">
            <div className="flex flex-1 justify-between sm:hidden">
              <button type="button" onClick={() => gameFilters.setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={gameFilters.effectivePage === 1} className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">Previous</button>
              <button type="button" onClick={() => gameFilters.setCurrentPage(prev => Math.min(prev + 1, gameFilters.totalPages))} disabled={gameFilters.effectivePage === gameFilters.totalPages} className="relative ml-3 inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">Next</button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm sm:justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-700">{(gameFilters.effectivePage - 1) * gameFilters.itemsPerPage + 1}</span> to{' '}
                  <span className="font-semibold text-slate-700">{Math.min(gameFilters.effectivePage * gameFilters.itemsPerPage, gameFilters.sortedGames.length)}</span>{' '}
                  of <span className="font-semibold text-slate-700">{gameFilters.sortedGames.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-lg border border-slate-200 bg-white shadow-xs" aria-label="Pagination">
                  <button type="button" onClick={() => gameFilters.setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={gameFilters.effectivePage === 1} className="relative inline-flex items-center rounded-l-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">
                    <span className="sr-only">Previous</span><ChevronLeft className="h-4 w-4" />
                  </button>
                  {gameFilters.getPageNumbers().map((page, idx) => {
                    if (page === '...') {
                      return <span key={`ellipsis-${idx}`} className="relative inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-400 border-l border-slate-200 select-none">...</span>;
                    }
                    const isCurrent = page === gameFilters.effectivePage;
                    return (
                      <button key={page} type="button" onClick={() => gameFilters.setCurrentPage(page)}
                        className={`relative inline-flex items-center px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${isCurrent ? 'z-10 bg-rose-500 text-white hover:bg-rose-600' : 'text-slate-600 hover:bg-slate-50 border-l border-slate-200'}`}>
                        {page}
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => gameFilters.setCurrentPage(prev => Math.min(prev + 1, gameFilters.totalPages))} disabled={gameFilters.effectivePage === gameFilters.totalPages} className="relative inline-flex items-center rounded-r-lg px-2.5 py-1.5 text-slate-400 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed border-l border-slate-200 transition-all cursor-pointer">
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
