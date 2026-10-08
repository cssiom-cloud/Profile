/**
 * src/store/useProfileStore.js
 * Centralized Global Reactive Store with live WYSIWYG draft mutators,
 * dynamic dirty tracking (isDirty), robust save/revert capabilities,
 * defensive CRUD operations, and JSON export/import.
 */
import { create } from 'zustand';
import { DEFAULT_PROFILE_DATA } from '../data/defaultData.js';
import { dataProvider } from '../lib/dataProvider.js';

/**
 * Defensive UUID generator supporting modern browsers, Node environments, and fallbacks
 */
const generateId = (prefix = 'id') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Deep clone utility
 */
const deepClone = (obj) => {
  if (obj === null || obj === undefined) return obj;
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
};

/**
 * Applies theme attribute to DOM document root for instant zero-reload CSS variable updates
 */
export const applyThemeToDOM = (themePreset, customColors = null) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (themePreset === 'custom' && customColors && typeof customColors === 'object') {
    root.setAttribute('data-theme', 'custom');
    if (customColors.primary) {
      root.style?.setProperty?.('--accent-primary', customColors.primary);
      root.style?.setProperty?.('--particle-color', customColors.primary);
    }
    if (customColors.secondary) {
      root.style?.setProperty?.('--accent-secondary', customColors.secondary);
    }
    if (customColors.base) {
      root.style?.setProperty?.('--bg-base', customColors.base);
    }
    if (customColors.surface) {
      root.style?.setProperty?.('--bg-surface', customColors.surface);
      root.style?.setProperty?.('--bg-surface-hover', customColors.surfaceHover || customColors.surface);
    }
    if (customColors.glow) {
      root.style?.setProperty?.('--border-glow', customColors.glow);
    } else if (customColors.primary) {
      root.style?.setProperty?.('--border-glow', `${customColors.primary}55`);
    }
    if (customColors.textMain) {
      root.style?.setProperty?.('--text-main', customColors.textMain);
    }
    if (customColors.textSub) {
      root.style?.setProperty?.('--text-sub', customColors.textSub);
    }
  } else {
    const validPreset = themePreset || 'cyber-neon';
    root.setAttribute?.('data-theme', validPreset);
    if (typeof root.style?.removeProperty === 'function') {
      root.style.removeProperty('--accent-primary');
      root.style.removeProperty('--accent-secondary');
      root.style.removeProperty('--bg-base');
      root.style.removeProperty('--bg-surface');
      root.style.removeProperty('--bg-surface-hover');
      root.style.removeProperty('--border-glow');
      root.style.removeProperty('--particle-color');
      root.style.removeProperty('--text-main');
      root.style.removeProperty('--text-sub');
    }
  }

  // Dispatch 'themechange' event so canvas & audio visualizers adapt
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('themechange', {
          detail: { theme: themePreset, customColors },
        })
      );
    } catch {
      // Graceful fallback
    }
  }
};

/**
 * Extracts comparable state payload for dirty tracking
 */
const extractPayload = (state) => ({
  profile: state?.profile,
  links: state?.links,
  favorites: state?.favorites,
  music: state?.music,
  settings: state?.settings,
});

/**
 * Computes whether the current draft differs from the committed snapshot
 * Mutators update reactive state directly and set isDirty: true when state differs.
 */
const computeIsDirty = (draft, committed) => {
  if (!committed) return false;
  return JSON.stringify(extractPayload(draft)) !== JSON.stringify(extractPayload(committed));
};

export const useProfileStore = create((set, get) => ({
  // --- Live Draft State (Immediate WYSIWYG Reactivity) ---
  profile: deepClone(DEFAULT_PROFILE_DATA.profile),
  links: deepClone(DEFAULT_PROFILE_DATA.links),
  favorites: deepClone(DEFAULT_PROFILE_DATA.favorites),
  music: deepClone(DEFAULT_PROFILE_DATA.music),
  settings: deepClone(DEFAULT_PROFILE_DATA.settings),

  // --- Persistence & Status Metadata ---
  committedState: deepClone(DEFAULT_PROFILE_DATA),
  isDirty: false,
  isLoading: false,
  saveStatus: 'idle', // 'idle' | 'saving' | 'saved' | 'error'
  storageSource: 'local', // 'local' | 'supabase'

  // --- UI & Customizer Mode State ---
  isOwner: false,
  customizerOpen: false,
  activeTab: 'profile', // 'profile' | 'links' | 'favorites' | 'music' | 'theme'
  loginModalOpen: false,

  // =========================================================================
  // Live Draft Mutators (Keystroke / Toggle Level Reactivity)
  // =========================================================================

  updateProfile: (fields = {}) => {
    set((state) => {
      const currentProfile = (state.profile && typeof state.profile === 'object') ? state.profile : {};
      const updatedProfile = { ...currentProfile, ...fields };
      const nextDraft = { ...state, profile: updatedProfile };
      return {
        profile: updatedProfile,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  updateMusic: (fields = {}) => {
    set((state) => {
      const currentMusic = (state.music && typeof state.music === 'object') ? state.music : {};
      const updatedMusic = { ...currentMusic, ...fields };
      const nextDraft = { ...state, music: updatedMusic };
      return {
        music: updatedMusic,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  updateSettings: (fields = {}) => {
    set((state) => {
      const currentSettings = (state.settings && typeof state.settings === 'object') ? state.settings : {};
      const updatedSettings = { ...currentSettings, ...fields };
      applyThemeToDOM(updatedSettings.themePreset, updatedSettings.customColors);
      const nextDraft = { ...state, settings: updatedSettings };
      return {
        settings: updatedSettings,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  setThemePreset: (presetId) => {
    set((state) => {
      const currentSettings = (state.settings && typeof state.settings === 'object') ? state.settings : {};
      const updatedSettings = { ...currentSettings, themePreset: presetId };
      applyThemeToDOM(presetId, updatedSettings.customColors);
      const nextDraft = { ...state, settings: updatedSettings };
      return {
        settings: updatedSettings,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  updateCustomColors: (colors = {}) => {
    set((state) => {
      const currentSettings = (state.settings && typeof state.settings === 'object') ? state.settings : {};
      const currentCustom = currentSettings.customColors || {
        primary: '#00f0ff',
        secondary: '#ff007f',
        base: '#090a0f',
        surface: '#10141f',
        surfaceHover: '#181e2e',
        glow: '#00f0ff',
        textMain: '#f1f5f9',
        textSub: '#94a3b8',
      };
      const updatedCustom = { ...currentCustom, ...colors };
      const updatedSettings = {
        ...currentSettings,
        themePreset: 'custom',
        customColors: updatedCustom,
      };
      applyThemeToDOM('custom', updatedCustom);
      const nextDraft = { ...state, settings: updatedSettings };
      return {
        settings: updatedSettings,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  // --- Links CRUD ---

  addLink: (newLink = {}) => {
    set((state) => {
      const currentLinks = Array.isArray(state.links)
        ? state.links.filter((l) => Boolean(l && typeof l === 'object'))
        : [];
      const safeNewLink = (newLink && typeof newLink === 'object') ? newLink : {};
      const createdLink = {
        id: generateId('link'),
        title: 'New Link',
        url: 'https://',
        icon: 'Globe',
        category: 'social',
        order: currentLinks.length,
        isActive: true,
        highlightColor: undefined,
        ...safeNewLink,
      };
      const updatedLinks = [...currentLinks, createdLink];
      const nextDraft = { ...state, links: updatedLinks };
      return {
        links: updatedLinks,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  updateLink: (id, fields = {}) => {
    set((state) => {
      const currentLinks = Array.isArray(state.links) ? state.links : [];
      const safeFields = (fields && typeof fields === 'object') ? fields : {};
      const updatedLinks = currentLinks
        .filter((link) => Boolean(link && typeof link === 'object'))
        .map((link) =>
          link.id === id ? { ...link, ...safeFields } : link
        );
      const nextDraft = { ...state, links: updatedLinks };
      return {
        links: updatedLinks,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  removeLink: (id) => {
    set((state) => {
      const currentLinks = Array.isArray(state.links) ? state.links : [];
      const filtered = currentLinks
        .filter((link) => Boolean(link && typeof link === 'object' && link.id !== id))
        .map((link, idx) => ({ ...link, order: idx }));
      const nextDraft = { ...state, links: filtered };
      return {
        links: filtered,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  reorderLinks: (newOrderedLinks) => {
    set((state) => {
      const validLinks = Array.isArray(newOrderedLinks)
        ? newOrderedLinks.filter((link) => Boolean(link && typeof link === 'object'))
        : [];
      const reindexed = validLinks.map((link, idx) => ({ ...link, order: idx }));
      const nextDraft = { ...state, links: reindexed };
      return {
        links: reindexed,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  toggleLinkActive: (id) => {
    set((state) => {
      const currentLinks = Array.isArray(state.links) ? state.links : [];
      const updatedLinks = currentLinks
        .filter((link) => Boolean(link && typeof link === 'object'))
        .map((link) =>
          link.id === id ? { ...link, isActive: !link.isActive } : link
        );
      const nextDraft = { ...state, links: updatedLinks };
      return {
        links: updatedLinks,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  // --- Favorites CRUD ---

  addFavorite: (item = {}) => {
    set((state) => {
      const currentFavs = Array.isArray(state.favorites)
        ? state.favorites.filter((fav) => Boolean(fav && typeof fav === 'object'))
        : [];
      const safeItem = (item && typeof item === 'object') ? item : {};
      const createdFavorite = {
        id: generateId('fav'),
        category: 'tech',
        title: 'New Favorite',
        subtitle: '',
        iconOrImage: 'Star',
        badge: '',
        order: currentFavs.length,
        ...safeItem,
      };
      const updatedFavs = [...currentFavs, createdFavorite];
      const nextDraft = { ...state, favorites: updatedFavs };
      return {
        favorites: updatedFavs,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  updateFavorite: (id, fields = {}) => {
    set((state) => {
      const currentFavs = Array.isArray(state.favorites) ? state.favorites : [];
      const safeFields = (fields && typeof fields === 'object') ? fields : {};
      const updatedFavs = currentFavs
        .filter((fav) => Boolean(fav && typeof fav === 'object'))
        .map((fav) =>
          fav.id === id ? { ...fav, ...safeFields } : fav
        );
      const nextDraft = { ...state, favorites: updatedFavs };
      return {
        favorites: updatedFavs,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  removeFavorite: (id) => {
    set((state) => {
      const currentFavs = Array.isArray(state.favorites) ? state.favorites : [];
      const filtered = currentFavs
        .filter((fav) => Boolean(fav && typeof fav === 'object' && fav.id !== id))
        .map((fav, idx) => ({ ...fav, order: idx }));
      const nextDraft = { ...state, favorites: filtered };
      return {
        favorites: filtered,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  reorderFavorites: (newOrderedFavs) => {
    set((state) => {
      const validFavs = Array.isArray(newOrderedFavs)
        ? newOrderedFavs.filter((fav) => Boolean(fav && typeof fav === 'object'))
        : [];
      const reindexed = validFavs.map((fav, idx) => ({ ...fav, order: idx }));
      const nextDraft = { ...state, favorites: reindexed };
      return {
        favorites: reindexed,
        isDirty: computeIsDirty(nextDraft, state.committedState),
      };
    });
  },

  // =========================================================================
  // Persistence & Lifecycle Actions
  // =========================================================================

  /**
   * Initializes store on application boot via dataProvider cascade
   */
  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      const loaded = await dataProvider.fetchData();
      const safeData = {
        profile: (loaded && typeof loaded.profile === 'object' && loaded.profile !== null)
          ? loaded.profile
          : deepClone(DEFAULT_PROFILE_DATA.profile),
        links: (loaded && Array.isArray(loaded.links))
          ? loaded.links
          : deepClone(DEFAULT_PROFILE_DATA.links),
        favorites: (loaded && Array.isArray(loaded.favorites))
          ? loaded.favorites
          : deepClone(DEFAULT_PROFILE_DATA.favorites),
        music: (loaded && typeof loaded.music === 'object' && loaded.music !== null)
          ? loaded.music
          : deepClone(DEFAULT_PROFILE_DATA.music),
        settings: (loaded && typeof loaded.settings === 'object' && loaded.settings !== null)
          ? loaded.settings
          : deepClone(DEFAULT_PROFILE_DATA.settings),
      };

      if (safeData.settings?.themePreset) {
        applyThemeToDOM(safeData.settings.themePreset, safeData.settings.customColors);
      }

      const snapshot = deepClone(safeData);
      set({
        profile: safeData.profile,
        links: safeData.links,
        favorites: safeData.favorites,
        music: safeData.music,
        settings: safeData.settings,
        committedState: snapshot,
        isDirty: false,
        storageSource: dataProvider.isSupabaseActive() ? 'supabase' : 'local',
        isLoading: false,
      });
    } catch (err) {
      console.error('[useProfileStore] Failed loading initial data:', err);
      set({ isLoading: false });
    }
  },

  /**
   * Saves current draft to dataProvider (LocalStorage + Supabase)
   */
  saveChanges: async () => {
    set({ saveStatus: 'saving' });
    const payload = extractPayload(get());

    try {
      const savePromise = dataProvider.saveData(payload);
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(
          () => resolve({ success: true, source: 'local', warning: 'Save finished with local fallback' }),
          4500
        )
      );

      const result = await Promise.race([savePromise, timeoutPromise]);
      if (result && result.success) {
        const savedSnapshot = deepClone(payload);
        set((state) => ({
          committedState: savedSnapshot,
          isDirty: computeIsDirty(state, savedSnapshot),
          saveStatus: 'saved',
          storageSource: result.source || 'local',
        }));

        setTimeout(() => {
          if (get().saveStatus === 'saved') {
            set({ saveStatus: 'idle' });
          }
        }, 2000);

        return { success: true, source: result.source };
      } else {
        set({ saveStatus: 'error' });
        setTimeout(() => {
          if (get().saveStatus === 'error') {
            set({ saveStatus: 'idle' });
          }
        }, 3000);
        return { success: false, error: result?.error || 'Storage save failed' };
      }
    } catch (err) {
      console.error('[useProfileStore] Error during saveChanges:', err);
      set({ saveStatus: 'error' });
      setTimeout(() => {
        if (get().saveStatus === 'error') {
          set({ saveStatus: 'idle' });
        }
      }, 3000);
      return { success: false, error: err?.message || err };
    }
  },

  /**
   * Reverts live draft back to the last committed snapshot
   */
  revertChanges: () => {
    const committed = get().committedState;
    if (committed?.settings?.themePreset) {
      applyThemeToDOM(committed.settings.themePreset, committed.settings.customColors);
    }
    set({
      profile: deepClone(committed.profile),
      links: deepClone(committed.links),
      favorites: deepClone(committed.favorites),
      music: deepClone(committed.music),
      settings: deepClone(committed.settings),
      isDirty: false,
      saveStatus: 'idle',
    });
  },

  /**
   * Resets entire store to default seed data
   */
  resetToDefaults: async () => {
    set({ saveStatus: 'saving' });
    const defaults = await dataProvider.resetData();
    if (defaults?.settings?.themePreset) {
      applyThemeToDOM(defaults.settings.themePreset, defaults.settings.customColors);
    }

    const snapshot = deepClone(defaults);
    set({
      profile: defaults.profile,
      links: defaults.links,
      favorites: defaults.favorites,
      music: defaults.music,
      settings: defaults.settings,
      committedState: snapshot,
      isDirty: false,
      saveStatus: 'idle',
      storageSource: 'local',
    });
  },

  /**
   * Exports current draft data to JSON file
   * @param {string} [filename='profile-hub-config.json']
   */
  exportData: (filename = 'profile-hub-config.json') => {
    const payload = extractPayload(get());
    return dataProvider.exportDataToJson(payload, filename);
  },

  /**
   * Imports JSON data into live draft
   */
  importData: (importedData) => {
    try {
      const validated = dataProvider.validateImportData(importedData);
      if (validated?.settings?.themePreset) {
        applyThemeToDOM(validated.settings.themePreset, validated.settings.customColors);
      }

      set((state) => {
        const nextDraft = {
          ...state,
          profile: validated.profile,
          links: validated.links,
          favorites: validated.favorites,
          music: validated.music,
          settings: validated.settings,
        };
        return {
          profile: validated.profile,
          links: validated.links,
          favorites: validated.favorites,
          music: validated.music,
          settings: validated.settings,
          isDirty: computeIsDirty(nextDraft, state.committedState),
        };
      });
      return { success: true };
    } catch (err) {
      console.error('[useProfileStore] Import error:', err);
      return { success: false, error: err.message };
    }
  },

  // =========================================================================
  // UI & Owner Mode Controls
  // =========================================================================

  setIsOwner: (isOwner) => set({ isOwner }),
  setCustomizerOpen: (open) => set({ customizerOpen: open }),
  openCustomizer: (tab = 'profile') => set({ customizerOpen: true, activeTab: tab }),
  closeCustomizer: () => set({ customizerOpen: false }),
  toggleCustomizer: () => set((state) => ({ customizerOpen: !state.customizerOpen })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
}));
