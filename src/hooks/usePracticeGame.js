import { useState } from 'react';
import { pb } from '../pb';

export function usePracticeGame(view, setView) {
  const [practiceState, setPracticeState] = useState('INTRO'); // 'INTRO' | 'QUESTION' | 'FEEDBACK' | 'ROUND_COMPLETE' | 'FINISHED'
  const [selectedGame, setSelectedGame] = useState(null);
  const [nickname, setNickname] = useState(localStorage.getItem('dahoot_practice_nickname') || '');
  
  const [questionsQueue, setQuestionsQueue] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [failedQuestions, setFailedQuestions] = useState([]);
  
  // Track mastery and scoring
  const [masteredQuestionIds, setMasteredQuestionIds] = useState(new Set());
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [score, setScore] = useState(0);
  const [playerSelectedIdx, setPlayerSelectedIdx] = useState(null);
  const [playerFeedback, setPlayerFeedback] = useState(null); // { correct: boolean, points: number }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Stats
  const [firstTryCorrectCount, setFirstTryCorrectCount] = useState(0);
  const [failedOnceIds, setFailedOnceIds] = useState(new Set()); // track questions got wrong at least once

  const startSoloPractice = async (gameId, options = {}) => {
    setError('');
    if (!gameId) {
      setError('Please select a game to practice.');
      return;
    }
    setLoading(true);
    try {
      // Find game details
      const game = await pb.collection('dahoot_games').getOne(gameId);
      
      // Fetch questions
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId })
      });

      if (qList.length === 0) {
        throw new Error('This game has no questions. Please add questions first.');
      }

      // Prepare active questions
      let activeQuestions = [...qList];
      if (options.questionTypes && options.questionTypes.length > 0) {
        activeQuestions = activeQuestions.filter(q => options.questionTypes.includes(q.type || 'MULTIPLE_CHOICE'));
      }

      if (activeQuestions.length === 0) {
        throw new Error('This game has no questions matching the selected question types.');
      }

      if (options.randomize) {
        activeQuestions.sort(() => 0.5 - Math.random());
      } else {
        activeQuestions.sort((a, b) => a.created.localeCompare(b.created));
      }

      if (options.maxQuestions && options.maxQuestions > 0) {
        activeQuestions = activeQuestions.slice(0, options.maxQuestions);
      }

      setSelectedGame(game);
      setQuestionsQueue(activeQuestions);
      setTotalQuestionsCount(activeQuestions.length);
      
      // Reset state for new practice
      setCurrentQuestionIdx(0);
      setFailedQuestions([]);
      setMasteredQuestionIds(new Set());
      setFailedOnceIds(new Set());
      setFirstTryCorrectCount(0);
      setRoundNumber(1);
      setScore(0);
      setPlayerSelectedIdx(null);
      setPlayerFeedback(null);
      
      setPracticeState('INTRO');
      setView('practice');
    } catch (err) {
      console.error(err);
      setError('Failed to load practice mode: ' + err.message);
      alert('Failed to load practice: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startPractice = (inputNickname) => {
    const name = inputNickname?.trim() || 'Student';
    setNickname(name);
    localStorage.setItem('dahoot_practice_nickname', name);
    setPracticeState('QUESTION');
  };

  const submitAnswer = (userAnswer) => {
    if (playerSelectedIdx !== null) return; // already answered

    setPlayerSelectedIdx(userAnswer);
    const activeQuestion = questionsQueue[currentQuestionIdx];
    if (!activeQuestion) return;

    let isCorrect = false;
    const type = activeQuestion.type || 'MULTIPLE_CHOICE';

    if (type === 'MULTIPLE_CHOICE') {
      isCorrect = userAnswer === activeQuestion.correct_option_index;
    } else if (type === 'SORTING') {
      isCorrect = Array.isArray(userAnswer) && 
                  userAnswer.length === activeQuestion.options.length &&
                  userAnswer.every((val, i) => val === activeQuestion.options[i]);
    } else if (type === 'DRAG_DROP') {
      const correctArr = activeQuestion.options.correct || [];
      isCorrect = Array.isArray(userAnswer) && 
                  userAnswer.length === correctArr.length &&
                  userAnswer.every((val, i) => val === correctArr[i]);
    } else if (type === 'DROP_DOWN') {
      const dropdowns = activeQuestion.options.dropdowns || [];
      isCorrect = Array.isArray(userAnswer) && 
                  userAnswer.length === dropdowns.length &&
                  userAnswer.every((val, i) => val === dropdowns[i]?.correct);
    } else if (type === 'CATEGORIZE') {
      const correctItems = activeQuestion.options.items || [];
      isCorrect = typeof userAnswer === 'object' && userAnswer !== null &&
                  correctItems.every(item => userAnswer[item.name] === item.category);
    }

    let points = 0;
    if (isCorrect) {
      // Correct answer!
      // If they haven't failed this question before in the entire session, it's correct on first try
      const hasFailedBefore = failedOnceIds.has(activeQuestion.id);
      if (!hasFailedBefore) {
        setFirstTryCorrectCount(prev => prev + 1);
        points = 1000;
      } else {
        points = 500; // less points for repeating questions
      }
      setScore(prev => prev + points);
      
      // Mark as mastered
      setMasteredQuestionIds(prev => {
        const next = new Set(prev);
        next.add(activeQuestion.id);
        return next;
      });
    } else {
      // Incorrect answer!
      // Add to failed once list
      setFailedOnceIds(prev => {
        const next = new Set(prev);
        next.add(activeQuestion.id);
        return next;
      });
      // Add to the round's failed queue
      setFailedQuestions(prev => [...prev, activeQuestion]);
    }

    setPlayerFeedback({ correct: isCorrect, points });
    setPracticeState('FEEDBACK');
  };

  const nextQuestion = () => {
    setPlayerSelectedIdx(null);
    setPlayerFeedback(null);

    const nextIdx = currentQuestionIdx + 1;
    if (nextIdx < questionsQueue.length) {
      setCurrentQuestionIdx(nextIdx);
      setPracticeState('QUESTION');
    } else {
      // Completed all questions in the current queue
      if (failedQuestions.length > 0) {
        setPracticeState('ROUND_COMPLETE');
      } else {
        setPracticeState('FINISHED');
      }
    }
  };

  const startNextRound = () => {
    // Retry incorrect questions
    setQuestionsQueue([...failedQuestions]);
    setFailedQuestions([]);
    setCurrentQuestionIdx(0);
    setRoundNumber(prev => prev + 1);
    setPracticeState('QUESTION');
  };

  const exitPractice = () => {
    setSelectedGame(null);
    setQuestionsQueue([]);
    setView('selection');
  };

  return {
    practiceState,
    selectedGame,
    nickname,
    setNickname,
    questionsQueue,
    currentQuestionIdx,
    failedQuestions,
    masteredCount: masteredQuestionIds.size,
    totalCount: totalQuestionsCount,
    roundNumber,
    score,
    playerSelectedIdx,
    playerFeedback,
    error,
    loading,
    firstTryCorrectCount,
    startSoloPractice,
    startPractice,
    submitAnswer,
    nextQuestion,
    startNextRound,
    exitPractice
  };
}
