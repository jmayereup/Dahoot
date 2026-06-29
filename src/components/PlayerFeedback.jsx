import React from 'react';

export function PlayerFeedback({ playerFeedback, activeQuestion, playerRecord }) {
  const type = activeQuestion.type || 'MULTIPLE_CHOICE';

  const renderCorrectAnswersDescription = () => {
    if (type === 'MULTIPLE_CHOICE') {
      return (
        <p style={{ color: 'var(--text-secondary)' }}>
          The correct answer was: <strong>{activeQuestion.options[activeQuestion.correct_option_index]}</strong>
        </p>
      );
    }
    
    if (type === 'SORTING') {
      return (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          <p style={{ marginBottom: 6 }}>The correct order was:</p>
          <strong style={{ color: 'var(--accent-light)' }}>
            {activeQuestion.options.join(" ➔ ")}
          </strong>
        </div>
      );
    }

    if (type === 'DRAG_DROP' && activeQuestion.options) {
      const filledSentence = activeQuestion.options.sentence.replace(/\[blank(\d+)\]/g, (_, idx) => {
        const valIdx = parseInt(idx);
        return `[ ${activeQuestion.options.correct[valIdx] || '???'} ]`;
      });
      return (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          <p style={{ marginBottom: 6 }}>The correct sentence was:</p>
          <strong style={{ color: 'var(--accent-light)', fontStyle: 'italic', lineHeight: '1.4rem', display: 'block' }}>
            {filledSentence}
          </strong>
        </div>
      );
    }

    if (type === 'DROP_DOWN' && activeQuestion.options) {
      const filledSentence = activeQuestion.options.sentence.replace(/\{\{(\d+)\}\}/g, (_, idx) => {
        const valIdx = parseInt(idx);
        return `[ ${activeQuestion.options.dropdowns[valIdx]?.correct || '???'} ]`;
      });
      return (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          <p style={{ marginBottom: 6 }}>The correct sentence was:</p>
          <strong style={{ color: 'var(--accent-light)', fontStyle: 'italic', lineHeight: '1.4rem', display: 'block' }}>
            {filledSentence}
          </strong>
        </div>
      );
    }

    if (type === 'CATEGORIZE') {
      return (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Look at the projector screen to see how the items are grouped!
        </p>
      );
    }

    return null;
  };

  return (
    <div className="feedback-screen">
      {playerFeedback ? (
        <div>
          {playerFeedback.correct ? (
            <div>
              <div className="feedback-icon feedback-correct">✓</div>
              <h2>Correct!</h2>
              <div className="points-text feedback-correct">+{playerFeedback.points} pts</div>
            </div>
          ) : (
            <div>
              <div className="feedback-icon feedback-incorrect">✗</div>
              <h2>Incorrect</h2>
              <div className="points-text feedback-incorrect">+0 pts</div>
              {renderCorrectAnswersDescription()}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="feedback-icon feedback-incorrect">✗</div>
          <h2>No Answer</h2>
          <div className="points-text feedback-incorrect">+0 pts</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
            You did not submit an answer in time!
          </p>
          {renderCorrectAnswersDescription()}
        </div>
      )}

      <div className="score-display" style={{ marginTop: 24 }}>
        Current Score: <strong>{playerRecord.score} points</strong>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 32 }}>
        Look at the screen to see current rankings.
      </p>
    </div>
  );
}
