import { useState, useEffect, useCallback } from 'react';
import { pb } from '../pb';
import { DEFAULT_QUESTIONS, SAMPLE_GAMES } from '../constants';

export function useHostGame(view, setView, hasPinFromUrl = false) {
  const [gamesList, setGamesList] = useState([]);
  const [hostRoom, setHostRoom] = useState(null);
  const [hostPlayers, setHostPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [hostTimeLeft, setHostTimeLeft] = useState(20);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentOptions, setCurrentOptions] = useState({});

  // Fetch games list
  const fetchGames = async () => {
    try {
      const list = await pb.collection('dahoot_games').getFullList({
        sort: '-created'
      });
      setGamesList(list);
    } catch (err) {
      console.error("Error fetching games list for host:", err);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // Generate QR code whenever the host room code is generated
  useEffect(() => {
    if (hostRoom?.code) {
      const joinUrlStr = `${window.location.origin}${window.location.pathname}?pin=${hostRoom.code}&openExternalBrowser=1`;
      import('qrcode')
        .then(({ default: QRCode }) => {
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
        })
        .catch(err => console.error("Failed to load qrcode library dynamically:", err));
    } else {
      setQrCodeUrl('');
    }
  }, [hostRoom?.code]);

  // Subscribe to players when hosting a room
  useEffect(() => {
    if (view !== 'host' || !hostRoom) return;

    let fetchTimeout = null;

    const fetchPlayers = async () => {
      try {
        const list = await pb.collection('dahoot_players').getFullList({
          filter: pb.filter("room_id = {:roomId}", { roomId: hostRoom.id }),
          sort: '-score'
        });
        // Stable sort client-side: score desc, then name/id asc
        list.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return (a.name || '').localeCompare(b.name || '') || a.id.localeCompare(b.id);
        });
        setHostPlayers(list);
      } catch (err) {
        console.error("Error fetching players:", err);
      }
    };

    const debouncedFetchPlayers = () => {
      if (fetchTimeout) clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(fetchPlayers, 100);
    };

    fetchPlayers();

    // Subscribe to players collection to update lobby/scores in real-time
    pb.collection('dahoot_players').subscribe('*', (e) => {
      if (e.record.room_id === hostRoom.id) {
        debouncedFetchPlayers();
      }
    });

    // Subscribe to room updates to keep state synced if changed elsewhere
    pb.collection('dahoot_rooms').subscribe(hostRoom.id, (e) => {
      if (e.action === 'update') {
        setHostRoom(e.record);
      }
    });

    return () => {
      if (fetchTimeout) clearTimeout(fetchTimeout);
      pb.collection('dahoot_players').unsubscribe('*');
      pb.collection('dahoot_rooms').unsubscribe(hostRoom.id);
    };
  }, [view, hostRoom?.id]);

  // Host Timer Control
  useEffect(() => {
    if (view !== 'host' || !hostRoom || hostRoom.status !== 'QUESTION' || !hostRoom.current_question_start_time) {
      return;
    }

    const duration = hostRoom.timer_duration;
    if (duration === 0) {
      setHostTimeLeft(null);
      return;
    }

    const startTime = new Date(hostRoom.current_question_start_time).getTime();
    const activeQuestion = questions[hostRoom.current_question_index];
    const isCategorize = activeQuestion && activeQuestion.type === 'CATEGORIZE';
    const limit = (duration !== undefined ? duration : 20) * (isCategorize ? 2 : 1);
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, limit - elapsed);
      setHostTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        hostShowLeaderboard();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [view, hostRoom?.status, hostRoom?.current_question_start_time, hostRoom?.current_question_index, hostRoom?.timer_duration, questions]);

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

  const joinUrl = hostRoom ? `${window.location.origin}${window.location.pathname}?pin=${hostRoom.code}&openExternalBrowser=1` : '';

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error("Failed to copy link:", err));
  };

  const startHosting = async (gameId, options = {}) => {
    setError('');
    if (!gameId) {
      setError('Please select a game to host.');
      return;
    }
    setLoading(true);
    try {
      setCurrentOptions(options);
      let qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId })
      });
      
      if (qList.length === 0) {
        throw new Error('This game has no questions. Please add questions in the Question Bank Manager first.');
      }
      
      // Filter by question types if specified
      let activeQuestions = [...qList];
      if (options.questionTypes && options.questionTypes.length > 0) {
        activeQuestions = activeQuestions.filter(q => options.questionTypes.includes(q.type || 'MULTIPLE_CHOICE'));
      }

      if (activeQuestions.length === 0) {
        throw new Error('This game has no questions matching the selected question types.');
      }

      // Shuffle if randomize option is enabled
      if (options.randomize) {
        for (let i = activeQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [activeQuestions[i], activeQuestions[j]] = [activeQuestions[j], activeQuestions[i]];
        }
      } else {
        // Default sort by created
        activeQuestions.sort((a, b) => a.created.localeCompare(b.created));
      }

      // Limit question count if specified and valid
      if (options.maxQuestions && options.maxQuestions > 0) {
        activeQuestions = activeQuestions.slice(0, options.maxQuestions);
      }
      
      setQuestions(activeQuestions);

      // Generate a unique PIN (ensure no active room is using it)
      let pin = '';
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 15) {
        pin = Math.floor(1000 + Math.random() * 9000).toString();
        try {
          await pb.collection('dahoot_rooms').getFirstListItem(
            pb.filter("code = {:code} && status != 'FINISHED'", { code: pin })
          );
          attempts++;
        } catch (err) {
          isUnique = true;
        }
      }
      if (!isUnique) {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
      }

      const questionIds = activeQuestions.map(q => q.id);

      const room = await pb.collection('dahoot_rooms').create({
        code: pin,
        game_id: gameId,
        current_question_index: 0,
        status: 'LOBBY',
        current_question_start_time: '',
        question_ids: questionIds,
        timer_duration: options.timerDuration !== undefined ? options.timerDuration : 20
      });

      setHostRoom(room);
      localStorage.setItem('dahoot_host_room_id', room.id);
      setView('host');
    } catch (err) {
      console.error(err);
      setError('Failed to create hosting room: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const adoptRoom = useCallback((room, activeQuestions, players) => {
    setHostRoom(room);
    setQuestions(activeQuestions);
    setHostPlayers(players);
    setCurrentOptions({
      timerDuration: room.timer_duration,
      maxQuestions: room.max_questions,
      randomize: room.randomize_questions,
      marathonMode: room.marathon_mode,
      pacingMode: room.pacing_mode
    });
    localStorage.setItem('dahoot_host_room_id', room.id);
  }, []);

  const clearRoom = () => {
    setHostRoom(null);
    setQuestions([]);
    setHostPlayers([]);
  };

  const restartRoomWithGame = async (gameId, options = {}) => {
    if (!hostRoom) return;
    setError('');
    setLoading(true);
    try {
      let qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId })
      });
      
      if (qList.length === 0) {
        throw new Error('This game has no questions. Please add questions in the Question Bank Manager first.');
      }
      
      // Filter by question types if specified
      let activeQuestions = [...qList];
      if (options.questionTypes && options.questionTypes.length > 0) {
        activeQuestions = activeQuestions.filter(q => options.questionTypes.includes(q.type || 'MULTIPLE_CHOICE'));
      }

      if (activeQuestions.length === 0) {
        throw new Error('This game has no questions matching the selected question types.');
      }

      // Shuffle if randomize option is enabled
      const shouldRandomize = options.randomize !== false;
      if (shouldRandomize) {
        for (let i = activeQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [activeQuestions[i], activeQuestions[j]] = [activeQuestions[j], activeQuestions[i]];
        }
      } else {
        // Default sort by created
        activeQuestions.sort((a, b) => a.created.localeCompare(b.created));
      }

      // Limit question count if specified and valid
      if (options.maxQuestions && options.maxQuestions > 0) {
        activeQuestions = activeQuestions.slice(0, options.maxQuestions);
      }
      
      setQuestions(activeQuestions);
      const questionIds = activeQuestions.map(q => q.id);

      // Reset all players currently in this room: score=0, answers={}, last_answered_index=-1
      const playerUpdates = hostPlayers.map(p => {
        const updateData = {
          score: 0,
          answers: {},
          last_answered_index: -1
        };
        if (options.marathonMode) {
          const shuffle = (arr) => {
            const res = [...arr];
            for (let i = res.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [res[i], res[j]] = [res[j], res[i]];
            }
            return res;
          };
          updateData.lap_question_ids = shouldRandomize
            ? shuffle(questionIds)
            : [...questionIds];
          updateData.marathon_stats = {
            total_answered: 0,
            correct_count: 0,
            current_streak: 0,
            best_streak: 0,
            longest_streak: 0,
            fastest_correct: null,
            lap: 0,
            question_history: []
          };
          updateData.session_start_time = new Date().toISOString();
          updateData.last_answer_time = null;
        }
        return pb.collection('dahoot_players').update(p.id, updateData);
      });
      await Promise.all(playerUpdates);

      // Update room to transition back to LOBBY
      const updatePayload = {
        game_id: gameId,
        current_question_index: 0,
        status: 'LOBBY',
        current_question_start_time: '',
        question_ids: questionIds,
        timer_duration: options.marathonMode ? 0 : (options.timerDuration !== undefined ? options.timerDuration : 20),
        pacing_mode: options.marathonMode ? 'student' : '',
        marathon_mode: !!options.marathonMode,
        wrap_up_timer: options.marathonMode ? 60 : 0,
        wrap_up_start_time: null,
        question_pool_size: activeQuestions.length,
        max_questions: options.maxQuestions || null,
        randomize_questions: shouldRandomize
      };

      const updatedRoom = await pb.collection('dahoot_rooms').update(hostRoom.id, updatePayload);

      setHostRoom(updatedRoom);
      setCurrentOptions(options);

      // Transition the teacher view if pacing mode changed
      if (options.marathonMode) {
        setView('marathonHost');
      } else {
        setView('host');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to restart game: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const hostPlayAgain = async () => {
    if (!hostRoom) return;
    await restartRoomWithGame(hostRoom.game_id, currentOptions);
  };

  const hostChangeGame = async (gameId, options = {}) => {
    if (!hostRoom) return;
    await restartRoomWithGame(gameId, options);
  };

  const hostStartGame = async () => {
    if (!hostRoom) return;
    try {
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
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
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
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
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
        status: 'FINISHED'
      });
    } else {
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
        status: 'QUESTION',
        current_question_index: nextIdx,
        current_question_start_time: new Date().toISOString()
      });
    }
  };

  const hostEndGame = async () => {
    if (!hostRoom) return;
    try {
      await pb.collection('dahoot_rooms').delete(hostRoom.id);
      setHostRoom(null);
      setHostPlayers([]);
      setView('selection');
      localStorage.removeItem('dahoot_host_room_id');
    } catch (err) {
      console.error("Error closing room:", err);
      setView('selection');
      localStorage.removeItem('dahoot_host_room_id');
    }
  };

  const seedQuestions = async () => {
    try {
      setLoading(true);
      const list = await pb.collection('dahoot_games').getList(1, 1);
      if (list.totalItems === 0) {
        for (const gameEntry of SAMPLE_GAMES) {
          const { questions, ...gameData } = gameEntry;
          const newGame = await pb.collection('dahoot_games').create(gameData);
          if (Array.isArray(questions)) {
            for (const q of questions) {
              await pb.collection('dahoot_questions').create({
                ...q,
                game_id: newGame.id
              });
            }
          }
        }
        alert("Sample games and questions seeded successfully!");
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

  const hostCancelTimer = async () => {
    if (!hostRoom) return;
    try {
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
        timer_duration: 0
      });
    } catch (err) {
      console.error("Error cancelling timer:", err);
    }
  };

  const hostRemovePlayer = async (playerId) => {
    try {
      await pb.collection('dahoot_players').delete(playerId);
    } catch (err) {
      console.error("Error removing player:", err);
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
    loading,
    error,
    joinUrl,
    handleCopyLink,
    startHosting,
    hostStartGame,
    hostShowLeaderboard,
    hostNextQuestion,
    hostEndGame,
    hostCancelTimer,
    seedQuestions,
    refreshGames: fetchGames,
    hostRemovePlayer,
    hostPlayAgain,
    hostChangeGame,
    adoptRoom,
    clearRoom
  };
}
