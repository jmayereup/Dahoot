import { useState, useEffect } from 'react';
import { pb } from '../pb';

export function useMarathonGame(view, setView) {
  const [marathonState, setMarathonState] = useState('INTRO'); // 'INTRO' | 'QUESTION' | 'FEEDBACK' | 'PAUSED' | 'FINISHED'
  const [selectedGame, setSelectedGame] = useState(null);
  const [nickname, setNickname] = useState(localStorage.getItem('dahoot_marathon_nickname') || '');
  
  const [questionsPool, setQuestionsPool] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionHistory, setQuestionHistory] = useState([]);
  
  // Marathon stats
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const [playerSelectedIdx, setPlayerSelectedIdx] = useState(null);
  const [playerFeedback, setPlayerFeedback] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Timer for elapsed time tracking
  useEffect(() => {
    let interval;
    if (marathonState === 'QUESTION' && sessionStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [marathonState, sessionStartTime]);

  const startMarathon = async (gameId, options = {}) => {
    setError('');
    if (!gameId) {
      setError('Please select a game to practice.');
      return;
    }
    setLoading(true);
    try {
      const game = await pb.collection('dahoot_games').getOne(gameId);
      
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: `game_id = "${gameId}"`
      });

      if (qList.length === 0) {
        throw new Error('This game has no questions. Please add questions first.');
      }

      let activeQuestions = [...qList];
      if (options.questionTypes && options.questionTypes.length > 0) {
        activeQuestions = activeQuestions.filter(q => options.questionTypes.includes(q.type || 'MULTIPLE_CHOICE'));
      }

      if (activeQuestions.length === 0) {
        throw new Error('This game has no questions matching the selected question types.');
      }

      setSelectedGame(game);
      setQuestionsPool(activeQuestions);
      
      // Reset marathon state
      setCurrentQuestion(null);
      setQuestionHistory([]);
      setTotalAnswered(0);
      setCorrectCount(0);
      setCurrentStreak(0);
      setBestStreak(0);
      setSessionStartTime(null);
      setElapsedTime(0);
      setPlayerSelectedIdx(null);
      setPlayerFeedback(null);
      
      setMarathonState('INTRO');
      setView('marathon');
    } catch (err) {
      console.error(err);
      setError('Failed to load marathon mode: ' + err.message);
      alert('Failed to load marathon: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startSession = (inputNickname) => {
    const name = inputNickname?.trim() || 'Student';
    setNickname(name);
    localStorage.setItem('dahoot_marathon_nickname', name);
    setSessionStartTime(Date.now());
    pickRandomQuestion();
    setMarathonState('QUESTION');
  };

  const pickRandomQuestion = () => {
    if (questionsPool.length === 0) return;
    const randomIndex = Math.floor(Math.random() * questionsPool.length);
    setCurrentQuestion(questionsPool[randomIndex]);
  };

  const submitAnswer = (userAnswer) => {
    if (playerSelectedIdx !== null) return;

    setPlayerSelectedIdx(userAnswer);
    if (!currentQuestion) return;

    let isCorrect = false;
    const type = currentQuestion.type || 'MULTIPLE_CHOICE';

    if (type === 'MULTIPLE_CHOICE') {
      isCorrect = userAnswer === currentQuestion.correct_option_index;
    } else if (type === 'SORTING') {
      isCorrect = Array.isArray(userAnswer) && 
                  userAnswer.length === currentQuestion.options.length &&
                  userAnswer.every((val, i) => val === currentQuestion.options[i]);
    } else if (type === 'DRAG_DROP') {
      const correctArr = currentQuestion.options.correct || [];
      isCorrect = Array.isArray(userAnswer) && 
                  userAnswer.length === correctArr.length &&
                  userAnswer.every((val, i) => val === correctArr[i]);
    } else if (type === 'DROP_DOWN') {
      const dropdowns = currentQuestion.options.dropdowns || [];
      isCorrect = Array.isArray(userAnswer) && 
                  userAnswer.length === dropdowns.length &&
                  userAnswer.every((val, i) => val === dropdowns[i]?.correct);
    } else if (type === 'CATEGORIZE') {
      const correctItems = currentQuestion.options.items || [];
      isCorrect = typeof userAnswer === 'object' && userAnswer !== null &&
                  correctItems.every(item => userAnswer[item.name] === item.category);
    }

    // Update stats
    setTotalAnswered(prev => prev + 1);
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setCurrentStreak(prev => {
        const newStreak = prev + 1;
        setBestStreak(best => Math.max(best, newStreak));
        return newStreak;
      });
    } else {
      setCurrentStreak(0);
    }

    // Add to history
    setQuestionHistory(prev => [...prev, {
      question: currentQuestion,
      userAnswer,
      isCorrect,
      timestamp: Date.now()
    }]);

    setPlayerFeedback({ correct: isCorrect });
    setMarathonState('FEEDBACK');
  };

  const nextQuestion = () => {
    setPlayerSelectedIdx(null);
    setPlayerFeedback(null);
    pickRandomQuestion();
    setMarathonState('QUESTION');
  };

  const pauseSession = () => {
    setMarathonState('PAUSED');
  };

  const resumeSession = () => {
    setMarathonState('QUESTION');
  };

  const finishSession = () => {
    setMarathonState('FINISHED');
  };

  const exitMarathon = () => {
    setSelectedGame(null);
    setQuestionsPool([]);
    setCurrentQuestion(null);
    setQuestionHistory([]);
    setView('selection');
  };

  const restartMarathon = () => {
    setQuestionHistory([]);
    setTotalAnswered(0);
    setCorrectCount(0);
    setCurrentStreak(0);
    setBestStreak(0);
    setSessionStartTime(Date.now());
    setElapsedTime(0);
    setPlayerSelectedIdx(null);
    setPlayerFeedback(null);
    pickRandomQuestion();
    setMarathonState('QUESTION');
  };

  const getAccuracy = () => {
    return totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    marathonState,
    selectedGame,
    nickname,
    setNickname,
    currentQuestion,
    totalAnswered,
    correctCount,
    currentStreak,
    bestStreak,
    elapsedTime,
    playerSelectedIdx,
    playerFeedback,
    error,
    loading,
    questionHistory,
    accuracy: getAccuracy(),
    formattedTime: formatTime(elapsedTime),
    startMarathon,
    startSession,
    submitAnswer,
    nextQuestion,
    pauseSession,
    resumeSession,
    finishSession,
    exitMarathon,
    restartMarathon
  };
}