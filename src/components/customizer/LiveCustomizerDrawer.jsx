/**
 * src/components/customizer/LiveCustomizerDrawer.jsx
 * Slide-over WYSIWYG Live Customizer Drawer (Milestone M5 - Features 21, 22, 23)
 *
 * Requirements:
 * - Framer Motion slide-over drawer from right (x: '100%' -> 0)
 * - Glassmorphic design (bg-theme-surface/95 backdrop-blur-2xl border-l border-theme-glow/40)
 * - Sticky tab header with icons (User, Link2, Heart, Music, Layout) and active tab indicators
 * - Real-time WYSIWYG preview behind drawer via useProfileStore mutators
 * - Save Changes (Supabase + LocalStorage), Revert Changes, Reset to Defaults, and JSON Export/Import
 * - Feedback notifications for all data management actions
 */

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../../store/useProfileStore.js';
import ProfileEditorTab from './ProfileEditorTab.jsx';
import LinksEditorTab from './LinksEditorTab.jsx';
import FavoritesEditorTab from './FavoritesEditorTab.jsx';
import MusicEditorTab from './MusicEditorTab.jsx';
import LayoutThemeTab from './LayoutThemeTab.jsx';
import ErrorBoundary from '../ui/ErrorBoundary.jsx';
import {
  X,
  Save,
  RotateCcw,
  RefreshCw,
  Download,
  Upload,
  User,
  Link2,
  Heart,
  Music,
  Layout,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Database,
  Loader2,
  Info,
  Eye,
} from 'lucide-react';

export default function LiveCustomizerDrawer() {
  const {
    customizerOpen,
    setCustomizerOpen,
    activeTab,
    setActiveTab,
    isDirty,
    saveStatus,
    storageSource,
    saveChanges,
    revertChanges,
    resetToDefaults,
    exportData,
    importData,
  } = useProfileStore();

  const fileInputRef = useRef(null);
  const [toast, setToast] = useState(null); // { message: string, type: 'success' | 'error' | 'info' }

  // Keyboard shortcut: Dismiss on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && customizerOpen) {
        setCustomizerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [customizerOpen, setCustomizerOpen]);

  // Tab definitions: User, Link2, Heart, Music, Layout
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'links', label: 'Links', icon: Link2 },
    { id: 'favorites', label: 'Favorites', icon: Heart },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'theme', label: 'Layout & Theme', icon: Layout },
  ];

  // Feature 23: Export JSON as profile-hub-config.json
  const handleExport = () => {
    try {
      exportData('profile-hub-config.json');
      setToast({
        message: 'Configuration successfully exported as profile-hub-config.json!',
        type: 'success',
      });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({
        message: `Export failed: ${err.message}`,
        type: 'error',
      });
      setTimeout(() => setToast(null), 4000);
    }
  };

  // Feature 23: Import JSON with defensive validation and dirty marking
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const res = importData(parsed);
        if (res.success) {
          setToast({
            message: 'JSON configuration loaded! Live draft marked dirty for review.',
            type: 'success',
          });
          setTimeout(() => setToast(null), 3500);
        } else {
          setToast({
            message: `Import validation failed: ${res.error}`,
            type: 'error',
          });
          setTimeout(() => setToast(null), 5000);
        }
      } catch (err) {
        setToast({
          message: `Invalid JSON file syntax: ${err.message}`,
          type: 'error',
        });
        setTimeout(() => setToast(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Feature 23: Save Changes with Feedback Toast
  const handleSave = async (autoClose = false) => {
    const result = await saveChanges();
    if (result && result.success) {
      if (result.warning) {
        setToast({
          message: `${result.warning}`,
          type: 'warning',
        });
        setTimeout(() => setToast(null), 8000);
      } else {
        setToast({
          message: `Changes saved successfully to ${result.source === 'supabase' ? 'Supabase' : 'LocalStorage'}!`,
          type: 'success',
        });
        setTimeout(() => setToast(null), 3000);
      }
      if (autoClose) {
        setTimeout(() => {
          setCustomizerOpen(false);
        }, 400);
      }
      return result;
    } else {
      setToast({
        message: `Save failed: ${result?.error || 'Unable to persist data'}`,
        type: 'error',
      });
      setTimeout(() => setToast(null), 5000);
      return result;
    }
  };

  // Feature 23: Revert Changes
  const handleRevert = () => {
    revertChanges();
    setToast({
      message: 'Draft changes reverted to last saved state.',
      type: 'info',
    });
    setTimeout(() => setToast(null), 3000);
  };

  // Feature 23: Reset to Defaults
  const handleReset = async () => {
    if (
      window.confirm(
        'Reset all profile, links, favorites, music, and theme settings to default demo values? All unsaved edits will be discarded.'
      )
    ) {
      await resetToDefaults();
      setToast({
        message: 'Profile reset to default seed configuration.',
        type: 'info',
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <AnimatePresence>
      {customizerOpen && (
        <div className="fixed inset-0 z-[60] overflow-hidden flex justify-end pointer-events-auto">
          {/* Backdrop with fade animation */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => {
              e.stopPropagation();
              setCustomizerOpen(false);
            }}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-0 cursor-pointer"
            title="Click backdrop to close customizer and view live website"
          />

          {/* Slide-over Drawer with Framer Motion spring physics */}
          <motion.aside
            key="drawer-panel"
            role="dialog"
            aria-label="Live Web Customizer"
            aria-modal="true"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-w-md md:max-w-lg h-full bg-theme-surface/95 backdrop-blur-2xl border-l border-theme-glow/40 shadow-2xl flex flex-col font-sans text-theme-main select-text pointer-events-auto"
          >
            {/* Drawer Header */}
            <header className="p-4 sm:p-5 border-b border-theme-glow/20 flex items-center justify-between shrink-0 bg-black/20">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-theme-primary/10 text-theme-primary border border-theme-primary/30 shadow-glow">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold font-mono text-theme-main flex items-center gap-2">
                    <span>Live Web Customizer</span>
                  </h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-theme-sub mt-0.5">
                    <span className="flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          storageSource === 'supabase' ? 'bg-emerald-400' : 'bg-cyan-400'
                        }`}
                      />
                      Storage: {storageSource === 'supabase' ? 'Supabase' : 'Local'}
                    </span>
                    {isDirty && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        Unsaved Edits
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCustomizerOpen(false)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-theme-sub hover:text-white border border-theme-glow/30 transition-all text-xs font-mono cursor-pointer"
                  title="Close customizer and interact with the website"
                >
                  <Eye className="w-3.5 h-3.5 text-theme-primary" />
                  <span className="hidden sm:inline">View Site (ดูเว็บ)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomizerOpen(false)}
                  className="p-2 rounded-xl text-theme-sub hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close customizer drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Notification Toast Banner within Drawer */}
            {toast && (
              <div
                className={`mx-4 mt-3 p-2.5 rounded-xl text-xs font-mono flex items-center gap-2 border animate-fade-in ${
                  toast.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-glow'
                    : toast.type === 'error'
                    ? 'bg-red-500/15 border-red-500/40 text-red-300'
                    : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                }`}
              >
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                ) : (
                  <Info className="w-4 h-4 shrink-0 text-cyan-400" />
                )}
                <span className="flex-1">{toast.message}</span>
                {toast.type === 'success' && (
                  <button
                    type="button"
                    onClick={() => setCustomizerOpen(false)}
                    className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-[10px] font-bold cursor-pointer shrink-0"
                    title="Close drawer to interact with site"
                  >
                    View Site (ดูเว็บ) &rarr;
                  </button>
                )}
                {toast.type === 'error' && (
                  <button
                    type="button"
                    onClick={() => setCustomizerOpen(false)}
                    className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-[10px] font-bold cursor-pointer shrink-0"
                    title="Close drawer to view site"
                  >
                    Close (ปิด) &rarr;
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setToast(null)}
                  className="p-0.5 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Sticky Tab Navigation Header with Icons */}
            <nav
              aria-label="Customizer Sections"
              className="sticky top-0 z-20 flex items-center gap-1 p-2 bg-black/40 backdrop-blur-md border-b border-theme-glow/20 overflow-x-auto shrink-0 scrollbar-none"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 focus:outline-none ${
                      isActive
                        ? 'text-theme-primary font-bold shadow-glow bg-theme-primary/20 border border-theme-primary/40'
                        : 'text-theme-sub hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="customizer-tab-indicator"
                        className="absolute inset-0 rounded-xl bg-theme-primary/10 border border-theme-primary/30 -z-10"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Tab Content Body (Scrollable Container) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
              <ErrorBoundary>
                {activeTab === 'profile' && <ProfileEditorTab />}
                {activeTab === 'links' && <LinksEditorTab />}
                {activeTab === 'favorites' && <FavoritesEditorTab />}
                {activeTab === 'music' && <MusicEditorTab />}
                {activeTab === 'theme' && <LayoutThemeTab />}
              </ErrorBoundary>

              {/* Backup & Disaster Recovery Actions */}
              <section className="pt-6 mt-6 border-t border-theme-glow/20 space-y-3 font-mono text-xs">
                <h4 className="font-bold text-theme-sub uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-theme-primary" />
                  <span>Backup & Disaster Recovery</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-black/40 border border-theme-glow/30 text-theme-sub hover:text-white hover:border-theme-glow/60 transition-all hover:bg-white/5 active:scale-[0.98]"
                    title="Export all data to JSON file"
                  >
                    <Download className="w-3.5 h-3.5 text-theme-primary" />
                    <span>Export JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-black/40 border border-theme-glow/30 text-theme-sub hover:text-white hover:border-theme-glow/60 transition-all hover:bg-white/5 active:scale-[0.98]"
                    title="Import data from JSON file"
                  >
                    <Upload className="w-3.5 h-3.5 text-theme-secondary" />
                    <span>Import JSON</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  accept=".json,application/json"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all text-[11px] active:scale-[0.98]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset All to Defaults</span>
                </button>
              </section>
            </div>

            {/* Drawer Action Footer (Sticky Save / Revert Bar) */}
            <footer className="p-4 border-t border-theme-glow/20 bg-black/40 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {isDirty && (
                  <button
                    type="button"
                    onClick={handleRevert}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono text-theme-sub hover:text-white hover:bg-white/10 border border-theme-glow/20 transition-all active:scale-[0.97]"
                    title="Revert all unsaved changes to committed state"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revert</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saveStatus === 'saving'}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-theme-surface border border-theme-glow/40 text-theme-primary hover:bg-theme-primary/10 hover:border-theme-primary font-mono text-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  title="Save changes and close drawer to view live site"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save &amp; View (บันทึก &amp; ดูเว็บ)</span>
                  <span className="sm:hidden">Save &amp; View</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saveStatus === 'saving'}
                  className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-theme-primary to-theme-accent text-black font-bold font-mono text-xs tracking-wider uppercase hover:opacity-95 shadow-glow transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-900" />
                      <span>Saved!</span>
                    </>
                  ) : saveStatus === 'error' ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-900" />
                      <span>Save Error</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </footer>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
