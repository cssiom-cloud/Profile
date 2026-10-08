/**
 * src/components/links/FavoritesSection.jsx
 * Lifestyle & Interests Showcase Component (Milestone M4 - Feature 18)
 * Displays categorized favorite tools, tech stack, anime, gaming, music, and hobbies.
 */

import React, { useState, useMemo } from 'react';
import { useProfileStore } from '../../store/useProfileStore.js';
import * as Icons from 'lucide-react';
import {
  Heart,
  Sparkles,
  Star,
  Code,
  Gamepad2,
  Film,
  Music,
  Palette,
  ExternalLink,
} from 'lucide-react';

/**
 * Canonical category configurations with theme accent tokens
 */
export const CATEGORY_META = {
  all: {
    label: 'All Favorites',
    icon: Sparkles,
    badgeBg: 'bg-theme-accent/10',
    badgeText: 'text-theme-accent',
    border: 'border-theme-accent/30',
  },
  tech: {
    label: 'Tech Stack',
    icon: Code,
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  gaming: {
    label: 'Gaming',
    icon: Gamepad2,
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  anime: {
    label: 'Anime & Cinema',
    icon: Film,
    badgeBg: 'bg-rose-500/10',
    badgeText: 'text-rose-400',
    border: 'border-rose-500/30',
  },
  music: {
    label: 'Music & Audio',
    icon: Music,
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  hobbies: {
    label: 'Creative Hobbies',
    icon: Palette,
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    border: 'border-amber-500/30',
  },
};

export default function FavoritesSection({ favorites: propFavorites, className = '' }) {
  const storeFavorites = useProfileStore((state) => state.favorites);
  const favorites = Array.isArray(propFavorites)
    ? propFavorites
    : Array.isArray(storeFavorites)
    ? storeFavorites
    : [];

  const [activeCategory, setActiveCategory] = useState('all');

  // Compute available categories from data
  const availableCategories = useMemo(() => {
    const found = new Set();
    favorites.forEach((fav) => {
      if (fav?.category) found.add(fav.category);
    });
    // Ensure all 5 canonical categories are available if present
    const categoryList = ['all'];
    ['tech', 'gaming', 'anime', 'music', 'hobbies'].forEach((cat) => {
      if (found.has(cat)) categoryList.push(cat);
    });
    // Add any custom extra categories found
    found.forEach((cat) => {
      if (!categoryList.includes(cat)) categoryList.push(cat);
    });
    return categoryList;
  }, [favorites]);

  // Filter and sort items
  const filteredFavorites = useMemo(() => {
    return favorites
      .filter((fav) => {
        if (!fav || typeof fav !== 'object') return false;
        if (activeCategory === 'all') return true;
        return fav.category === activeCategory;
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [favorites, activeCategory]);

  return (
    <section
      aria-label="Favorites & Interests"
      className={`w-full space-y-4 ${className}`}
    >
      {/* Header and Category Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-theme-accent" />
          <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-theme-main">
            Interests & What I Love
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-theme-accent/10 text-theme-accent border border-theme-accent/30">
            {filteredFavorites.length}
          </span>
        </div>

        {/* Category Pills Filter */}
        {availableCategories.length > 2 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {availableCategories.map((cat) => {
              const meta = CATEGORY_META[cat] || {
                label: cat,
                icon: Star,
                badgeBg: 'bg-theme-accent/10',
                badgeText: 'text-theme-accent',
                border: 'border-theme-accent/30',
              };
              const CatIcon = meta.icon;
              const isActive = activeCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg transition-all capitalize border ${
                    isActive
                      ? 'bg-theme-accent/20 text-theme-accent border-theme-accent font-bold shadow-glow'
                      : 'bg-theme-surface/50 text-theme-sub border-theme-glow/20 hover:text-white hover:border-theme-glow/50'
                  }`}
                >
                  <CatIcon className="w-3.5 h-3.5 opacity-80" />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Showcase */}
      {filteredFavorites.length === 0 ? (
        <div className="p-8 text-center rounded-2xl backdrop-blur-md bg-theme-surface/40 border border-theme-glow/20 text-theme-sub font-mono text-xs">
          No favorites found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {filteredFavorites.map((item) => {
            const isImage =
              item.iconOrImage &&
              (item.iconOrImage.startsWith('http://') ||
                item.iconOrImage.startsWith('https://') ||
                item.iconOrImage.startsWith('/'));

            const IconComp =
              !isImage && item.iconOrImage && Icons[item.iconOrImage]
                ? Icons[item.iconOrImage]
                : (CATEGORY_META[item.category]?.icon || Sparkles);

            const meta = CATEGORY_META[item.category] || CATEGORY_META.all;

            return (
              <div
                key={item.id}
                className="group relative p-4 rounded-2xl backdrop-blur-md bg-theme-surface/60 border border-theme-glow/30 hover:border-theme-accent/60 hover:shadow-glow transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="p-2 rounded-xl bg-theme-base/80 text-theme-accent border border-theme-glow/30 group-hover:scale-110 transition-transform flex items-center justify-center w-9 h-9">
                      {isImage ? (
                        <img
                          src={item.iconOrImage}
                          alt={item.title}
                          className="w-5 h-5 rounded object-cover"
                        />
                      ) : (
                        <IconComp className="w-4 h-4" />
                      )}
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-theme-accent/10 text-theme-accent border border-theme-accent/20 truncate max-w-[120px]">
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-sans font-bold text-sm text-theme-main group-hover:text-theme-accent transition-colors">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <p className="text-xs font-mono text-theme-sub mt-0.5 line-clamp-2">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-2 mt-3 border-t border-theme-glow/10 flex items-center justify-between text-[11px] font-mono text-theme-sub">
                  <span className={`capitalize ${meta.badgeText} opacity-80 flex items-center gap-1`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                    {item.category}
                  </span>
                  <span className="text-theme-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    <span>Favorite</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
