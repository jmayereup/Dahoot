import { useState, useEffect, useCallback, useRef } from 'react';
import { pb } from '../pb';
import { shuffleArray } from '../utils/shuffle';
import { isAnswerCorrect } from '../utils/questionSchema';

export function useMarathonPlayer(view, setView, onStandardRoom) {
  const [playerRoom, setPlayerRoom] = useState(null);
  const [playerRecord, setPlayerRecord] = useState(null);
  const playerRoomRef = useRef(playerRoom);
  const playerRecordRef = useRef(playerRecord);
  useEffect(() => {
    playerRoomRef.current = playerRoom;
  }, [playerRoom]);
  useEffect(() => {
    playerRecordRef.current = playerRecord;
  }, [playerRecord]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [playerSelectedIdx, setPlayerSelectedIdx] = useState(null);
  const [playerFeedback, setPlayerFeedback] = useState(null);
  const [currentLapQuestions, setCurrentLapQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removedReason, setRemovedReason] = useState(''); // 'removed' or 'closed'

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
    setRemovedReason('');
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

      const normalizedName = playerName.trim().substring(0, 15);
      const playerFilter = pb.filter("room_id = {:roomId} && name = {:name}", { roomId: room.id, name: normalizedName });
      let existingPlayer = null;
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
          name: normalizedName,
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
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (userAnswer) => {
    if (playerSelectedIdx !== null || !playerRoom || !playerRecord || !currentQuestion) return;
    if (playerRoom.status === 'LOBBY' || playerRoom.status === 'FINISHED') return;

    setPlayerSelectedIdx(userAnswer);

    try {
      const question = currentLapQuestions[playerQuestionIndex];
      if (!question) return;

      const isDiscussion = question.type === 'DISCUSSION';
      const isCorrect = isAnswerCorrect(question, userAnswer);

      const points = isDiscussion ? 0 : (isCorrect ? 1000 : 0);
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
        ...currentStats,
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

      const answerVal = isDiscussion
        ? { text: typeof userAnswer === 'string' ? userAnswer : (userAnswer?.text || ''), isDiscussion: true }
        : isCorrect;

      const updatedPlayer = await pb.collection('dahoot_players').update(playerRecord.id, {
        score: (parseFloat(playerRecord.score) || 0) + points,
        last_answered_index: newIndex,
        answers: {
          ...playerRecord.answers,
          [question.id]: answerVal
        },
        marathon_stats: updatedStats,
        last_answer_time: new Date().toISOString()
      });

      setPlayerRecord(updatedPlayer);
      setPlayerFeedback(
        isDiscussion
          ? { correct: true, isDiscussion: true, points: 0, responseText: answerVal.text }
          : { correct: isCorrect, points }
      );
    } catch (err) {
      console.error('Error submitting answer:', err.message);
      setPlayerSelectedIdx(null);
      setError('Failed to submit answer: ' + err.message);
    }
  };

  const advanceToNextQuestion = async () => {
    if (!playerRoom || playerRoom.status === 'LOBBY' || playerRoom.status === 'FINISHED') return;
    if (isStudentPaced && currentLapQuestions.length > 0 && playerQuestionIndex >= currentLapQuestions.length) {
      try {
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
        setAllQuestions(ordered);
        setCurrentLapQuestions(ordered);
        setPlayerSelectedIdx(null);
        setPlayerFeedback(null);
      } catch (err) {
        console.error('Error advancing to next lap:', err);
        setError('Failed to load next lap. Please try again.');
      }
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
    if (view !== 'marathonPlayer' || !playerRoom || !playerRecord) return;

    const roomId = playerRoom.id;
    const playerId = playerRecord.id;
    let isMounted = true;
    let roomUnsub = null;
    let playerUnsub = null;

    pb.collection('dahoot_rooms').subscribe(roomId, async (e) => {
      if (!isMounted) return;
      if (e.action === 'update') {
        const updatedRoom = e.record;
        const prevRoom = playerRoomRef.current;

        if (!updatedRoom.marathon_mode) {
          setPlayerRoom(null);
          setPlayerRecord(null);
          setAllQuestions([]);
          setCurrentLapQuestions([]);
          setPlayerSelectedIdx(null);
          setPlayerFeedback(null);
          if (onStandardRoom) {
            onStandardRoom(updatedRoom.id, playerId);
          } else {
            setView('player');
          }
          return;
        }

        if (updatedRoom.status === 'LOBBY') {
          setPlayerSelectedIdx(null);
          setPlayerFeedback(null);
        }

        if (updatedRoom.question_ids && JSON.stringify(updatedRoom.question_ids) !== JSON.stringify(prevRoom?.question_ids)) {
          const lapIds = updatedRoom.status === 'LOBBY'
            ? updatedRoom.question_ids
            : (playerRecordRef.current?.lap_question_ids || updatedRoom.question_ids);
          await loadAllQuestions(lapIds);
        }

        setPlayerRoom(updatedRoom);
      } else if (e.action === 'delete') {
        setRemovedReason('closed');
      }
    }).then(unsub => {
      if (!isMounted) {
        if (typeof unsub === 'function') unsub();
      } else {
        roomUnsub = unsub;
      }
    });

    pb.collection('dahoot_players').subscribe(playerId, (e) => {
      if (!isMounted) return;
      if (e.action === 'update') {
        setPlayerRecord(e.record);
      } else if (e.action === 'delete') {
        setRemovedReason('removed');
      }
    }).then(unsub => {
      if (!isMounted) {
        if (typeof unsub === 'function') unsub();
      } else {
        playerUnsub = unsub;
      }
    });

    return () => {
      isMounted = false;
      if (typeof roomUnsub === 'function') roomUnsub();
      if (typeof playerUnsub === 'function') playerUnsub();
    };
  }, [view, playerRoom?.id, playerRecord?.id]);

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
    exitMarathon,
    removedReason
  };
}
