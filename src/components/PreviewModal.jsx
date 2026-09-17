import { useState, useEffect } from 'react';
import { pb } from '../pb';
import { ConfirmModal } from './ConfirmModal';
import { QuestionPreviewCard } from './QuestionPreviewCard';
import { QuestionEditModal } from './QuestionEditModal';

export function PreviewModal({
  isOpen,
  onClose,
  game,
  gameId,
  questions: externalQuestions,
  canEdit,
  currentUser,
  userInfo,
  onSaveQuestion: onSaveQuestionProp,
  onDeleteQuestion: onDeleteQuestionProp,
  onImport,
  onEditGame,
  onQuestionsChanged,
  standalone
}) {
  const effectiveGameId = gameId || game?.id;
  const [questions, setQuestions] = useState(externalQuestions || []);
  const [loading, setLoading] = useState(Boolean(isOpen && standalone && effectiveGameId && !externalQuestions));
  const [error, setError] = useState('');

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [questionToDeleteId, setQuestionToDeleteId] = useState(null);

  const [editingQuestion, setEditingQuestion] = useState(null);

  const loadQuestions = async () => {
    if (!effectiveGameId) return;
    setLoading(true);
    setError('');
    try {
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: effectiveGameId }),
        sort: 'created'
      });
      setQuestions(qList);
    } catch (err) {
      setError('Failed to load questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (externalQuestions) {
        setQuestions(externalQuestions);
        setLoading(false);
      } else if (standalone && effectiveGameId) {
        setLoading(true);
        loadQuestions();
      }
    } else {
      if (standalone) {
        setQuestions([]);
        setLoading(false);
      }
    }
  }, [isOpen, effectiveGameId, externalQuestions, standalone]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !editingQuestion && !deleteConfirmOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, editingQuestion, deleteConfirmOpen]);

  const startCreating = () => {
    setEditingQuestion('new');
  };

  const startEditing = (question) => {
    setEditingQuestion(question);
  };

  const handleSaveQuestion = async (questionData, targetQuestion) => {
    const payload = {
      ...questionData,
      game_id: effectiveGameId
    };

    if (standalone) {
      if (targetQuestion && targetQuestion !== 'new') {
        await pb.collection('dahoot_questions').update(targetQuestion.id, payload);
      } else {
        await pb.collection('dahoot_questions').create(payload);
      }
      await loadQuestions();
      if (onQuestionsChanged) {
        onQuestionsChanged();
      }
    } else if (onSaveQuestionProp) {
      await onSaveQuestionProp(payload, targetQuestion);
      if (onQuestionsChanged) {
        onQuestionsChanged();
      }
    }
  };

  const requestDeleteQuestion = (id) => {
    setQuestionToDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!questionToDeleteId) return;
    try {
      if (standalone) {
        await pb.collection('dahoot_questions').delete(questionToDeleteId);
        await loadQuestions();
        if (onQuestionsChanged) {
          onQuestionsChanged();
        }
      } else if (onDeleteQuestionProp) {
        await onDeleteQuestionProp(questionToDeleteId);
        setQuestions(prev => prev.filter(q => q.id !== questionToDeleteId));
        if (onQuestionsChanged) {
          onQuestionsChanged();
        }
      }
      setDeleteConfirmOpen(false);
      setQuestionToDeleteId(null);
    } catch (err) {
      console.error('Error deleting question:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(9, 10, 15, 0.85)', backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px'
      }}>
        <div className="panel panel-large animate-join-focus p-4 sm:p-7" style={{
          width: '95%', maxWidth: '1200px', maxHeight: '94vh', overflowY: 'auto',
          textAlign: 'left', border: '1px solid var(--panel-border-focus)', position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '15px', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Questions ({questions.length})
              </span>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                {game?.title || 'Preview Quiz'}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {canEdit && onEditGame && (
                <button
                  onClick={() => {
                    onClose();
                    onEditGame(game);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                  title="Open full Dahoot Builder to edit title, description, and metadata"
                >
                  ✏️ Edit Game Details
                </button>
              )}
              {canEdit && (
                <button
                  onClick={startCreating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                >
                  ➕ Add Question
                </button>
              )}
              {canEdit && onImport && (
                <button
                  onClick={onImport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:text-violet-800 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors cursor-pointer"
                >
                  📥 Import
                </button>
              )}
              <button
                onClick={onClose}
                className="bg-black/[0.04] hover:bg-black/[0.08]"
                style={{
                  border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem',
                  cursor: 'pointer', borderRadius: '50%', width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {error ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#ff4b60' }}>
              <p>{error}</p>
              <button className="btn btn-secondary" onClick={onClose} style={{ marginTop: '16px' }}>Close</button>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Loading questions...</p>
            </div>
          ) : questions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {questions.map((question, qIdx) => (
                <QuestionPreviewCard
                  key={question.id}
                  question={question}
                  index={qIdx}
                  canEdit={canEdit}
                  onEdit={startEditing}
                  onDelete={requestDeleteQuestion}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>This Dahoot has no questions yet.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                {canEdit && (
                  <button className="btn btn-primary" onClick={startCreating} style={{ width: 'auto' }}>➕ Add Question</button>
                )}
                {canEdit && onEditGame && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      onClose();
                      onEditGame(game);
                    }}
                    style={{ width: 'auto' }}
                  >
                    ✏️ Edit Game Details
                  </button>
                )}
                <button className="btn btn-secondary" onClick={onClose} style={{ width: 'auto' }}>Close</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <QuestionEditModal
        isOpen={Boolean(editingQuestion)}
        editingQuestion={editingQuestion}
        gameTitle={game?.title}
        canEdit={canEdit}
        onClose={() => setEditingQuestion(null)}
        onSave={handleSaveQuestion}
      />

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="Delete Question?"
        message="Are you sure you want to delete this question? This action cannot be undone."
        confirmText="Delete Question"
        cancelText="Cancel"
        variant="danger"
        icon="🗑️"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setQuestionToDeleteId(null);
        }}
      />
    </>
  );
}
