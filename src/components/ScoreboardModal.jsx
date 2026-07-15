import React, { useState, useEffect, useRef } from 'react';
import { Download, Search } from 'lucide-react';
import { exportResultsCsv } from '../utils/exportCsv';

export function ScoreboardModal({
  isOpen,
  onClose,
  hostPlayers = [],
  questions = [],
  gameTitle,
  roomCode,
  isMarathon
}) {
  const containerRef = useRef(null);
  const [search, setSearch] = useState('');

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
        const focusable = containerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const sortedPlayers = [...hostPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
  
  const filteredPlayers = sortedPlayers.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = () => {
    exportResultsCsv({ gameTitle, roomCode, isMarathon, hostPlayers, questions });
  };

  return (
    <div
      ref={containerRef}
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-[1300] flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col p-6 shadow-xl animate-pop-in text-left"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">📊 Full Player Scoreboard</h2>
            <p className="text-xs text-slate-500 mt-1">
              {gameTitle || 'Dahoot Quiz'} — Room {roomCode}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer border-none bg-transparent"
          >
            ✕
          </button>
        </div>

        {/* Filter and Download Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 py-4 shrink-0">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white rounded-xl pl-9 pr-4 py-2 text-sm outline-none transition-all"
            />
          </div>
          <button
            onClick={handleDownload}
            className="btn bg-emerald-600 border border-emerald-700 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 text-sm py-2 px-4 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            Download CSV Report
          </button>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-y-auto min-h-0 border border-slate-150 rounded-xl">
          <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs uppercase bg-slate-50 border-b border-slate-150 text-slate-400 font-extrabold sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-6 py-3 text-center w-16">Rank</th>
                <th scope="col" className="px-6 py-3">Student Name</th>
                <th scope="col" className="px-6 py-3 text-right w-32">Final Score</th>
                <th scope="col" className="px-6 py-3 text-center w-36">Correct Answers</th>
                <th scope="col" className="px-6 py-3 text-center w-28">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlayers.map((player) => {
                const rankIdx = sortedPlayers.findIndex(p => p.id === player.id) + 1;
                const playerAnswers = player.answers || {};
                let correctCount = 0;
                questions.forEach(q => {
                  if (playerAnswers[q.id] === true) correctCount++;
                });
                const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

                let rankBadge = `${rankIdx}`;
                if (rankIdx === 1) rankBadge = '🥇';
                else if (rankIdx === 2) rankBadge = '🥈';
                else if (rankIdx === 3) rankBadge = '🥉';

                return (
                  <tr key={player.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-center font-bold text-slate-700">{rankBadge}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-800">{player.name}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-slate-700">{player.score || 0} pts</td>
                    <td className="px-6 py-3.5 text-center font-medium text-slate-600">
                      {correctCount} / {questions.length}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        accuracy >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                        accuracy >= 50 ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {accuracy}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredPlayers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-400 italic">
                    No players found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="btn btn-secondary text-sm px-5 py-2 cursor-pointer"
          >
            Close Scoreboard
          </button>
        </div>
      </div>
    </div>
  );
}
