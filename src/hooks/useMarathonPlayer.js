import { useState, useEffect, useCallback } from 'react';
import { pb } from '../pb';
import { shuffleArray } from '../utils/shuffle';

export function useMarathonPlayer(view, setView) {
  const [playerRoom, setPlayerRoom] = useState(null);
  const [playerRecord, setPlayerRecord] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [playerSelectedIdx, setPlayerSelectedIdx] = useState(null);
  const [playerFeedback, setPlayerFeedback] = useState(null);
  const [currentLapQuestions, setCurrentLapQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isStudentPaced = playerRoom?.pacing_mode === 'student';

  const playerQuestionIndex = playerRecord
    ? (playerRecord.last_answered_index ?? -1) + 1
    : 0;

  const totalLapQuestions = currentLapQuestions.length;
  const hasMoreQuestions = totalLapQuestions > 0 && (
    playerQuestionIndex < totalLapQuestions ||
    (isStudentPaced && playerQuestionIndex >= totalLapQuestions)
  );
  const isRoomFinished = playerRoom?.status === 'FINISHED';
  const isFinished = isRoomFinished;
  const currentLap = (playerRecord?.marathon_stats?.lap || 0) + 1;

  const currentQuestion = (currentLapQuestions.length > 0 && playerQuestionIndex < currentLapQuestions.length)
    ? currentLapQuestions[playerQuestionIndex]
    : null;

  const loadAllQuestions = useCallback(async (questionIds) => {
    if (!questionIds || questionIds.length === 0) return;
    try {
      const filter = questionIds.map(id => pb.filter("id = {:id}", { id })).join(' || ');
      const questions = await pb.collection('dahoot_questions').getFullList({
        filter,
        sort: 'created'
      });
      const ordered = questionIds.map(id => questions.find(q => q.id === id)).filter(Boolean);
      setAllQuestions(ordered);
      setCurrentLapQuestions(ordered);
    } catch (err) {
      console.error('Error loading questions:', err);
    }
  }, []);

  const joinMarathon = async (pin, playerName) => {
    setError('');
    setLoading(true);
    try {
      const room = await pb.collection('dahoot_rooms').getFirstListItem(
        pb.filter("code = {:code} && marathon_mode = true", { code: pin })
      );

      if (!room) {
        throw new Error('Invalid marathon PIN or room not found.');
      }

      if (room.status === 'FINISHED') {
        throw new Error('This marathon has already ended.');
      }

      const playerFilter = pb.filter("room_id = {:roomId} && name = {:name}", { roomId: room.id, name: playerName });
      try {
        existingPlayer = await pb.collection('dahoot_players').getFirstListItem(playerFilter);
      } catch (_e) {
      }

      let player;
      if (existingPlayer) {
        player = existingPlayer;
        localStorage.setItem('dahoot_marathon_player_id', player.id);
      } else {
        const initialLapIds = room.randomize_questions
          ? shuffleArray(room.question_ids)
          : [...room.question_ids];

        player = await pb.collection('dahoot_players').create({
          room_id: room.id,
          name: playerName,
          score: 0,
          last_answered_index: -1,
          answers: {},
          lap_question_ids: initialLapIds,
          marathon_stats: {
            total_answered: 0,
            correct_count: 0,
            current_streak: 0,
            best_streak: 0,
            longest_streak: 0,
            fastest_correct: null,
            lap: 0,
            question_history: []
          },
          session_start_time: new Date().toISOString(),
          last_answer_time: null
        });
        localStorage.setItem('dahoot_marathon_player_id', player.id);
      }

      setPlayerRoom(room);
      setPlayerRecord(player);

      const lapIds = player.lap_question_ids || room.question_ids;
      if (lapIds?.length > 0) {
        await loadAllQuestions(lapIds);
      }

      setView('marathonPlayer');
    } catch (err) {
      console.error(err);
      setError('Failed to join marathon: ' + err.message);
      alert('Failed to join marathon: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (userAnswer) => {
    if (playerSelectedIdx !== null || !playerRoom || !playerRecord || !currentQuestion) return;

    setPlayerSelectedIdx(userAnswer);

    try {
      const question = currentLapQuestions[playerQuestionIndex];
      if (!question) return;

      let isCorrect = false;
      const type = question.type || 'MULTIPLE_CHOICE';

      if (type === 'MULTIPLE_CHOICE') {
        isCorrect = userAnswer === question.correct_option_index;
      } else if (type === 'SORTING') {
        isCorrect = Array.isArray(userAnswer) &&
                    userAnswer.length === question.options.length &&
                    userAnswer.every((val, i) => val === question.options[i]);
      } else if (type === 'DRAG_DROP') {
        const correctArr = question.options.correct || [];
        isCorrect = Array.isArray(userAnswer) &&
                    userAnswer.length === correctArr.length &&
                    userAnswer.every((val, i) => val === correctArr[i]);
      } else if (type === 'DROP_DOWN') {
        const dropdowns = question.options.dropdowns || [];
        isCorrect = Array.isArray(userAnswer) &&
                    userAnswer.length === dropdowns.length &&
                    userAnswer.every((val, i) => val === dropdowns[i]?.correct);
      } else if (type === 'CATEGORIZE') {
        const correctItems = question.options.items || [];
        isCorrect = typeof userAnswer === 'object' && userAnswer !== null &&
                    correctItems.every(item => userAnswer[item.name] === item.category);
      }

      const points = isCorrect ? 1000 : 0;
      const currentStats = playerRecord.marathon_stats || {};
      const newStreak = isCorrect ? (currentStats.current_streak || 0) + 1 : 0;
      const bestStreak = Math.max(currentStats.best_streak || 0, newStreak);
      const longestStreak = Math.max(currentStats.longest_streak || 0, newStreak);

      const answerTime = playerRoom.current_question_start_time
        ? Date.now() - new Date(playerRoom.current_question_start_time).getTime()
        : Date.now();

      const fastestCorrect = isCorrect && answerTime
        ? Math.min(currentStats.fastest_correct || Infinity, answerTime)
        : currentStats.fastest_correct;

      const updatedStats = {
        total_answered: (currentStats.total_answered || 0) + 1,
        correct_count: isCorrect ? (currentStats.correct_count || 0) + 1 : currentStats.correct_count || 0,
        current_streak: newStreak,
        best_streak: bestStreak,
        longest_streak: longestStreak,
        fastest_correct: fastestCorrect,
        question_history: [
          ...(currentStats.question_history || []),
          {
            question_id: question.id,
            is_correct: isCorrect,
            answer_time: answerTime,
            timestamp: Date.now()
          }
        ].slice(-50)
      };

      const newIndex = playerQuestionIndex;

      const updatedPlayer = await pb.collection('dahoot_players').update(playerRecord.id, {
        score: (parseFloat(playerRecord.score) || 0) + points,
        last_answered_index: newIndex,
        answers: {
          ...playerRecord.answers,
          [question.id]: isCorrect
        },
        marathon_stats: updatedStats,
        last_answer_time: new Date().toISOString()
      });

      setPlayerRecord(updatedPlayer);
      setPlayerFeedback({ correct: isCorrect, points });
    } catch (err) {
      console.error('Error submitting answer:', err.message);
      setError('Failed to submit answer: ' + err.message);
    }
  };

  const advanceToNextQuestion = async () => {
    if (isStudentPaced && playerQuestionIndex >= currentLapQuestions.length) {
      const newIds = shuffleArray(currentLapQuestions.map(q => q.id));
      const newLap = (playerRecord.marathon_stats?.lap || 0) + 1;

      const updatedPlayer = await pb.collection('dahoot_players').update(playerRecord.id, {
        lap_question_ids: newIds,
        last_answered_index: -1,
        marathon_stats: {
          ...playerRecord.marathon_stats,
          lap: newLap
        }
      });

      const filter = newIds.map(id => pb.filter("id = {:id}", { id })).join(' || ');
      const questions = await pb.collection('dahoot_questions').getFullList({ filter });
      const ordered = newIds.map(id => questions.find(q => q.id === id)).filter(Boolean);

      setPlayerRecord(updatedPlayer);
      setCurrentLapQuestions(ordered);
      setPlayerSelectedIdx(null);
      setPlayerFeedback(null);
    } else {
      setPlayerSelectedIdx(null);
      setPlayerFeedback(null);
    }
  };

  const disconnectSession = async () => {
    try {
      localStorage.removeItem('dahoot_marathon_player_id');
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
    setPlayerRoom(null);
    setPlayerRecord(null);
    setAllQuestions([]);
    setCurrentLapQuestions([]);
    setPlayerSelectedIdx(null);
    setPlayerFeedback(null);
    setView('selection');
  };

  const exitMarathon = async () => {
    await disconnectSession();
  };

  useEffect(() => {
    if (!playerRoom) return;

    const roomId = playerRoom.id;

    let roomUnsub = null;
    let playerUnsub = null;

    pb.collection('dahoot_rooms').subscribe(roomId, async (e) => {
      if (e.action === 'update') {
        const updatedRoom = e.record;

        if (updatedRoom.question_ids && JSON.stringify(updatedRoom.question_ids) !== JSON.stringify(playerRoom.question_ids)) {
          const lapIds = playerRecord.lap_question_ids || updatedRoom.question_ids;
          await loadAllQuestions(lapIds);
        }

        setPlayerRoom(updatedRoom);
      } else if (e.action === 'delete') {
        alert('The marathon room has been closed by the host.');
        disconnectSession();
      }
    }).then(unsub => { roomUnsub = unsub; });

    pb.collection('dahoot_players').subscribe(playerRecord.id, (e) => {
      if (e.action === 'update') {
        setPlayerRecord(e.record);
      }
    }).then(unsub => { playerUnsub = unsub; });

    return () => {
      if (typeof roomUnsub === 'function') roomUnsub();
      if (typeof playerUnsub === 'function') playerUnsub();
    };
  }, [playerRoom?.id, playerRecord?.id]);

  return {
    playerRoom,
    playerRecord,
    allQuestions,
    currentLapQuestions,
    currentQuestion,
    playerQuestionIndex,
    currentLap,
    playerSelectedIdx,
    playerFeedback,
    error,
    loading,
    isStudentPaced,
    hasMoreQuestions,
    isFinished,
    joinMarathon,
    submitAnswer,
    advanceToNextQuestion,
    disconnectSession,
    exitMarathon
  };
}
