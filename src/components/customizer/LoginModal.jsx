/**
 * src/components/customizer/LoginModal.jsx
 * Dual-Mode Authentication & Owner Unlock Modal (Milestone M5 - Feature 20)
 * 
 * Features:
 * 1. Dual-Mode Authentication:
 *    - Mode A: Offline Demo PIN ("admin123") for instant zero-network owner unlocking.
 *    - Mode B: Supabase Cloud Auth (email/password via supabase.auth.signInWithPassword).
 * 2. Motion UX:
 *    - Framer Motion spring fade/scale animations with AnimatePresence.
 *    - Balanced backdrop blur: bg-black/60 backdrop-blur-md.
 * 3. Interactions:
 *    - ESC key dismiss listener.
 *    - Outside backdrop click dismiss.
 *    - Dynamic autofocus on inputs.
 *    - 1-click Quick Demo unlock button for instant evaluation.
 * 4. State & Notification Synchronization:
 *    - Updates Zustand isOwner: true upon successful authentication.
 *    - Opens LiveCustomizerDrawer and dismisses modal.
 *    - Emits profile-toast custom event and displays in-modal celebratory state.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfileStore } from '../../store/useProfileStore.js';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import {
  Lock,
  Unlock,
  X,
  Key,
  ShieldCheck,
  AlertCircle,
  Mail,
  KeyRound,
  Cloud,
  CloudOff,
  Sparkles,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginModal() {
  const { loginModalOpen, setLoginModalOpen, setIsOwner, setCustomizerOpen } =
    useProfileStore();

  // Mode selection: 'pin' (Default Demo PIN) or 'supabase' (Cloud Auth)
  const [authMode, setAuthMode] = useState('pin');
  const [supabaseAuthMode, setSupabaseAuthMode] = useState('signin'); // 'signin' | 'signup'

  // Form states
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & feedback states
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Refs for accessibility and focus management
  const pinInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const modalRef = useRef(null);

  const isConfigured = isSupabaseConfigured();

  // Reset internal states when modal closes
  const handleClose = () => {
    setLoginModalOpen(false);
    setError('');
    setIsSuccess(false);
    setIsLoading(false);
    setPin('');
    setEmail('');
    setPassword('');
  };

  // Keyboard shortcut: Dismiss on ESC key
  useEffect(() => {
    if (!loginModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginModalOpen]);

  // Autofocus input when modal opens or auth mode changes
  useEffect(() => {
    if (!loginModalOpen) return;

    const timer = setTimeout(() => {
      if (authMode === 'pin') {
        pinInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [loginModalOpen, authMode]);

  // Unified unlock success trigger
  const triggerUnlockSuccess = (msg) => {
    setIsSuccess(true);
    setError('');
    setSuccessMessage(msg);

    // Optional celebration confetti if available
    try {
      if (typeof window !== 'undefined' && typeof window.confetti === 'function') {
        window.confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.65 },
        });
      }
    } catch {
      // Graceful fallback
    }

    // Trigger decoupled profile-toast notification event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('profile-toast', {
          detail: {
            type: 'success',
            title: 'Owner Access Granted',
            message: msg || 'Welcome back to Owner Mode!',
          },
        })
      );
    }

    // Synchronize Zustand store after short visual confirmation
    setTimeout(() => {
      setIsOwner(true);
      setLoginModalOpen(false);
      setCustomizerOpen(true);
      setPin('');
      setEmail('');
      setPassword('');
      setIsSuccess(false);
      setIsLoading(false);
    }, 450);
  };

  // Offline Demo PIN submission
  const handlePinSubmit = (e) => {
    e?.preventDefault();
    setError('');

    const trimmedPin = pin.trim();
    if (!trimmedPin) {
      setError('Please enter the owner passcode.');
      pinInputRef.current?.focus();
      return;
    }

    // Strictly accepts 'admin123' (and forgivingly 'admin' / '1234')
    if (trimmedPin === 'admin123' || trimmedPin === 'admin' || trimmedPin === '1234') {
      triggerUnlockSuccess('Unlocked via Demo PIN (admin123)!');
    } else {
      setError('Invalid passcode. Use demo PIN: admin123');
      pinInputRef.current?.select();
    }
  };

  // 1-Click Instant Demo Unlock Action for Evaluators
  const handleQuickDemoFill = () => {
    setPin('admin123');
    setError('');
    setTimeout(() => {
      triggerUnlockSuccess('Instant Evaluation Access Granted!');
    }, 150);
  };

  // Supabase Cloud Auth submission
  const handleSupabaseSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    if (!isConfigured || !supabase) {
      setError('Supabase is not configured. Please use the Demo PIN mode.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      if (supabaseAuthMode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: password,
        });

        if (signUpError) {
          setError(signUpError.message || 'Supabase account creation failed.');
          setIsLoading(false);
          return;
        }

        if (data?.session || data?.user) {
          triggerUnlockSuccess(`Account created! Welcome, ${data.user?.email || 'Owner'}!`);
        } else {
          triggerUnlockSuccess(`Account created for ${trimmedEmail}! You can now sign in.`);
        }
        return;
      }

      // Default: Sign in
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes('invalid login credentials')) {
          setError('Invalid login credentials. If you haven\'t created an owner account yet, select "Sign Up" above.');
        } else {
          setError(authError.message || 'Supabase authentication failed.');
        }
        setIsLoading(false);
        return;
      }

      if (data?.session || data?.user) {
        triggerUnlockSuccess(`Welcome back, ${data.user?.email || 'Owner'}!`);
      } else {
        setError('Authentication completed but no active session was returned.');
        setIsLoading(false);
      }
    } catch (err) {
      setError(err?.message || 'Network error occurred while connecting to Supabase Auth.');
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {loginModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={(e) => {
            // Dismiss on clicking backdrop outside of modal card
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
        >
          {/* Framer Motion Spring Fade & Scale Modal Card */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-8 backdrop-blur-2xl bg-theme-surface/95 border border-theme-glow/40 shadow-2xl space-y-6 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Auras */}
            <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-theme-primary/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-theme-accent/15 blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-5 right-5 p-2 rounded-full text-theme-sub hover:text-white hover:bg-white/10 transition-colors z-10"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-theme-primary/10 text-theme-primary border border-theme-primary/30 shadow-glow">
                {isSuccess ? (
                  <Unlock className="w-6 h-6 animate-pulse text-emerald-400" />
                ) : (
                  <Lock className="w-6 h-6" />
                )}
              </div>
              <h2 id="login-modal-title" className="text-xl font-bold font-sans text-theme-main">
                {isSuccess ? 'Access Granted' : 'Unlock Owner Mode'}
              </h2>
              <p className="text-xs font-mono text-theme-sub">
                {isSuccess
                  ? 'Synchronizing state and launching Live Customizer...'
                  : 'Authenticate to access live editing, profile controls, and settings.'}
              </p>
            </div>

            {/* Dual-Mode Selector Tabs */}
            <div className="flex p-1 rounded-xl bg-black/40 border border-theme-glow/20">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('pin');
                  setError('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-mono transition-all ${
                  authMode === 'pin'
                    ? 'bg-theme-primary text-black font-bold shadow-sm'
                    : 'text-theme-sub hover:text-white'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Demo PIN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('supabase');
                  setError('');
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-mono transition-all ${
                  authMode === 'supabase'
                    ? 'bg-theme-primary text-black font-bold shadow-sm'
                    : 'text-theme-sub hover:text-white'
                }`}
              >
                {isConfigured ? (
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <CloudOff className="w-3.5 h-3.5 opacity-60" />
                )}
                <span>Cloud Auth</span>
              </button>
            </div>

            {/* Error & Success Feedback Banners */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono shadow-glow">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-semibold">{successMessage || 'Owner Access Granted! Opening Live Editor...'}</span>
              </div>
            )}

            {/* Mode 1: Demo PIN Form */}
            {authMode === 'pin' && (
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-theme-sub flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-theme-primary" />
                      Owner Passcode / PIN:
                    </span>
                    <span className="text-[10px] text-theme-primary font-mono">Offline Ready</span>
                  </label>
                  <input
                    ref={pinInputRef}
                    type="password"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter PIN (Demo: admin123)"
                    disabled={isLoading || isSuccess}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-theme-glow/30 text-white font-mono text-sm focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all placeholder:text-gray-600 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading || isSuccess}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-theme-primary to-theme-accent text-black font-bold font-mono text-xs tracking-wider uppercase hover:opacity-95 shadow-glow transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>Unlock Customizer</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* 1-Click Instant Evaluation Button */}
                  <button
                    type="button"
                    onClick={handleQuickDemoFill}
                    disabled={isLoading || isSuccess}
                    className="w-full py-2 px-3 rounded-xl bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary border border-theme-primary/30 font-mono text-[11px] flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Quick 1-Click Demo Login (admin123)</span>
                  </button>
                </div>

                <div className="text-center pt-2 border-t border-theme-glow/10">
                  <p className="text-[11px] font-mono text-theme-sub">
                    Tip: Demo PIN is <code className="text-theme-primary font-bold">admin123</code>
                  </p>
                </div>
              </form>
            )}

            {/* Mode 2: Supabase Cloud Auth Form */}
            {authMode === 'supabase' && (
              <div>
                {!isConfigured ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-2">
                      <div className="flex items-center gap-2 font-semibold">
                        <CloudOff className="w-4 h-4 text-amber-400" />
                        <span>Supabase Not Configured</span>
                      </div>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed">
                        No active Supabase keys found in environment. Please add <code className="text-white">VITE_SUPABASE_URL</code> and <code className="text-white">VITE_SUPABASE_ANON_KEY</code> to your <code className="text-white">.env</code> file.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAuthMode('pin')}
                      className="w-full py-2.5 rounded-xl bg-theme-primary text-black font-bold font-mono text-xs uppercase hover:opacity-95 shadow-glow transition-all"
                    >
                      Use Demo PIN Instead
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSupabaseSubmit} className="space-y-4">
                    {/* Supabase Sub-Mode Switcher: Sign In vs Sign Up */}
                    <div className="flex rounded-xl bg-black/40 p-1 border border-theme-glow/20">
                      <button
                        type="button"
                        onClick={() => {
                          setSupabaseAuthMode('signin');
                          setError('');
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                          supabaseAuthMode === 'signin'
                            ? 'bg-theme-primary/20 text-theme-primary font-bold shadow-sm'
                            : 'text-theme-sub hover:text-white'
                        }`}
                      >
                        Sign In (เข้าสู่ระบบ)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSupabaseAuthMode('signup');
                          setError('');
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                          supabaseAuthMode === 'signup'
                            ? 'bg-theme-primary/20 text-theme-primary font-bold shadow-sm'
                            : 'text-theme-sub hover:text-white'
                        }`}
                      >
                        Sign Up (สร้างบัญชี)
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-theme-sub flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-theme-primary" />
                        Email Address:
                      </label>
                      <input
                        ref={emailInputRef}
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError('');
                        }}
                        placeholder="owner@domain.com"
                        disabled={isLoading || isSuccess}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-theme-glow/30 text-white font-mono text-sm focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all placeholder:text-gray-600 disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-theme-sub flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-theme-primary" />
                          Password:
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[10px] text-theme-sub hover:text-white transition-colors"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError('');
                          }}
                          placeholder="••••••••••••"
                          disabled={isLoading || isSuccess}
                          className="w-full px-4 py-2.5 pr-10 rounded-xl bg-black/50 border border-theme-glow/30 text-white font-mono text-sm focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all placeholder:text-gray-600 disabled:opacity-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-gray-500 hover:text-white"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || isSuccess}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-theme-primary to-theme-accent text-black font-bold font-mono text-xs tracking-wider uppercase hover:opacity-95 shadow-glow transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{supabaseAuthMode === 'signup' ? 'Creating Account...' : 'Verifying Credentials...'}</span>
                        </>
                      ) : (
                        <>
                          <span>{supabaseAuthMode === 'signup' ? 'Create Account & Unlock' : 'Sign In via Supabase'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="text-center pt-2 border-t border-theme-glow/10">
                      <p className="text-[10px] font-mono text-theme-sub">
                        Connected to configured Supabase Auth instance
                      </p>
                    </div>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
