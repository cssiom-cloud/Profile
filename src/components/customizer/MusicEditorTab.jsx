/**
 * src/components/customizer/MusicEditorTab.jsx
 * Audio Player & Soundwave Settings WYSIWYG Editor Tab (Milestone M5 - Feature 21)
 *
 * Requirements:
 * - Fields: title, artist, audioUrl, coverUrl, spotifyUrl, youtubeUrl
 * - Autoplay toggle switch (isAutoPlay)
 * - Default volume slider (defaultVolume)
 * - Live audio stream testing & artwork preview
 */

import React, { useState, useRef } from 'react';
import { useProfileStore } from '../../store/useProfileStore.js';
import {
  Music,
  Disc,
  Link as LinkIcon,
  Radio,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Image,
  ExternalLink,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

export default function MusicEditorTab() {
  const { music, updateMusic } = useProfileStore();

  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const audioPreviewRef = useRef(null);
  const [coverError, setCoverError] = useState(false);

  const handleChange = (field, value) => {
    updateMusic({ [field]: value });
  };

  const handleTestAudioToggle = () => {
    if (!music?.audioUrl) return;

    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(music.audioUrl);
      audioPreviewRef.current.volume = music?.defaultVolume ?? 0.7;
      audioPreviewRef.current.onended = () => setIsPlayingTest(false);
      audioPreviewRef.current.onerror = () => {
        setIsPlayingTest(false);
        alert('Failed to stream audio from URL: ' + music.audioUrl);
      };
    } else {
      if (audioPreviewRef.current.src !== music.audioUrl) {
        audioPreviewRef.current.src = music.audioUrl;
      }
    }

    if (isPlayingTest) {
      audioPreviewRef.current.pause();
      setIsPlayingTest(false);
    } else {
      audioPreviewRef.current
        .play()
        .then(() => setIsPlayingTest(true))
        .catch((err) => {
          setIsPlayingTest(false);
          alert('Audio playback error: ' + err.message);
        });
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    handleChange('defaultVolume', val);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.volume = val;
    }
  };

  const currentVolume = music?.defaultVolume ?? 0.7;
  const currentVolumePercent = Math.round(currentVolume * 100);

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* Visual Audio Header Banner */}
      <div className="p-3.5 rounded-2xl bg-black/50 border border-theme-glow/30 flex items-center gap-3.5">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-black/80 border border-theme-primary/40 shrink-0 shadow-glow">
          {music?.coverUrl && !coverError ? (
            <img
              src={music.coverUrl}
              alt="Track Artwork"
              onError={() => setCoverError(true)}
              onLoad={() => setCoverError(false)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-theme-primary/10 text-theme-primary">
              <Disc className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm truncate">
              {music?.title || 'Synthetic Serenade'}
            </span>
          </div>
          <p className="text-[11px] text-theme-primary truncate">
            {music?.artist || 'Lofi Tokyo Beats'}
          </p>

          <button
            type="button"
            onClick={handleTestAudioToggle}
            className="mt-1 flex items-center gap-1.5 text-[10px] text-theme-sub hover:text-white font-mono transition-colors"
          >
            {isPlayingTest ? (
              <>
                <Pause className="w-3 h-3 text-theme-primary" />
                <span className="text-theme-primary font-bold">Stop Audio Preview</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-theme-accent" />
                <span>Test Audio Stream</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1. Track Title & Artist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <Music className="w-3.5 h-3.5 text-theme-primary" />
            <span>Track Title:</span>
          </label>
          <input
            type="text"
            value={music?.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="e.g. Synthetic Serenade"
            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <Disc className="w-3.5 h-3.5 text-theme-primary" />
            <span>Artist Name:</span>
          </label>
          <input
            type="text"
            value={music?.artist || ''}
            onChange={(e) => handleChange('artist', e.target.value)}
            placeholder="e.g. Lofi Tokyo Beats"
            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary"
          />
        </div>
      </div>

      {/* 2. Audio MP3 Source URL */}
      <div className="space-y-1.5">
        <label className="text-theme-sub flex items-center justify-between font-bold">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-theme-primary" />
            <span>Audio Stream URL (MP3/AAC):</span>
          </span>
          <button
            type="button"
            onClick={() =>
              handleChange(
                'audioUrl',
                'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3'
              )
            }
            className="text-[10px] text-theme-primary hover:underline"
          >
            Load Demo Lofi MP3
          </button>
        </label>
        <input
          type="url"
          value={music?.audioUrl || ''}
          onChange={(e) => handleChange('audioUrl', e.target.value)}
          placeholder="https://... audio.mp3"
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary text-[11px]"
        />
      </div>

      {/* 3. Album Cover Artwork URL */}
      <div className="space-y-1.5">
        <label className="text-theme-sub flex items-center gap-1.5 font-bold">
          <Image className="w-3.5 h-3.5 text-theme-primary" />
          <span>Album Cover URL:</span>
        </label>
        <input
          type="url"
          value={music?.coverUrl || ''}
          onChange={(e) => {
            setCoverError(false);
            handleChange('coverUrl', e.target.value);
          }}
          placeholder="https://images.unsplash.com/photo-..."
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary text-[11px]"
        />
      </div>

      {/* 4. Playback Settings: Autoplay & Default Volume */}
      <div className="p-3.5 rounded-2xl bg-black/40 border border-theme-glow/20 space-y-3.5">
        <h4 className="font-bold text-white text-[11px] uppercase tracking-wider">
          Playback Preferences
        </h4>

        {/* Autoplay Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-bold text-white block">Auto-Play on Load</span>
            <span className="text-[10px] text-theme-sub block">
              Attempt autoplay (subject to browser audio policy)
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleChange('isAutoPlay', !music?.isAutoPlay)}
            className={`relative w-11 h-6 rounded-full transition-colors p-0.5 focus:outline-none ${
              music?.isAutoPlay ? 'bg-theme-primary' : 'bg-gray-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-black shadow-md transition-transform ${
                music?.isAutoPlay ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Default Volume Slider */}
        <div className="space-y-1.5 pt-2 border-t border-theme-glow/10">
          <div className="flex items-center justify-between text-theme-sub">
            <span className="flex items-center gap-1.5 font-bold">
              {currentVolume === 0 ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-theme-primary" />
              )}
              <span>Default Audio Volume:</span>
            </span>
            <span className="font-bold text-white">{currentVolumePercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={currentVolume}
            onChange={handleVolumeChange}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-theme-primary"
          />
        </div>
      </div>

      {/* 5. External Streaming Links */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <LinkIcon className="w-3.5 h-3.5 text-theme-primary" />
            <span>Spotify Track / Playlist URL:</span>
          </label>
          <input
            type="url"
            value={music?.spotifyUrl || ''}
            onChange={(e) => handleChange('spotifyUrl', e.target.value)}
            placeholder="https://open.spotify.com/track/..."
            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary text-[11px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <LinkIcon className="w-3.5 h-3.5 text-theme-primary" />
            <span>YouTube Music / Video URL:</span>
          </label>
          <input
            type="url"
            value={music?.youtubeUrl || ''}
            onChange={(e) => handleChange('youtubeUrl', e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary text-[11px]"
          />
        </div>
      </div>
    </div>
  );
}
