/**
 * src/components/links/LinksGrid.jsx
 * Responsive Categorized Links Grid Showcase Component (Milestone M4)
 * Supports dynamic Bento, Stack, and Cards layouts, category filtering pills with counts,
 * Framer Motion layout transitions, and owner mode controls.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../../store/useProfileStore.js';
import LinkCard from './LinkCard.jsx';
import { Link2, FolderOpen, Layers, Plus } from 'lucide-react';

/**
 * Category Title Formatter
 */
const formatCategoryLabel = (category) => {
  if (!category || category === 'all') return 'All';
  const labelMap = {
    project: 'Projects',
    projects: 'Projects',
    social: 'Socials',
    socials: 'Socials',
    work: 'Work',
    creative: 'Creative',
    tech: 'Tech',
    community: 'Community',
    other: 'Other',
  };
  return labelMap[category] || (category.charAt(0).toUpperCase() + category.slice(1));
};

/**
 * Layout Container Class Resolver
 */
const getLayoutContainerClass = (layoutStyle) => {
  switch (layoutStyle) {
    case 'stack':
      return 'flex flex-col gap-3 max-w-xl mx-auto w-full';
    case 'cards':
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full';
    case 'bento':
    default:
      return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full';
  }
};

/**
 * Asymmetric Bento Item Span Resolver
 */
const getItemSpanClass = (link, index, layoutStyle, totalCount) => {
  if (layoutStyle === 'stack') return 'w-full';
  if (layoutStyle === 'cards') return 'col-span-1 w-full';

  // Bento layout asymmetric spans:
  // Featured cards span 2 columns when explicitly tagged or as primary card
  const isFeatured = Boolean(
    link?.isFeatured ||
    link?.featured ||
    (index === 0 && totalCount >= 3) ||
    (index % 5 === 0 && index > 0 && totalCount > 5)
  );

  return isFeatured ? 'sm:col-span-2 md:col-span-2 w-full' : 'col-span-1 w-full';
};

export default function LinksGrid() {
  const { links, settings, isOwner, toggleCustomizer } = useProfileStore();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const layoutStyle = settings?.layoutStyle || 'bento';
  const cardStyle = settings?.cardStyle || 'glassmorphism';

  // Filter valid active links (or all links in owner mode)
  const activeLinks = useMemo(() => {
    if (!Array.isArray(links)) return [];
    return links
      .filter((l) => Boolean(l && typeof l === 'object'))
      .filter((l) => (isOwner ? true : l.isActive !== false))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [links, isOwner]);

  // Derive unique categories with exact item counts
  const { categories, categoryCounts } = useMemo(() => {
    const counts = { all: activeLinks.length };
    const catSet = new Set();

    activeLinks.forEach((link) => {
      const rawCat = (link.category || 'other').trim().toLowerCase();
      counts[rawCat] = (counts[rawCat] || 0) + 1;
      catSet.add(rawCat);
    });

    const uniqueCats = ['all', ...Array.from(catSet).sort()];
    return { categories: uniqueCats, categoryCounts: counts };
  }, [activeLinks]);

  // Filter links for currently active category
  const filteredLinks = useMemo(() => {
    return activeLinks.filter((link) => {
      if (selectedCategory === 'all') return true;
      const linkCat = (link.category || 'other').trim().toLowerCase();
      return linkCat === selectedCategory;
    });
  }, [activeLinks, selectedCategory]);

  return (
    <section aria-label="Links Hub" className="w-full space-y-4">
      {/* Section Header & Dynamic Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-theme-primary" />
          <h2 className="text-sm font-mono uppercase tracking-wider font-bold text-theme-main">
            Featured Portals & Links
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary border border-theme-primary/30">
            {filteredLinks.length}
          </span>
        </div>

        {/* Dynamic Category Filtering Pills */}
        {categories.length > 1 && (
          <div
            className="flex flex-wrap items-center gap-1.5"
            role="tablist"
            aria-label="Filter links by category"
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = categoryCounts[cat] || 0;

              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat)}
                  className={`relative text-xs font-mono px-3 py-1.5 rounded-xl transition-all capitalize border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-theme-primary/20 text-theme-primary border-theme-primary font-bold shadow-glow'
                      : 'bg-theme-surface/50 text-theme-sub border-theme-glow/20 hover:text-white hover:border-theme-glow/50 hover:bg-theme-surface/80'
                  }`}
                >
                  <span>{formatCategoryLabel(cat)}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-theme-primary text-black'
                        : 'bg-theme-base/60 text-theme-sub border border-theme-glow/20'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty State Display */}
      {filteredLinks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-10 text-center rounded-2xl backdrop-blur-md bg-theme-surface/40 border border-theme-glow/20 flex flex-col items-center justify-center gap-3 text-theme-sub"
        >
          <div className="p-3 rounded-full bg-theme-surface/80 border border-theme-glow/30 text-theme-primary">
            <FolderOpen className="w-6 h-6" />
          </div>
          <p className="font-mono text-sm text-theme-main font-semibold">
            {selectedCategory === 'all'
              ? 'No active portals or links available.'
              : `No portals found in category "${formatCategoryLabel(selectedCategory)}".`}
          </p>
          <p className="font-mono text-xs text-theme-sub max-w-sm">
            {isOwner
              ? 'Click the button below to add portals via the Live Customizer.'
              : 'Try selecting a different category or check back later.'}
          </p>

          <div className="flex items-center gap-2 mt-2">
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-theme-primary/10 text-theme-primary border border-theme-primary/30 hover:bg-theme-primary/20 transition-all font-semibold"
              >
                Show All ({activeLinks.length})
              </button>
            )}

            {isOwner && (
              <button
                type="button"
                onClick={toggleCustomizer}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-theme-primary text-black hover:brightness-110 transition-all font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Portal
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        /* Links Container with Framer Motion Layout Animations */
        <motion.div
          layout
          className={getLayoutContainerClass(layoutStyle)}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="popLayout">
            {filteredLinks.map((link, index) => {
              const isFeatured =
                layoutStyle === 'bento' &&
                (Boolean(link.isFeatured || link.featured) ||
                  (index === 0 && filteredLinks.length >= 3));

              const spanClass = getItemSpanClass(
                link,
                index,
                layoutStyle,
                filteredLinks.length
              );

              return (
                <motion.div
                  key={link.id || `link-${index}`}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -8 }}
                  transition={{
                    duration: 0.24,
                    delay: Math.min(index * 0.03, 0.2),
                    ease: 'easeOut',
                  }}
                  className={`relative ${spanClass}`}
                >
                  <LinkCard
                    link={link}
                    layoutStyle={layoutStyle}
                    cardStyle={cardStyle}
                    index={index}
                    isFeatured={isFeatured}
                    isOwner={isOwner}
                  />

                  {/* Owner Inactive Indicator */}
                  {isOwner && link.isActive === false && (
                    <span className="absolute top-2.5 right-2.5 z-20 text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      Hidden
                    </span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
