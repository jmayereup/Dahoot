import { useState, useEffect, useMemo, useCallback } from 'react';
import { pb } from '../pb';
import { shuffleArray } from '../utils/shuffle';

export function useMarathonHost(view, setView) {
  const [hostRoom, setHostRoom] = useState(null);
  const [hostPlayers, setHostPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [wrapUpTimeLeft, setWrapUpTimeLeft] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gamesList, setGamesList] = useState([]);
  const [currentOptions, setCurrentOptions] = useState({});

  useEffect(() => {
    pb.collection('dahoot_games').getFullList({ sort: '-created' })
      .then(list => setGamesList(list))
      .catch(err => console.error("Error fetching games list in marathon host:", err));
  }, []);

  const isStudentPaced = hostRoom?.pacing_mode === 'student';

  const marathonStats = useMemo(() => {
    if (hostPlayers.length === 0) {
      return { totalAnswered: 0, accuracy: 0, bestStreak: 0, activeStudents: 0, bestStreakPlayer: null, mostCorrectPlayer: null, mostCorrectCount: 0 };
    }
    const totalAnswered = hostPlayers.reduce((sum, p) => {
      const stats = p.marathon_stats || {};
      return sum + (stats.total_answered || 0);
    }, 0);

    const totalCorrect = hostPlayers.reduce((sum, p) => {
      const stats = p.marathon_stats || {};
      return sum + (stats.correct_count || 0);
    }, 0);

    const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    let bestStreakVal = 0;
    let bestStreakPlayer = null;
    let mostCorrectVal = 0;
    let mostCorrectPlayer = null;

    hostPlayers.forEach(p => {
      const stats = p.marathon_stats || {};
      const pBest = stats.best_streak || 0;
      if (pBest > bestStreakVal) {
        bestStreakVal = pBest;
        bestStreakPlayer = p;
      }
      const pCorrect = stats.correct_count || 0;
      if (pCorrect > mostCorrectVal) {
        mostCorrectVal = pCorrect;
        mostCorrectPlayer = p;
      }
    });

    const activeStudents = hostPlayers.filter(p => {
      const stats = p.marathon_stats || {};
      return (stats.total_answered || 0) > 0;
    }).length;

    return { totalAnswered, accuracy, bestStreak: bestStreakVal, activeStudents, bestStreakPlayer, mostCorrectPlayer, mostCorrectCount: mostCorrectVal };
  }, [hostPlayers]);

  const generateUniquePin = async () => {
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
    return pin;
  };

  const startMarathonHosting = async (gameId, options = {}) => {
    setError('');
    setLoading(true);
    try {
      setCurrentOptions({ ...options, marathonMode: true });
      const game = await pb.collection('dahoot_games').getOne(gameId);

      const qList = await pb.collection('dahoot_questions').getFullList({
        filter: pb.filter("game_id = {:gameId}", { gameId })
      });

      if (qList.length === 0) {
        throw new Error('This game has no questions. Please add questions first.');
      }

      let activeQuestions = [...qList];
      if (options.questionTypes && options.questionTypes.length > 0) {
        activeQuestions = activeQuestions.filter(q => options.questionTypes.includes(q.type || 'MULTIPLE_CHOICE'));
      }

      if (activeQuestions.length === 0) {
        throw new Error('No questions match the selected criteria.');
      }

      if (options.randomize !== false) {
        activeQuestions = shuffleArray(activeQuestions);
      }

      const pacingMode = options.pacingMode || 'student';
      const pin = await generateUniquePin();

      const room = await pb.collection('dahoot_rooms').create({
        code: pin,
        game_id: gameId,
        current_question_index: 0,
        status: 'LOBBY',
        current_question_start_time: '',
        question_ids: activeQuestions.map(q => q.id),
        timer_duration: 0,
        pacing_mode: pacingMode,
        marathon_mode: true,
        wrap_up_timer: 60,
        wrap_up_start_time: null,
        question_pool_size: activeQuestions.length,
        max_questions: options.maxQuestions || null,
        randomize_questions: options.randomize !== false
      });

      setHostRoom(room);
      setQuestions(activeQuestions);
      localStorage.setItem('dahoot_host_room_id', room.id);
      setView('marathonHost');
    } catch (err) {
      console.error(err);
      setError('Failed to start marathon: ' + err.message);
      alert('Failed to start marathon: ' + err.message);
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

  const fetchPlayers = async () => {
    if (!hostRoom) return;
    try {
      const players = await pb.collection('dahoot_players').getFullList({
        filter: pb.filter("room_id = {:roomId}", { roomId: hostRoom.id }),
        sort: '-score'
      });
      // Stable sort client-side: score desc, then name/id asc
      players.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (a.name || '').localeCompare(b.name || '') || a.id.localeCompare(b.id);
      });
      setHostPlayers(players);
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  const hostStartMarathon = async () => {
    if (!hostRoom) return;

    try {
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
        status: 'QUESTION',
        current_question_index: 0,
        current_question_start_time: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error starting marathon: ' + err.message);
      alert('Failed to start marathon: ' + err.message);
    }
  };

  const hostStartWrapUp = async () => {
    if (!hostRoom) return;

    try {
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
        status: 'WRAP_UP',
        wrap_up_start_time: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error starting wrap-up timer: ' + err.message);
      alert('Failed to start wrap-up timer: ' + err.message);
    }
  };

  const hostShowLeaderboard = async () => {
    if (!hostRoom) return;

    try {
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
        status: 'LEADERBOARD'
      });
    } catch (err) {
      console.error('Error showing leaderboard: ' + err.message);
    }
  };

  const reshuffleQuestionIds = () => {
    const ids = [...questions.map(q => q.id)];
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  };

  const hostNextQuestion = async () => {
    if (!hostRoom) return;
    const nextIdx = hostRoom.current_question_index + 1;
    if (nextIdx >= questions.length) {
      const newLap = currentLap + 1;
      const newIds = reshuffleQuestionIds();
      setCurrentLap(newLap);
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
        question_ids: newIds,
        current_question_index: 0,
        current_question_start_time: new Date().toISOString()
      });
    } else {
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
        status: 'QUESTION',
        current_question_index: nextIdx,
        current_question_start_time: new Date().toISOString()
      });
    }
  };

  const hostCancelTimer = async () => {
    if (!hostRoom) return;
    try {
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
        timer_duration: 0
      });
    } catch (err) {
      console.error('Error cancelling timer:', err);
    }
  };

  const hostEndMarathon = async () => {
    if (!hostRoom) return;

    try {
      await pb.collection('dahoot_rooms').update(hostRoom.id, {
        status: 'FINISHED'
      });
    } catch (err) {
      console.error('Error ending marathon: ' + err.message);
    }
  };

  const exitMarathon = async () => {
    if (hostRoom) {
      try {
        await pb.collection('dahoot_rooms').delete(hostRoom.id);
      } catch (err) {
        console.error('Error deleting room: ' + err.message);
      }
    }
    setHostRoom(null);
    setHostPlayers([]);
    setQuestions([]);
    setCurrentLap(1);
    setView('selection');
    localStorage.removeItem('dahoot_host_room_id');
  };

  useEffect(() => {
    if (!hostRoom) return;

    let fetchTimeout = null;

    const debouncedFetchPlayers = () => {
      if (fetchTimeout) clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(fetchPlayers, 100);
    };

    pb.collection('dahoot_rooms').subscribe(hostRoom.id, async (e) => {
      if (e.action === 'update') {
        setHostRoom(e.record);
      } else if (e.action === 'delete') {
        alert('Marathon room was deleted.');
        exitMarathon();
      }
    });

    pb.collection('dahoot_players').subscribe('*', (e) => {
      if (e.record.room_id === hostRoom.id) {
        debouncedFetchPlayers();
      }
    });

    fetchPlayers();

    return () => {
      if (fetchTimeout) clearTimeout(fetchTimeout);
      pb.collection('dahoot_rooms').unsubscribe(hostRoom.id);
      pb.collection('dahoot_players').unsubscribe('*');
    };
  }, [hostRoom?.id]);

  useEffect(() => {
    if (hostRoom?.status !== 'WRAP_UP' || !hostRoom?.wrap_up_start_time) return;

    const startTime = new Date(hostRoom.wrap_up_start_time).getTime();
    const wrapUpDuration = hostRoom.wrap_up_timer || 60;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, wrapUpDuration - elapsed);
      setWrapUpTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        hostShowLeaderboard();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [hostRoom?.status, hostRoom?.wrap_up_start_time]);

  useEffect(() => {
    if (!hostRoom || hostRoom.status !== 'QUESTION' || hostPlayers.length === 0) return;

    const allPassedFirstLap = hostPlayers.every(p => (p.marathon_stats?.lap || 0) >= 1);
    if (!allPassedFirstLap) return;

    const poolSize = hostRoom.question_pool_size || questions.length;
    const threshold = Math.ceil(poolSize * 0.8);

    const allMastered = hostPlayers.every(p => {
      const history = p.marathon_stats?.question_history || [];
      const uniqueCorrect = new Set(
        history.filter(h => h.is_correct).map(h => h.question_id)
      ).size;
      return uniqueCorrect >= threshold;
    });

    if (allMastered) {
      hostEndMarathon();
    }
  }, [hostPlayers, hostRoom?.status]);

  const hostRemovePlayer = async (playerId) => {
    try {
      await pb.collection('dahoot_players').delete(playerId);
    } catch (err) {
      console.error('Error removing player:', err);
    }
  };

  return {
    hostRoom,
    hostPlayers,
    questions,
    wrapUpTimeLeft,
    currentLap,
    qrCodeUrl,
    copied,
    joinUrl,
    handleCopyLink,
    loading,
    error,
    isStudentPaced,
    marathonStats,
    startMarathonHosting,
    hostStartMarathon,
    hostStartWrapUp,
    hostShowLeaderboard,
    hostShowMarathonLeaderboard: hostShowLeaderboard,
    hostNextQuestion,
    hostCancelTimer,
    hostEndMarathon,
    exitMarathon,
    hostRemovePlayer,
    gamesList,
    hostPlayAgain,
    hostChangeGame,
    adoptRoom,
    clearRoom
  };
}
