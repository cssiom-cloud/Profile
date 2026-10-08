/**
 * src/components/audio/MusicPlayer.jsx
 * Embedded Music Player & Turntable Showcase Component
 * Milestone 3 (F13: Audio Controls & Vinyl, F14: Visualizer Integration, F15: Streaming Links)
 *
 * Key Capabilities:
 * - HTML5 <audio> element lifecycle management via audioRef
 * - Interactive play/pause, time seekbar scrubbing, volume control slider, and mute toggle
 * - Rotating vinyl record with realistic grooves, center label art, and dynamic tonearm
 * - Responsive glassmorphic aesthetic styled with dynamic CSS theme tokens
 * - Dual-platform streaming action buttons (Spotify & YouTube) with target="_blank"
 * - Deep integration with <SoundwaveVisualizer /> passing audioElementRef and isPlaying
 * - Robust error recovery banner for stream failures and autoplay policy rejections
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  Music,
  Sparkles,
} from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore.js';
import { DEFAULT_PROFILE_DATA } from '../../data/defaultData.js';
import { mediaStorage } from '../../lib/mediaStorage.js';
import SoundwaveVisualizer from './SoundwaveVisualizer.jsx';

/**
 * Format raw seconds into m:ss time string
 */
export const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

/**
 * Defensive music object extractor with seed fallback
 */
const getSafeMusic = (storeMusic) => {
  if (storeMusic && typeof storeMusic === 'object') {
    return {
      title: storeMusic.title || DEFAULT_PROFILE_DATA.music.title,
      artist: storeMusic.artist || DEFAULT_PROFILE_DATA.music.artist,
      audioUrl: storeMusic.audioUrl || DEFAULT_PROFILE_DATA.music.audioUrl,
      coverUrl: storeMusic.coverUrl || DEFAULT_PROFILE_DATA.music.coverUrl,
      spotifyUrl: storeMusic.spotifyUrl || DEFAULT_PROFILE_DATA.music.spotifyUrl,
      youtubeUrl: storeMusic.youtubeUrl || DEFAULT_PROFILE_DATA.music.youtubeUrl,
      defaultVolume:
        typeof storeMusic.defaultVolume === 'number'
          ? storeMusic.defaultVolume
          : DEFAULT_PROFILE_DATA.music.defaultVolume,
      isAutoPlay: Boolean(storeMusic.isAutoPlay),
    };
  }
  return DEFAULT_PROFILE_DATA.music;
};

/**
 * MusicPlayer Component
 *
 * @param {Object} props
 * @param {Object} [props.music] Optional override for music data
 * @param {'card' | 'compact'} [props.variant='card'] Display mode ('card' for hero showcase, 'compact' for floating pill)
 * @param {string} [props.className=''] Additional CSS classes
 */
export default function MusicPlayer({ music: propMusic, variant = 'card', className = '' }) {
  // Read live reactive music draft from Zustand store or props
  const storeMusic = useProfileStore((state) => state.music);
  const updateMusic = useProfileStore((state) => state.updateMusic);
  const music = getSafeMusic(propMusic || storeMusic);

  // Audio element reference and previous volume store for mute restoration
  const audioRef = useRef(null);
  const prevVolumeRef = useRef(music.defaultVolume ?? 0.7);
  const currentAudioUrl = useRef(music.audioUrl);

  // Component state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(music.defaultVolume ?? 0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [autoplayWaiting, setAutoplayWaiting] = useState(false);
  const [playableSrc, setPlayableSrc] = useState('');
  const [isLocalDeviceOnly, setIsLocalDeviceOnly] = useState(false);

  // Safe numerical duration and progress calculation
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
  const progressPercent = safeDuration > 0 ? Math.min(100, (safeCurrentTime / safeDuration) * 100) : 0;

  // ---------------------------------------------------------------------------
  // Lifecycle: Synchronize track changes from Live Customizer
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isCancelled = false;

    const syncAudioTrack = async () => {
      let targetUrl = music.audioUrl;
      let localOnly = false;

      if (targetUrl && targetUrl.startsWith('indexeddb://')) {
        const key = targetUrl.replace('indexeddb://', '') || 'custom_audio_file';
        try {
          const playable = await mediaStorage.getPlayableUrl(key);
          if (playable) {
            targetUrl = playable;
            localOnly = false;
          } else {
            targetUrl = DEFAULT_PROFILE_DATA.music.audioUrl;
            localOnly = true;
          }
        } catch (err) {
          console.warn('[MusicPlayer] Failed resolving indexeddb audio:', err);
          targetUrl = DEFAULT_PROFILE_DATA.music.audioUrl;
          localOnly = true;
        }
      } else if (!targetUrl) {
        targetUrl = DEFAULT_PROFILE_DATA.music.audioUrl;
      }

      if (isCancelled) return;

      setIsLocalDeviceOnly(localOnly);
      setPlayableSrc(targetUrl);

      const audio = audioRef.current;
      if (!audio) return;

      if (targetUrl !== currentAudioUrl.current) {
        currentAudioUrl.current = targetUrl;
        setAudioError(null);
        setCurrentTime(0);
        setDuration(0);
        audio.src = targetUrl;
        audio.load();

        if (isPlaying || music.isAutoPlay) {
          audio.play().catch((err) => {
            console.warn('[MusicPlayer] Play on track URL change prevented:', err);
            if (!music.isAutoPlay) setIsPlaying(false);
          });
        }
      }
    };

    syncAudioTrack();

    return () => {
      isCancelled = true;
    };
  }, [music.audioUrl, isPlaying, music.isAutoPlay]);

  // ---------------------------------------------------------------------------
  // Lifecycle: Auto-Play Handler on initial mount & setting toggle
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!music.isAutoPlay) {
      setAutoplayWaiting(false);
      return;
    }

    let isMounted = true;

    const startAutoplay = async () => {
      const audio = audioRef.current;
      if (!audio) return;

      try {
        let targetUrl = music.audioUrl;
        if (targetUrl && targetUrl.startsWith('indexeddb://')) {
          const key = targetUrl.replace('indexeddb://', '') || 'custom_audio_file';
          const playable = await mediaStorage.getPlayableUrl(key);
          if (playable) {
            targetUrl = playable;
          } else {
            targetUrl = DEFAULT_PROFILE_DATA.music.audioUrl;
            if (isMounted) setIsLocalDeviceOnly(true);
          }
        } else if (!targetUrl) {
          targetUrl = DEFAULT_PROFILE_DATA.music.audioUrl;
        }

        if (isMounted) setPlayableSrc(targetUrl);

        if (!audio.src || !audio.src.includes(targetUrl.slice(0, 30))) {
          audio.src = targetUrl;
          audio.load();
        }

        const vol = typeof music.defaultVolume === 'number' ? music.defaultVolume : 0.7;
        audio.volume = Math.max(0, Math.min(1, vol));
        audio.muted = vol === 0;

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          if (isMounted) {
            setIsPlaying(true);
            setAutoplayWaiting(false);
          }
        }
      } catch (err) {
        console.info('[MusicPlayer] Browser autoplay policy prevented sound without user gesture:', err);
        if (isMounted) {
          setAutoplayWaiting(true);
        }

        // Setup universal one-time interaction listeners on the window
        const unlockAudio = async () => {
          try {
            const el = audioRef.current;
            if (el) {
              const vol = typeof music.defaultVolume === 'number' ? music.defaultVolume : 0.7;
              el.volume = Math.max(0, Math.min(1, vol));
              el.muted = vol === 0;
              await el.play();
              if (isMounted) {
                setIsPlaying(true);
                setAutoplayWaiting(false);
              }
            }
          } catch (gestureErr) {
            console.warn('[MusicPlayer] Gesture unlock failed:', gestureErr);
          } finally {
            cleanup();
          }
        };

        const cleanup = () => {
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
          window.removeEventListener('touchstart', unlockAudio);
          window.removeEventListener('pointerdown', unlockAudio);
        };

        window.addEventListener('click', unlockAudio, { once: true, passive: true });
        window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
        window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
        window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
      }
    };

    startAutoplay();

    return () => {
      isMounted = false;
    };
  }, [music.isAutoPlay, music.audioUrl, music.defaultVolume]);

  // Synchronize volume in real-time when music.defaultVolume updates in store
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && typeof music.defaultVolume === 'number') {
      const targetVol = Math.max(0, Math.min(1, music.defaultVolume));
      audio.volume = targetVol;
      audio.muted = targetVol === 0;
      setVolume(targetVol);
      if (targetVol > 0) {
        prevVolumeRef.current = targetVol;
        setIsMuted(false);
      } else {
        setIsMuted(true);
      }
    }
  }, [music.defaultVolume]);

  // ---------------------------------------------------------------------------
  // Audio Element Event Handlers
  // ---------------------------------------------------------------------------
  const handleOnPlay = () => {
    setIsPlaying(true);
    setAudioError(null);
  };

  const handleOnPause = () => {
    setIsPlaying(false);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || isScrubbing) return;
    setCurrentTime(audio.currentTime);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
    setIsLoading(false);
  };

  const handleDurationChange = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleWaiting = () => {
    setIsLoading(true);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleAudioError = (e) => {
    if (isLocalDeviceOnly) {
      console.info('[MusicPlayer] Suppressed audio error for local device fallback');
      setIsLoading(false);
      return;
    }
    console.warn('[MusicPlayer] HTML5 audio error event triggered:', e);
    setIsLoading(false);
    setIsPlaying(false);
    setAudioError('Unable to load audio track. Please check the audio URL.');
  };

  // ---------------------------------------------------------------------------
  // User Interaction Controls
  // ---------------------------------------------------------------------------
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setAudioError(null);
      setIsLoading(true);

      // Verify audio source is ready and not indexeddb
      if (!audio.src || audio.src.startsWith('indexeddb://') || !playableSrc) {
        let targetSrc = playableSrc;
        if (!targetSrc || targetSrc.startsWith('indexeddb://')) {
          if (music.audioUrl && music.audioUrl.startsWith('indexeddb://')) {
            const key = music.audioUrl.replace('indexeddb://', '') || 'custom_audio_file';
            const resolved = await mediaStorage.getPlayableUrl(key);
            targetSrc = resolved || DEFAULT_PROFILE_DATA.music.audioUrl;
            if (!resolved) setIsLocalDeviceOnly(true);
          } else {
            targetSrc = music.audioUrl || DEFAULT_PROFILE_DATA.music.audioUrl;
          }
        }
        setPlayableSrc(targetSrc);
        audio.src = targetSrc;
        audio.load();
      }

      try {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
      } catch (err) {
        if (err.name === 'AbortError') {
          // Intentionally interrupted by pause() - normal browser behavior, do not show error banner
          return;
        }
        console.warn('[MusicPlayer] Playback was prevented or failed:', err);
        setIsPlaying(false);
        if (err.name === 'NotAllowedError') {
          setAudioError('Playback blocked by browser policy. Click to permit.');
        } else if (err.name === 'NotSupportedError') {
          if (!isLocalDeviceOnly) {
            setAudioError('Audio format not supported by browser.');
          }
        } else {
          setAudioError('Playback failed. Check audio stream.');
        }
      } finally {
        setIsLoading(false);
      }
    }
  }, [isPlaying, playableSrc, music.audioUrl, isLocalDeviceOnly]);

  const handleSeekChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };

  const handleSeekStart = () => {
    setIsScrubbing(true);
  };

  const handleSeekCommit = (e) => {
    setIsScrubbing(false);
    const audio = audioRef.current;
    if (audio) {
      const newTime = parseFloat(e.target.value);
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const rawVol = parseFloat(e.target.value);
    const newVol = Number.isFinite(rawVol) ? Math.max(0, Math.min(1, rawVol)) : 0.7;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
    const audio = audioRef.current;
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, newVol));
      audio.muted = newVol === 0;
    }
    // Save volume changes in real-time to store & persistent state
    updateMusic({ defaultVolume: newVol });
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted || volume === 0) {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.7;
      setVolume(restored);
      setIsMuted(false);
      audio.volume = restored;
      audio.muted = false;
    } else {
      prevVolumeRef.current = volume;
      setVolume(0);
      setIsMuted(true);
      audio.volume = 0;
      audio.muted = true;
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        togglePlay();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Render: Compact Variant (Floating Bar / Docked Player)
  // ---------------------------------------------------------------------------
  if (variant === 'compact') {
    return (
      <div
        className={`glass-panel rounded-2xl px-4 py-2.5 flex items-center gap-3 border border-theme-glow/30 shadow-glass ${className}`}
      >
        <audio
          ref={audioRef}
          src={playableSrc || undefined}
          preload="metadata"
          onPlay={handleOnPlay}
          onPause={handleOnPause}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleDurationChange}
          onEnded={handleEnded}
          onError={handleAudioError}
          onWaiting={handleWaiting}
          onCanPlay={handleCanPlay}
        />

        {/* Mini spinning vinyl disc */}
        <div
          className={`relative w-9 h-9 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center flex-shrink-0 overflow-hidden ${
            isPlaying ? 'animate-spin-slow shadow-glow' : ''
          }`}
          style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
        >
          {music.coverUrl ? (
            <img src={music.coverUrl} alt={music.title} className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <Music className="w-4 h-4 text-theme-primary" />
          )}
          <div className="absolute w-1.5 h-1.5 rounded-full bg-theme-base border border-gray-600" />
        </div>

        {/* Track Title and Artist */}
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-theme-main truncate">{music.title}</h4>
          <p className="text-[10px] text-theme-sub truncate">{music.artist}</p>
        </div>

        {/* Embedded Soundwave Visualizer in compact format */}
        <div className="w-24 hidden sm:block">
          <SoundwaveVisualizer
            isPlaying={isPlaying}
            audioElementRef={audioRef}
            barCount={16}
            height={20}
          />
        </div>

        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-8 h-8 rounded-full bg-theme-primary/20 hover:bg-theme-primary/30 border border-theme-primary/40 text-theme-primary flex items-center justify-center transition-all shadow-glow"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Hero Showcase Card Variant (Default)
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`glass-panel rounded-2xl p-5 sm:p-6 border border-theme-glow/30 shadow-glow relative overflow-hidden backdrop-blur-xl ${className}`}
    >
      {/* Hidden Native HTML5 Audio Tag */}
      <audio
        ref={audioRef}
        src={playableSrc || undefined}
        preload="metadata"
        onPlay={handleOnPlay}
        onPause={handleOnPause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onEnded={handleEnded}
        onError={handleAudioError}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
      />

      {/* Ambient Radial Backdrop Glow */}
      <div
        className={`absolute -top-16 -left-16 w-48 h-48 rounded-full bg-theme-primary/10 blur-3xl pointer-events-none transition-opacity duration-700 ${
          isPlaying ? 'opacity-100' : 'opacity-20'
        }`}
      />

      {/* Main Grid: Left Vinyl Turntable, Right Controls & Info */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
        {/* ==================================================================
            Vinyl Record Turntable Showcase
            ================================================================== */}
        <div className="relative flex-shrink-0 flex items-center justify-center">
          {/* Subtle Dynamic Audio Aura */}
          <div
            className={`absolute inset-0 rounded-full blur-xl pointer-events-none transition-opacity duration-700 ${
              isPlaying ? 'opacity-50 bg-theme-primary/30' : 'opacity-0'
            }`}
          />

          {/* Tonearm Stylus Assembly */}
          <div className="absolute -top-2 -right-1 z-20 pointer-events-none hidden sm:block">
            <div
              className="relative origin-top-right transition-transform duration-700 ease-in-out"
              style={{
                transform: isPlaying ? 'rotate(24deg)' : 'rotate(-4deg)',
              }}
            >
              {/* Pivot Base */}
              <div className="w-4 h-4 rounded-full bg-neutral-800 border-2 border-neutral-600 shadow-md" />
              {/* Metallic Arm Shaft */}
              <div className="w-1 h-14 bg-gradient-to-b from-neutral-400 via-neutral-300 to-neutral-600 mx-auto -mt-1 rounded-sm shadow-sm" />
              {/* Cartridge Head & Stylus */}
              <div className="w-3 h-5 bg-neutral-900 border border-neutral-700 rounded-sm -ml-1 shadow-md flex items-center justify-center">
                <span
                  className={`w-1 h-1 rounded-full ${
                    isPlaying ? 'bg-theme-primary animate-pulse shadow-glow' : 'bg-neutral-600'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Spinning Vinyl Record Disc */}
          <div
            className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#0b0c10] border-4 border-neutral-800 shadow-2xl flex items-center justify-center overflow-hidden cursor-pointer select-none transition-transform ${
              isPlaying ? 'animate-spin-slow shadow-glow' : 'hover:scale-[1.02]'
            }`}
            style={{
              animationPlayState: isPlaying ? 'running' : 'paused',
            }}
            onClick={togglePlay}
            title={isPlaying ? 'Click to pause' : 'Click to play'}
          >
            {/* Concentric Vinyl Grooves */}
            <div className="absolute inset-2 rounded-full border border-neutral-700/25 pointer-events-none" />
            <div className="absolute inset-4 rounded-full border border-neutral-800/40 pointer-events-none" />
            <div className="absolute inset-6 rounded-full border border-neutral-700/20 pointer-events-none" />
            <div className="absolute inset-8 rounded-full border border-neutral-800/35 pointer-events-none" />

            {/* Conic Sheen Light Reflection */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25 mix-blend-screen"
              style={{
                background:
                  'conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.4) 40deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.4) 220deg, transparent 270deg)',
              }}
            />

            {/* Center Label: Album Cover Image */}
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-theme-primary/50 shadow-inner flex items-center justify-center bg-theme-surface">
              {music.coverUrl ? (
                <img
                  src={music.coverUrl}
                  alt={music.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-theme-primary/30 to-theme-secondary/30 text-theme-primary">
                  <Music className="w-6 h-6 animate-pulse" />
                </div>
              )}

              {/* Spindle Center Hole */}
              <div className="absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-theme-base border border-neutral-600 shadow-inner z-10" />
            </div>
          </div>
        </div>

        {/* ==================================================================
            Track Info, Visualizer, Timeline, and Controls
            ================================================================== */}
        <div className="flex-1 w-full flex flex-col justify-between gap-3 min-w-0">
          {/* Header Row: Title, Artist, Status Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-theme-primary/90 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3 text-theme-primary" />
                  Featured Track
                </span>
                {isPlaying && (
                  <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[9px] font-mono border border-green-500/30 animate-pulse">
                    PLAYING
                  </span>
                )}
                {autoplayWaiting && !isPlaying && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-theme-primary/20 hover:bg-theme-primary/30 border border-theme-primary/40 text-theme-primary text-[9px] font-mono animate-pulse cursor-pointer shadow-glow transition-all"
                    title="Browser autoplay policy waiting for click. Click to start!"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>คลิกเพื่อเริ่มเพลง</span>
                  </button>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold font-sans text-theme-main truncate leading-tight">
                {music.title}
              </h3>
              <p className="text-xs text-theme-sub truncate font-medium">{music.artist}</p>
            </div>

            {/* Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-11 h-11 rounded-2xl bg-theme-primary/20 hover:bg-theme-primary/30 active:scale-95 border border-theme-primary/50 text-theme-primary flex items-center justify-center transition-all shadow-glow flex-shrink-0"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-theme-primary border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Integrated Soundwave Visualizer */}
          <div className="w-full py-0.5">
            <SoundwaveVisualizer
              isPlaying={isPlaying}
              audioElementRef={audioRef}
              accentColor="var(--accent-primary)"
              barCount={28}
              height={32}
            />
          </div>

          {/* Track Progress Seekbar Slider */}
          <div className="space-y-1">
            <div className="relative flex items-center group">
              <input
                type="range"
                min="0"
                max={safeDuration || 100}
                step="0.1"
                value={safeCurrentTime}
                onChange={handleSeekChange}
                onMouseDown={handleSeekStart}
                onMouseUp={handleSeekCommit}
                onTouchStart={handleSeekStart}
                onTouchEnd={handleSeekCommit}
                disabled={!safeDuration}
                aria-label="Track progress seek slider"
                className="w-full h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer accent-theme-primary focus:outline-none focus:ring-1 focus:ring-theme-primary transition-all"
                style={{
                  background: `linear-gradient(to right, var(--accent-primary) ${progressPercent}%, rgba(255,255,255,0.12) ${progressPercent}%)`,
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-theme-sub select-none">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls Footer: Restart, Volume Slider, and External Streaming Links */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-theme-glow/20">
            {/* Left Controls: Restart and Volume Control */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRestart}
                aria-label="Restart track from beginning"
                className="p-1.5 rounded-xl text-theme-sub hover:text-theme-primary hover:bg-theme-surface transition-colors"
                title="Restart Track"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Volume Slider & Mute Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  className="p-1 rounded-lg text-theme-sub hover:text-theme-primary hover:bg-theme-surface transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-theme-sub" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-3.5 h-3.5 text-theme-primary" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-theme-primary" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume slider"
                  className="w-16 sm:w-20 h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-theme-primary"
                  style={{
                    background: `linear-gradient(to right, var(--accent-primary) ${
                      (isMuted ? 0 : volume) * 100
                    }%, rgba(255,255,255,0.15) ${(isMuted ? 0 : volume) * 100}%)`,
                  }}
                />
              </div>
            </div>

            {/* Right Controls: External Streaming Action Buttons (Spotify & YouTube) */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Spotify Link */}
              {music.spotifyUrl && (
                <a
                  href={music.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Listen to ${music.title} on Spotify`}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 hover:bg-[#1db954]/15 border border-[#1db954]/30 hover:border-[#1db954] text-[#1db954] text-xs font-mono transition-all shadow-sm hover:shadow-[0_0_12px_rgba(29,185,84,0.35)]"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                  <span className="font-sans font-medium text-[11px]">Spotify</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              )}

              {/* YouTube Link */}
              {music.youtubeUrl && (
                <a
                  href={music.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Watch ${music.title} on YouTube`}
                  className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 hover:bg-[#ff0000]/15 border border-[#ff0000]/30 hover:border-[#ff0000] text-[#ff0000] text-xs font-mono transition-all shadow-sm hover:shadow-[0_0_12px_rgba(255,0,0,0.35)]"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span className="font-sans font-medium text-[11px]">YouTube</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </a>
              )}
            </div>
          </div>

          {/* Friendly device notice when custom audio was uploaded only on the owner's PC */}
          {isLocalDeviceOnly && !audioError && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-theme-primary/10 border border-theme-primary/20 text-theme-primary text-xs font-mono mt-1">
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
                <span className="text-[11px] truncate max-w-[220px] sm:max-w-xs">
                  ไฟล์เสียงอยู่ในคอมพิวเตอร์ของคุณ • กดฟังเพลงเต็มได้ที่ Spotify หรือ YouTube
                </span>
              </div>
            </div>
          )}

          {/* Graceful Audio Error Notification Banner */}
          {audioError && !isLocalDeviceOnly && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono mt-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="text-[11px] truncate max-w-[200px] sm:max-w-xs">{audioError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAudioError(null);
                  if (audioRef.current) {
                    audioRef.current.load();
                  }
                }}
                className="px-2 py-0.5 rounded text-[10px] bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
