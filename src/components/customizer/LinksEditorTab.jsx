/**
 * src/components/customizer/LinksEditorTab.jsx
 * Links Management WYSIWYG Editor Tab (Milestone M5 - Feature 21)
 *
 * Requirements:
 * - Full CRUD operations for links:
 *   - Add new link
 *   - Edit title, url, category, icon, highlightColor for ALL existing links
 *   - Delete link
 *   - Toggle active state (visibility)
 *   - Reorder links (Move Up / Down)
 *   - Curated Lucide icon picker dropdown with search & dynamic previews
 */

import React, { useState } from 'react';
import { useProfileStore } from '../../store/useProfileStore.js';
import * as Icons from 'lucide-react';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  ArrowUp,
  ArrowDown,
  Palette,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Tag,
  Github,
  Twitter,
  Linkedin,
  Youtube,
  Instagram,
  Twitch,
  Code,
  Terminal,
  Cpu,
  Layers,
  Zap,
  Sparkles,
  Music,
  Film,
  Gamepad2,
  BookOpen,
  Coffee,
  Heart,
  Star,
  Mail,
  Send,
  Share2,
  Briefcase,
  Compass,
} from 'lucide-react';

// Popular curated Lucide icons list with matching icon components
const POPULAR_ICONS = [
  { name: 'Globe', icon: Globe },
  { name: 'Github', icon: Github },
  { name: 'Twitter', icon: Twitter },
  { name: 'Linkedin', icon: Linkedin },
  { name: 'Youtube', icon: Youtube },
  { name: 'Instagram', icon: Instagram },
  { name: 'Twitch', icon: Twitch },
  { name: 'Mail', icon: Mail },
  { name: 'Send', icon: Send },
  { name: 'Share2', icon: Share2 },
  { name: 'Code', icon: Code },
  { name: 'Terminal', icon: Terminal },
  { name: 'Cpu', icon: Cpu },
  { name: 'Layers', icon: Layers },
  { name: 'Zap', icon: Zap },
  { name: 'Sparkles', icon: Sparkles },
  { name: 'Palette', icon: Palette },
  { name: 'Music', icon: Music },
  { name: 'Film', icon: Film },
  { name: 'Gamepad2', icon: Gamepad2 },
  { name: 'BookOpen', icon: BookOpen },
  { name: 'Coffee', icon: Coffee },
  { name: 'Heart', icon: Heart },
  { name: 'Star', icon: Star },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Compass', icon: Compass },
  { name: 'ExternalLink', icon: ExternalLink },
];

// Preset highlight colors for quick glow styling
const PRESET_HIGHLIGHT_COLORS = [
  { label: 'Cyan', color: '#00f2fe' },
  { label: 'Sky', color: '#38bdf8' },
  { label: 'Magenta', color: '#ff007f' },
  { label: 'Violet', color: '#a855f7' },
  { label: 'Indigo', color: '#818cf8' },
  { label: 'Rose', color: '#f43f5e' },
  { label: 'Emerald', color: '#10b981' },
  { label: 'Amber', color: '#f59e0b' },
  { label: 'None', color: '' },
];

// Helper to dynamically render a Lucide icon safely
function DynamicIcon({ name, className = 'w-4 h-4' }) {
  if (!name) return <Globe className={className} />;
  const Comp = Icons[name] || Globe;
  return <Comp className={className} />;
}

export default function LinksEditorTab() {
  const { links, addLink, updateLink, removeLink, toggleLinkActive, reorderLinks } =
    useProfileStore();

  // Add Link State
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('social');
  const [newIcon, setNewIcon] = useState('Globe');
  const [newHighlightColor, setNewHighlightColor] = useState('#00f2fe');

  // Expanded link card state for detailed editing
  const [expandedLinkId, setExpandedLinkId] = useState(null);

  const handleAdd = (e) => {
    e?.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    addLink({
      title: newTitle.trim(),
      url: newUrl.trim(),
      category: newCategory,
      icon: newIcon,
      highlightColor: newHighlightColor || undefined,
      isActive: true,
    });

    setNewTitle('');
    setNewUrl('');
    setNewHighlightColor('#00f2fe');
  };

  const moveUp = (index) => {
    if (index <= 0) return;
    const reordered = [...links];
    const temp = reordered[index - 1];
    reordered[index - 1] = reordered[index];
    reordered[index] = temp;
    reorderLinks(reordered);
  };

  const moveDown = (index) => {
    if (index >= links.length - 1) return;
    const reordered = [...links];
    const temp = reordered[index + 1];
    reordered[index + 1] = reordered[index];
    reordered[index] = temp;
    reorderLinks(reordered);
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* 1. Add New Link Form Card */}
      <form
        onSubmit={handleAdd}
        className="p-4 rounded-2xl bg-black/50 border border-theme-glow/30 space-y-3.5 shadow-lg"
      >
        <div className="flex items-center gap-2 text-theme-primary font-bold">
          <Plus className="w-4 h-4" />
          <span>Add New Portal / Link</span>
        </div>

        <div className="space-y-1">
          <label className="text-theme-sub">Link Title:</label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. GitHub Repositories"
            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-theme-sub">Destination URL:</label>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Category */}
          <div className="space-y-1">
            <label className="text-theme-sub">Category:</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary"
            >
              <option value="social">Social</option>
              <option value="project">Project</option>
              <option value="work">Work</option>
              <option value="creative">Creative</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Icon Selector */}
          <div className="space-y-1">
            <label className="text-theme-sub flex items-center gap-1">
              <span>Icon:</span>
              <DynamicIcon name={newIcon} className="w-3 h-3 text-theme-primary" />
            </label>
            <select
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary"
            >
              {POPULAR_ICONS.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Highlight Color Swatches */}
        <div className="space-y-1.5">
          <label className="text-theme-sub flex items-center justify-between">
            <span>Highlight Aura Glow:</span>
            {newHighlightColor && (
              <span className="text-[10px] text-theme-primary font-mono">{newHighlightColor}</span>
            )}
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_HIGHLIGHT_COLORS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setNewHighlightColor(preset.color)}
                className={`w-6 h-6 rounded-lg border transition-all ${
                  newHighlightColor === preset.color
                    ? 'border-white scale-110 shadow-glow'
                    : 'border-white/20 hover:scale-105'
                }`}
                style={{
                  background: preset.color || '#333',
                  boxShadow: preset.color ? `0 0 8px ${preset.color}66` : 'none',
                }}
                title={preset.label}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-theme-primary/20 hover:bg-theme-primary/30 text-theme-primary border border-theme-primary/40 font-bold transition-all shadow-glow active:scale-[0.98]"
        >
          Add Link to Profile
        </button>
      </form>

      {/* 2. Existing Links List */}
      <div className="space-y-3">
        <h3 className="font-bold text-theme-main flex items-center justify-between">
          <span>Active Links ({links.length}):</span>
          <span className="text-[10px] text-theme-sub font-normal">Use ↑ ↓ to reorder</span>
        </h3>

        {links.length === 0 && (
          <div className="p-4 rounded-xl border border-dashed border-theme-glow/30 text-center text-theme-sub">
            No links added yet. Use the form above to add your first link.
          </div>
        )}

        {links.map((link, index) => {
          const isExpanded = expandedLinkId === link.id;

          return (
            <div
              key={link.id}
              className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                link.isActive === false
                  ? 'bg-black/20 border-gray-800 opacity-60'
                  : 'bg-black/40 border-theme-glow/30 hover:border-theme-glow/60'
              }`}
            >
              {/* Summary Header Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Reorder Arrows */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveUp(index)}
                      className="p-0.5 rounded text-theme-sub hover:text-white disabled:opacity-20"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === links.length - 1}
                      onClick={() => moveDown(index)}
                      className="p-0.5 rounded text-theme-sub hover:text-white disabled:opacity-20"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Icon Indicator */}
                  <span
                    className="p-1.5 rounded-lg bg-black/60 border border-theme-glow/20 shrink-0"
                    style={{
                      color: link.highlightColor || 'inherit',
                      boxShadow: link.highlightColor ? `0 0 8px ${link.highlightColor}44` : 'none',
                    }}
                  >
                    <DynamicIcon name={link.icon} className="w-3.5 h-3.5" />
                  </span>

                  {/* Title Input */}
                  <input
                    type="text"
                    value={link.title || ''}
                    onChange={(e) => updateLink(link.id, { title: e.target.value })}
                    className="font-bold bg-transparent text-white focus:outline-none focus:border-b border-theme-primary truncate"
                    placeholder="Link Title"
                  />
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setExpandedLinkId(isExpanded ? null : link.id)}
                    className="p-1.5 rounded-lg text-theme-sub hover:text-white hover:bg-white/10"
                    title={isExpanded ? 'Collapse settings' : 'Expand full settings'}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleLinkActive(link.id)}
                    title={link.isActive ? 'Hide link' : 'Show link'}
                    className="p-1.5 rounded-lg text-theme-sub hover:text-theme-primary hover:bg-white/10"
                  >
                    {link.isActive ? (
                      <Eye className="w-3.5 h-3.5 text-theme-primary" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeLink(link.id)}
                    title="Delete link"
                    className="p-1.5 rounded-lg text-theme-sub hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* URL Input */}
              <input
                type="url"
                value={link.url || ''}
                onChange={(e) => updateLink(link.id, { url: e.target.value })}
                className="w-full text-[11px] text-theme-sub bg-transparent focus:outline-none focus:border-b border-theme-primary px-1"
                placeholder="https://..."
              />

              {/* Expandable Advanced Options */}
              {isExpanded && (
                <div className="pt-2 mt-2 border-t border-theme-glow/15 space-y-2.5 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Category Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-theme-sub">Category:</label>
                      <select
                        value={link.category || 'social'}
                        onChange={(e) => updateLink(link.id, { category: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary text-[11px]"
                      >
                        <option value="social">Social</option>
                        <option value="project">Project</option>
                        <option value="work">Work</option>
                        <option value="creative">Creative</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    {/* Icon Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-theme-sub">Icon:</label>
                      <select
                        value={link.icon || 'Globe'}
                        onChange={(e) => updateLink(link.id, { icon: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-black/60 border border-theme-glow/30 text-white focus:outline-none focus:border-theme-primary text-[11px]"
                      >
                        {POPULAR_ICONS.map((item) => (
                          <option key={item.name} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Highlight Color Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-theme-sub">Highlight Aura Color:</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_HIGHLIGHT_COLORS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => updateLink(link.id, { highlightColor: preset.color || undefined })}
                          className={`w-5 h-5 rounded-md border transition-all ${
                            link.highlightColor === preset.color || (!link.highlightColor && preset.color === '')
                              ? 'border-white scale-110 shadow-glow'
                              : 'border-white/20'
                          }`}
                          style={{
                            background: preset.color || '#333',
                            boxShadow: preset.color ? `0 0 6px ${preset.color}66` : 'none',
                          }}
                          title={preset.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
