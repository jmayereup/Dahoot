import { useState, useEffect } from 'react';
import { pb } from '../pb';
import QRCode from 'qrcode';
import { DEFAULT_QUESTIONS } from '../constants';

export function useHostGame(view, setView) {
  const [gamesList, setGamesList] = useState([]);
  const [hostRoom, setHostRoom] = useState(null);
  const [hostPlayers, setHostPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [hostTimeLeft, setHostTimeLeft] = useState(20);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch games list
  const fetchGames = async () => {
    try {
      const list = await pb.collection('games').getFullList({
        sort: 'created'
      });
      setGamesList(list);
    } catch (err) {
      console.error("Error fetching games list for host:", err);
    }
  };

  useEffect(() => {
    if (view === 'selection') {
      fetchGames();
    }
  }, [view]);

  // Generate QR code whenever the host room code is generated
  useEffect(() => {
    if (hostRoom?.code) {
      const joinUrlStr = `${window.location.origin}${window.location.pathname}?pin=${hostRoom.code}`;
      QRCode.toDataURL(joinUrlStr, {
        width: 256,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error("Error generating QR code:", err));
    } else {
      setQrCodeUrl('');
    }
  }, [hostRoom?.code]);

  // Subscribe to players when hosting a room
  useEffect(() => {
    if (view !== 'host' || !hostRoom) return;

    const fetchPlayers = async () => {
      try {
        const list = await pb.collection('players').getFullList({
          filter: `room_id = "${hostRoom.id}"`,
          sort: '-score'
        });
        setHostPlayers(list);
      } catch (err) {
        console.error("Error fetching players:", err);
      }
    };

    fetchPlayers();

    // Subscribe to players collection to update lobby/scores in real-time
    pb.collection('players').subscribe('*', (e) => {
      if (e.record.room_id === hostRoom.id) {
        fetchPlayers();
      }
    });

    // Subscribe to room updates to keep state synced if changed elsewhere
    pb.collection('rooms').subscribe(hostRoom.id, (e) => {
      if (e.action === 'update') {
        setHostRoom(e.record);
      }
    });

    return () => {
      pb.collection('players').unsubscribe('*');
      pb.collection('rooms').unsubscribe(hostRoom.id);
    };
  }, [view, hostRoom?.id]);

  // Host Timer Control
  useEffect(() => {
    if (view !== 'host' || !hostRoom || hostRoom.status !== 'QUESTION' || !hostRoom.current_question_start_time) {
      return;
    }

    const startTime = new Date(hostRoom.current_question_start_time).getTime();
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 20 - elapsed);
      setHostTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        hostShowLeaderboard();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [view, hostRoom?.status, hostRoom?.current_question_start_time, hostRoom?.current_question_index]);

  // Host Auto-skip: If all players have answered, trigger leaderboard
  useEffect(() => {
    if (view !== 'host' || !hostRoom || hostRoom.status !== 'QUESTION' || hostPlayers.length === 0) {
      return;
    }

    const currentIdx = hostRoom.current_question_index;
    const allAnswered = hostPlayers.every(p => p.last_answered_index === currentIdx);
    
    if (allAnswered) {
      hostShowLeaderboard();
    }
  }, [view, hostRoom?.status, hostPlayers, hostRoom?.current_question_index]);

  const joinUrl = hostRoom ? `${window.location.origin}${window.location.pathname}?pin=${hostRoom.code}` : '';

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error("Failed to copy link:", err));
  };

  const startHosting = async (gameId) => {
    setError('');
    if (!gameId) {
      setError('Please select a game to host.');
      return;
    }
    setLoading(true);
    try {
      let qList = await pb.collection('questions').getFullList({
        filter: `game_id = "${gameId}"`,
        sort: 'created'
      });
      
      if (qList.length === 0) {
        throw new Error('This game has no questions. Please add questions in the Question Bank Manager first.');
      }
      
      setQuestions(qList);

      const pin = Math.floor(1000 + Math.random() * 9000).toString();

      const room = await pb.collection('rooms').create({
        code: pin,
        game_id: gameId,
        current_question_index: 0,
        status: 'LOBBY',
        current_question_start_time: ''
      });

      setHostRoom(room);
      setView('host');
    } catch (err) {
      console.error(err);
      setError('Failed to create hosting room: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const hostStartGame = async () => {
    if (!hostRoom) return;
    try {
      await pb.collection('rooms').update(hostRoom.id, {
        status: 'QUESTION',
        current_question_index: 0,
        current_question_start_time: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error starting game:", err);
    }
  };

  const hostShowLeaderboard = async () => {
    if (!hostRoom) return;
    try {
      await pb.collection('rooms').update(hostRoom.id, {
        status: 'LEADERBOARD'
      });
    } catch (err) {
      console.error("Error transitioning to leaderboard:", err);
    }
  };

  const hostNextQuestion = async () => {
    if (!hostRoom) return;
    const nextIdx = hostRoom.current_question_index + 1;
    if (nextIdx >= questions.length) {
      await pb.collection('rooms').update(hostRoom.id, {
        status: 'FINISHED'
      });
    } else {
      await pb.collection('rooms').update(hostRoom.id, {
        status: 'QUESTION',
        current_question_index: nextIdx,
        current_question_start_time: new Date().toISOString()
      });
    }
  };

  const hostEndGame = async () => {
    if (!hostRoom) return;
    try {
      await pb.collection('rooms').delete(hostRoom.id);
      setHostRoom(null);
      setHostPlayers([]);
      setView('selection');
    } catch (err) {
      console.error("Error closing room:", err);
      setView('selection');
    }
  };

  const seedQuestions = async () => {
    try {
      setLoading(true);
      const list = await pb.collection('games').getList(1, 1);
      if (list.totalItems === 0) {
        const defaultGame = await pb.collection('games').create({
          title: "General Tech Trivia",
          description: "A fun quiz testing your knowledge of programming history, CSS, React, and general technology stack layers."
        });
        for (const q of DEFAULT_QUESTIONS) {
          await pb.collection('questions').create({
            ...q,
            game_id: defaultGame.id
          });
        }
        alert("Sample game and questions seeded successfully!");
      } else {
        alert("Games database already has data.");
      }
      await fetchGames();
    } catch (err) {
      alert("Failed to seed questions: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    gamesList,
    hostRoom,
    hostPlayers,
    questions,
    hostTimeLeft,
    qrCodeUrl,
    copied,
    joinUrl,
    loading,
    error,
    setError,
    setLoading,
    startHosting,
    hostStartGame,
    hostShowLeaderboard,
    hostNextQuestion,
    hostEndGame,
    handleCopyLink,
    seedQuestions,
    refreshGames: fetchGames
  };
}
