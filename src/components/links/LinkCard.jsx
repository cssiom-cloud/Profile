/**
 * src/components/links/LinkCard.jsx
 * Interactive Link Card with dynamic Lucide icon resolution,
 * multi-variant card styling, Framer Motion micro-animations,
 * XSS protocol neutralization, and external link security.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  Globe,
  ExternalLink,
  Github,
  Twitter,
  Linkedin,
  Youtube,
  Code,
  Folder,
  Terminal,
  Sparkles,
  Palette,
  Play,
  BookOpen,
  Coffee,
  MessageSquare,
  Mail,
  Send,
  Layers,
  Heart,
  Star,
  Cpu,
  Bookmark,
  FileText,
  Briefcase,
  Compass,
  Zap,
  Music,
  Share2,
  Gamepad2,
  Film,
  Instagram,
  Twitch,
  Hash,
} from 'lucide-react';

/**
 * Normalization & alias dictionary for dynamic icon resolution
 */
const ICON_REGISTRY = {
  // Developer & Social
  github: Github,
  twitter: Twitter,
  x: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  discord: MessageSquare,
  messagesquare: MessageSquare,
  instagram: Instagram,
  twitch: Twitch,
  mail: Mail,
  email: Mail,
  send: Send,
  share: Share2,
  share2: Share2,

  // Portals & Web
  globe: Globe,
  web: Globe,
  site: Globe,
  externallink: ExternalLink,
  folder: Folder,
  briefcase: Briefcase,
  compass: Compass,
  bookmark: Bookmark,
  filetext: FileText,

  // Coding & Tech
  code: Code,
  dev: Code,
  terminal: Terminal,
  cpu: Cpu,
  layers: Layers,
  zap: Zap,
  hash: Hash,

  // Creative, Media & Hobbies
  sparkles: Sparkles,
  palette: Palette,
  art: Palette,
  play: Play,
  video: Play,
  music: Music,
  film: Film,
  gamepad2: Gamepad2,
  game: Gamepad2,
  bookopen: BookOpen,
  blog: BookOpen,
  coffee: Coffee,
  heart: Heart,
  star: Star,
};

/**
 * Resilient Lucide Icon Resolver
 */
export const resolveLucideIcon = (iconName) => {
  if (!iconName || typeof iconName !== 'string') return Globe;
  const normalized = iconName.trim().toLowerCase().replace(/[-_\s]/g, '');
  if (ICON_REGISTRY[normalized]) return ICON_REGISTRY[normalized];

  // Direct match in lucide-react exports
  if (Icons[iconName]) return Icons[iconName];

  // PascalCase reconstruction
  const pascal = iconName
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
  if (Icons[pascal]) return Icons[pascal];

  return Globe;
};

/**
 * URL Safety Validator against XSS schemes (T2.5)
 */
export const isSafeUrl = (rawUrl) => {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim().toLowerCase();
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const proto of dangerousProtocols) {
    if (trimmed.startsWith(proto)) return false;
  }
  return true;
};

/**
 * URL Normalization
 */
export const normalizeUrl = (rawUrl) => {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (trimmed === '') return '';
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

/**
 * Card Style CSS Variant Mapper
 */
const getCardStyleClasses = (cardStyle) => {
  switch (cardStyle) {
    case 'neon-border':
      return 'bg-theme-surface border-2 border-theme-primary shadow-glow hover:shadow-glow-lg hover:border-theme-primary';
    case 'minimal-flat':
      return 'bg-theme-surface/80 border border-theme-surface-hover hover:border-theme-primary/50 shadow-none';
    case 'glassmorphism':
    default:
      return 'backdrop-blur-xl bg-theme-surface/60 border border-theme-glow/30 shadow-glass hover:border-theme-primary/60 hover:shadow-glow hover:bg-theme-surface/80';
  }
};

export default function LinkCard({
  link,
  layoutStyle = 'bento',
  cardStyle = 'glassmorphism',
  index = 0,
  isFeatured = false,
  isOwner = false,
}) {
  const [isHovered, setIsHovered] = useState(false);

  if (!link || typeof link !== 'object') return null;

  const IconComponent = resolveLucideIcon(link.icon);
  const isUrlSafe = isSafeUrl(link.url);
  const safeHref = isUrlSafe ? normalizeUrl(link.url) : '#';
  const cardStyleClasses = getCardStyleClasses(cardStyle);

  // Clean URL preview string
  const displayUrl = link.url
    ? link.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : '';

  const handleClick = (e) => {
    if (!isUrlSafe) {
      e.preventDefault();
      console.warn('[LinkCard] Blocked navigation to potentially unsafe URL:', link.url);
    }
  };

  return (
    <motion.a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex items-center justify-between rounded-2xl transition-all duration-300 overflow-hidden ${cardStyleClasses} ${
        isFeatured ? 'p-5 sm:p-6' : 'p-4'
      } ${layoutStyle === 'stack' ? 'w-full' : 'h-full w-full'}`}
      style={{
        boxShadow:
          isHovered && link.highlightColor
            ? `0 0 24px -2px ${link.highlightColor}50`
            : undefined,
      }}
    >
      {/* Ambient background glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: link.highlightColor
            ? `radial-gradient(circle at top right, ${link.highlightColor}18, transparent 70%)`
            : 'radial-gradient(circle at top right, var(--border-glow), transparent 70%)',
        }}
      />

      {/* Main Content Area */}
      <div className="flex items-center gap-3.5 relative z-10 min-w-0 flex-1">
        {/* Dynamic Icon Container */}
        <div
          className={`rounded-xl bg-theme-base/80 border border-theme-glow/30 text-theme-primary group-hover:scale-110 group-hover:border-theme-primary/60 transition-all duration-300 shrink-0 flex items-center justify-center ${
            isFeatured ? 'p-3 w-12 h-12' : 'p-2.5 w-10 h-10'
          }`}
          style={{
            color: link.highlightColor || undefined,
            borderColor:
              isHovered && link.highlightColor ? `${link.highlightColor}60` : undefined,
          }}
        >
          <IconComponent className={isFeatured ? 'w-6 h-6' : 'w-5 h-5'} />
        </div>

        {/* Text & Metadata */}
        <div className="min-w-0 flex-1 pr-2">
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-semibold text-sm sm:text-base text-theme-main group-hover:text-theme-primary transition-colors truncate">
              {link.title || 'Untitled Portal'}
            </h3>
            {isFeatured && (
              <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary border border-theme-primary/30 uppercase font-bold tracking-wider">
                Featured
              </span>
            )}
          </div>

          <p className="text-xs font-mono text-theme-sub truncate opacity-75 group-hover:opacity-100 transition-opacity mt-0.5">
            {displayUrl || 'External Link'}
          </p>

          {isFeatured && link.category && (
            <span className="inline-block sm:hidden text-[10px] font-mono text-theme-primary/80 capitalize mt-1">
              • {link.category}
            </span>
          )}
        </div>
      </div>

      {/* Trailing External Link Indicator */}
      <div className="flex items-center gap-2 relative z-10 text-theme-sub group-hover:text-theme-primary transition-colors shrink-0 pl-2">
        {link.category && !isFeatured && (
          <span className="hidden md:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-theme-base/50 text-theme-sub/70 border border-theme-glow/10 capitalize">
            {link.category}
          </span>
        )}
        <div className="p-1 rounded-lg group-hover:bg-theme-primary/10 transition-colors">
          <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
        </div>
      </div>
    </motion.a>
  );
}
