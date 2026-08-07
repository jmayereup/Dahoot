import React, { useState, useEffect, useRef } from 'react';

const TRACKS = [
  { id: 'offbeat', name: 'Slightly Offbeat (Lobby)', path: '/gameMusic/slightly-offbeat-soundroll-main-version-48700-01-30.mp3' },
  { id: 'recess', name: 'Recess Logic (Thinking)', path: '/gameMusic/Recess_Logic.mp3' },
  { id: 'golden_hour', name: 'Golden Hour Market (Gameplay)', path: '/gameMusic/Golden_Hour_Market.mp3' },
  { id: 'lotus_bloom', name: 'Lotus Bloom Bounce (Gameplay)', path: '/gameMusic/Lotus_Bloom_Bounce.mp3' },
  { id: 'paddy_field', name: 'Paddy Field Shuffle (Gameplay)', path: '/gameMusic/Paddy_Field_Shuffle.mp3' },
  { id: 'sunday', name: 'Sunday High (Celebration)', path: '/gameMusic/Sunday_High.mp3' }
];

export function GameMusicController({ gameStatus, isMarathon = false }) {
  const [currentTrackId, setCurrentTrackId] = useState('offbeat');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [playError, setPlayError] = useState(false);

  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  // Keep refs in sync with state for access in intervals without stale closures
  const currentTrackIdRef = useRef(currentTrackId);
  const currentVolumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const isPlayingRef = useRef(isPlaying);
  const isFadingOutRef = useRef(false);
  const prevStatusRef = useRef(gameStatus);

  useEffect(() => {
    currentTrackIdRef.current = currentTrackId;
  }, [currentTrackId]);

  useEffect(() => {
    currentVolumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isMutedRef.current = isMuted;
    // Only update directly if we are NOT actively fading
    if (audioRef.current && !fadeIntervalRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const currentTrack = TRACKS.find(t => t.id === currentTrackId) || TRACKS[0];

  // Sync game phase to active track when autoSync is active
  useEffect(() => {
    if (!autoSync) {
      prevStatusRef.current = gameStatus;
      return;
    }

    let targetTrackId = currentTrackId;
    let shouldPlay = true;

    if (gameStatus === 'LOBBY') {
      targetTrackId = 'offbeat';
      shouldPlay = true;
    } else if (gameStatus === 'QUESTION') {
      const gameplayTracks = ['recess', 'golden_hour', 'lotus_bloom', 'paddy_field'];
      const isCurrentGameplay = gameplayTracks.includes(currentTrackId);
      const transitionedToQuestion = prevStatusRef.current !== 'QUESTION';

      if (transitionedToQuestion || !isCurrentGameplay) {
        // Exclude the current track if possible to avoid playing the same track twice in a row
        const available = gameplayTracks.filter(id => id !== currentTrackId);
        const choice = available.length > 0 ? available : gameplayTracks;
        const randomIndex = Math.floor(Math.random() * choice.length);
        targetTrackId = choice[randomIndex];
      } else {
        targetTrackId = currentTrackId;
      }
      shouldPlay = true;
    } else if (gameStatus === 'LEADERBOARD') {
      // Pause while the answer is being shown so the teacher can explain things
      shouldPlay = false;
    } else if (gameStatus === 'FINISHED') {
      targetTrackId = 'sunday';
      shouldPlay = true;
    }

    if (shouldPlay) {
      if (targetTrackId !== currentTrackId) {
        setCurrentTrackId(targetTrackId);
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }

    prevStatusRef.current = gameStatus;
  }, [gameStatus, autoSync, currentTrackId]);

  // Handle track source changes and play/pause state with smooth fades/transitions
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Clear any existing fade transitions
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    isFadingOutRef.current = false;

    const fadeDuration = 1500; // ms
    const fadeSteps = 30;
    const stepTime = fadeDuration / fadeSteps;

    const expectedSrc = currentTrack.path;
    const currentSrc = audio.getAttribute('src');
    
    // Check if we need to swap tracks
    if (currentSrc && currentSrc !== expectedSrc) {
      const wasPlaying = isPlaying;
      if (wasPlaying && audio.volume > 0 && !audio.paused) {
        // Smooth crossfade: Fade out current track first
        let currentStep = 0;
        const startVol = audio.volume;
        
        fadeIntervalRef.current = setInterval(() => {
          currentStep++;
          const ratio = 1 - (currentStep / fadeSteps);
          if (audioRef.current) {
            audioRef.current.volume = Math.max(0, ratio * startVol);
          }
          
          if (currentStep >= fadeSteps) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
            
            // Swap source and fade in new track
            if (audioRef.current) {
              audioRef.current.src = expectedSrc;
              audioRef.current.load();
              audioRef.current.volume = 0;
              audioRef.current.play()
                .then(() => {
                  setPlayError(false);
                  let fadeInStep = 0;
                  fadeIntervalRef.current = setInterval(() => {
                    fadeInStep++;
                    const inRatio = fadeInStep / fadeSteps;
                    if (audioRef.current && !isMutedRef.current) {
                      audioRef.current.volume = inRatio * currentVolumeRef.current;
                    }
                    if (fadeInStep >= fadeSteps) {
                      clearInterval(fadeIntervalRef.current);
                      fadeIntervalRef.current = null;
                      if (audioRef.current) {
                        audioRef.current.volume = isMutedRef.current ? 0 : currentVolumeRef.current;
                      }
                    }
                  }, stepTime);
                })
                .catch(err => {
                  console.warn("Autoplay blocked after source swap:", err);
                  setPlayError(true);
                  setIsPlaying(false);
                });
            }
          }
        }, stepTime);
        return; // Transition handled, exit effect early
      } else {
        // If not playing, just change source instantly
        audio.src = expectedSrc;
        audio.load();
      }
    } else if (!currentSrc) {
      audio.src = expectedSrc;
      audio.load();
    }

    // Normal play/pause volume fading
    if (isPlaying) {
      audio.volume = 0;
      audio.play()
        .then(() => {
          setPlayError(false);
          let currentStep = 0;
          fadeIntervalRef.current = setInterval(() => {
            currentStep++;
            const ratio = currentStep / fadeSteps;
            if (audioRef.current && !isMutedRef.current) {
              audioRef.current.volume = ratio * currentVolumeRef.current;
            }
            if (currentStep >= fadeSteps) {
              clearInterval(fadeIntervalRef.current);
              fadeIntervalRef.current = null;
              if (audioRef.current) {
                audioRef.current.volume = isMutedRef.current ? 0 : currentVolumeRef.current;
              }
            }
          }, stepTime);
        })
        .catch(err => {
          console.warn("Autoplay blocked by browser, user interaction required:", err);
          setPlayError(true);
          setIsPlaying(false);
        });
    } else {
      // Fade out then pause
      const startVol = audio.volume;
      if (startVol > 0 && !audio.paused) {
        let currentStep = 0;
        fadeIntervalRef.current = setInterval(() => {
          currentStep++;
          const ratio = 1 - (currentStep / fadeSteps);
          if (audioRef.current) {
            audioRef.current.volume = Math.max(0, ratio * startVol);
          }
          if (currentStep >= fadeSteps) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.volume = isMutedRef.current ? 0 : currentVolumeRef.current;
            }
          }
        }, stepTime);
      } else {
        audio.pause();
      }
    }

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, [currentTrackId, isPlaying]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const duration = audio.duration;
    if (!duration || isNaN(duration)) return;

    const fadeOutDuration = 2.5; // seconds before end to start fading out
    const remainingTime = duration - audio.currentTime;

    // If user seeked backward during a fade out, restore volume
    if (isFadingOutRef.current && remainingTime > fadeOutDuration) {
      isFadingOutRef.current = false;
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }
      audio.volume = isMutedRef.current ? 0 : currentVolumeRef.current;
      return;
    }

    // Start fade out if we are playing, not already fading, and within the window
    if (isPlayingRef.current && !isFadingOutRef.current && remainingTime <= fadeOutDuration && remainingTime > 0) {
      isFadingOutRef.current = true;

      const startVol = audio.volume;
      const fadeSteps = 25;
      const stepTime = (remainingTime * 1000) / fadeSteps;
      let currentStep = 0;

      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
      }

      fadeIntervalRef.current = setInterval(() => {
        currentStep++;
        const ratio = 1 - (currentStep / fadeSteps);
        if (audioRef.current && isFadingOutRef.current) {
          audioRef.current.volume = Math.max(0, ratio * startVol);
        }

        if (currentStep >= fadeSteps) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      }, stepTime);
    }
  };

  const handleEnded = () => {
    const audio = audioRef.current;
    if (!audio) return;

    isFadingOutRef.current = false;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    if (isMarathon || autoSync) {
      // Auto-cycle through music options during marathon mode or autoSync
      const gameplayTracks = ['recess', 'golden_hour', 'lotus_bloom', 'paddy_field'];
      let nextTrackId;

      if (gameplayTracks.includes(currentTrackIdRef.current)) {
        const currentIndex = gameplayTracks.indexOf(currentTrackIdRef.current);
        nextTrackId = gameplayTracks[(currentIndex + 1) % gameplayTracks.length];
      } else {
        const currentIndex = TRACKS.findIndex(t => t.id === currentTrackIdRef.current);
        const nextIndex = (currentIndex + 1) % TRACKS.length;
        nextTrackId = TRACKS[nextIndex].id;
      }

      setCurrentTrackId(nextTrackId);
      setIsPlaying(true);
    } else {
      // Reset track and play again with fade in
      audio.currentTime = 0;
      audio.volume = 0;

      if (isPlayingRef.current) {
        audio.play()
          .then(() => {
            setPlayError(false);
            const fadeInDuration = 2000; // ms
            const fadeSteps = 30;
            const stepTime = fadeInDuration / fadeSteps;
            let fadeInStep = 0;

            fadeIntervalRef.current = setInterval(() => {
              fadeInStep++;
              const inRatio = fadeInStep / fadeSteps;
              if (audioRef.current && !isMutedRef.current) {
                audioRef.current.volume = inRatio * currentVolumeRef.current;
              }
              if (fadeInStep >= fadeSteps) {
                clearInterval(fadeIntervalRef.current);
                fadeIntervalRef.current = null;
                if (audioRef.current) {
                  audioRef.current.volume = isMutedRef.current ? 0 : currentVolumeRef.current;
                }
              }
            }, stepTime);
          })
          .catch(err => {
            console.warn("Error replaying audio in loop:", err);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleTrackChange = (e) => {
    const selectedId = e.target.value;
    setCurrentTrackId(selectedId);
    setAutoSync(false); // Disable auto sync once teacher manually overrides track
    setIsPlaying(true);
  };

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
    setPlayError(false);
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 select-none">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {isCollapsed ? (
        /* Collapsed Icon Mode */
        <button
          onClick={() => setIsCollapsed(false)}
          className={`flex items-center justify-center w-12 h-12 rounded-full shadow-lg border border-slate-200/50 bg-white/80 backdrop-blur-md hover:scale-105 active:scale-95 transition-all relative group cursor-pointer ${
            isPlaying ? 'ring-2 ring-[#FFB7B2]' : ''
          }`}
          title="Game Music Controls"
          aria-label="Expand Game Music Controls"
        >
          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className={`${prefersReducedMotion ? '' : 'animate-ping'} absolute inline-flex h-full w-full rounded-full bg-[#FFB7B2] opacity-75`}></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FFDAC1]"></span>
            </span>
          )}
          
          <svg
            className={`w-6 h-6 text-slate-700 ${isPlaying && !prefersReducedMotion ? 'animate-spin' : ''}`}
            style={{ animationDuration: isPlaying && !prefersReducedMotion ? '6s' : '0s' }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </button>
      ) : (
        /* Expanded Controller Panel */
        <div className="w-80 bg-white/90 border border-slate-200/60 backdrop-blur-md rounded-2xl shadow-xl p-4 flex flex-col gap-3 animate-pop-in relative before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-gradient-to-r before:from-[#FFB7B2] before:to-[#FFDAC1]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
              <span className="font-bold text-sm text-slate-700">Game Soundtrack</span>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Marathon Mode Auto-cycling badge */}
          {isMarathon && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 border border-purple-200/60 rounded-lg text-[11px] font-semibold text-purple-700">
              <svg className={`w-3.5 h-3.5 text-purple-500 flex-shrink-0 ${prefersReducedMotion ? '' : 'animate-spin'}`} style={{ animationDuration: '8s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Marathon Mode: Auto-cycling tracks</span>
            </div>
          )}

          {/* Autoplay blocked message */}
          {playError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Autoplay blocked. Click play below!</span>
            </div>
          )}

          {/* Track selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Track</label>
            <select
              value={currentTrackId}
              onChange={handleTrackChange}
              className="w-full text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FFB7B2] cursor-pointer"
            >
              {TRACKS.map(track => (
                <option key={track.id} value={track.id}>{track.name}</option>
              ))}
            </select>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
                isPlaying 
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                  : 'bg-gradient-to-r from-[#FFB7B2] to-[#FFDAC1] text-slate-700'
              }`}
            >
              {isPlaying ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <div className="flex-grow flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : volume < 0.4 ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
                  </svg>
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full accent-[#FFB7B2] h-1 bg-slate-100 rounded-lg cursor-pointer appearance-none animate-none"
              />
            </div>
          </div>

          {/* Auto Phase Sync Option */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-bold text-slate-500">Auto-sync to game phases</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#BFFCC6]"></div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
