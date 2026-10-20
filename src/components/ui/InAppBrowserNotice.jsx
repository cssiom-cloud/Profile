/**
 * src/components/ui/InAppBrowserNotice.jsx
 * In-App Browser (Instagram, Facebook, Line, etc.) Detection & Redirect Notice
 * 
 * Capabilities:
 * - Detects WebView environments that restrict media autoplay, audio streams, and storage.
 * - Displays clear guidance directing users to the top-right (⋮) menu to open in Chrome or Safari.
 * - Provides direct Android Chrome intent trigger and one-tap link copier.
 * - Supports dismissal persisted in sessionStorage.
 * - Allows testing via URL parameter (?inapp=true or #inapp).
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  ExternalLink,
  Copy,
  Check,
  X,
  ChevronRight,
  Info,
  CornerRightUp,
} from 'lucide-react';

/**
 * Checks if current environment is an in-app browser webview
 */
export function detectInAppBrowser() {
  if (typeof window === 'undefined') return false;

  // Check URL parameter override for debugging and manual testing
  try {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('inapp') === 'true' || searchParams.get('inapp') === '1') {
      return true;
    }
    if (window.location.hash.includes('inapp')) {
      return true;
    }
  } catch {}

  const ua = navigator?.userAgent || navigator?.vendor || window.opera || '';
  if (!ua) return false;

  const isInstagram = /Instagram/i.test(ua);
  const isFacebook = /FBAN|FBAV|FB_IAB|FBSS/i.test(ua);
  const isLine = /Line\//i.test(ua);
  const isTwitter = /Twitter/i.test(ua);
  const isTikTok = /musical_ly|ByteLocale|TikTok/i.test(ua);
  const isWeChat = /MicroMessenger/i.test(ua);
  const isGenericWebView = /(wv|\.0\.0\.0)/i.test(ua) && /Mobile/i.test(ua);

  return isInstagram || isFacebook || isLine || isTwitter || isTikTok || isWeChat || isGenericWebView;
}

export default function InAppBrowserNotice() {
  const [isInApp, setIsInApp] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if dismissed in this session
    try {
      const dismissed = sessionStorage.getItem('dismiss_inapp_notice');
      if (dismissed === 'true') {
        setIsDismissed(true);
        return;
      }
    } catch {}

    const detected = detectInAppBrowser();
    setIsInApp(detected);
    setIsDismissed(!detected);

    if (navigator?.userAgent) {
      setIsAndroid(/Android/i.test(navigator.userAgent));
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('dismiss_inapp_notice', 'true');
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      const url = window.location.href.split('?')[0].split('#')[0];
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenChrome = () => {
    if (typeof window === 'undefined') return;
    try {
      const hostPath = `${window.location.host}${window.location.pathname}`;
      const searchHash = `${window.location.search}${window.location.hash}`;
      const intentUrl = `intent://${hostPath}${searchHash}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    } catch {
      handleCopyLink();
    }
  };

  if (!isInApp || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="In-App Browser Warning"
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.3 }}
        className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-md z-50"
      >
        <div className="relative overflow-hidden rounded-2xl bg-[#090c15]/95 backdrop-blur-2xl border-2 border-theme-primary/60 shadow-2xl p-4 sm:p-5 text-theme-main font-sans">
          {/* Subtle top indicator pointing toward the Instagram 3-dots menu */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-theme-primary/20 text-theme-primary border border-theme-primary/40">
                <Compass className="w-4 h-4 animate-spin-slow" />
              </span>
              <span className="text-xs font-mono font-bold tracking-wide text-theme-primary uppercase">
                In-App Browser Detected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-mono text-theme-secondary font-semibold animate-pulse">
                <span>แตะเมนู ⋮ ขวาบน</span>
                <CornerRightUp className="w-3.5 h-3.5" />
              </span>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-white/10 text-theme-sub hover:text-white transition-colors"
                title="ปิดการแจ้งเตือน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Core Guidance Content */}
          <div className="space-y-2 mb-4">
            <h3 className="text-sm font-bold text-white tracking-tight">
              แนะนำให้เปิดผ่านเบราว์เซอร์หลัก
            </h3>
            <p className="text-xs text-theme-sub leading-relaxed">
              เบราว์เซอร์ภายใน Instagram / แอปโซเชียล อาจปิดกั้นการเล่นเพลงอัตโนมัติ การโหลดกราฟิก และการแสดงผลบางส่วน
            </p>

            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] font-mono space-y-1">
              <div className="flex items-start gap-1.5 text-theme-main">
                <span className="text-theme-primary font-bold">1.</span>
                <span>แตะจุดสามจุด ( ⋮ หรือ ··· ) ที่มุมขวาบนของหน้าจอ</span>
              </div>
              <div className="flex items-start gap-1.5 text-theme-main">
                <span className="text-theme-primary font-bold">2.</span>
                <span>เลือก &ldquo;เปิดในเบราว์เซอร์ภายนอก&rdquo; (Chrome หรือ Safari)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {isAndroid ? (
              <button
                type="button"
                onClick={handleOpenChrome}
                className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-theme-primary text-black font-mono font-bold text-xs shadow-glow hover:brightness-110 active:scale-95 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>เปิดใน Chrome ทันที</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl font-mono text-xs border transition-all ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>คัดลอกลิงก์แล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 opacity-80" />
                  <span>คัดลอกลิงก์เว็บ</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-2 rounded-xl bg-transparent hover:bg-white/5 text-[11px] text-theme-sub hover:text-white transition-colors font-mono text-center"
            >
              ดูในนี้ต่อไป
            </button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
