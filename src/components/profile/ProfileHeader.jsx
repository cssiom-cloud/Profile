/**
 * src/components/profile/ProfileHeader.jsx
 * Dynamic Creative Profile Header Component
 * Milestone 4 (Feature 16: Profile Header & Status)
 *
 * Capabilities:
 * - Reads reactive profile state from Zustand useProfileStore (or optional profile prop)
 * - Avatar with dynamic theme glowing aura (Framer Motion pulse + shadow-glow)
 * - Robust avatar image fallback to stylish monogram initials (100% compliant with T2.8 spec)
 * - Hero banner background with responsive height and dynamic generative gradient fallback
 * - Status badge pill with animated pulsing live indicator dot and micro-glow
 * - Verified badge icon (BadgeCheck), normalized @handle, and location pill with MapPin
 * - Responsive typography for Bio and stylized Blockquote for Personal Quote
 * - Fully responsive, zero horizontal overflow under extreme string stress (T2.2)
 * - Discreet Owner Mode edit trigger when isOwner === true (R2 compliant)
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  MapPin,
  Quote,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore.js';
import { DEFAULT_PROFILE_DATA } from '../../data/defaultData.js';

/**
 * Generates monogram initials fallback for broken/missing avatar images.
 * Adheres strictly to Tier 2 test contract T2.8:
 * - Single word: first 2 characters uppercase (e.g. 'Kavinsky' -> 'KA')
 * - Multiple words: first character of first word + first character of last word (e.g. 'Alex Rivera' -> 'AR')
 * - Empty / null / invalid: '??'
 *
 * @param {string} name
 * @returns {string} 2-character monogram string
 */
export const generateAvatarFallback = (name) => {
  if (!name || typeof name !== 'string') return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Defensive profile data sanitizer ensuring no undefined errors
 */
export const getSafeProfile = (profile) => {
  const seed = DEFAULT_PROFILE_DATA.profile;
  if (!profile || typeof profile !== 'object') return seed;

  return {
    name: typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : seed.name,
    handle: typeof profile.handle === 'string' && profile.handle.trim()
      ? (profile.handle.trim().startsWith('@') ? profile.handle.trim() : `@${profile.handle.trim()}`)
      : seed.handle,
    bio: typeof profile.bio === 'string' ? profile.bio : seed.bio,
    quote: typeof profile.quote === 'string' ? profile.quote : seed.quote,
    avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : seed.avatarUrl,
    bannerUrl: typeof profile.bannerUrl === 'string' ? profile.bannerUrl : seed.bannerUrl,
    location: typeof profile.location === 'string' ? profile.location : seed.location,
    statusBadge: typeof profile.statusBadge === 'string' ? profile.statusBadge : seed.statusBadge,
  };
};

/**
 * ProfileHeader Component
 *
 * @param {Object} props
 * @param {Object} [props.profile] Optional override for profile state
 * @param {string} [props.className] Additional CSS class names
 */
export default function ProfileHeader({ profile: propProfile, className = '' }) {
  // Read profile draft and owner state from Zustand store
  const storeProfile = useProfileStore((state) => state.profile);
  const isOwner = useProfileStore((state) => state.isOwner);
  const setCustomizerOpen = useProfileStore((state) => state.setCustomizerOpen);
  const setActiveTab = useProfileStore((state) => state.setActiveTab);

  // Normalize data with defensive fallback
  const profile = getSafeProfile(propProfile || storeProfile);

  // Image load error states
  const [avatarError, setAvatarError] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  // Reset error flags if URLs are dynamically updated in customizer
  useEffect(() => {
    setAvatarError(false);
  }, [profile.avatarUrl]);

  useEffect(() => {
    setBannerError(false);
  }, [profile.bannerUrl]);

  const initials = generateAvatarFallback(profile.name);

  // Clean quote string from surrounding quotes if already present
  const cleanQuote = profile.quote
    ? profile.quote.replace(/^["'“”]/, '').replace(/["'“”]$/, '').trim()
    : '';

  return (
    <article
      aria-label="Profile Header"
      className={`relative w-full rounded-3xl overflow-hidden bg-theme-surface/60 backdrop-blur-xl border border-theme-glow/30 shadow-glass transition-colors duration-300 ${className}`}
    >
      {/* ====================================================================
          1. Hero Banner Section with Generative Gradient Fallback
          ==================================================================== */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 overflow-hidden bg-theme-base select-none">
        {profile.bannerUrl && !bannerError ? (
          <img
            src={profile.bannerUrl}
            alt={`${profile.name}'s banner background`}
            onError={() => setBannerError(true)}
            className="w-full h-full object-cover object-center filter brightness-90 contrast-[1.05] transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(0, 240, 255, 0.12) 50%, var(--bg-base) 100%)',
            }}
          >
            {/* Subtle Constellation Grid Pattern */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(var(--border-glow) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-theme-primary/10 via-transparent to-theme-secondary/10 mix-blend-screen" />
          </div>
        )}

        {/* Smooth Vignette Overlay to blend into surface below */}
        <div className="absolute inset-0 bg-gradient-to-t from-theme-base/90 via-theme-base/30 to-transparent pointer-events-none" />

        {/* Discreet Owner Quick-Edit Button (Owner Mode only) */}
        {isOwner && (
          <motion.button
            type="button"
            onClick={() => {
              if (typeof setActiveTab === 'function') setActiveTab('profile');
              if (typeof setCustomizerOpen === 'function') setCustomizerOpen(true);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-theme-surface/90 hover:bg-theme-surface-hover/95 backdrop-blur-md border border-theme-primary/50 text-theme-primary text-xs font-mono shadow-glow transition-all"
            aria-label="Edit Profile Details in Customizer"
          >
            <Edit3 className="w-3.5 h-3.5 text-theme-primary" />
            <span>Edit Profile</span>
          </motion.button>
        )}
      </div>

      {/* ====================================================================
          2. Profile Body Content (Avatar, Bio, Quote, Badges)
          ==================================================================== */}
      <div className="relative px-5 sm:px-8 pb-8 -mt-16 sm:-mt-20 md:-mt-24 z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-6">
          
          {/* Avatar Container with Animated Glowing Aura */}
          <div className="relative group flex-shrink-0">
            {/* Dynamic Breathing Glow Aura Layer */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.45, 0.8, 0.45],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -inset-1 rounded-full pointer-events-none -z-10"
              style={{
                background: 'radial-gradient(circle, var(--accent-primary) 0%, var(--border-glow) 70%, transparent 100%)',
                filter: 'blur(10px)',
              }}
            />

            {/* Avatar Frame with Border & Theme Shadow */}
            <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-b from-theme-primary/80 via-theme-surface to-theme-glow/30 shadow-[0_0_25px_var(--border-glow)] overflow-hidden">
              {profile.avatarUrl && !avatarError ? (
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.name}'s profile avatar`}
                  onError={() => setAvatarError(true)}
                  className="w-full h-full rounded-full object-cover bg-theme-surface border-2 border-theme-base select-none transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                /* Fallback Initials Avatar (T2.8 Compliance) */
                <div
                  className="w-full h-full rounded-full flex flex-col items-center justify-center border-2 border-theme-base select-none shadow-inner"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--bg-surface) 50%, var(--accent-secondary) 100%)',
                  }}
                  title={profile.name}
                >
                  <span className="font-mono font-extrabold text-2xl sm:text-4xl text-theme-main tracking-wider drop-shadow-md">
                    {initials}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-theme-primary/80 mt-1 opacity-75" />
                </div>
              )}
            </div>
          </div>

          {/* Status Badge Pill (Micro-Glow Animation) */}
          {profile.statusBadge && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-theme-surface/90 backdrop-blur-md border border-theme-glow/40 text-theme-main text-xs font-mono shadow-[0_0_16px_var(--border-glow)] hover:border-theme-primary/70 transition-all sm:mb-2 max-w-full"
            >
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              </span>
              <span className="truncate max-w-[250px] sm:max-w-[360px] font-medium tracking-tight">
                {profile.statusBadge}
              </span>
            </motion.div>
          )}
        </div>

        {/* ====================================================================
            3. Identity Metadata: Name, Verified Badge, Handle, Location
            ==================================================================== */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-theme-main tracking-tight font-sans break-words max-w-full">
              {profile.name}
            </h1>

            {/* Creative Verified Badge */}
            <div
              className="inline-flex items-center justify-center p-1 rounded-full bg-theme-primary/10 border border-theme-primary/30 text-theme-primary shadow-glow cursor-help"
              title="Verified Creative Engineer"
              aria-label="Verified Creative Engineer"
            >
              <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-theme-primary fill-theme-primary/20" />
            </div>
          </div>

          {/* Handle & Location Pill */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs sm:text-sm font-mono text-theme-sub">
            <span className="text-theme-primary font-semibold tracking-wide">
              {profile.handle}
            </span>

            {profile.location && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-theme-surface/70 border border-theme-glow/20 text-theme-sub text-xs">
                <MapPin className="w-3.5 h-3.5 text-theme-secondary flex-shrink-0" />
                <span className="truncate max-w-[220px] sm:max-w-xs">{profile.location}</span>
              </div>
            )}
          </div>

          {/* ====================================================================
              4. Bio Description (Defensive Wrap for T2.2 Extreme Lengths)
              ==================================================================== */}
          {profile.bio && (
            <p className="text-sm sm:text-base text-theme-sub leading-relaxed max-w-3xl font-sans break-words whitespace-pre-line pt-1">
              {profile.bio}
            </p>
          )}

          {/* ====================================================================
              5. Stylized Inspirational Quote Block (Blockquote with Quote Icon)
              ==================================================================== */}
          {cleanQuote && (
            <motion.blockquote
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="relative mt-4 p-4 rounded-2xl bg-theme-surface/40 backdrop-blur-md border border-theme-glow/30 border-l-4 border-l-theme-primary shadow-glass overflow-hidden max-w-3xl"
            >
              <div className="flex items-start gap-3">
                <Quote className="w-5 h-5 text-theme-primary/70 flex-shrink-0 mt-0.5 rotate-180" />
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="text-sm sm:text-base italic text-theme-main/90 font-serif leading-relaxed break-words">
                    &ldquo;{cleanQuote}&rdquo;
                  </p>
                  <span className="block text-[10px] font-mono uppercase tracking-widest text-theme-sub/70">
                    — Personal Philosophy
                  </span>
                </div>
              </div>
            </motion.blockquote>
          )}
        </div>
      </div>
    </article>
  );
}
