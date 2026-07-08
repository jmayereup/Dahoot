import { useState, useEffect } from 'react';
import { pb } from '../pb';
import { isAnswerCorrect } from '../utils/questionSchema';

export function usePlayerGame(view, setView, onMarathonRoom) {
  const [joinPin, setJoinPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  
  const [playerRoom, setPlayerRoom] = useState(null);
  const [playerRecord, setPlayerRecord] = useState(null);
  const [playerQuestions, setPlayerQuestions] = useState([]);
  const [playerTimeLeft, setPlayerTimeLeft] = useState(20);
  const [playerSelectedIdx, setPlayerSelectedIdx] = useState(null);
  const [playerFeedback, setPlayerFeedback] = useState(null); // { correct: boolean, points: number }
  const [removedReason, setRemovedReason] = useState(''); // 'removed' or 'closed'
  
  const [hasPinFromUrl, setHasPinFromUrl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle URL Pin extraction and Auto-reconnect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    if (pinParam) {
      setJoinPin(pinParam.replace(/\D/g, '').substring(0, 4));
      setHasPinFromUrl(true);
    } else {
      const cachedPlayerId = localStorage.getItem('dahoot_player_id');
      const cachedRoomId = localStorage.getItem('dahoot_room_id');
      if (cachedPlayerId && cachedRoomId) {
        attemptReconnect(cachedPlayerId, cachedRoomId);
      }
    }
  }, []);

  const restoreCachedAnswers = (room, questions) => {
    const cachedFeedbackStr = localStorage.getItem('dahoot_last_feedback');
    if (cachedFeedbackStr) {
      try {
        const cachedFeedback = JSON.parse(cachedFeedbackStr);
        const currentQuestion = questions[room.current_question_index];
        if (currentQuestion && cachedFeedback.questionId === currentQuestion.id) {
          setPlayerFeedback(cachedFeedback.feedback);
        }
      } catch (e) {}
    }
    const cachedSelectedStr = localStorage.getItem('dahoot_last_selected_idx');
    if (cachedSelectedStr) {
      try {
        const cachedSelected = JSON.parse(cachedSelectedStr);
        const currentQuestion = questions[room.current_question_index];
        if (currentQuestion && cachedSelected.questionId === currentQuestion.id) {
          setPlayerSelectedIdx(cachedSelected.selectedIdx);
        }
      } catch (e) {}
    }
  };

  const attemptReconnect = async (playerId, roomId) => {
    try {
      setRemovedReason('');
      setLoading(true);
      const room = await pb.collection('dahoot_rooms').getOne(roomId);
      const player = await pb.collection('dahoot_players').getOne(playerId);
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: room.game_id })
      });
      
      let finalQuestions = qList;
      if (room.question_ids && Array.isArray(room.question_ids) && room.question_ids.length > 0) {
        const idMap = new Map(room.question_ids.map((id, index) => [id, index]));
        finalQuestions = qList
          .filter(q => idMap.has(q.id))
          .sort((a, b) => idMap.get(a.id) - idMap.get(b.id));
      } else {
        finalQuestions.sort((a, b) => a.created.localeCompare(b.created));
      }
      
      setPlayerRoom(room);
      setPlayerRecord(player);
      setPlayerQuestions(finalQuestions);
      restoreCachedAnswers(room, finalQuestions);
      setView('player');
    } catch (err) {
      console.warn("Could not auto-reconnect to previous session:", err);
      localStorage.removeItem('dahoot_player_id');
      localStorage.removeItem('dahoot_room_id');
    } finally {
      setLoading(false);
    }
  };

  const disconnectSession = () => {
    localStorage.removeItem('dahoot_player_id');
    localStorage.removeItem('dahoot_room_id');
    localStorage.removeItem('dahoot_last_feedback');
    localStorage.removeItem('dahoot_last_selected_idx');
    window.location.reload();
  };

  // Player Real-time updates subscription
  useEffect(() => {
    if (view !== 'player' || !playerRoom || !playerRecord) return;

    // Listen to Room updates
    pb.collection('dahoot_rooms').subscribe(playerRoom.id, async (e) => {
      if (e.action === 'update') {
        const updatedRoom = e.record;
        
        // Reset player choice on new question
        if (updatedRoom.status === 'QUESTION' && playerRoom.status !== 'QUESTION') {
          setPlayerSelectedIdx(null);
          setPlayerFeedback(null);
          localStorage.removeItem('dahoot_last_feedback');
          localStorage.removeItem('dahoot_last_selected_idx');
        }

        setPlayerRoom(updatedRoom);
      } else if (e.action === 'delete') {
        setRemovedReason('closed');
      }
    });

    // Listen to Player updates (e.g. self score updates or kick events)
    pb.collection('dahoot_players').subscribe(playerRecord.id, (e) => {
      if (e.action === 'update') {
        setPlayerRecord(e.record);
      } else if (e.action === 'delete') {
        setRemovedReason('removed');
      }
    });

    return () => {
      pb.collection('dahoot_rooms').unsubscribe(playerRoom.id);
      pb.collection('dahoot_players').unsubscribe(playerRecord.id);
    };
  }, [view, playerRoom?.id, playerRecord?.id]);

  // Player Timer Control
  useEffect(() => {
    if (view !== 'player' || !playerRoom || playerRoom.status !== 'QUESTION' || !playerRoom.current_question_start_time) {
      return;
    }

    const duration = playerRoom.timer_duration;
    if (duration === 0) {
      setPlayerTimeLeft(null);
      return;
    }

    const startTime = new Date(playerRoom.current_question_start_time).getTime();
    const activeQuestion = playerQuestions[playerRoom.current_question_index];
    const isCategorize = activeQuestion && activeQuestion.type === 'CATEGORIZE';
    const limit = (duration !== undefined ? duration : 20) * (isCategorize ? 2 : 1);
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, limit - elapsed);
      setPlayerTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [view, playerRoom?.status, playerRoom?.current_question_start_time, playerRoom?.current_question_index, playerRoom?.timer_duration, playerQuestions]);

  const joinGame = async (e) => {
    e.preventDefault();
    setError('');
    setRemovedReason('');
    if (!joinPin || !playerName) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    try {
      let room;
      try {
        room = await pb.collection('dahoot_rooms').getFirstListItem(
          pb.filter("code = {:code}", { code: joinPin.trim() })
        );
      } catch (err) {
        throw new Error('Room not found. Check the code.');
      }

      if (room.marathon_mode && onMarathonRoom) {
        setLoading(false);
        onMarathonRoom(joinPin.trim(), playerName.trim());
        return;
      }

      if (room.status === 'FINISHED') {
        throw new Error('Game already finished.');
      }

      const existing = await pb.collection('dahoot_players').getList(1, 1, {
        filter: pb.filter("room_id = {:roomId} && name = {:name}", { roomId: room.id, name: playerName.trim() })
      });
      
      let player;
      if (existing.totalItems > 0) {
        player = existing.items[0];
      } else {
        player = await pb.collection('dahoot_players').create({
          room_id: room.id,
          name: playerName.trim().substring(0, 15),
          score: 0,
          last_answered_index: -1,
          answers: {}
        });
      }

      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId: room.game_id })
      });
      
      let finalQuestions = qList;
      if (room.question_ids && Array.isArray(room.question_ids) && room.question_ids.length > 0) {
        const idMap = new Map(room.question_ids.map((id, index) => [id, index]));
        finalQuestions = qList
          .filter(q => idMap.has(q.id))
          .sort((a, b) => idMap.get(a.id) - idMap.get(b.id));
      } else {
        finalQuestions.sort((a, b) => a.created.localeCompare(b.created));
      }
      
      localStorage.setItem('dahoot_player_id', player.id);
      localStorage.setItem('dahoot_room_id', room.id);

      setPlayerRoom(room);
      setPlayerRecord(player);
      setPlayerQuestions(finalQuestions);
      restoreCachedAnswers(room, finalQuestions);
      setView('player');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (userAnswer) => {
    if (!playerRoom || !playerRecord || playerSelectedIdx !== null) return;
    
    const duration = playerRoom.timer_duration;
    const isTimerActive = duration !== 0;
    if (isTimerActive && playerTimeLeft !== null && playerTimeLeft <= 0) {
      setError("Time's up!");
      return;
    }

    setPlayerSelectedIdx(userAnswer);
    const qIndex = playerRoom.current_question_index;
    const activeQuestion = playerQuestions[qIndex];
    
    if (!activeQuestion) return;

    const isCorrect = isAnswerCorrect(activeQuestion, userAnswer);

    let points = 0;
    if (isCorrect) {
      const duration = playerRoom.timer_duration;
      if (duration === 0) {
        points = 1000;
      } else {
        const isCategorize = activeQuestion && activeQuestion.type === 'CATEGORIZE';
        const limit = (duration || 20) * (isCategorize ? 2 : 1);
        const startTime = new Date(playerRoom.current_question_start_time).getTime();
        const elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000);
        points = Math.max(500, Math.round(1000 - (elapsedSeconds / limit) * 500));
      }
    }

    try {
      const currentAnswers = playerRecord.answers || {};
      const newAnswers = {
        ...currentAnswers,
        [activeQuestion.id]: isCorrect
      };

      const updatedPlayer = await pb.collection('dahoot_players').update(playerRecord.id, {
        score: (parseFloat(playerRecord.score) || 0) + points,
        last_answered_index: qIndex,
        answers: newAnswers
      });
      setPlayerRecord(updatedPlayer);
      setPlayerFeedback({ correct: isCorrect, points });

      // Save feedback and selection to localStorage for reconnect support
      localStorage.setItem('dahoot_last_feedback', JSON.stringify({
        questionId: activeQuestion.id,
        feedback: { correct: isCorrect, points }
      }));
      localStorage.setItem('dahoot_last_selected_idx', JSON.stringify({
        questionId: activeQuestion.id,
        selectedIdx: userAnswer
      }));
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError("Failed to submit answer. Try again.");
    }
  };

  const exitGame = async () => {
    if (playerRecord?.id) {
      try {
        await pb.collection('dahoot_players').delete(playerRecord.id);
      } catch (err) {
        console.error("Error deleting player record on exit:", err);
      }
    }
    disconnectSession();
  };

  return {
    joinPin,
    setJoinPin,
    playerName,
    setPlayerName,
    playerRoom,
    playerRecord,
    playerQuestions,
    playerTimeLeft,
    playerSelectedIdx,
    playerFeedback,
    hasPinFromUrl,
    setHasPinFromUrl,
    loading,
    error,
    setError,
    joinGame,
    submitAnswer,
    disconnectSession,
    exitGame,
    removedReason
  };
}
