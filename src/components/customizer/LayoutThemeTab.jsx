/**
 * src/components/customizer/LayoutThemeTab.jsx
 * Theme & Structural Layout WYSIWYG Editor Tab (Milestone M5 - Feature 21)
 *
 * Requirements:
 * - 5 theme presets selection with live preview swatches
 *   ('cyber-neon', 'midnight-glow', 'lofi-aesthetic', 'clean-minimalist', 'retro-vaporwave')
 * - layoutStyle selection ('bento' | 'stack' | 'cards') with visual wireframes
 * - cardStyle selection ('glassmorphism' | 'neon-border' | 'minimal-flat') with live style indicators
 * - particleDensity selection ('off' | 'low' | 'medium' | 'high')
 */

import React from 'react';
import { useProfileStore } from '../../store/useProfileStore.js';
import {
  THEME_PRESETS,
  LAYOUT_STYLES,
  CARD_STYLES,
  PARTICLE_DENSITIES,
} from '../../data/defaultData.js';
import {
  Palette,
  Layout,
  Layers,
  Sparkles,
  Check,
  Grid3X3,
  List,
  Columns,
} from 'lucide-react';

// Palette metadata for the 5 live theme swatches
const THEME_PALETTES = {
  'cyber-neon': {
    primary: '#00f0ff',
    secondary: '#ff007f',
    base: '#090a0f',
    glow: 'rgba(0, 240, 255, 0.4)',
    accentLabel: 'Cyan & Magenta Glow',
  },
  'midnight-glow': {
    primary: '#a855f7',
    secondary: '#6366f1',
    base: '#0b0f19',
    glow: 'rgba(168, 85, 247, 0.4)',
    accentLabel: 'Nebula Violet & Indigo',
  },
  'lofi-aesthetic': {
    primary: '#e09f67',
    secondary: '#88a892',
    base: '#1a1816',
    glow: 'rgba(224, 159, 103, 0.35)',
    accentLabel: 'Twilight Peach & Sage',
  },
  'clean-minimalist': {
    primary: '#38bdf8',
    secondary: '#94a3b8',
    base: '#09090b',
    glow: 'rgba(255, 255, 255, 0.2)',
    accentLabel: 'Monochrome Slate & Sky',
  },
  'retro-vaporwave': {
    primary: '#ff71ce',
    secondary: '#01cdfe',
    base: '#160529',
    glow: 'rgba(255, 113, 206, 0.45)',
    accentLabel: 'Synthwave Pink & Pastel Teal',
  },
};

export default function LayoutThemeTab() {
  const { settings, setThemePreset, updateSettings } = useProfileStore();

  const currentTheme = settings?.themePreset || 'cyber-neon';
  const currentLayout = settings?.layoutStyle || 'bento';
  const currentCard = settings?.cardStyle || 'glassmorphism';
  const currentDensity = settings?.particleDensity || 'medium';

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* 1. Theme Presets with Live Preview Swatches */}
      <div className="space-y-3">
        <label className="text-theme-sub flex items-center justify-between font-bold">
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-theme-primary" />
            <span>Theme Presets (5 Presets Available):</span>
          </span>
          <span className="text-[10px] text-theme-primary uppercase">{currentTheme}</span>
        </label>

        <div className="grid grid-cols-1 gap-2.5">
          {THEME_PRESETS.map((preset) => {
            const palette = THEME_PALETTES[preset.id] || THEME_PALETTES['cyber-neon'];
            const isActive = currentTheme === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setThemePreset(preset.id)}
                className={`p-3 rounded-2xl text-left border transition-all relative overflow-hidden ${
                  isActive
                    ? 'border-theme-primary shadow-glow bg-theme-primary/10'
                    : 'bg-black/40 border-theme-glow/20 hover:border-theme-glow/50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Live Preview Swatch Pill */}
                    <div
                      className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center relative overflow-hidden border border-white/20 shadow-md"
                      style={{
                        background: palette.base,
                        boxShadow: `0 0 12px ${palette.glow}`,
                      }}
                    >
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{
                          background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 100%)`,
                        }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{preset.name}</span>
                        {isActive && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-theme-primary text-black font-bold uppercase tracking-wider">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-theme-sub truncate mt-0.5">
                        {palette.accentLabel}
                      </p>
                    </div>
                  </div>

                  {/* Color Swatch Dots */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className="w-3 h-3 rounded-full border border-white/30"
                      style={{ background: palette.primary }}
                      title="Primary Accent"
                    />
                    <span
                      className="w-3 h-3 rounded-full border border-white/30"
                      style={{ background: palette.secondary }}
                      title="Secondary Accent"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-theme-sub/80 mt-2 line-clamp-1">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Layout Structure Architecture */}
      <div className="space-y-2.5">
        <label className="text-theme-sub flex items-center justify-between font-bold">
          <span className="flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5 text-theme-primary" />
            <span>Layout Architecture:</span>
          </span>
          <span className="text-[10px] text-theme-primary uppercase">{currentLayout}</span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          {LAYOUT_STYLES.map((layout) => {
            const isActive = currentLayout === layout.id;

            return (
              <button
                key={layout.id}
                type="button"
                onClick={() => updateSettings({ layoutStyle: layout.id })}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all ${
                  isActive
                    ? 'bg-theme-primary/20 border-theme-primary text-theme-primary font-bold shadow-glow'
                    : 'bg-black/30 border-theme-glow/20 text-theme-sub hover:border-theme-glow/50 hover:text-white'
                }`}
              >
                {layout.id === 'bento' ? (
                  <Grid3X3 className="w-5 h-5 mb-0.5" />
                ) : layout.id === 'stack' ? (
                  <List className="w-5 h-5 mb-0.5" />
                ) : (
                  <Columns className="w-5 h-5 mb-0.5" />
                )}
                <span className="text-xs">{layout.name}</span>
                <span className="text-[9px] opacity-70">
                  {layout.id === 'bento' ? 'Modular Grid' : layout.id === 'stack' ? 'Single Column' : 'Balanced Cards'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Card Visual Style */}
      <div className="space-y-2.5">
        <label className="text-theme-sub flex items-center justify-between font-bold">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-theme-primary" />
            <span>Card Visual Style:</span>
          </span>
          <span className="text-[10px] text-theme-primary uppercase">{currentCard}</span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          {CARD_STYLES.map((card) => {
            const isActive = currentCard === card.id;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => updateSettings({ cardStyle: card.id })}
                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                  isActive
                    ? 'bg-theme-primary/20 border-theme-primary text-theme-primary font-bold shadow-glow'
                    : 'bg-black/30 border-theme-glow/20 text-theme-sub hover:border-theme-glow/50 hover:text-white'
                }`}
              >
                <div
                  className={`w-7 h-4 rounded mb-0.5 border ${
                    card.id === 'glassmorphism'
                      ? 'bg-white/10 backdrop-blur-sm border-white/30'
                      : card.id === 'neon-border'
                      ? 'bg-black border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.6)]'
                      : 'bg-zinc-800 border-zinc-700'
                  }`}
                />
                <span className="text-[11px]">{card.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Canvas Particle Density */}
      <div className="space-y-2.5">
        <label className="text-theme-sub flex items-center justify-between font-bold">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
            <span>Canvas Particle Density:</span>
          </span>
          <span className="text-[10px] text-theme-primary uppercase">{currentDensity}</span>
        </label>

        <div className="grid grid-cols-4 gap-1.5">
          {PARTICLE_DENSITIES.map((density) => {
            const isActive = currentDensity === density.id;

            return (
              <button
                key={density.id}
                type="button"
                onClick={() => updateSettings({ particleDensity: density.id })}
                className={`py-2 px-1 rounded-xl border text-center text-[11px] transition-all capitalize ${
                  isActive
                    ? 'bg-theme-primary/20 border-theme-primary text-theme-primary font-bold shadow-glow'
                    : 'bg-black/30 border-theme-glow/20 text-theme-sub hover:border-theme-glow/50 hover:text-white'
                }`}
              >
                {density.id}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
