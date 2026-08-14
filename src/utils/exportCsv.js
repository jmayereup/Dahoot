/**
 * Safely escape strings for CSV output.
 */
export function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate and trigger download of Dahoot session results.
 */
export function exportResultsCsv({ gameTitle, roomCode, isMarathon, hostPlayers, questions }) {
  const sortedPlayers = [...hostPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
  
  const rows = [];
  rows.push(['Dahoot Game Participation Report']);
  rows.push(['Quiz Title', gameTitle || 'Dahoot Game']);
  rows.push(['Room Code', roomCode || 'N/A']);
  rows.push(['Pacing Mode', isMarathon ? 'Student-Paced (Marathon)' : 'Teacher-Paced (Live)']);
  rows.push(['Date Generated', new Date().toLocaleString()]);
  rows.push(['Total Players', hostPlayers.length]);
  rows.push(['Total Questions', questions.length]);
  
  // Calculate Class Averages
  const totalScore = hostPlayers.reduce((sum, p) => sum + (p.score || 0), 0);
  const avgScore = hostPlayers.length > 0 ? Math.round(totalScore / hostPlayers.length) : 0;
  rows.push(['Average Score', avgScore]);

  const gradedQuestions = questions.filter(q => q.type !== 'DISCUSSION');
  const totalGraded = gradedQuestions.length;

  let totalCorrect = 0;
  hostPlayers.forEach(p => {
    gradedQuestions.forEach(q => {
      if (p.answers && p.answers[q.id] === true) {
        totalCorrect++;
      }
    });
  });
  const totalPossible = hostPlayers.length * totalGraded;
  const avgAccuracy = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 100;
  rows.push(['Class Average Accuracy', `${avgAccuracy}%`]);
  
  rows.push([]); // Blank row separator
  
  // Headers
  const headers = ['Rank', 'Player Name', 'Final Score', 'Correct Answers', 'Accuracy (%)'];
  questions.forEach((q, idx) => {
    headers.push(`Q${idx + 1}: ${q.text} (${q.type === 'DISCUSSION' ? 'DISCUSSION - 0 PTS' : q.type})`);
  });
  rows.push(headers);
  
  // Player Data Rows
  sortedPlayers.forEach((player, pIdx) => {
    const playerAnswers = player.answers || {};
    let correctCount = 0;
    gradedQuestions.forEach(q => {
      if (playerAnswers[q.id] === true) correctCount++;
    });
    const accuracy = totalGraded > 0 ? Math.round((correctCount / totalGraded) * 100) : 100;
    
    const row = [
      pIdx + 1,
      player.name,
      player.score || 0,
      `${correctCount} / ${totalGraded}`,
      `${accuracy}%`
    ];
    
    questions.forEach(q => {
      const status = playerAnswers[q.id];
      if (q.type === 'DISCUSSION') {
        if (typeof status === 'string' && status.trim()) {
          row.push(status.trim());
        } else if (status && typeof status === 'object' && typeof status.text === 'string' && status.text.trim()) {
          row.push(status.text.trim());
        } else {
          row.push('[No response]');
        }
      } else {
        if (status === true) {
          row.push('Correct');
        } else if (status === false) {
          row.push('Incorrect');
        } else {
          row.push('Unanswered');
        }
      }
    });
    
    rows.push(row);
  });
  
  const csvContent = rows
    .map(row => row.map(escapeCsvCell).join(','))
    .join('\n');
    
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const sanitizedTitle = (gameTitle || 'dahoot-game')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
    
  link.setAttribute('href', url);
  link.setAttribute('download', `dahoot-results-${sanitizedTitle}-${roomCode || 'room'}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
