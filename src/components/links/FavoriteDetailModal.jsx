/**
 * src/components/links/FavoriteDetailModal.jsx
 * Interactive Expanded Detail Modal for Favorites & Interests
 *
 * Capabilities:
 * - High-res top banner header (or stylized theme gradient fallback)
 * - Clean layout without overlapping elements (icon floats naturally between banner and body)
 * - Full un-truncated description notes (multiline, rich typography)
 * - Category badge, custom tier pill, and external link action
 * - Smooth Framer Motion entrance, backdrop blur, ESC & outside click dismiss
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
      {item && (
        <motion.div
          key="favorite-detail-modal-portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto pointer-events-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="favorite-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            key="favorite-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer pointer-events-auto"
          />

          {/* Modal Window */}
          <motion.div
            key="favorite-modal-panel"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-lg rounded-3xl overflow-hidden bg-theme-surface/95 border border-theme-glow/40 shadow-2xl backdrop-blur-2xl z-10 my-auto text-theme-main pointer-events-auto"
          >
          {/* Top Banner Area */}
          <div className="relative h-36 sm:h-44 w-full overflow-hidden bg-neutral-950">
            {hasBanner ? (
              <img
                src={item.bannerUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-theme-primary/20 via-theme-surface to-theme-accent/25 relative overflow-hidden flex items-center justify-center">
                {/* Subtle cyber background ambient aura */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.18)_0%,transparent_70%)]" />
                <div className="w-32 h-32 rounded-full border border-theme-glow/15 animate-pulse" />
              </div>
            )}

            {/* Gradient shadow overlay for legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

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
          </div>

          {/* Modal Content Body */}
          <div className="p-6 pt-0 space-y-4">
            {/* Elevated Icon Box (Floats naturally between banner and content without overlapping text) */}
            <div className="flex items-end justify-between -mt-9 sm:-mt-11 mb-2 relative z-20">
              <div className="p-3 rounded-2xl bg-theme-surface border-2 border-theme-glow/60 text-theme-accent shadow-2xl flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 shrink-0">
                {isIconImage ? (
                  <img
                    src={item.iconOrImage}
                    alt={item.title}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <IconComp className="w-8 h-8 sm:w-9 sm:h-9" />
                )}
              </div>

              {item.linkUrl && (
                <a
                  href={item.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-theme-primary/20 hover:bg-theme-primary/30 text-theme-primary border border-theme-primary/40 font-mono text-xs font-semibold transition-all shadow-glow hover:scale-105 active:scale-95"
                >
                  <span>Visit Link</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Title & Category Sub-label */}
            <div className="space-y-1">
              <h2
                id="favorite-modal-title"
                className="text-xl sm:text-2xl font-bold font-sans text-theme-main tracking-tight leading-snug"
              >
                {item.title}
              </h2>
              <div className="text-xs font-mono text-theme-sub flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-theme-accent animate-pulse" />
                <span>Category: {meta.label || item.category}</span>
              </div>
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
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-theme-glow/20">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-medium transition-all active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
  );
}
