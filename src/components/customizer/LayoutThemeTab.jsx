/**
 * src/components/customizer/LayoutThemeTab.jsx
 * Theme & Structural Layout WYSIWYG Editor Tab (Milestone M5 - Feature 21)
 *
 * Requirements:
 * - 5 theme presets selection with live preview swatches
 *   ('cyber-neon', 'midnight-glow', 'lofi-aesthetic', 'clean-minimalist', 'retro-vaporwave')
 * - Full Custom Theme Color Picker with real-time CSS variable synchronization
 *   (Primary Accent, Secondary Accent, Background Base, Surface Cards, Glow, Text Main, Text Sub)
 * - 1-Click Quick Starter Palettes
 * - Live Mini-Card Preview
 * - layoutStyle selection ('bento' | 'stack' | 'cards') with visual wireframes
 * - cardStyle selection ('glassmorphism' | 'neon-border' | 'minimal-flat') with live style indicators
 * - particleDensity selection ('off' | 'low' | 'medium' | 'high')
 */

import React, { useState } from 'react';
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
  Sliders,
  RotateCcw,
  Eye,
  Wand2,
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

// Curated Quick Custom Starters for instant 1-click aesthetic combinations
const QUICK_CUSTOM_STARTERS = [
  {
    name: 'Cyber Neon',
    primary: '#00f0ff',
    secondary: '#ff007f',
    base: '#090a0f',
    surface: '#10141f',
    glow: '#00f0ff',
    textMain: '#f1f5f9',
    textSub: '#94a3b8',
  },
  {
    name: 'Midnight Glow',
    primary: '#a855f7',
    secondary: '#6366f1',
    base: '#0b0f19',
    surface: '#111827',
    glow: '#a855f7',
    textMain: '#f8fafc',
    textSub: '#94a3b8',
  },
  {
    name: 'Matrix Mint',
    primary: '#10b981',
    secondary: '#06b6d4',
    base: '#05130b',
    surface: '#0d2217',
    glow: '#10b981',
    textMain: '#ecfdf5',
    textSub: '#6ee7b7',
  },
  {
    name: 'Crimson Blood',
    primary: '#ef4444',
    secondary: '#f97316',
    base: '#140606',
    surface: '#220e0e',
    glow: '#ef4444',
    textMain: '#fef2f2',
    textSub: '#fca5a5',
  },
  {
    name: 'Amber Sunset',
    primary: '#f59e0b',
    secondary: '#ec4899',
    base: '#170e03',
    surface: '#26190a',
    glow: '#f59e0b',
    textMain: '#fffbeb',
    textSub: '#fcd34d',
  },
  {
    name: 'Deep Ocean',
    primary: '#38bdf8',
    secondary: '#3b82f6',
    base: '#040d1a',
    surface: '#0b1e38',
    glow: '#38bdf8',
    textMain: '#f0f9ff',
    textSub: '#7dd3fc',
  },
  {
    name: 'Sakura Pastel',
    primary: '#f472b6',
    secondary: '#c084fc',
    base: '#190a16',
    surface: '#291225',
    glow: '#f472b6',
    textMain: '#fdf2f8',
    textSub: '#f9a8d4',
  },
  {
    name: 'Obsidian Slate',
    primary: '#38bdf8',
    secondary: '#e2e8f0',
    base: '#09090b',
    surface: '#18181b',
    glow: '#ffffff',
    textMain: '#ffffff',
    textSub: '#a1a1aa',
  },
];

const DEFAULT_CUSTOM_COLORS = {
  primary: '#00f0ff',
  secondary: '#ff007f',
  base: '#090a0f',
  surface: '#10141f',
  surfaceHover: '#181e2e',
  glow: '#00f0ff',
  textMain: '#f1f5f9',
  textSub: '#94a3b8',
};

export default function LayoutThemeTab() {
  const { settings, setThemePreset, updateSettings, updateCustomColors } = useProfileStore();

  const currentTheme = settings?.themePreset || 'cyber-neon';
  const currentLayout = settings?.layoutStyle || 'bento';
  const currentCard = settings?.cardStyle || 'glassmorphism';
  const currentDensity = settings?.particleDensity || 'medium';
  const customColors = { ...DEFAULT_CUSTOM_COLORS, ...(settings?.customColors || {}) };

  const isCustomActive = currentTheme === 'custom';
  const [themeMode, setThemeMode] = useState(isCustomActive ? 'custom' : 'preset');

  const handleColorChange = (key, value) => {
    updateCustomColors({ [key]: value });
  };

  const handleApplyStarter = (starter) => {
    updateCustomColors(starter);
  };

  const handleResetCustom = () => {
    updateCustomColors(DEFAULT_CUSTOM_COLORS);
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* 1. Theme Configuration Mode Switcher */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-theme-sub flex items-center gap-1.5 font-bold">
            <Palette className="w-3.5 h-3.5 text-theme-primary" />
            <span>Theme & Colors:</span>
          </label>
          <span className="text-[10px] text-theme-primary uppercase">
            {isCustomActive ? 'CUSTOM PALETTE' : currentTheme}
          </span>
        </div>

        {/* Mode Switcher: 5 Presets vs Custom Palette */}
        <div className="flex rounded-xl bg-black/40 p-1 border border-theme-glow/20">
          <button
            type="button"
            onClick={() => {
              setThemeMode('preset');
              if (currentTheme === 'custom') {
                setThemePreset('cyber-neon');
              }
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              themeMode === 'preset'
                ? 'bg-theme-primary/20 text-theme-primary font-bold shadow-sm'
                : 'text-theme-sub hover:text-white'
            }`}
          >
            5 Theme Presets
          </button>
          <button
            type="button"
            onClick={() => {
              setThemeMode('custom');
              updateCustomColors(customColors);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              themeMode === 'custom'
                ? 'bg-theme-primary/20 text-theme-primary font-bold shadow-sm'
                : 'text-theme-sub hover:text-white'
            }`}
          >
            🎨 Custom Palette (เลือกสีเอง)
          </button>
        </div>

        {/* VIEW A: 5 Theme Presets */}
        {themeMode === 'preset' && (
          <div className="space-y-2.5">
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

            <button
              type="button"
              onClick={() => {
                setThemeMode('custom');
                updateCustomColors(customColors);
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-theme-surface border border-theme-glow/30 hover:border-theme-primary text-theme-primary hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-bold"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>ต้องการเลือกสีเอง? คลิกเปิดโหมด Custom Palette</span>
            </button>
          </div>
        )}

        {/* VIEW B: Custom Color Palette (Free Selection) */}
        {themeMode === 'custom' && (
          <div className="space-y-4 p-3.5 rounded-2xl bg-black/40 border border-theme-glow/30">
            {/* Live Mini Preview Card */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-theme-sub">
                <span className="flex items-center gap-1 font-bold text-[11px]">
                  <Eye className="w-3 h-3 text-theme-primary" />
                  <span>Real-time Aesthetic Preview:</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetCustom}
                  className="flex items-center gap-1 text-[10px] text-theme-sub hover:text-white transition-colors"
                  title="Reset to default custom colors"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset</span>
                </button>
              </div>

              <div
                className="p-3.5 rounded-xl border relative overflow-hidden transition-all shadow-md"
                style={{
                  background: customColors.base,
                  borderColor: customColors.glow || customColors.primary,
                  boxShadow: `0 0 16px ${customColors.glow || customColors.primary}33`,
                }}
              >
                <div
                  className="p-3 rounded-lg border backdrop-blur-sm space-y-2"
                  style={{
                    background: customColors.surface,
                    borderColor: `${customColors.primary}44`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="font-bold text-xs"
                      style={{ color: customColors.textMain }}
                    >
                      Creative Profile Hub
                    </span>
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                      style={{
                        background: customColors.primary,
                        color: customColors.base,
                      }}
                    >
                      LIVE PREVIEW
                    </span>
                  </div>

                  <p
                    className="text-[10px] leading-relaxed"
                    style={{ color: customColors.textSub }}
                  >
                    เฉดสีทั้งหมดจะแสดงผลบนหน้าเว็บแบบเรียลไทม์ทันทีที่คุณปรับ
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <div
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold text-black"
                      style={{
                        background: `linear-gradient(135deg, ${customColors.primary} 0%, ${customColors.secondary} 100%)`,
                      }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-md text-[10px] border"
                      style={{
                        borderColor: customColors.primary,
                        color: customColors.primary,
                      }}
                    >
                      Border Accent
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Starter Palettes */}
            <div className="space-y-1.5">
              <label className="text-theme-sub flex items-center gap-1 font-bold text-[11px]">
                <Wand2 className="w-3 h-3 text-theme-primary" />
                <span>Quick Starter Palettes (โทนสียอดนิยม):</span>
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_CUSTOM_STARTERS.map((starter) => (
                  <button
                    key={starter.name}
                    type="button"
                    onClick={() => handleApplyStarter(starter)}
                    className="p-2 rounded-xl bg-theme-surface/70 border border-theme-glow/20 hover:border-theme-primary/60 flex items-center justify-between text-left transition-all"
                  >
                    <span className="text-[11px] font-bold text-white truncate">
                      {starter.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/20"
                        style={{ background: starter.primary }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/20"
                        style={{ background: starter.secondary }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Color Pickers */}
            <div className="space-y-2 pt-2 border-t border-theme-glow/10">
              <label className="text-theme-sub block font-bold text-[11px]">
                Adjust Individual Colors (ปรับแต่งสีละเอียดยิบ):
              </label>

              <div className="space-y-2">
                {/* 1. Primary Accent */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-theme-glow/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="relative cursor-pointer shrink-0">
                      <div
                        className="w-7 h-7 rounded-lg border border-white/30 shadow-md transition-transform hover:scale-105"
                        style={{ background: customColors.primary }}
                      />
                      <input
                        type="color"
                        value={customColors.primary.startsWith('#') && customColors.primary.length === 7 ? customColors.primary : '#00f0ff'}
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-[11px]">Primary Accent</div>
                      <div className="text-[9px] text-theme-sub truncate">สีหลัก / ปุ่ม / คลื่นเสียง / แสงนีออน</div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customColors.primary}
                    onChange={(e) => handleColorChange('primary', e.target.value)}
                    className="w-20 px-2 py-1 text-center font-mono text-[10px] bg-black border border-theme-glow/30 rounded-lg text-white uppercase focus:border-theme-primary focus:outline-none"
                    placeholder="#00f0ff"
                  />
                </div>

                {/* 2. Secondary Accent */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-theme-glow/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="relative cursor-pointer shrink-0">
                      <div
                        className="w-7 h-7 rounded-lg border border-white/30 shadow-md transition-transform hover:scale-105"
                        style={{ background: customColors.secondary }}
                      />
                      <input
                        type="color"
                        value={customColors.secondary.startsWith('#') && customColors.secondary.length === 7 ? customColors.secondary : '#ff007f'}
                        onChange={(e) => handleColorChange('secondary', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-[11px]">Secondary Accent</div>
                      <div className="text-[9px] text-theme-sub truncate">สีรอง / การไล่เฉดสี Gradient</div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customColors.secondary}
                    onChange={(e) => handleColorChange('secondary', e.target.value)}
                    className="w-20 px-2 py-1 text-center font-mono text-[10px] bg-black border border-theme-glow/30 rounded-lg text-white uppercase focus:border-theme-primary focus:outline-none"
                    placeholder="#ff007f"
                  />
                </div>

                {/* 3. Background Base */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-theme-glow/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="relative cursor-pointer shrink-0">
                      <div
                        className="w-7 h-7 rounded-lg border border-white/30 shadow-md transition-transform hover:scale-105"
                        style={{ background: customColors.base }}
                      />
                      <input
                        type="color"
                        value={customColors.base.startsWith('#') && customColors.base.length === 7 ? customColors.base : '#090a0f'}
                        onChange={(e) => handleColorChange('base', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-[11px]">Background Base</div>
                      <div className="text-[9px] text-theme-sub truncate">สีพื้นหลังหลักของเว็บไซต์</div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customColors.base}
                    onChange={(e) => handleColorChange('base', e.target.value)}
                    className="w-20 px-2 py-1 text-center font-mono text-[10px] bg-black border border-theme-glow/30 rounded-lg text-white uppercase focus:border-theme-primary focus:outline-none"
                    placeholder="#090a0f"
                  />
                </div>

                {/* 4. Surface Cards */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-theme-glow/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="relative cursor-pointer shrink-0">
                      <div
                        className="w-7 h-7 rounded-lg border border-white/30 shadow-md transition-transform hover:scale-105"
                        style={{ background: customColors.surface }}
                      />
                      <input
                        type="color"
                        value={customColors.surface.startsWith('#') && customColors.surface.length === 7 ? customColors.surface : '#10141f'}
                        onChange={(e) => {
                          handleColorChange('surface', e.target.value);
                          handleColorChange('surfaceHover', e.target.value);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-[11px]">Surface Cards</div>
                      <div className="text-[9px] text-theme-sub truncate">สีพื้นหลังการ์ดและกล่องข้อมูล</div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customColors.surface}
                    onChange={(e) => {
                      handleColorChange('surface', e.target.value);
                      handleColorChange('surfaceHover', e.target.value);
                    }}
                    className="w-20 px-2 py-1 text-center font-mono text-[10px] bg-black border border-theme-glow/30 rounded-lg text-white uppercase focus:border-theme-primary focus:outline-none"
                    placeholder="#10141f"
                  />
                </div>

                {/* 5. Glow / Border */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-theme-glow/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="relative cursor-pointer shrink-0">
                      <div
                        className="w-7 h-7 rounded-lg border border-white/30 shadow-md transition-transform hover:scale-105"
                        style={{ background: customColors.glow || customColors.primary }}
                      />
                      <input
                        type="color"
                        value={(customColors.glow && customColors.glow.startsWith('#') && customColors.glow.length === 7) ? customColors.glow : customColors.primary}
                        onChange={(e) => handleColorChange('glow', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-[11px]">Border & Glow</div>
                      <div className="text-[9px] text-theme-sub truncate">แสงนีออนเรืองแสงและขอบการ์ด</div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customColors.glow || customColors.primary}
                    onChange={(e) => handleColorChange('glow', e.target.value)}
                    className="w-20 px-2 py-1 text-center font-mono text-[10px] bg-black border border-theme-glow/30 rounded-lg text-white uppercase focus:border-theme-primary focus:outline-none"
                    placeholder="#00f0ff"
                  />
                </div>

                {/* 6. Main Text */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-theme-glow/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="relative cursor-pointer shrink-0">
                      <div
                        className="w-7 h-7 rounded-lg border border-white/30 shadow-md transition-transform hover:scale-105"
                        style={{ background: customColors.textMain }}
                      />
                      <input
                        type="color"
                        value={customColors.textMain.startsWith('#') && customColors.textMain.length === 7 ? customColors.textMain : '#f1f5f9'}
                        onChange={(e) => handleColorChange('textMain', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-[11px]">Main Text</div>
                      <div className="text-[9px] text-theme-sub truncate">สีตัวหนังสือหลัก / หัวข้อ</div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customColors.textMain}
                    onChange={(e) => handleColorChange('textMain', e.target.value)}
                    className="w-20 px-2 py-1 text-center font-mono text-[10px] bg-black border border-theme-glow/30 rounded-lg text-white uppercase focus:border-theme-primary focus:outline-none"
                    placeholder="#f1f5f9"
                  />
                </div>

                {/* 7. Sub Text */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-theme-glow/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <label className="relative cursor-pointer shrink-0">
                      <div
                        className="w-7 h-7 rounded-lg border border-white/30 shadow-md transition-transform hover:scale-105"
                        style={{ background: customColors.textSub }}
                      />
                      <input
                        type="color"
                        value={customColors.textSub.startsWith('#') && customColors.textSub.length === 7 ? customColors.textSub : '#94a3b8'}
                        onChange={(e) => handleColorChange('textSub', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </label>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-[11px]">Sub Text</div>
                      <div className="text-[9px] text-theme-sub truncate">สีตัวหนังสือรอง / คำบรรยาย</div>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={customColors.textSub}
                    onChange={(e) => handleColorChange('textSub', e.target.value)}
                    className="w-20 px-2 py-1 text-center font-mono text-[10px] bg-black border border-theme-glow/30 rounded-lg text-white uppercase focus:border-theme-primary focus:outline-none"
                    placeholder="#94a3b8"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
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
