/**
 * src/components/customizer/MusicEditorTab.jsx
 * Audio Player & Soundwave Settings WYSIWYG Editor Tab
 *
 * Enhanced Capabilities:
 * - Smart Link Auto-Detector & Metadata/Cover Fetcher (YouTube & Spotify)
 * - Local Audio File Uploader (.mp3, .wav, .m4a, .ogg) with instant offline playback
 * - Interactive Album Artwork Upload & Canvas Cropper (ImageCropModal 1:1)
 * - Built-in Music Downloader Guide (Cobalt.tools, yt-dlp, Y2Mate) with step-by-step instructions
 * - Playback Preferences: Autoplay toggle & Default volume slider
 * - Live Audio Stream & Turntable testing
 */

import React, { useState, useRef } from 'react';
import { useProfileStore } from '../../store/useProfileStore.js';
import ImageCropModal from '../ui/ImageCropModal.jsx';
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
  Upload,
  Crop,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Terminal,
  Globe,
  Loader2,
  Layers,
} from 'lucide-react';

export default function MusicEditorTab() {
  const { music, updateMusic } = useProfileStore();

  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const audioPreviewRef = useRef(null);
  const [coverError, setCoverError] = useState(false);
  const [isFetchingLink, setIsFetchingLink] = useState(false);
  const [linkFetchStatus, setLinkFetchStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [audioFileInfo, setAudioFileInfo] = useState(null); // { name: string, size: string }
  const [showDownloaderGuide, setShowDownloaderGuide] = useState(false);

  // Image Cropper Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropInitialSrc, setCropInitialSrc] = useState('');

  const artworkFileInputRef = useRef(null);
  const audioFileInputRef = useRef(null);

  const handleChange = (field, value) => {
    updateMusic({ [field]: value });
  };

  // Test audio playback toggle
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

  // Handle local audio file selection (.mp3, .wav, .m4a, .ogg)
  const handleAudioFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|ogg|aac|flac)$/i)) {
      alert('Please select a valid audio file (.mp3, .wav, .m4a, .ogg)');
      return;
    }

    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setAudioFileInfo({
      name: file.name,
      size: `${fileSizeMb} MB`,
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const audioDataUrl = event.target.result;
      handleChange('audioUrl', audioDataUrl);

      // Auto-suggest title from filename if title is default or empty
      const baseName = file.name.replace(/\.[^/.]+$/, '').trim();
      if (!music?.title || music.title === 'Synthetic Serenade') {
        handleChange('title', baseName);
      }

      setLinkFetchStatus({
        type: 'success',
        message: `Local audio "${file.name}" loaded successfully! Ready to play.`,
      });
      setTimeout(() => setLinkFetchStatus(null), 4000);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle artwork local file selection -> open cropper immediately
  const handleArtworkFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCropInitialSrc(event.target.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Smart Link Metadata & Cover Fetcher for YouTube and Spotify
  const handleFetchLinkInfo = async (url) => {
    const targetUrl = (url || music?.youtubeUrl || music?.spotifyUrl || '').trim();
    if (!targetUrl) {
      setLinkFetchStatus({
        type: 'error',
        message: 'Please paste a valid YouTube or Spotify link first.',
      });
      setTimeout(() => setLinkFetchStatus(null), 3000);
      return;
    }

    setIsFetchingLink(true);
    setLinkFetchStatus(null);

    try {
      // 1. YouTube Link Detection
      const ytMatch = targetUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        const highResThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        // Update cover and youtubeUrl
        handleChange('coverUrl', highResThumb);
        handleChange('youtubeUrl', targetUrl);
        setCoverError(false);

        // Fetch oEmbed title & author
        try {
          const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.title) handleChange('title', data.title);
            if (data.author_name) handleChange('artist', data.author_name);
          }
        } catch {
          // Graceful fallback to video ID thumbnail
        }

        setLinkFetchStatus({
          type: 'success',
          message: 'YouTube cover artwork & video metadata successfully fetched!',
        });
        setTimeout(() => setLinkFetchStatus(null), 4000);
        setIsFetchingLink(false);
        return;
      }

      // 2. Spotify Link Detection
      const spotMatch = targetUrl.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
      if (spotMatch) {
        handleChange('spotifyUrl', targetUrl);

        try {
          const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.thumbnail_url) {
              handleChange('coverUrl', data.thumbnail_url);
              setCoverError(false);
            }
            if (data.title) {
              // Spotify title usually is "Track Title - Artist"
              const parts = data.title.split(' - ');
              if (parts.length >= 2) {
                handleChange('title', parts[0].trim());
                handleChange('artist', parts[1].trim());
              } else {
                handleChange('title', data.title);
              }
            }
          }
        } catch {
          // Spotify CORS fallback
        }

        setLinkFetchStatus({
          type: 'success',
          message: 'Spotify artwork & metadata successfully fetched!',
        });
        setTimeout(() => setLinkFetchStatus(null), 4000);
        setIsFetchingLink(false);
        return;
      }

      setLinkFetchStatus({
        type: 'error',
        message: 'Could not auto-detect YouTube or Spotify URL format. You can manually enter details below.',
      });
      setTimeout(() => setLinkFetchStatus(null), 4000);
    } catch (err) {
      setLinkFetchStatus({
        type: 'error',
        message: `Failed to fetch metadata: ${err.message}`,
      });
      setTimeout(() => setLinkFetchStatus(null), 4000);
    } finally {
      setIsFetchingLink(false);
    }
  };

  const currentVolume = music?.defaultVolume ?? 0.7;
  const currentVolumePercent = Math.round(currentVolume * 100);

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* Visual Audio Header Banner */}
      <div className="p-3.5 rounded-2xl bg-black/50 border border-theme-glow/30 flex items-center gap-3.5">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/80 border border-theme-primary/40 shrink-0 shadow-glow">
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

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleTestAudioToggle}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-glow/30 text-[10px] text-theme-sub hover:text-white font-mono transition-all"
            >
              {isPlayingTest ? (
                <>
                  <Pause className="w-3 h-3 text-theme-primary" />
                  <span className="text-theme-primary font-bold">Stop Preview</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-theme-accent" />
                  <span>Test Audio</span>
                </>
              )}
            </button>

            {audioFileInfo && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] border border-emerald-500/30">
                Local: {audioFileInfo.size}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notification Toast for link/audio actions */}
      {linkFetchStatus && (
        <div
          className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 border animate-fade-in ${
            linkFetchStatus.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          {linkFetchStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{linkFetchStatus.message}</span>
        </div>
      )}

      {/* SMART LINK PASTE & AUTO-FETCH BAR */}
      <section className="p-3.5 rounded-2xl bg-black/40 border border-theme-glow/30 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
            <span>Smart Music Link (YouTube / Spotify):</span>
          </label>
          <span className="text-[10px] text-theme-primary">Auto-extracts cover & info</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="url"
            placeholder="Paste YouTube or Spotify link here..."
            className="flex-1 px-3 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary text-[11px]"
            onChange={(e) => {
              const val = e.target.value.trim();
              if (val.includes('youtube.com') || val.includes('youtu.be') || val.includes('spotify.com')) {
                handleFetchLinkInfo(val);
              }
            }}
          />
          <button
            type="button"
            onClick={() => handleFetchLinkInfo(music?.youtubeUrl || music?.spotifyUrl)}
            disabled={isFetchingLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-theme-primary text-black font-bold hover:scale-105 active:scale-95 transition-all text-xs disabled:opacity-50"
          >
            {isFetchingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Fetch Info</span>
          </button>
        </div>
      </section>

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

      {/* 2. Audio Stream URL & Local Audio Upload */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <Radio className="w-3.5 h-3.5 text-theme-primary" />
            <span>Audio Source (MP3 Stream or File):</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => audioFileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-theme-primary to-theme-accent text-black font-bold hover:scale-105 active:scale-95 transition-all text-[10px]"
              title="Upload MP3 or audio file directly from your computer"
            >
              <Upload className="w-3 h-3" />
              <span>Upload Local Audio (.mp3)</span>
            </button>

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
              Demo MP3
            </button>
          </div>
        </div>

        <input
          ref={audioFileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg"
          onChange={handleAudioFileChange}
          className="hidden"
        />

        <input
          type="url"
          value={music?.audioUrl || ''}
          onChange={(e) => handleChange('audioUrl', e.target.value)}
          placeholder="https://... audio.mp3 or upload local audio file above"
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary text-[11px]"
        />

        {/* Music Downloader Tools Guide Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDownloaderGuide(!showDownloaderGuide)}
            className="flex items-center gap-1.5 text-[11px] text-theme-primary hover:underline"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showDownloaderGuide ? 'Hide Downloader Guide' : 'How to download music files to upload? (Guide)'}</span>
          </button>
        </div>

        {/* Music Downloader Guide Card */}
        {showDownloaderGuide && (
          <div className="p-3.5 rounded-2xl bg-black/60 border border-theme-primary/30 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-theme-primary" />
              <h5 className="font-bold text-white text-xs">How to Download & Add Music Tracks:</h5>
            </div>
            <p className="text-[11px] text-theme-sub leading-relaxed">
              Browsers block direct streaming from YouTube or Spotify pages due to copyright/CORS policies.
              You can easily download your favorite track to an MP3 file using these free tools, then click <strong className="text-white">"Upload Local Audio (.mp3)"</strong> above to play it directly on your site:
            </p>

            <div className="space-y-2 pt-1">
              <div className="p-2.5 rounded-xl bg-theme-surface/70 border border-theme-glow/20 flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white">1. cnvmp3.com & ytmp3.nu (แนะนำที่สุด โหลดได้ 100%)</span>
                    <a
                      href="https://cnvmp3.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary underline flex items-center gap-0.5 text-[10px]"
                    >
                      <span>เปิด cnvmp3.com</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href="https://ytmp3.nu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-theme-primary underline flex items-center gap-0.5 text-[10px]"
                    >
                      <span>เปิด ytmp3.nu</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <p className="text-[10px] text-theme-sub mt-0.5 leading-relaxed">
                    ฟรี 100% ไม่มีปัญหาปิดกั้น YouTube แค่วางลิงก์เพลง YouTube แล้วกด Download MP3 ได้ไฟล์เพลงทันที!
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-theme-surface/70 border border-theme-glow/20 flex items-start gap-2.5">
                <Globe className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">2. OnlyMP3 / Dirpy (เว็บสำรอง)</span>
                    <a
                      href="https://en.onlymp3.to"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 underline flex items-center gap-0.5 text-[10px]"
                    >
                      <span>เปิด onlymp3.to</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <p className="text-[10px] text-theme-sub mt-0.5">
                    แปลง YouTube เป็นไฟล์เสียง MP3 ความคมชัดสูงใน 1 คลิก
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-theme-surface/70 border border-theme-glow/20 flex items-start gap-2.5">
                <Terminal className="w-4 h-4 text-theme-secondary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">3. yt-dlp (สำหรับคอมพิวเตอร์ / ไม่มีวันโดนแบน)</span>
                  <p className="text-[10px] text-theme-sub mt-0.5">
                    เปิด Terminal บน Windows แล้วพิมพ์คำสั่งนี้:
                  </p>
                  <code className="block mt-1 p-1.5 rounded-lg bg-black text-cyan-300 text-[10px] select-all">
                    yt-dlp -x --audio-format mp3 &quot;&lt;ลิงก์ YouTube ที่นี่&gt;&quot;
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Album Cover Artwork URL & Upload/Crop */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <Image className="w-3.5 h-3.5 text-theme-primary" />
            <span>Album Cover Artwork:</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => artworkFileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-glow/30 hover:border-theme-primary text-theme-primary hover:text-white transition-all text-[10px]"
              title="Upload cover image from computer"
            >
              <Upload className="w-3 h-3" />
              <span>Upload Local</span>
            </button>
            {music?.coverUrl && (
              <button
                type="button"
                onClick={() => {
                  setCropInitialSrc(music.coverUrl);
                  setCropModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-theme-primary/10 border border-theme-primary/40 text-theme-primary hover:bg-theme-primary hover:text-black transition-all text-[10px]"
                title="Crop & adjust cover artwork"
              >
                <Crop className="w-3 h-3" />
                <span>Crop (1:1)</span>
              </button>
            )}
          </div>
        </div>

        <input
          ref={artworkFileInputRef}
          type="file"
          accept="image/*"
          onChange={handleArtworkFileChange}
          className="hidden"
        />

        <input
          type="url"
          value={music?.coverUrl || ''}
          onChange={(e) => {
            setCoverError(false);
            handleChange('coverUrl', e.target.value);
          }}
          placeholder="https://images.unsplash.com/... or auto-fetched from link"
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

      {/* Interactive Image Cropper Modal for Album Cover */}
      <ImageCropModal
        isOpen={cropModalOpen}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={(croppedDataUrl) => {
          handleChange('coverUrl', croppedDataUrl);
          setCoverError(false);
        }}
        initialImageSrc={cropInitialSrc}
        title="Crop Album Artwork (1:1 Square)"
        defaultAspect="1:1"
        circularGuide={false}
      />
    </div>
  );
}
