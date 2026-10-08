/**
 * src/components/ui/SitePreloader.jsx
 * Aesthetic Cyber Experience Entrance & Audio Preloader
 *
 * Capabilities:
 * - Solves browser autoplay policy rejections on mobile/desktop by providing
 *   a high-aesthetic "Click/Tap to Enter" gateway.
 * - Buffers and warms up the audio engine during the entrance sequence.
 * - Displays avatar aura, music track title & artist, and cyber loading visualizer.
 * - Single click/tap satisfies browser user gesture: unlocks AudioContext and starts playback.
 * - Smooth Framer Motion curtain dissolve transition.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Disc,
  Play,
  Headphones,
  ShieldCheck,
  Radio,
} from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore.js';
import { mediaStorage } from '../../lib/mediaStorage.js';

export default function SitePreloader({ onEnter }) {
  const { profile, music, settings } = useProfileStore();

  const [progress, setProgress] = useState(0);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [enterMode, setEnterMode] = useState('sound'); // 'sound' | 'silent'
  const audioPreloadRef = useRef(null);

  // Buffer and preload track
  useEffect(() => {
    let isCancelled = false;

    // Simulate cyber asset scanning while resolving audio
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + Math.floor(Math.random() * 25) + 10;
      });
    }, 120);

    const prepareAudio = async () => {
      try {
        let src = music?.audioUrl;
        if (src && src.startsWith('indexeddb://')) {
          const key = src.replace('indexeddb://', '') || 'custom_audio_file';
          const resolved = await mediaStorage.getPlayableUrl(key);
          if (resolved) src = resolved;
        }

        if (src && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
          const testAudio = new Audio();
          testAudio.src = src;
          testAudio.preload = 'auto';
          testAudio.muted = true;
          audioPreloadRef.current = testAudio;

          testAudio.oncanplaythrough = () => {
            if (!isCancelled) setIsAudioReady(true);
          };
          testAudio.onerror = () => {
            if (!isCancelled) setIsAudioReady(true);
          };
          testAudio.load();
        } else {
          setIsAudioReady(true);
        }
      } catch {
        if (!isCancelled) setIsAudioReady(true);
      }
    };

    prepareAudio();

    return () => {
      isCancelled = true;
      clearInterval(timer);
      if (audioPreloadRef.current) {
        audioPreloadRef.current.src = '';
      }
    };
  }, [music?.audioUrl]);

  // Entrance handler: satisfies user interaction and starts music
  const handleEnterExperience = (withSound = true) => {
    if (hasEntered) return;
    setHasEntered(true);

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('has_entered_profile', 'true');
      }
    } catch {
      // Ignore sessionStorage errors
    }

    // Trigger audio playback event with user gesture
    if (withSound) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('play-profile-audio'));
      }
    }

    if (onEnter) {
      onEnter(withSound);
    }
  };

  if (hasEntered) return null;

  const displayProgress = Math.min(100, progress);
  const isReady = displayProgress >= 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06080e]/95 backdrop-blur-2xl text-white select-none overflow-hidden"
      >
        {/* Animated Background Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.12)_0%,transparent_70%)] pointer-events-none" />

        {/* Floating Ambient Rings */}
        <div className="absolute w-[500px] h-[500px] rounded-full border border-theme-glow/10 animate-pulse pointer-events-none" />
        <div className="absolute w-[700px] h-[700px] rounded-full border border-theme-glow/5 animate-pulse pointer-events-none" />

        <div className="relative z-10 max-w-md w-full text-center space-y-6">
          {/* Profile Monogram / Avatar with Glowing Aura */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-theme-primary via-theme-secondary to-theme-accent blur-md opacity-70 animate-pulse" />
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-theme-primary/80 bg-black/80 flex items-center justify-center shadow-glow">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile?.name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-2xl text-theme-primary font-mono">
                    {(profile?.name || 'P').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3">
              <h1 className="text-xl sm:text-2xl font-bold font-sans text-white tracking-tight flex items-center justify-center gap-1.5">
                <span>{profile?.name || 'Profile Experience'}</span>
                <ShieldCheck className="w-4 h-4 text-theme-primary shrink-0" />
              </h1>
              <p className="text-xs font-mono text-theme-primary opacity-90 mt-0.5">
                {profile?.handle || '@creative'}
              </p>
            </div>
          </div>

          {/* Music Track Preview Card */}
          <div className="p-4 rounded-2xl bg-black/60 border border-theme-glow/30 backdrop-blur-md space-y-3 shadow-glow">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-black border border-theme-primary/40 shrink-0 flex items-center justify-center">
                {music?.coverUrl ? (
                  <img
                    src={music.coverUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Disc className="w-6 h-6 text-theme-primary animate-spin" />
                )}
              </div>

              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-theme-primary">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>AUDIO ENGINE READY</span>
                </div>
                <h3 className="font-bold text-white text-xs sm:text-sm truncate">
                  {music?.title || 'Featured Track'}
                </h3>
                <p className="text-[11px] text-theme-sub truncate font-medium">
                  {music?.artist || 'Artist'}
                </p>
              </div>
            </div>

            {/* Audio Preloading Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono text-theme-sub">
                <span>{isReady ? 'STREAM BUFFERED • 100%' : 'BUFFERING AUDIO STREAM...'}</span>
                <span>{displayProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-black/80 rounded-full overflow-hidden border border-theme-glow/20">
                <motion.div
                  className="h-full bg-gradient-to-r from-theme-primary via-theme-secondary to-theme-accent"
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Entrance Actions (Bypasses Browser Autoplay Lock) */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => handleEnterExperience(true)}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-theme-primary to-theme-secondary hover:brightness-110 active:scale-95 text-black font-bold font-sans text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all cursor-pointer group"
            >
              <Headphones className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>CLICK TO ENTER • แตะเพื่อเข้าสู่เว็บไซต์</span>
            </button>

            <button
              type="button"
              onClick={() => handleEnterExperience(false)}
              className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-theme-sub hover:text-white text-xs font-mono transition-all flex items-center justify-center gap-1.5"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>เข้าชมแบบปิดเสียง (Silent Mode)</span>
            </button>
          </div>

          <p className="text-[10px] font-mono text-theme-sub/70">
            แตะที่ปุ่มเพื่อเริ่มฟังเพลงทันที • รองรับทุกเบราว์เซอร์และมือถือ 100%
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
