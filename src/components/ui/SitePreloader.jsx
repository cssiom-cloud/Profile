/**
 * src/components/ui/SitePreloader.jsx
 * Authentic Cyber Preloader & Audio Initializer
 *
 * Capabilities:
 * - Real, automatic loading screen (no questioning/choice buttons).
 * - Smooth 0% -> 100% progress animation with cyber phase messages.
 * - Buffers and preloads the audio stream during the loading progress.
 * - Captures any touch or click gesture during loading to unlock audio autoplay.
 * - Automatically dissolves and transitions to the main profile on 100% completion.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Disc,
  Music,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore.js';
import { mediaStorage } from '../../lib/mediaStorage.js';
import { resolveAudioUrl } from '../audio/MusicPlayer.jsx';

export default function SitePreloader({ onEnter }) {
  const { profile, music } = useProfileStore();

  const [progress, setProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('กำลังเชื่อมต่อระบบ Cloud Profile...');
  const [isDismissed, setIsDismissed] = useState(false);
  const audioPreloadRef = useRef(null);

  // Capture any touch/click during loading to satisfy browser gesture
  const registerUserGesture = () => {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('play-profile-audio'));
      }
    } catch {}
  };

  // Preload audio and advance loading bar
  useEffect(() => {
    let isCancelled = false;

    // Phase 1: Preload Audio Track
    const preloadAudio = async () => {
      try {
        let src = music?.audioUrl;
        if (src && src.startsWith('indexeddb://')) {
          const key = src.replace('indexeddb://', '') || 'custom_audio_file';
          const resolved = await mediaStorage.getPlayableUrl(key);
          if (resolved) src = resolved;
        }

        const resolvedSrc = resolveAudioUrl(src);
        if (resolvedSrc && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
          const testAudio = new Audio();
          testAudio.src = resolvedSrc;
          testAudio.preload = 'auto';
          testAudio.muted = true;
          audioPreloadRef.current = testAudio;
          testAudio.load();
        }
      } catch (err) {
        console.warn('[Preloader] Audio preload notice:', err);
      }
    };

    preloadAudio();

    // Smooth cyber progress simulation
    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds for snappy feel

    const interval = setInterval(() => {
      if (isCancelled) return;
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));

      setProgress(pct);

      if (pct < 30) {
        setLoadingPhase('กำลังเชื่อมต่อระบบ Cloud Profile...');
      } else if (pct < 70) {
        setLoadingPhase('กำลังโหลดเพลงและข้อมูลโปรไฟล์...');
      } else if (pct < 100) {
        setLoadingPhase('กำลังเตรียมพร้อมประสบการณ์เว็บไซต์...');
      } else {
        setLoadingPhase('โหลดเสร็จสมบูรณ์ 100%');
        clearInterval(interval);

        // Auto transition after showing complete state
        setTimeout(() => {
          if (!isCancelled) {
            try {
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('has_entered_profile', 'true');
              }
            } catch {}

            // Trigger audio playback
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('play-profile-audio'));
            }

            setIsDismissed(true);
            if (onEnter) {
              onEnter();
            }
          }
        }, 300);
      }
    }, 40);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      if (audioPreloadRef.current) {
        audioPreloadRef.current.src = '';
      }
    };
  }, [music?.audioUrl, onEnter]);

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="site-preloader-curtain"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.03 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        onClick={registerUserGesture}
        onTouchStart={registerUserGesture}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06080e] text-white select-none overflow-hidden cursor-wait"
      >
        {/* Animated Background Ambience */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.15)_0%,rgba(6,8,14,0.95)_70%)] pointer-events-none" />

        {/* Animated Radial Rings */}
        <div
          className="absolute w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] rounded-full border border-theme-primary/10 animate-ping opacity-25 pointer-events-none"
          style={{ animationDuration: '3s' }}
        />
        <div className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full border border-theme-primary/5 animate-pulse pointer-events-none" />

        <div className="relative z-10 max-w-sm w-full text-center space-y-6 px-4">
          {/* Center Avatar with Pulsing Energy Aura */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-theme-primary via-theme-secondary to-theme-accent blur-lg opacity-75 animate-pulse" />
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-theme-primary bg-black/90 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.4)]">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile?.name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-3xl text-theme-primary font-mono">
                    {(profile?.name || 'P').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Spinning Tech Ring Indicator */}
              <div className="absolute -inset-1 rounded-full border-2 border-dashed border-theme-primary/40 animate-spin-slow pointer-events-none" />
            </div>

            <div className="mt-4">
              <h1 className="text-xl sm:text-2xl font-bold font-sans text-white tracking-tight flex items-center justify-center gap-1.5">
                <span>{profile?.name || 'Loading Profile...'}</span>
                <ShieldCheck className="w-4 h-4 text-theme-primary shrink-0" />
              </h1>
              <p className="text-xs font-mono text-theme-primary/90 mt-0.5">
                {profile?.handle || '@creative'}
              </p>
            </div>
          </div>

          {/* Dynamic Loading Box */}
          <div className="p-4 rounded-2xl bg-black/70 border border-theme-primary/30 backdrop-blur-xl space-y-3.5 shadow-2xl">
            {/* Progress Header */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-theme-primary">
                {progress < 100 ? (
                  <Disc className="w-4 h-4 animate-spin text-theme-primary" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                )}
                <span className="font-semibold tracking-wider">
                  {progress < 100 ? 'SYSTEM INITIALIZING' : 'SYSTEM READY'}
                </span>
              </div>
              <span className="font-bold text-white tracking-widest">{progress}%</span>
            </div>

            {/* High-Tech Progress Bar */}
            <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10 p-0.5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-theme-primary via-theme-secondary to-theme-accent shadow-[0_0_15px_rgba(0,240,255,0.7)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'easeOut', duration: 0.1 }}
              />
            </div>

            {/* Status Phase Label */}
            <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-gray-300">
              <Sparkles className="w-3 h-3 text-theme-primary animate-pulse" />
              <span className="truncate">{loadingPhase}</span>
            </div>
          </div>

          {/* Aesthetic Mini Equalizer */}
          <div className="flex items-center justify-center gap-1.5 pt-1 opacity-70">
            <span className="w-1 h-3 bg-theme-primary rounded-full animate-pulse" />
            <span
              className="w-1 h-5 bg-theme-primary rounded-full animate-pulse"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1 h-2 bg-theme-primary rounded-full animate-pulse"
              style={{ animationDelay: '300ms' }}
            />
            <span
              className="w-1 h-6 bg-theme-primary rounded-full animate-pulse"
              style={{ animationDelay: '450ms' }}
            />
            <span
              className="w-1 h-4 bg-theme-primary rounded-full animate-pulse"
              style={{ animationDelay: '200ms' }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
