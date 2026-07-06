export function GameModeButtons({
  loading, pocketbaseStatus,
  selectedGameId, totalQuestions,
  startHosting, startMarathonHosting, startSoloPractice,
  randomize, maxQuestions, timerDuration, selectedQuestionTypes
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginBottom: 16 }}>
      <button
        className="btn btn-primary"
        onClick={() => startHosting(selectedGameId, { randomize, maxQuestions: parseInt(maxQuestions) || 0, timerDuration, questionTypes: selectedQuestionTypes })}
        disabled={loading || pocketbaseStatus !== 'connected' || !selectedGameId || !totalQuestions}
        style={{ width: '100%' }}
      >
        {loading ? 'Initializing...' : 'Class Game (Teacher-Paced)'}
      </button>

      <button
        className="btn btn-secondary w-full bg-blue-500/10 hover:bg-blue-500/20"
        onClick={() => startMarathonHosting(selectedGameId, { randomize, maxQuestions: parseInt(maxQuestions) || 0, questionTypes: selectedQuestionTypes, pacingMode: 'student' })}
        disabled={loading || !selectedGameId || !totalQuestions}
        style={{
          border: '1.5px solid #3b82f6',
          color: 'var(--text-secondary)'
        }}
      >
        Class Game (Student-Paced)
      </button>

      <button
        className="btn btn-secondary w-full bg-[#FFB7B2]/10 hover:bg-[#FFB7B2]/20"
        onClick={() => startSoloPractice(selectedGameId, { randomize, maxQuestions: parseInt(maxQuestions) || 0, questionTypes: selectedQuestionTypes })}
        disabled={loading || !selectedGameId || !totalQuestions}
        style={{
          border: '1.5px solid var(--color-school-primary)',
          color: 'var(--text-secondary)'
        }}
      >
        Single Player Game
      </button>
    </div>
  );
}
