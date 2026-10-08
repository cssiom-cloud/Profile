/**
 * src/components/profile/SocialHub.jsx
 * Social Links Footer & Discreet Owner Mode Trigger Component (Milestone M4 - Feature 19)
 * Provides platform-specific social icons, copyright branding,
 * and a discreet owner authentication trigger (visual padlock + Ctrl+Shift+L shortcut).
 */

import React, { useEffect } from 'react';
import { useProfileStore } from '../../store/useProfileStore.js';
import * as Icons from 'lucide-react';
import {
  Github,
  Twitter,
  Linkedin,
  Youtube,
  MessageSquare,
  Mail,
  Instagram,
  Lock,
  Unlock,
  Key,
  Heart,
  Globe,
} from 'lucide-react';

/**
 * Resolves platform-specific icon based on link title, URL, or icon name
 */
export const getSocialIcon = (iconName = '', url = '') => {
  const normIcon = (iconName || '').toLowerCase();
  const normUrl = (url || '').toLowerCase();

  if (normIcon.includes('github') || normUrl.includes('github.com')) return Github;
  if (normIcon.includes('twitter') || normIcon.includes(' x') || normUrl.includes('twitter.com') || normUrl.includes('x.com')) return Twitter;
  if (normIcon.includes('linkedin') || normUrl.includes('linkedin.com')) return Linkedin;
  if (normIcon.includes('youtube') || normUrl.includes('youtube.com')) return Youtube;
  if (normIcon.includes('discord') || normUrl.includes('discord.gg') || normUrl.includes('discord.com')) return MessageSquare;
  if (normIcon.includes('mail') || normIcon.includes('email') || normUrl.startsWith('mailto:')) return Mail;
  if (normIcon.includes('instagram') || normUrl.includes('instagram.com')) return Instagram;

  // Fallback to general Lucide icon or Globe
  if (iconName && Icons[iconName]) return Icons[iconName];
  return Globe;
};

export default function SocialHub({ className = '' }) {
  const { profile, links, isOwner, setLoginModalOpen, setCustomizerOpen, toggleCustomizer } =
    useProfileStore();

  const currentYear = new Date().getFullYear();

  // Extract active social links
  const socialLinks = Array.isArray(links)
    ? links.filter((l) => l && l.category === 'social' && l.isActive !== false)
    : [];

  // Global keyboard listener for discreet owner mode toggle (Ctrl+Shift+L or Cmd+Shift+L)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        if (isOwner) {
          setCustomizerOpen(true);
        } else {
          setLoginModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOwner, setCustomizerOpen, setLoginModalOpen]);

  const handleOwnerClick = () => {
    if (isOwner) {
      setCustomizerOpen(true);
    } else {
      setLoginModalOpen(true);
    }
  };

  return (
    <footer
      aria-label="Social Hub Footer"
      className={`w-full pt-8 pb-12 mt-8 border-t border-theme-glow/20 space-y-6 text-center text-xs font-mono text-theme-sub ${className}`}
    >
      {/* Quick Social Icon Badges */}
      {socialLinks.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {socialLinks.map((social) => {
            const IconComponent = getSocialIcon(social.icon, social.url);

            return (
              <a
                key={social.id}
                href={social.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.title || 'Social Link'}
                title={social.title || 'Social Link'}
                className="p-2.5 rounded-xl bg-theme-surface/70 border border-theme-glow/30 text-theme-sub hover:text-theme-primary hover:border-theme-primary/50 hover:scale-110 transition-all shadow-glass"
              >
                <IconComponent className="w-4 h-4" />
              </a>
            );
          })}
        </div>
      )}

      {/* Copyright & Creative Credits */}
      <div className="space-y-1">
        <p className="flex items-center justify-center gap-1.5 text-theme-main">
          Crafted with <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30" /> by{' '}
          <span className="font-bold text-theme-primary">
            {profile?.footerCraftedBy || profile?.name || 'Alex Rivera'}
          </span>
        </p>
        <p className="text-[11px] text-theme-sub">
          &copy; {currentYear} {profile?.name || 'Alex Rivera'} • {profile?.footerCopyright || 'All rights reserved'}
        </p>
        {profile?.showFooterCredits !== false && (
          <p className="text-[10px] text-theme-sub/70">
            {profile?.footerCredits || 'Powered by React, Vite, Tailwind CSS & Supabase • Hosted on GitHub Pages'}
          </p>
        )}
      </div>

      {/* Discreet Owner Login / Lock Button */}
      <div className="pt-2 flex items-center justify-center">
        <button
          type="button"
          onClick={handleOwnerClick}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono transition-all border ${
            isOwner
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-glow'
              : 'bg-theme-surface/40 text-theme-sub border-theme-glow/20 hover:text-white hover:border-theme-glow/50'
          }`}
          title={isOwner ? 'Owner Mode Active (Ctrl+Shift+L to customize)' : 'Owner Login (Ctrl+Shift+L)'}
          aria-label={isOwner ? 'Owner Mode Active' : 'Owner Login'}
        >
          {isOwner ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>Owner Mode Active (Customize)</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 opacity-60" />
              <span>Owner Login / Key</span>
              <kbd className="hidden sm:inline text-[9px] px-1 py-0.5 rounded bg-black/40 text-theme-sub border border-theme-glow/20">
                Ctrl+Shift+L
              </kbd>
            </>
          )}
        </button>
      </div>
    </footer>
  );
}
