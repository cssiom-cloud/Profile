/**
 * src/components/ui/ThemeSwitcher.jsx
 * Interactive Theme Preset Switcher supporting all 5 aesthetic themes:
 * - Cyber Neon (Default high-contrast cyberpunk cyan & magenta)
 * - Midnight Glow (Deep space navy & nebula violet/sapphire)
 * - Lo-Fi Aesthetic (Warm retro twilight, cozy peach & sage)
 * - Clean Minimalist (Sophisticated monochrome slate & sky)
 * - Retro Vaporwave (90s nostalgia synthwave pink & pastel teal)
 *
 * Features:
 * - Instant zero-reload DOM update via document.documentElement data-theme attribute
 * - Bi-directional synchronization with Zustand useProfileStore
 * - Fluid Framer Motion layoutId active pill indicator and micro-spring animations
 * - Accessible ARIA radiogroup, keyboard arrow navigation, and tooltip preview
 * - Multi-variant layout: 'pills' (default), 'dropdown', and 'grid' (for customizer drawer)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Moon,
  Coffee,
  Feather,
  Sunset,
  Check,
  Palette,
  ChevronDown,
} from 'lucide-react';
import { useProfileStore } from '../../store/useProfileStore.js';

/**
 * Master Theme Presets Configuration
 * Colors precisely match CSS Custom Properties in src/index.css
 */
export const THEME_PRESETS_CONFIG = [
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    tagline: 'Futuristic Cyan & Magenta',
    description: 'High-contrast cyberpunk glow with electric cyan and magenta',
    colors: {
      primary: '#00f0ff',
      secondary: '#ff007f',
      base: '#090a0f',
      surface: 'rgba(16, 20, 31, 0.75)',
      glow: 'rgba(0, 240, 255, 0.35)',
    },
    icon: Sparkles,
  },
  {
    id: 'midnight-glow',
    name: 'Midnight Glow',
    tagline: 'Deep Nebula Violet & Indigo',
    description: 'Deep space navy with neon violet and sapphire accents',
    colors: {
      primary: '#a855f7',
      secondary: '#6366f1',
      base: '#0b0f19',
      surface: 'rgba(17, 24, 39, 0.8)',
      glow: 'rgba(168, 85, 247, 0.32)',
    },
    icon: Moon,
  },
  {
    id: 'lofi-aesthetic',
    name: 'Lo-Fi Aesthetic',
    tagline: 'Warm Twilight & Peach',
    description: 'Warm retro twilight, sunset peach, and cozy vibes',
    colors: {
      primary: '#e09f67',
      secondary: '#88a892',
      base: '#1a1816',
      surface: 'rgba(38, 34, 31, 0.78)',
      glow: 'rgba(224, 159, 103, 0.28)',
    },
    icon: Coffee,
  },
  {
    id: 'clean-minimalist',
    name: 'Clean Minimalist',
    tagline: 'Slate Monochrome & Sky',
    description: 'Sophisticated monochrome slate with crisp typography',
    colors: {
      primary: '#38bdf8',
      secondary: '#94a3b8',
      base: '#09090b',
      surface: 'rgba(24, 24, 27, 0.72)',
      glow: 'rgba(255, 255, 255, 0.16)',
    },
    icon: Feather,
  },
  {
    id: 'retro-vaporwave',
    name: 'Retro Vaporwave',
    tagline: '90s Synthwave & Pastel Teal',
    description: '90s nostalgia synth aesthetic with pink and pastel teal',
    colors: {
      primary: '#ff71ce',
      secondary: '#01cdfe',
      base: '#160529',
      surface: 'rgba(36, 12, 64, 0.82)',
      glow: 'rgba(255, 113, 206, 0.42)',
    },
    icon: Sunset,
  },
];

/**
 * Immediately applies data-theme attribute to DOM document root
 * Dispatches 'themechange' custom event so Canvas & Visualizers can re-sample colors
 */
export const applyThemeToDOM = (themeKey) => {
  if (typeof document === 'undefined' || !themeKey) return;

  document.documentElement.setAttribute('data-theme', themeKey);

  // Safely persist to localStorage for instant pre-hydration restore
  try {
    localStorage.setItem('profile_hub_active_theme', themeKey);
  } catch (err) {
    // Graceful fallback for sandboxed storage environments
  }

  // Dispatch custom event for HTML5 Canvas and Web Audio visualizers
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('themechange', {
        detail: { theme: themeKey },
      })
    );
  }
};

/**
 * Visual Color Swatch Component with Duotone Gradient Pill & Glowing Aura
 */
export function ColorSwatch({ colors, size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={`relative rounded-full flex-shrink-0 overflow-hidden shadow-inner ${sizeClasses[size] || sizeClasses.md} ${className}`}
      style={{
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        boxShadow: `0 0 10px ${colors.primary}55`,
      }}
    >
      <div
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), transparent 70%)',
        }}
      />
    </div>
  );
}

/**
 * Glassmorphic Tooltip showing theme details and color swatches
 */
function ThemeTooltip({ preset, isVisible }) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap"
      >
        <div className="px-3 py-2 rounded-xl bg-theme-surface/95 backdrop-blur-xl border border-theme-glow/40 shadow-glow text-left text-xs text-theme-main font-sans">
          <div className="flex items-center gap-2 mb-1">
            <ColorSwatch colors={preset.colors} size="sm" />
            <span className="font-semibold text-theme-primary">{preset.name}</span>
          </div>
          <p className="text-[10px] text-theme-sub max-w-[190px] leading-tight">
            {preset.tagline}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-theme-glow/20">
            <span className="text-[9px] text-theme-sub uppercase tracking-wider font-mono">Palette:</span>
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/30"
              style={{ backgroundColor: preset.colors.primary }}
              title="Primary Accent"
            />
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/30"
              style={{ backgroundColor: preset.colors.secondary }}
              title="Secondary Accent"
            />
            <span
              className="w-2.5 h-2.5 rounded-full border border-black/30"
              style={{ backgroundColor: preset.colors.base }}
              title="Base Background"
            />
          </div>
        </div>
        {/* Tooltip caret */}
        <div className="w-2 h-2 bg-theme-surface border-r border-b border-theme-glow/40 rotate-45 mx-auto -mt-1" />
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Main ThemeSwitcher Component
 *
 * @param {Object} props
 * @param {'pills' | 'dropdown' | 'grid'} props.variant Display style
 * @param {boolean} props.showLabels Whether to show preset text labels in pills
 * @param {boolean} props.compact Whether to render in ultra-compact format
 * @param {string} props.className Additional container CSS classes
 * @param {Function} props.onThemeChange Optional callback invoked when theme changes
 */
export default function ThemeSwitcher({
  variant = 'pills',
  showLabels = true,
  compact = false,
  className = '',
  onThemeChange,
}) {
  // Read current theme and mutator from Zustand store
  const activeThemeId = useProfileStore(
    (state) => state.settings?.themePreset || 'cyber-neon'
  );
  const setThemePreset = useProfileStore((state) => state.setThemePreset);

  const [hoveredPreset, setHoveredPreset] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef(null);

  // Synchronize DOM data-theme with current store state on mount and update
  useEffect(() => {
    if (activeThemeId) {
      applyThemeToDOM(activeThemeId);
    }
  }, [activeThemeId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }
  }, [dropdownOpen]);

  // Core theme selection handler
  const handleSelectTheme = useCallback(
    (presetId) => {
      applyThemeToDOM(presetId);
      if (typeof setThemePreset === 'function') {
        setThemePreset(presetId);
      }
      if (typeof onThemeChange === 'function') {
        onThemeChange(presetId);
      }
      setDropdownOpen(false);
    },
    [setThemePreset, onThemeChange]
  );

  // Keyboard navigation for accessible radiogroup
  const handleKeyDown = (e, currentIndex) => {
    let nextIndex = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % THEME_PRESETS_CONFIG.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + THEME_PRESETS_CONFIG.length) % THEME_PRESETS_CONFIG.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = THEME_PRESETS_CONFIG.length - 1;
    }

    if (nextIndex !== null) {
      const nextPreset = THEME_PRESETS_CONFIG[nextIndex];
      handleSelectTheme(nextPreset.id);
      const buttons = containerRef.current?.querySelectorAll('button[role="radio"]');
      buttons?.[nextIndex]?.focus();
    }
  };

  const currentPreset =
    THEME_PRESETS_CONFIG.find((p) => p.id === activeThemeId) ||
    THEME_PRESETS_CONFIG[0];

  // ---------------------------------------------------------------------------
  // Variant A: Dropdown Popover
  // ---------------------------------------------------------------------------
  if (variant === 'dropdown') {
    return (
      <div ref={containerRef} className={`relative inline-block ${className}`}>
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-theme-surface/80 hover:bg-theme-surface-hover/90 backdrop-blur-md border border-theme-glow/40 hover:border-theme-primary text-theme-main text-xs font-mono shadow-glass transition-all"
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
          aria-label={`Theme picker: currently ${currentPreset.name}`}
        >
          <ColorSwatch colors={currentPreset.colors} size="sm" />
          <span className="font-sans font-medium">{currentPreset.name}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-theme-sub transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.16 }}
              role="listbox"
              className="absolute right-0 mt-2 w-56 p-1.5 rounded-2xl bg-theme-surface/95 backdrop-blur-2xl border border-theme-glow/50 shadow-glow z-50 overflow-hidden font-sans"
            >
              <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-theme-sub border-b border-theme-glow/20 mb-1">
                Select Aesthetic Theme
              </div>
              {THEME_PRESETS_CONFIG.map((preset) => {
                const isSelected = preset.id === activeThemeId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectTheme(preset.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-theme-primary/15 text-theme-primary font-semibold'
                        : 'text-theme-main hover:bg-theme-surface-hover/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ColorSwatch colors={preset.colors} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5 leading-tight">
                          <span>{preset.name}</span>
                        </div>
                        <p className="text-[10px] text-theme-sub">{preset.tagline}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-theme-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Variant B: Expanded Grid (Tailored for Customizer Drawer LayoutThemeTab)
  // ---------------------------------------------------------------------------
  if (variant === 'grid') {
    return (
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label="Theme Preset Selection"
        className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}
      >
        {THEME_PRESETS_CONFIG.map((preset, index) => {
          const isSelected = preset.id === activeThemeId;

          return (
            <motion.button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleSelectTheme(preset.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-3.5 rounded-2xl text-left border transition-all overflow-hidden ${
                isSelected
                  ? 'bg-theme-surface/90 border-theme-primary shadow-glow'
                  : 'bg-theme-surface/50 border-theme-glow/30 hover:border-theme-glow hover:bg-theme-surface/70'
              }`}
            >
              {/* Active Indicator Backdrop Aura */}
              {isSelected && (
                <motion.div
                  layoutId="activeThemeGridBackdrop"
                  className="absolute inset-0 bg-theme-primary/10 -z-10 pointer-events-none"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}

              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <ColorSwatch colors={preset.colors} size="md" />
                  <div>
                    <h4 className="font-semibold text-xs text-theme-main">{preset.name}</h4>
                    <span className="text-[10px] text-theme-sub font-mono">{preset.tagline}</span>
                  </div>
                </div>
                {isSelected ? (
                  <div className="w-5 h-5 rounded-full bg-theme-primary/20 border border-theme-primary flex items-center justify-center text-theme-primary">
                    <Check className="w-3 h-3" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border border-theme-glow/40" />
                )}
              </div>

              <p className="text-[11px] text-theme-sub leading-snug mb-2.5">
                {preset.description}
              </p>

              {/* Theme Mini Palette Visualizer */}
              <div className="flex items-center gap-1.5 pt-2 border-t border-theme-glow/20">
                <div
                  className="h-2 flex-1 rounded-full border border-black/20"
                  style={{ backgroundColor: preset.colors.primary }}
                  title="Primary Accent"
                />
                <div
                  className="h-2 flex-1 rounded-full border border-black/20"
                  style={{ backgroundColor: preset.colors.secondary }}
                  title="Secondary Accent"
                />
                <div
                  className="h-2 flex-1 rounded-full border border-black/20"
                  style={{ backgroundColor: preset.colors.base }}
                  title="Base Background"
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Variant C: Floating Swatch Pills (Default Visitor Header / Toolbar)
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Theme Preset Selection"
      className={`inline-flex items-center gap-1 p-1 rounded-2xl bg-theme-surface/75 backdrop-blur-xl border border-theme-glow/40 shadow-glass transition-all ${className}`}
    >
      {/* Decorative Palette Icon Header on Desktop */}
      {!compact && (
        <div
          className="hidden sm:flex items-center px-2 text-theme-sub text-xs gap-1.5"
          title="Theme Presets"
        >
          <Palette className="w-3.5 h-3.5 text-theme-primary animate-pulse-slow" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-theme-sub/80">
            Theme
          </span>
        </div>
      )}

      {THEME_PRESETS_CONFIG.map((preset, index) => {
        const isSelected = preset.id === activeThemeId;

        return (
          <div
            key={preset.id}
            className="relative"
            onMouseEnter={() => setHoveredPreset(preset.id)}
            onMouseLeave={() => setHoveredPreset(null)}
          >
            <motion.button
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${preset.name} theme: ${preset.tagline}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => handleSelectTheme(preset.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onFocus={() => setHoveredPreset(preset.id)}
              onBlur={() => setHoveredPreset(null)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors z-10 ${
                isSelected
                  ? 'text-theme-primary font-semibold'
                  : 'text-theme-sub hover:text-theme-main'
              }`}
            >
              {/* Framer Motion Active Indicator Slider Pill */}
              {isSelected && (
                <motion.div
                  layoutId="activeThemePillHighlight"
                  className="absolute inset-0 rounded-xl bg-theme-primary/15 border border-theme-primary/50 shadow-glow -z-10"
                  transition={{
                    type: 'spring',
                    stiffness: 420,
                    damping: 32,
                  }}
                />
              )}

              {/* Duotone Swatch Dot */}
              <ColorSwatch colors={preset.colors} size={compact ? 'sm' : 'md'} />

              {/* Label (Hidden in compact mode or responsive breakpoints) */}
              {showLabels && !compact && (
                <span className="hidden md:inline whitespace-nowrap text-xs">
                  {preset.name}
                </span>
              )}

              {/* Active Checkmark Pill (mobile / visual reinforcement) */}
              {isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-theme-primary shadow-glow flex-shrink-0" />
              )}
            </motion.button>

            {/* Hover Tooltip Popover */}
            <ThemeTooltip preset={preset} isVisible={hoveredPreset === preset.id} />
          </div>
        );
      })}
    </div>
  );
}
