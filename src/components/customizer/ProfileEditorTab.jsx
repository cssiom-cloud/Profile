/**
 * src/components/customizer/ProfileEditorTab.jsx
 * Profile Information WYSIWYG Editor Tab (Milestone M5 - Feature 21)
 *
 * Requirements:
 * - Fields for: name, handle, bio, quote, avatarUrl, bannerUrl, location, statusBadge
 * - Instant WYSIWYG reactivity via useProfileStore.updateProfile()
 * - Visual live previews for Avatar and Banner
 */

import React, { useState } from 'react';
import { useProfileStore } from '../../store/useProfileStore.js';
import { User, Image, Quote, MapPin, Sparkles, AtSign, AlignLeft, Layers } from 'lucide-react';

export default function ProfileEditorTab() {
  const { profile, updateProfile } = useProfileStore();
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [bannerLoadError, setBannerLoadError] = useState(false);

  const handleChange = (field, value) => {
    updateProfile({ [field]: value });
  };

  const currentAvatar = profile?.avatarUrl || '';
  const currentBanner = profile?.bannerUrl || '';

  return (
    <div className="space-y-5 font-mono text-xs">
      {/* Live Visual Media Preview Section */}
      <div className="relative rounded-2xl overflow-hidden border border-theme-glow/30 bg-black/40">
        {/* Banner Preview */}
        <div className="relative h-24 w-full bg-slate-900 overflow-hidden">
          {currentBanner && !bannerLoadError ? (
            <img
              src={currentBanner}
              alt="Profile Banner"
              onError={() => setBannerLoadError(true)}
              onLoad={() => setBannerLoadError(false)}
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-theme-primary/10 via-theme-surface to-theme-accent/10 text-theme-sub text-[11px]">
              <Layers className="w-4 h-4 mr-1.5 opacity-40" />
              <span>{currentBanner ? 'Failed to load banner' : 'No Banner URL configured'}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>

        {/* Avatar Preview overlapping banner */}
        <div className="absolute top-12 left-4 flex items-end gap-3">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-theme-primary/60 shadow-glow bg-black/80 shrink-0">
            {currentAvatar && !avatarLoadError ? (
              <img
                src={currentAvatar}
                alt={profile?.name || 'Avatar'}
                onError={() => setAvatarLoadError(true)}
                onLoad={() => setAvatarLoadError(false)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-theme-primary/10 text-theme-primary font-bold text-lg">
                {(profile?.name || 'A').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="mb-1">
            <h3 className="font-bold text-white text-sm truncate max-w-[220px]">
              {profile?.name || 'Unnamed Creator'}
            </h3>
            <p className="text-[11px] text-theme-primary font-mono truncate max-w-[220px]">
              {profile?.handle || '@handle'}
            </p>
          </div>
        </div>
        <div className="pt-10 p-3 bg-black/60 border-t border-theme-glow/10 flex items-center justify-between text-[10px] text-theme-sub">
          <span>{profile?.location || 'No location set'}</span>
          <span>{profile?.statusBadge || '⚡ Online'}</span>
        </div>
      </div>

      {/* 1. Name & Handle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <User className="w-3.5 h-3.5 text-theme-primary" />
            <span>Display Name:</span>
          </label>
          <input
            type="text"
            value={profile?.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g. Alex Rivera"
            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <AtSign className="w-3.5 h-3.5 text-theme-primary" />
            <span>Profile Handle:</span>
          </label>
          <input
            type="text"
            value={profile?.handle || ''}
            onChange={(e) => handleChange('handle', e.target.value)}
            placeholder="e.g. @alexrivera"
            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
          />
        </div>
      </div>

      {/* 2. Status Badge Pill */}
      <div className="space-y-1.5">
        <label className="text-theme-sub flex items-center gap-1.5 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
          <span>Status Badge Pill / Tagline:</span>
        </label>
        <input
          type="text"
          value={profile?.statusBadge || ''}
          onChange={(e) => handleChange('statusBadge', e.target.value)}
          placeholder="e.g. ⚡ Exploring Creative Frontiers"
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
        />
      </div>

      {/* 3. Avatar Image URL */}
      <div className="space-y-1.5">
        <label className="text-theme-sub flex items-center gap-1.5 font-bold">
          <Image className="w-3.5 h-3.5 text-theme-primary" />
          <span>Avatar Image URL:</span>
        </label>
        <input
          type="url"
          value={profile?.avatarUrl || ''}
          onChange={(e) => {
            setAvatarLoadError(false);
            handleChange('avatarUrl', e.target.value);
          }}
          placeholder="https://images.unsplash.com/photo-..."
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all text-[11px]"
        />
      </div>

      {/* 4. Banner Cover Image URL */}
      <div className="space-y-1.5">
        <label className="text-theme-sub flex items-center gap-1.5 font-bold">
          <Layers className="w-3.5 h-3.5 text-theme-primary" />
          <span>Banner Cover URL:</span>
        </label>
        <input
          type="url"
          value={profile?.bannerUrl || ''}
          onChange={(e) => {
            setBannerLoadError(false);
            handleChange('bannerUrl', e.target.value);
          }}
          placeholder="https://images.unsplash.com/photo-..."
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all text-[11px]"
        />
      </div>

      {/* 5. Location */}
      <div className="space-y-1.5">
        <label className="text-theme-sub flex items-center gap-1.5 font-bold">
          <MapPin className="w-3.5 h-3.5 text-theme-primary" />
          <span>Location / Base:</span>
        </label>
        <input
          type="text"
          value={profile?.location || ''}
          onChange={(e) => handleChange('location', e.target.value)}
          placeholder="e.g. Tokyo & Neo-Metropolis"
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
        />
      </div>

      {/* 6. Bio Description */}
      <div className="space-y-1.5">
        <label className="text-theme-sub flex items-center gap-1.5 font-bold">
          <AlignLeft className="w-3.5 h-3.5 text-theme-primary" />
          <span>Bio Description:</span>
        </label>
        <textarea
          rows={3}
          value={profile?.bio || ''}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="Crafting digital realities with code, sound, and interactive canvas aesthetics..."
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary resize-none transition-all leading-relaxed"
        />
      </div>

      {/* 7. Personal Quote */}
      <div className="space-y-1.5">
        <label className="text-theme-sub flex items-center gap-1.5 font-bold">
          <Quote className="w-3.5 h-3.5 text-theme-primary" />
          <span>Personal Quote / Philosophy:</span>
        </label>
        <input
          type="text"
          value={profile?.quote || ''}
          onChange={(e) => handleChange('quote', e.target.value)}
          placeholder='"Dream in algorithms, craft in color, build for the future."'
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
        />
      </div>
    </div>
  );
}
