/**
 * src/components/customizer/FavoritesEditorTab.jsx
 * Favorites & Interests WYSIWYG Editor Tab (Milestone M5 - Feature 21)
 *
 * Requirements:
 * - Manage favorite interest items across categories (tech, gaming, anime, music, hobbies)
 * - Section Header Banner upload & configuration (favoritesBannerUrl)
 * - Individual Card Banner upload & configuration (bannerUrl)
 * - Category filter tabs with counts
 * - Add new favorite items with rich notes, card banners, external links
 * - Edit existing favorites (title, subtitle/lore, category, badge, iconOrImage, bannerUrl, linkUrl)
 * - Reorder favorites (Move Up / Down)
 * - Delete favorite items
 */

import React, { useState, useRef } from 'react';
import { useProfileStore } from '../../store/useProfileStore.js';
import * as Icons from 'lucide-react';
import ImageCropModal from '../ui/ImageCropModal.jsx';
import {
  Plus,
  Trash2,
  Heart,
  ArrowUp,
  ArrowDown,
  Tag,
  Star,
  Code,
  Gamepad2,
  Film,
  Music,
  Palette,
  Terminal,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Upload,
  Crop,
  Image as ImageIcon,
  ExternalLink,
  Link as LinkIcon,
} from 'lucide-react';
import { FAVORITE_CATEGORIES } from '../../data/defaultData.js';

// Curated icons for favorites
const FAVORITE_ICONS = [
  'Code',
  'Terminal',
  'Sparkles',
  'Layers',
  'Gamepad2',
  'Film',
  'Music',
  'Palette',
  'Star',
  'Heart',
];

// Helper to render icon or custom cropped image safely
function DynamicFavIcon({ name, className = 'w-3.5 h-3.5' }) {
  if (!name) return <Star className={className} />;
  if (
    typeof name === 'string' &&
    (name.startsWith('data:image/') ||
      name.startsWith('http://') ||
      name.startsWith('https://') ||
      name.startsWith('/'))
  ) {
    return <img src={name} alt="Fav thumbnail" className={`${className} object-cover rounded`} />;
  }
  const Comp = Icons[name] || Star;
  return <Comp className={className} />;
}

export default function FavoritesEditorTab() {
  const {
    favorites,
    addFavorite,
    updateFavorite,
    removeFavorite,
    reorderFavorites,
    settings,
    updateSettings,
  } = useProfileStore();

  // Active category filter: 'all' or specific category
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Add Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState('tech');
  const [badge, setBadge] = useState('');
  const [iconOrImage, setIconOrImage] = useState('Star');
  const [bannerUrl, setBannerUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Cropper Modal State
  const [cropModal, setCropModal] = useState({
    isOpen: false,
    initialSrc: '',
    onCropSuccess: null,
    title: 'Crop Image',
  });

  const sectionBannerFileRef = useRef(null);
  const addFileInputRef = useRef(null);
  const addBannerFileRef = useRef(null);
  const editFileInputRef = useRef(null);
  const editBannerFileRef = useRef(null);
  const activeEditingTargetRef = useRef(null);

  // Expanded favorite item for editing
  const [editingId, setEditingId] = useState(null);

  const handleAdd = (e) => {
    e?.preventDefault();
    if (!title.trim()) return;

    addFavorite({
      title: title.trim(),
      subtitle: subtitle.trim(),
      category,
      badge: badge.trim(),
      iconOrImage: iconOrImage || 'Star',
      bannerUrl: bannerUrl.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
    });

    setTitle('');
    setSubtitle('');
    setBadge('');
    setIconOrImage('Star');
    setBannerUrl('');
    setLinkUrl('');
  };

  const moveUp = (favId) => {
    const idx = favorites.findIndex((f) => f.id === favId);
    if (idx <= 0) return;
    const reordered = [...favorites];
    const temp = reordered[idx - 1];
    reordered[idx - 1] = reordered[idx];
    reordered[idx] = temp;
    reorderFavorites(reordered);
  };

  const moveDown = (favId) => {
    const idx = favorites.findIndex((f) => f.id === favId);
    if (idx >= favorites.length - 1 || idx === -1) return;
    const reordered = [...favorites];
    const temp = reordered[idx + 1];
    reordered[idx + 1] = reordered[idx];
    reordered[idx] = temp;
    reorderFavorites(reordered);
  };

  const filteredFavorites = selectedCategory === 'all'
    ? favorites
    : favorites.filter((f) => f.category === selectedCategory);

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* 0. Section Header Banner Configuration */}
      <div className="p-3.5 rounded-2xl bg-black/40 border border-theme-glow/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <Layers className="w-3.5 h-3.5 text-theme-accent" />
            <span>Favorites Section Banner (แบนเนอร์หัวข้อส่วนนี้):</span>
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => sectionBannerFileRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-glow/30 hover:border-theme-accent text-theme-accent hover:text-white transition-all text-[10px]"
              title="Upload section banner image"
            >
              <Upload className="w-3 h-3" />
              <span>Upload Local</span>
            </button>
            {settings?.favoritesBannerUrl && (
              <button
                type="button"
                onClick={() => updateSettings({ favoritesBannerUrl: '' })}
                className="text-[10px] text-red-400 hover:underline px-1.5 py-0.5 rounded bg-red-500/10"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <input
          ref={sectionBannerFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
              setCropModal({
                isOpen: true,
                initialSrc: event.target.result,
                onCropSuccess: (dataUrl) => updateSettings({ favoritesBannerUrl: dataUrl }),
                title: 'Crop Section Header Banner (3:1 / 16:9)',
              });
            };
            reader.readAsDataURL(file);
            e.target.value = '';
          }}
        />

        <input
          type="url"
          value={settings?.favoritesBannerUrl || ''}
          onChange={(e) => updateSettings({ favoritesBannerUrl: e.target.value })}
          placeholder="https://images.unsplash.com/... or upload section banner above"
          className="w-full px-3 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
        />

        {settings?.favoritesBannerUrl && (
          <div className="relative h-20 rounded-xl overflow-hidden border border-theme-glow/20">
            <img
              src={settings.favoritesBannerUrl}
              alt="Section Banner Preview"
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* 1. Category Filter Navigation Bar */}
      <div className="space-y-1.5">
        <label className="text-theme-sub text-[11px] font-bold">Filter By Category:</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
              selectedCategory === 'all'
                ? 'bg-theme-accent text-black font-bold shadow-glow'
                : 'bg-black/40 text-theme-sub hover:text-white border border-theme-glow/20'
            }`}
          >
            All ({favorites.length})
          </button>
          {FAVORITE_CATEGORIES.map((cat) => {
            const count = favorites.filter((f) => f.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all capitalize ${
                  selectedCategory === cat.id
                    ? 'bg-theme-accent text-black font-bold shadow-glow'
                    : 'bg-black/40 text-theme-sub hover:text-white border border-theme-glow/20'
                }`}
              >
                {cat.id} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Add New Favorite Form */}
      <form
        onSubmit={handleAdd}
        className="p-4 rounded-2xl bg-black/50 border border-theme-glow/30 space-y-3.5 shadow-lg"
      >
        <div className="flex items-center gap-2 text-theme-accent font-bold">
          <Plus className="w-4 h-4" />
          <span>Add New Interest / Favorite</span>
        </div>

        <div className="space-y-1">
          <label className="text-theme-sub">Title / Item Name:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Elden Ring or Roblox"
            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-theme-sub">Subtitle / Full Description Notes:</label>
          <textarea
            rows={2}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Write full details, lore, review or descriptions (supports multiline)..."
            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent resize-none leading-relaxed"
          />
        </div>

        {/* Card Banner Image */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-theme-sub flex items-center gap-1 font-bold">
              <ImageIcon className="w-3.5 h-3.5 text-theme-accent" />
              <span>Card Banner Image (แบนเนอร์การ์ด):</span>
            </label>
            <button
              type="button"
              onClick={() => addBannerFileRef.current?.click()}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-theme-surface border border-theme-glow/30 hover:border-theme-accent text-theme-accent hover:text-white transition-all text-[10px]"
            >
              <Upload className="w-2.5 h-2.5" />
              <span>Upload Banner</span>
            </button>
          </div>
          <input
            ref={addBannerFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                setCropModal({
                  isOpen: true,
                  initialSrc: event.target.result,
                  onCropSuccess: (dataUrl) => setBannerUrl(dataUrl),
                  title: 'Crop Card Banner Image (16:9 / 3:1)',
                });
              };
              reader.readAsDataURL(file);
              e.target.value = '';
            }}
          />
          <input
            type="url"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder="https://images.unsplash.com/... or upload banner pic above"
            className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
          />
        </div>

        {/* External Link */}
        <div className="space-y-1">
          <label className="text-theme-sub flex items-center gap-1">
            <LinkIcon className="w-3 h-3 text-theme-accent" />
            <span>Link URL (Optional external link):</span>
          </label>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://www.roblox.com/... or project link"
            className="w-full px-3 py-1.5 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Category */}
          <div className="space-y-1">
            <label className="text-theme-sub">Category:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-2 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
            >
              <option value="tech">Tech</option>
              <option value="gaming">Gaming</option>
              <option value="anime">Anime</option>
              <option value="music">Music</option>
              <option value="hobbies">Hobbies</option>
            </select>
          </div>

          {/* Badge Pill */}
          <div className="space-y-1">
            <label className="text-theme-sub">Badge Pill:</label>
            <input
              type="text"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="e.g. S-Tier"
              className="w-full px-2 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
            />
          </div>

          {/* Icon or Custom Cropped Picture */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-theme-sub">Icon / Image:</label>
              <button
                type="button"
                onClick={() => addFileInputRef.current?.click()}
                className="text-[10px] text-theme-accent hover:underline flex items-center gap-1"
                title="Upload & crop custom picture"
              >
                <Upload className="w-3 h-3" />
                <span>Upload Pic</span>
              </button>
            </div>

            <input
              ref={addFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  setCropModal({
                    isOpen: true,
                    initialSrc: event.target.result,
                    onCropSuccess: (dataUrl) => setIconOrImage(dataUrl),
                    title: 'Crop Favorite Item Picture',
                  });
                };
                reader.readAsDataURL(file);
                e.target.value = '';
              }}
            />

            {iconOrImage && (iconOrImage.startsWith('data:') || iconOrImage.startsWith('http')) ? (
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/60 border border-theme-accent/40">
                <img src={iconOrImage} alt="Preview" className="w-6 h-6 rounded object-cover" />
                <span className="text-[10px] text-emerald-400 flex-1 truncate">Custom Pic</span>
                <button
                  type="button"
                  onClick={() => setIconOrImage('Star')}
                  className="text-[10px] text-theme-sub hover:text-white px-1.5 py-0.5 rounded bg-white/10"
                >
                  Reset
                </button>
              </div>
            ) : (
              <select
                value={iconOrImage}
                onChange={(e) => setIconOrImage(e.target.value)}
                className="w-full px-2 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
              >
                {FAVORITE_ICONS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-theme-accent/20 hover:bg-theme-accent/30 text-theme-accent border border-theme-accent/40 font-bold transition-all shadow-glow active:scale-[0.98]"
        >
          Add Favorite Item
        </button>
      </form>

      {/* 3. Existing Favorites List */}
      <div className="space-y-3">
        <h3 className="font-bold text-theme-main flex items-center justify-between">
          <span>
            {selectedCategory === 'all'
              ? `All Favorites (${favorites.length}):`
              : `${selectedCategory.toUpperCase()} (${filteredFavorites.length}):`}
          </span>
          <span className="text-[10px] text-theme-sub font-normal">Use ↑ ↓ to reorder</span>
        </h3>

        {filteredFavorites.length === 0 && (
          <div className="p-4 rounded-xl border border-dashed border-theme-glow/30 text-center text-theme-sub">
            No items in this category.
          </div>
        )}

        {filteredFavorites.map((fav) => {
          const isEditing = editingId === fav.id;

          return (
            <div
              key={fav.id}
              className="p-3 rounded-xl bg-black/40 border border-theme-glow/30 hover:border-theme-glow/60 transition-all space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveUp(fav.id)}
                      className="p-0.5 rounded text-theme-sub hover:text-white"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(fav.id)}
                      className="p-0.5 rounded text-theme-sub hover:text-white"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Icon */}
                  <span className="p-1.5 rounded-lg bg-black/60 border border-theme-glow/20 text-theme-accent shrink-0">
                    <DynamicFavIcon name={fav.iconOrImage} className="w-3.5 h-3.5" />
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white truncate">{fav.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-theme-sub uppercase">
                        {fav.category}
                      </span>
                      {fav.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-theme-accent/20 text-theme-accent font-bold">
                          {fav.badge}
                        </span>
                      )}
                    </div>
                    {fav.subtitle && (
                      <p className="text-[11px] text-theme-sub truncate">{fav.subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingId(isEditing ? null : fav.id)}
                    className="p-1.5 rounded-lg text-theme-sub hover:text-white hover:bg-white/10"
                    title={isEditing ? 'Close Edit' : 'Edit Favorite'}
                  >
                    {isEditing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFavorite(fav.id)}
                    className="p-1.5 rounded-lg text-theme-sub hover:text-red-400 hover:bg-red-500/10"
                    title="Delete favorite"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline Edit Panel */}
              {isEditing && (
                <div className="pt-2 mt-2 border-t border-theme-glow/15 space-y-2.5 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[10px] text-theme-sub">Title:</label>
                    <input
                      type="text"
                      value={fav.title || ''}
                      onChange={(e) => updateFavorite(fav.id, { title: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-theme-sub">Subtitle / Full Description Notes:</label>
                    <textarea
                      rows={2}
                      value={fav.subtitle || ''}
                      onChange={(e) => updateFavorite(fav.id, { subtitle: e.target.value })}
                      placeholder="Write full description (multiline)..."
                      className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent resize-none leading-relaxed"
                    />
                  </div>

                  {/* Edit Card Banner Image */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-theme-sub flex items-center gap-1 font-bold">
                        <ImageIcon className="w-3 h-3 text-theme-accent" />
                        <span>Card Banner Image:</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          activeEditingTargetRef.current = fav.id;
                          editBannerFileRef.current?.click();
                        }}
                        className="text-[10px] text-theme-accent hover:underline flex items-center gap-0.5"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>Upload Banner</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      value={fav.bannerUrl || ''}
                      onChange={(e) => updateFavorite(fav.id, { bannerUrl: e.target.value })}
                      placeholder="https://... or upload banner image"
                      className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
                    />
                  </div>

                  {/* Edit Link URL */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-theme-sub flex items-center gap-1">
                      <LinkIcon className="w-2.5 h-2.5 text-theme-accent" />
                      <span>Link URL:</span>
                    </label>
                    <input
                      type="url"
                      value={fav.linkUrl || ''}
                      onChange={(e) => updateFavorite(fav.id, { linkUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-theme-sub">Category:</label>
                      <select
                        value={fav.category || 'tech'}
                        onChange={(e) => updateFavorite(fav.id, { category: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
                      >
                        <option value="tech">Tech</option>
                        <option value="gaming">Gaming</option>
                        <option value="anime">Anime</option>
                        <option value="music">Music</option>
                        <option value="hobbies">Hobbies</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-theme-sub">Badge:</label>
                      <input
                        type="text"
                        value={fav.badge || ''}
                        onChange={(e) => updateFavorite(fav.id, { badge: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-theme-sub">Icon / Pic:</label>
                        <button
                          type="button"
                          onClick={() => {
                            activeEditingTargetRef.current = fav.id;
                            editFileInputRef.current?.click();
                          }}
                          className="text-[10px] text-theme-accent hover:underline flex items-center gap-0.5"
                          title="Upload and crop picture for this card"
                        >
                          <Upload className="w-2.5 h-2.5" />
                          <span>Pic</span>
                        </button>
                      </div>

                      {fav.iconOrImage && (fav.iconOrImage.startsWith('data:') || fav.iconOrImage.startsWith('http')) ? (
                        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/60 border border-theme-accent/30">
                          <img src={fav.iconOrImage} alt="Fav" className="w-5 h-5 rounded object-cover" />
                          <button
                            type="button"
                            onClick={() => updateFavorite(fav.id, { iconOrImage: 'Star' })}
                            className="text-[9px] text-theme-sub hover:text-white px-1 py-0.5 rounded bg-white/10"
                          >
                            To Icon
                          </button>
                        </div>
                      ) : (
                        <select
                          value={fav.iconOrImage || 'Star'}
                          onChange={(e) => updateFavorite(fav.id, { iconOrImage: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-accent text-[11px]"
                        >
                          {FAVORITE_ICONS.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hidden File Input for Card Picture */}
      <input
        ref={editFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const targetFavId = activeEditingTargetRef.current;
          if (!file || !targetFavId) return;

          const reader = new FileReader();
          reader.onload = (event) => {
            setCropModal({
              isOpen: true,
              initialSrc: event.target.result,
              onCropSuccess: (dataUrl) => {
                updateFavorite(targetFavId, { iconOrImage: dataUrl });
              },
              title: 'Crop Favorite Item Picture (1:1)',
            });
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
      />

      {/* Hidden File Input for Card Banner */}
      <input
        ref={editBannerFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const targetFavId = activeEditingTargetRef.current;
          if (!file || !targetFavId) return;

          const reader = new FileReader();
          reader.onload = (event) => {
            setCropModal({
              isOpen: true,
              initialSrc: event.target.result,
              onCropSuccess: (dataUrl) => {
                updateFavorite(targetFavId, { bannerUrl: dataUrl });
              },
              title: 'Crop Favorite Card Banner (16:9 / 3:1)',
            });
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
      />

      {/* Interactive Image Cropper Modal */}
      <ImageCropModal
        isOpen={cropModal.isOpen}
        onClose={() => setCropModal((prev) => ({ ...prev, isOpen: false }))}
        onCropComplete={(croppedDataUrl) => {
          if (typeof cropModal.onCropSuccess === 'function') {
            cropModal.onCropSuccess(croppedDataUrl);
          }
        }}
        initialImageSrc={cropModal.initialSrc}
        title={cropModal.title}
        defaultAspect="16:9"
        circularGuide={false}
      />
    </div>
  );
}
