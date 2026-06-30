import { useState, useEffect } from 'react';
import { pb } from '../pb';

export function usePlayerGame(view, setView) {
  const [joinPin, setJoinPin] = useState('');
  const [playerName, setPlayerName] = useState('');
  
  const [playerRoom, setPlayerRoom] = useState(null);
  const [playerRecord, setPlayerRecord] = useState(null);
  const [playerQuestions, setPlayerQuestions] = useState([]);
  const [playerTimeLeft, setPlayerTimeLeft] = useState(20);
  const [playerSelectedIdx, setPlayerSelectedIdx] = useState(null);
  const [playerFeedback, setPlayerFeedback] = useState(null); // { correct: boolean, points: number }
  
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

  const attemptReconnect = async (playerId, roomId) => {
    try {
      setLoading(true);
      const room = await pb.collection('dahoot_rooms').getOne(roomId);
      const player = await pb.collection('dahoot_players').getOne(playerId);
      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: `game_id = "${room.game_id}"`,
        sort: 'created'
      });
      
      setPlayerRoom(room);
      setPlayerRecord(player);
      setPlayerQuestions(qList);
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
        }

        setPlayerRoom(updatedRoom);
      } else if (e.action === 'delete') {
        alert('The room has been closed by the host.');
        disconnectSession();
      }
    });

    // Listen to Player updates (e.g. self score updates or kick events)
    pb.collection('dahoot_players').subscribe(playerRecord.id, (e) => {
      if (e.action === 'update') {
        setPlayerRecord(e.record);
      } else if (e.action === 'delete') {
        alert('You have been removed from the room.');
        disconnectSession();
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

    const startTime = new Date(playerRoom.current_question_start_time).getTime();
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 20 - elapsed);
      setPlayerTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [view, playerRoom?.status, playerRoom?.current_question_start_time, playerRoom?.current_question_index]);

  const joinGame = async (e) => {
    e.preventDefault();
    setError('');
    if (!joinPin || !playerName) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);
    try {
      let room;
      try {
        room = await pb.collection('dahoot_rooms').getFirstListItem(`code = "${joinPin.trim()}"`);
      } catch (err) {
        throw new Error('Room not found. Check the code.');
      }

      if (room.status !== 'LOBBY') {
        throw new Error('Game already started or finished.');
      }

      const existing = await pb.collection('dahoot_players').getList(1, 1, {
        filter: `room_id = "${room.id}" && name = "${playerName.trim()}"`
      });
      if (existing.totalItems > 0) {
        throw new Error('Name taken in this room. Choose another.');
      }

      const player = await pb.collection('dahoot_players').create({
        room_id: room.id,
        name: playerName.trim().substring(0, 15),
        score: 0,
        last_answered_index: -1
      });

      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: `game_id = "${room.game_id}"`,
        sort: 'created'
      });
      
      localStorage.setItem('dahoot_player_id', player.id);
      localStorage.setItem('dahoot_room_id', room.id);

      setPlayerRoom(room);
      setPlayerRecord(player);
      setPlayerQuestions(qList);
      setView('player');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (userAnswer) => {
    if (!playerRoom || !playerRecord || playerSelectedIdx !== null) return;
    
    if (playerTimeLeft <= 0) {
      setError("Time's up!");
      return;
    }

    setPlayerSelectedIdx(userAnswer);
    const qIndex = playerRoom.current_question_index;
    const activeQuestion = playerQuestions[qIndex];
    
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
      const startTime = new Date(playerRoom.current_question_start_time).getTime();
      const elapsedSeconds = Math.max(0, (Date.now() - startTime) / 1000);
      points = Math.max(500, Math.round(1000 - (elapsedSeconds / 20) * 500));
    }

    try {
      const updatedPlayer = await pb.collection('dahoot_players').update(playerRecord.id, {
        score: playerRecord.score + points,
        last_answered_index: qIndex
      });
      setPlayerRecord(updatedPlayer);
      setPlayerFeedback({ correct: isCorrect, points });
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError("Failed to submit answer. Try again.");
    }
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
    disconnectSession
  };
}
