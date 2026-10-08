/**
 * src/components/links/FavoriteDetailModal.jsx
 * Interactive Expanded Detail Modal for Favorites & Interests
 *
 * Capabilities:
 * - High-res top banner header (or stylized theme gradient fallback)
 * - Full un-truncated description notes (multiline, markdown/plain text, rich typography)
 * - Category badge, custom tier pill, and external link action
 * - Smooth Framer Motion scale entrance, backdrop blur, ESC & outside click dismiss
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  X,
  ExternalLink,
  Star,
  Sparkles,
  Layers,
  Heart,
} from 'lucide-react';
import { CATEGORY_META } from './FavoritesSection.jsx';

export default function FavoriteDetailModal({ item, onClose }) {
  // Handle ESC key press
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const isIconImage =
    item.iconOrImage &&
    (item.iconOrImage.startsWith('http://') ||
      item.iconOrImage.startsWith('https://') ||
      item.iconOrImage.startsWith('/') ||
      item.iconOrImage.startsWith('data:image/'));

  const IconComp =
    !isIconImage && item.iconOrImage && Icons[item.iconOrImage]
      ? Icons[item.iconOrImage]
      : (CATEGORY_META[item.category]?.icon || Sparkles);

  const meta = CATEGORY_META[item.category] || CATEGORY_META.all;
  const CatIcon = meta.icon || Sparkles;

  const hasBanner = Boolean(item.bannerUrl);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorite-modal-title"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-xl rounded-3xl overflow-hidden bg-theme-surface/95 border border-theme-glow/40 shadow-2xl backdrop-blur-2xl z-10 my-auto text-theme-main"
        >
          {/* Top Banner Image / Aesthetic Gradient Header */}
          <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-black/60">
            {hasBanner ? (
              <img
                src={item.bannerUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-theme-primary/20 via-theme-surface to-theme-accent/20 flex items-center justify-center relative overflow-hidden">
                {/* Decorative background grid and icons */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.15)_0%,transparent_70%)]" />
                <IconComp className="w-20 h-20 text-theme-primary/20 animate-pulse" />
              </div>
            )}

            {/* Gradient shadow overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-theme-surface via-transparent to-black/40" />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white/80 hover:text-white border border-white/10 transition-all shadow-lg active:scale-95 z-20 cursor-pointer"
              title="Close modal (Esc)"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Floating Category & Tier Badges */}
            <div className="absolute top-3.5 left-3.5 flex items-center gap-2 flex-wrap z-20">
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold backdrop-blur-md bg-black/70 border border-theme-glow/30 ${meta.badgeText}`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{meta.label}</span>
              </span>

              {item.badge && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-semibold backdrop-blur-md bg-theme-accent/20 text-theme-accent border border-theme-accent/40 shadow-glow">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{item.badge}</span>
                </span>
              )}
            </div>

            {/* Main Icon overlapping banner & content */}
            <div className="absolute -bottom-5 left-6 flex items-center gap-3 z-20">
              <div className="p-3 rounded-2xl bg-theme-surface border-2 border-theme-glow/50 text-theme-accent shadow-glow flex items-center justify-center w-14 h-14">
                {isIconImage ? (
                  <img
                    src={item.iconOrImage}
                    alt={item.title}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <IconComp className="w-7 h-7" />
                )}
              </div>
            </div>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 pt-8 space-y-4">
            {/* Title */}
            <div>
              <h2
                id="favorite-modal-title"
                className="text-xl sm:text-2xl font-bold font-sans text-theme-main tracking-tight flex items-center gap-2"
              >
                <span>{item.title}</span>
                <Heart className="w-5 h-5 text-theme-accent fill-theme-accent/20 inline-block shrink-0" />
              </h2>
            </div>

            {/* Full Un-truncated Subtitle / Description Notes */}
            <div className="p-4 rounded-2xl bg-black/40 border border-theme-glow/20 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-mono text-theme-sub/80 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-theme-primary" />
                <span>Details & Notes</span>
              </div>
              <div className="text-sm sm:text-base text-theme-main/90 font-sans leading-relaxed whitespace-pre-line break-words">
                {item.subtitle || 'No detailed description provided.'}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-theme-glow/20 flex-wrap">
              <div className="text-xs font-mono text-theme-sub flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-theme-accent animate-pulse" />
                <span>Category: {item.category}</span>
              </div>

              <div className="flex items-center gap-2">
                {item.linkUrl && (
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-theme-primary/20 hover:bg-theme-primary/30 text-theme-primary border border-theme-primary/40 font-mono text-xs font-bold transition-all shadow-glow hover:scale-105 active:scale-95"
                  >
                    <span>Visit Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs transition-all active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
