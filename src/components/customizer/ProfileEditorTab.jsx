/**
 * src/components/customizer/ProfileEditorTab.jsx
 * Profile Information WYSIWYG Editor Tab (Milestone M5 - Feature 21)
 *
 * Requirements:
 * - Fields for: name, handle, bio, quote, avatarUrl, bannerUrl, location, statusBadge
 * - Instant WYSIWYG reactivity via useProfileStore.updateProfile()
 * - Visual live previews for Avatar and Banner
 */

import React, { useState, useRef } from 'react';
import { useProfileStore } from '../../store/useProfileStore.js';
import {
  User,
  Image,
  Quote,
  MapPin,
  Sparkles,
  AtSign,
  AlignLeft,
  Layers,
  Crop,
  Upload,
  Heart,
  Shield,
  Key,
  Eye,
  EyeOff,
  Check,
  FileText,
} from 'lucide-react';
import ImageCropModal from '../ui/ImageCropModal.jsx';

export default function ProfileEditorTab() {
  const { profile, updateProfile } = useProfileStore();
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [bannerLoadError, setBannerLoadError] = useState(false);

  // Owner Credentials Management (Username & Password)
  const [authCreds, setAuthCreds] = useState(() => {
    try {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('profile_owner_auth') : null;
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return { username: 'admin', password: 'admin123' };
  });
  const [credsSaved, setCredsSaved] = useState(false);
  const [showCredsPassword, setShowCredsPassword] = useState(false);

  const handleSaveCredentials = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('profile_owner_auth', JSON.stringify(authCreds));
      }
      setCredsSaved(true);
      setTimeout(() => setCredsSaved(false), 2500);
    } catch (err) {
      console.warn('Failed saving auth credentials:', err);
    }
  };

  // Image Cropper Modal State
  const [cropModal, setCropModal] = useState({
    isOpen: false,
    targetField: 'avatarUrl',
    title: '',
    defaultAspect: '1:1',
    circularGuide: false,
    initialSrc: '',
  });

  const avatarFileRef = useRef(null);
  const bannerFileRef = useRef(null);

  const handleChange = (field, value) => {
    updateProfile({ [field]: value });
  };

  const handleOpenCropper = (targetField, initialSrc, defaultAspect, circularGuide, title) => {
    setCropModal({
      isOpen: true,
      targetField,
      initialSrc: initialSrc || '',
      defaultAspect,
      circularGuide,
      title,
    });
  };

  const handleFileInputSelect = (e, targetField, defaultAspect, circularGuide, title) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      handleOpenCropper(targetField, event.target.result, defaultAspect, circularGuide, title);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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

      {/* 3. Avatar Image URL & Upload/Crop */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <Image className="w-3.5 h-3.5 text-theme-primary" />
            <span>Avatar Image:</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => avatarFileRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-glow/30 hover:border-theme-primary text-theme-primary hover:text-white transition-all text-[10px]"
              title="Upload image from computer"
            >
              <Upload className="w-3 h-3" />
              <span>Upload Local</span>
            </button>
            {profile?.avatarUrl && (
              <button
                type="button"
                onClick={() =>
                  handleOpenCropper(
                    'avatarUrl',
                    profile.avatarUrl,
                    '1:1',
                    true,
                    'Crop Avatar Image (1:1 Circle / Square)'
                  )
                }
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-theme-primary/10 border border-theme-primary/40 text-theme-primary hover:bg-theme-primary hover:text-black transition-all text-[10px]"
                title="Crop & adjust aspect ratio"
              >
                <Crop className="w-3 h-3" />
                <span>Crop (1:1)</span>
              </button>
            )}
          </div>
        </div>

        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          onChange={(e) =>
            handleFileInputSelect(
              e,
              'avatarUrl',
              '1:1',
              true,
              'Crop Uploaded Avatar (1:1 Circle / Square)'
            )
          }
          className="hidden"
        />

        <input
          type="url"
          value={profile?.avatarUrl || ''}
          onChange={(e) => {
            setAvatarLoadError(false);
            handleChange('avatarUrl', e.target.value);
          }}
          placeholder="https://images.unsplash.com/... or upload image"
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all text-[11px]"
        />
      </div>

      {/* 4. Banner Cover Image URL & Upload/Crop */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <Layers className="w-3.5 h-3.5 text-theme-primary" />
            <span>Banner Cover:</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => bannerFileRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-glow/30 hover:border-theme-primary text-theme-primary hover:text-white transition-all text-[10px]"
              title="Upload banner image from computer"
            >
              <Upload className="w-3 h-3" />
              <span>Upload Local</span>
            </button>
            {profile?.bannerUrl && (
              <button
                type="button"
                onClick={() =>
                  handleOpenCropper(
                    'bannerUrl',
                    profile.bannerUrl,
                    '3:1',
                    false,
                    'Crop Banner Cover (3:1 / 16:9 / Free)'
                  )
                }
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-theme-primary/10 border border-theme-primary/40 text-theme-primary hover:bg-theme-primary hover:text-black transition-all text-[10px]"
                title="Crop & adjust banner aspect ratio"
              >
                <Crop className="w-3 h-3" />
                <span>Crop Banner</span>
              </button>
            )}
          </div>
        </div>

        <input
          ref={bannerFileRef}
          type="file"
          accept="image/*"
          onChange={(e) =>
            handleFileInputSelect(
              e,
              'bannerUrl',
              '3:1',
              false,
              'Crop Uploaded Banner Cover (3:1 / 16:9)'
            )
          }
          className="hidden"
        />

        <input
          type="url"
          value={profile?.bannerUrl || ''}
          onChange={(e) => {
            setBannerLoadError(false);
            handleChange('bannerUrl', e.target.value);
          }}
          placeholder="https://images.unsplash.com/... or upload image"
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

      {/* 8. Bottom Footer Customization Section (ส่วนล่างสุดของเว็บ) */}
      <div className="pt-4 border-t border-theme-glow/20 space-y-3">
        <div className="flex items-center gap-2 text-theme-primary font-bold">
          <Heart className="w-4 h-4 text-rose-400" />
          <h4 className="text-xs uppercase tracking-wider">Footer Customization (ปรับแต่งส่วนล่างสุด)</h4>
        </div>

        <div className="space-y-1.5">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <User className="w-3.5 h-3.5 text-theme-primary" />
            <span>Crafted By (สร้างโดย):</span>
          </label>
          <input
            type="text"
            value={profile?.footerCraftedBy ?? ''}
            onChange={(e) => handleChange('footerCraftedBy', e.target.value)}
            placeholder="e.g. Alex Rivera or your name"
            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <FileText className="w-3.5 h-3.5 text-theme-primary" />
            <span>Copyright Notice (ข้อความลิขสิทธิ์):</span>
          </label>
          <input
            type="text"
            value={profile?.footerCopyright ?? ''}
            onChange={(e) => handleChange('footerCopyright', e.target.value)}
            placeholder="e.g. All rights reserved"
            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-theme-sub flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
              <span>Credits & Tech Stack (เครดิตเทคโนโลยี):</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-theme-sub hover:text-white">
              <input
                type="checkbox"
                checked={profile?.showFooterCredits !== false}
                onChange={(e) => handleChange('showFooterCredits', e.target.checked)}
                className="rounded accent-theme-primary cursor-pointer"
              />
              <span>Show Credits</span>
            </label>
          </div>
          <input
            type="text"
            value={profile?.footerCredits ?? ''}
            onChange={(e) => handleChange('footerCredits', e.target.value)}
            placeholder="e.g. Powered by React, Vite, Tailwind CSS & Supabase"
            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all"
          />
        </div>
      </div>

      {/* 9. Owner Credentials Section (ระบบเข้าสู่ระบบ: Username & Password) */}
      <div className="pt-4 border-t border-theme-glow/20 space-y-3">
        <div className="flex items-center gap-2 text-theme-primary font-bold">
          <Shield className="w-4 h-4 text-emerald-400" />
          <h4 className="text-xs uppercase tracking-wider">Owner Account Settings (ตั้งค่าชื่อผู้ใช้และรหัสผ่าน)</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-theme-sub flex items-center gap-1.5 font-bold">
              <User className="w-3.5 h-3.5 text-theme-primary" />
              <span>Username (ชื่อผู้ใช้):</span>
            </label>
            <input
              type="text"
              value={authCreds.username}
              onChange={(e) => setAuthCreds((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="e.g. admin"
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-theme-sub flex items-center gap-1.5 font-bold">
                <Key className="w-3.5 h-3.5 text-theme-primary" />
                <span>Password (รหัสผ่าน):</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCredsPassword(!showCredsPassword)}
                className="text-[10px] text-theme-sub hover:text-white"
              >
                {showCredsPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showCredsPassword ? 'text' : 'password'}
                value={authCreds.password}
                onChange={(e) => setAuthCreds((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-3 py-2 pr-9 rounded-xl bg-black/50 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCredsPassword(!showCredsPassword)}
                className="absolute right-2.5 top-2 text-theme-sub hover:text-white"
              >
                {showCredsPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveCredentials}
          className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl bg-theme-surface border border-theme-glow/30 text-theme-primary hover:bg-theme-primary/10 hover:border-theme-primary transition-all text-xs font-mono"
        >
          {credsSaved ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Saved Credentials Successfully!</span>
            </>
          ) : (
            <>
              <Shield className="w-3.5 h-3.5" />
              <span>Update Owner Login Credentials (บันทึกรหัสผ่านใหม่)</span>
            </>
          )}
        </button>
      </div>

      {/* Interactive Image Cropper Modal */}
      <ImageCropModal
        isOpen={cropModal.isOpen}
        onClose={() => setCropModal((prev) => ({ ...prev, isOpen: false }))}
        onCropComplete={(croppedDataUrl) => {
          handleChange(cropModal.targetField, croppedDataUrl);
        }}
        initialImageSrc={cropModal.initialSrc}
        title={cropModal.title}
        defaultAspect={cropModal.defaultAspect}
        circularGuide={cropModal.circularGuide}
      />
    </div>
  );
}
