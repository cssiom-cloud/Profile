/**
 * src/lib/dataProvider.js
 * Storage Provider Pattern implementation with automatic LocalStorage read/write cache,
 * seed data fallback, schema normalization, and optional Supabase cloud persistence.
 */
import { isSupabaseConfigured, supabase } from './supabase.js';
import { DEFAULT_PROFILE_DATA } from '../data/defaultData.js';
import { mediaStorage } from './mediaStorage.js';

export const LOCAL_STORAGE_KEY = 'profile_hub_local_storage_v1';

/**
 * Helper to produce deep clones preventing shared object reference mutations
 */
/**
 * Helper to produce deep clones preventing shared object reference mutations
 */
const deepClone = (obj) => {
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
};

/**
 * Timeout helper to prevent hanging cloud network requests
 */
const fetchWithTimeout = (promise, ms = 3500) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
};

export const dataProvider = {
  /**
   * Probes if Supabase is active and connected
   * @returns {boolean}
   */
  isSupabaseActive() {
    return isSupabaseConfigured() && supabase !== null;
  },

  /**
   * Normalizes a raw object into compliant Profile Data structure
   */
  normalizePayload(parsed) {
    if (!parsed || typeof parsed !== 'object') {
      return deepClone(DEFAULT_PROFILE_DATA);
    }

    let normalizedProfile;
    if (typeof parsed.profile === 'string') {
      normalizedProfile = {
        ...deepClone(DEFAULT_PROFILE_DATA.profile),
        name: parsed.profile || DEFAULT_PROFILE_DATA.profile.name,
      };
    } else if (parsed.profile && typeof parsed.profile === 'object' && !Array.isArray(parsed.profile)) {
      normalizedProfile = {
        ...deepClone(DEFAULT_PROFILE_DATA.profile),
        ...parsed.profile,
        name: typeof parsed.profile.name === 'string' ? parsed.profile.name : DEFAULT_PROFILE_DATA.profile.name,
      };
    } else {
      normalizedProfile = deepClone(DEFAULT_PROFILE_DATA.profile);
    }

    const normalizedLinks = Array.isArray(parsed.links)
      ? parsed.links
      : deepClone(DEFAULT_PROFILE_DATA.links);

    const normalizedFavorites = Array.isArray(parsed.favorites)
      ? parsed.favorites
      : deepClone(DEFAULT_PROFILE_DATA.favorites);

    const normalizedMusic = (parsed.music && typeof parsed.music === 'object' && !Array.isArray(parsed.music))
      ? { ...deepClone(DEFAULT_PROFILE_DATA.music), ...parsed.music }
      : deepClone(DEFAULT_PROFILE_DATA.music);

    const normalizedSettings = (parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings))
      ? { ...deepClone(DEFAULT_PROFILE_DATA.settings), ...parsed.settings }
      : deepClone(DEFAULT_PROFILE_DATA.settings);

    return {
      _updatedAt: parsed._updatedAt || 0,
      profile: normalizedProfile,
      links: normalizedLinks,
      favorites: normalizedFavorites,
      music: normalizedMusic,
      settings: normalizedSettings,
    };
  },

  /**
   * Offloads multi-megabyte media strings (e.g. uploaded base64 audio, high-res covers)
   * into IndexedDB so localStorage (<5MB total quota) and Supabase REST requests (<2MB body)
   * remain fast, lightweight, and quota-safe.
   */
  async offloadLargeMedia(payload) {
    const clone = deepClone(payload);

    // 1. Offload audio if large base64 or custom audio (>64KB)
    if (clone.music && typeof clone.music.audioUrl === 'string') {
      const audio = clone.music.audioUrl;
      if (audio.startsWith('data:audio') || audio.startsWith('blob:') || audio.length > 64 * 1024) {
        try {
          await mediaStorage.setItem('custom_audio_file', audio);
          clone.music.audioUrl = 'indexeddb://custom_audio_file';
        } catch (err) {
          console.warn('[DataProvider] Failed to offload audio to IndexedDB:', err);
        }
      }
    }

    // 2. Offload custom music cover if large base64 (>150KB)
    if (clone.music && typeof clone.music.coverUrl === 'string') {
      const cover = clone.music.coverUrl;
      if (cover.startsWith('data:image') && cover.length > 150 * 1024) {
        try {
          await mediaStorage.setItem('custom_music_cover', cover);
          clone.music.coverUrl = 'indexeddb://custom_music_cover';
        } catch (err) {
          console.warn('[DataProvider] Failed to offload music cover to IndexedDB:', err);
        }
      }
    }

    // 3. Offload custom profile avatar if large base64 (>150KB)
    if (clone.profile && typeof clone.profile.avatarUrl === 'string') {
      const avatar = clone.profile.avatarUrl;
      if (avatar.startsWith('data:image') && avatar.length > 150 * 1024) {
        try {
          await mediaStorage.setItem('custom_avatar_url', avatar);
          clone.profile.avatarUrl = 'indexeddb://custom_avatar_url';
        } catch (err) {
          console.warn('[DataProvider] Failed to offload avatar to IndexedDB:', err);
        }
      }
    }

    // 4. Offload custom banner if large base64 (>250KB)
    if (clone.profile && typeof clone.profile.bannerUrl === 'string') {
      const banner = clone.profile.bannerUrl;
      if (banner.startsWith('data:image') && banner.length > 250 * 1024) {
        try {
          await mediaStorage.setItem('custom_banner_url', banner);
          clone.profile.bannerUrl = 'indexeddb://custom_banner_url';
        } catch (err) {
          console.warn('[DataProvider] Failed to offload banner to IndexedDB:', err);
        }
      }
    }

    return clone;
  },

  /**
   * Rehydrates indexeddb:// URI pointers back to their full media data from IndexedDB
   */
  async restoreMediaFromIndexedDB(payload) {
    if (!payload || typeof payload !== 'object') return payload;

    // Restore audio pointer and auto-migrate legacy large data URLs
    if (payload.music && typeof payload.music.audioUrl === 'string') {
      if (payload.music.audioUrl.startsWith('indexeddb://')) {
        // Keep the lightweight pointer 'indexeddb://custom_audio_file' in the store state!
        // DO NOT blow up the React state with a 13.5MB base64 string.
        // MusicPlayer and MusicEditorTab resolve it on-demand via mediaStorage.getPlayableUrl().
      } else if (payload.music.audioUrl.startsWith('data:audio') || payload.music.audioUrl.length > 64 * 1024) {
        // Auto-migrate legacy multi-megabyte data URLs to IndexedDB to free up main thread
        try {
          await mediaStorage.setItem('custom_audio_file', payload.music.audioUrl);
          payload.music.audioUrl = 'indexeddb://custom_audio_file';
        } catch (err) {
          console.warn('[DataProvider] Failed auto-migrating legacy audio dataUrl:', err);
        }
      }
    }

    // Restore music cover
    if (payload.music && typeof payload.music.coverUrl === 'string' && payload.music.coverUrl.startsWith('indexeddb://')) {
      const key = payload.music.coverUrl.replace('indexeddb://', '') || 'custom_music_cover';
      try {
        const stored = await mediaStorage.getItem(key);
        if (stored) payload.music.coverUrl = stored;
        else payload.music.coverUrl = DEFAULT_PROFILE_DATA.music.coverUrl;
      } catch {
        payload.music.coverUrl = DEFAULT_PROFILE_DATA.music.coverUrl;
      }
    }

    // Restore avatar
    if (payload.profile && typeof payload.profile.avatarUrl === 'string' && payload.profile.avatarUrl.startsWith('indexeddb://')) {
      const key = payload.profile.avatarUrl.replace('indexeddb://', '') || 'custom_avatar_url';
      try {
        const stored = await mediaStorage.getItem(key);
        if (stored) payload.profile.avatarUrl = stored;
        else payload.profile.avatarUrl = DEFAULT_PROFILE_DATA.profile.avatarUrl;
      } catch {
        payload.profile.avatarUrl = DEFAULT_PROFILE_DATA.profile.avatarUrl;
      }
    }

    // Restore banner
    if (payload.profile && typeof payload.profile.bannerUrl === 'string' && payload.profile.bannerUrl.startsWith('indexeddb://')) {
      const key = payload.profile.bannerUrl.replace('indexeddb://', '') || 'custom_banner_url';
      try {
        const stored = await mediaStorage.getItem(key);
        if (stored) payload.profile.bannerUrl = stored;
        else payload.profile.bannerUrl = DEFAULT_PROFILE_DATA.profile.bannerUrl;
      } catch {
        payload.profile.bannerUrl = DEFAULT_PROFILE_DATA.profile.bannerUrl;
      }
    }

    return payload;
  },

  /**
   * Silently synchronizes data to Supabase in the background without blocking UI
   */
  async syncToSupabaseSilently(data) {
    try {
      if (this.isSupabaseActive()) {
        await this.saveData(data);
      }
    } catch (err) {
      console.warn('[DataProvider] Background sync warning:', err);
    }
  },

  /**
   * Fetches profile data following the cascade:
   * 1. Supabase (if active, with 3.5s timeout)
   * 2. LocalStorage cache (with schema normalization & deep merge)
   * 3. Built-in seed data (DEFAULT_PROFILE_DATA)
   * Safeguard: LocalStorage user customizations are NEVER overwritten by stale Supabase seeds.
   * @returns {Promise<typeof DEFAULT_PROFILE_DATA>}
   */
  async fetchData() {
    // Read local cache first to inspect last user edits
    let localData = null;
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached !== null) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') {
            localData = parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[DataProvider] LocalStorage pre-read failed:', e);
    }

    // 1. Try Supabase cloud if active
    if (this.isSupabaseActive()) {
      try {
        const cloudResult = await fetchWithTimeout((async () => {
          const { data: profileRecord, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (profileErr || !profileRecord) return null;

          const profileId = profileRecord.id;

          const [linksRes, favsRes, settingsRes] = await Promise.all([
            supabase.from('links').select('*').eq('profile_id', profileId).order('sort_order', { ascending: true }),
            supabase.from('favorites').select('*').eq('profile_id', profileId).order('sort_order', { ascending: true }),
            supabase.from('site_settings').select('*').eq('profile_id', profileId).maybeSingle(),
          ]);

          return { profileRecord, linksRes, favsRes, settingsRes };
        })(), 3500);

        if (cloudResult && cloudResult.profileRecord) {
          const { profileRecord, linksRes, favsRes, settingsRes } = cloudResult;
          const cloudData = {
            _updatedAt: profileRecord.updated_at ? new Date(profileRecord.updated_at).getTime() : 0,
            profile: {
              name: profileRecord.name || DEFAULT_PROFILE_DATA.profile.name,
              handle: profileRecord.handle || DEFAULT_PROFILE_DATA.profile.handle,
              bio: profileRecord.bio || DEFAULT_PROFILE_DATA.profile.bio,
              quote: profileRecord.quote || DEFAULT_PROFILE_DATA.profile.quote,
              avatarUrl: profileRecord.avatar_url || DEFAULT_PROFILE_DATA.profile.avatarUrl,
              bannerUrl: profileRecord.banner_url || DEFAULT_PROFILE_DATA.profile.bannerUrl,
              location: profileRecord.location || DEFAULT_PROFILE_DATA.profile.location,
              statusBadge: profileRecord.status_badge || DEFAULT_PROFILE_DATA.profile.statusBadge,
              footerCraftedBy: profileRecord.footer_crafted_by || DEFAULT_PROFILE_DATA.profile.footerCraftedBy,
              footerCopyright: profileRecord.footer_copyright || DEFAULT_PROFILE_DATA.profile.footerCopyright,
              footerCredits: profileRecord.footer_credits || DEFAULT_PROFILE_DATA.profile.footerCredits,
              showFooterCredits: profileRecord.show_footer_credits ?? DEFAULT_PROFILE_DATA.profile.showFooterCredits,
            },
            links: (linksRes.data && linksRes.data.length > 0)
              ? linksRes.data.map((l) => ({
                  id: l.id,
                  title: l.title,
                  url: l.url,
                  icon: l.icon || 'Globe',
                  category: l.category || 'social',
                  order: l.sort_order ?? 0,
                  isActive: l.is_active !== false,
                  highlightColor: l.highlight_color || undefined,
                }))
              : deepClone(DEFAULT_PROFILE_DATA.links),
            favorites: (favsRes.data && favsRes.data.length > 0)
              ? favsRes.data.map((f) => ({
                  id: f.id,
                  category: f.category || 'tech',
                  title: f.title,
                  subtitle: f.subtitle || undefined,
                  iconOrImage: f.icon_or_image || undefined,
                  badge: f.badge || undefined,
                  order: f.sort_order ?? 0,
                }))
              : deepClone(DEFAULT_PROFILE_DATA.favorites),
            music: {
              title: settingsRes.data?.music_title || DEFAULT_PROFILE_DATA.music.title,
              artist: settingsRes.data?.music_artist || DEFAULT_PROFILE_DATA.music.artist,
              audioUrl: settingsRes.data?.music_audio_url || DEFAULT_PROFILE_DATA.music.audioUrl,
              coverUrl: settingsRes.data?.music_cover_url || DEFAULT_PROFILE_DATA.music.coverUrl,
              spotifyUrl: settingsRes.data?.music_spotify_url || DEFAULT_PROFILE_DATA.music.spotifyUrl,
              youtubeUrl: settingsRes.data?.music_youtube_url || DEFAULT_PROFILE_DATA.music.youtubeUrl,
              isAutoPlay: settingsRes.data?.custom_css_or_config?.isAutoPlay ?? false,
              defaultVolume: settingsRes.data?.custom_css_or_config?.defaultVolume ?? 0.7,
            },
            settings: {
              themePreset: settingsRes.data?.theme_preset || DEFAULT_PROFILE_DATA.settings.themePreset,
              layoutStyle: settingsRes.data?.layout_style || DEFAULT_PROFILE_DATA.settings.layoutStyle,
              cardStyle: settingsRes.data?.card_style || DEFAULT_PROFILE_DATA.settings.cardStyle,
              particleDensity: settingsRes.data?.particle_density || DEFAULT_PROFILE_DATA.settings.particleDensity,
              customColors: settingsRes.data?.custom_css_or_config?.customColors || DEFAULT_PROFILE_DATA.settings.customColors,
            },
          };

          // Conflict resolution: protect local edits against stale cloud seeds
          const localTimestamp = localData?._updatedAt || 0;
          const cloudTimestamp = cloudData._updatedAt || 0;
          const localIsCustomized = Boolean(
            localData?.profile?.name && localData.profile.name !== DEFAULT_PROFILE_DATA.profile.name
          );
          const cloudIsDefaultSeed = profileRecord.name === DEFAULT_PROFILE_DATA.profile.name;

          if (localData && (localTimestamp > cloudTimestamp || (localIsCustomized && cloudIsDefaultSeed))) {
            // Local storage has newer or customized data! Do not overwrite local.
            this.syncToSupabaseSilently(localData);
            const restored = await this.restoreMediaFromIndexedDB(localData);
            return this.normalizePayload(restored);
          }

          // Cache cloud data to LocalStorage for offline resilience
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudData));
            }
          } catch (storageErr) {
            console.warn('[DataProvider] Failed caching to LocalStorage:', storageErr);
          }

          const restoredCloud = await this.restoreMediaFromIndexedDB(cloudData);
          return restoredCloud;
        }
      } catch (err) {
        console.warn('[DataProvider] Supabase fetch timed out or failed, falling back to LocalStorage:', err);
      }
    }

    // 2. Fallback to LocalStorage with schema normalization & deep merge
    if (localData) {
      const restoredLocal = await this.restoreMediaFromIndexedDB(localData);
      return this.normalizePayload(restoredLocal);
    }

    // 3. Built-in seed data fallback
    const seed = deepClone(DEFAULT_PROFILE_DATA);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seed));
      }
    } catch {
      // Ignore write errors in restricted sandbox
    }
    return seed;
  },

  /**
   * Persists data to LocalStorage and mirrors to Supabase when active
   * @param {typeof DEFAULT_PROFILE_DATA} data
   * @returns {Promise<{ success: boolean; source: 'supabase' | 'local'; warning?: string; error?: string }>}
   */
  async saveData(data) {
    if (!data || typeof data !== 'object') {
      return { success: false, source: 'local', error: 'Invalid data payload: must be an object' };
    }

    // Sanitize data payload before persistence
    const sanitized = {
      _updatedAt: data._updatedAt || Date.now(),
      profile: (data.profile && typeof data.profile === 'object' && !Array.isArray(data.profile))
        ? { ...DEFAULT_PROFILE_DATA.profile, ...data.profile }
        : deepClone(DEFAULT_PROFILE_DATA.profile),
      links: Array.isArray(data.links)
        ? data.links
            .filter((l) => l !== null && typeof l === 'object' && !Array.isArray(l))
            .map((l, idx) => ({ ...l, order: typeof l.order === 'number' ? l.order : idx }))
        : deepClone(DEFAULT_PROFILE_DATA.links),
      favorites: Array.isArray(data.favorites)
        ? data.favorites
            .filter((f) => f !== null && typeof f === 'object' && !Array.isArray(f))
            .map((f, idx) => ({ ...f, order: typeof f.order === 'number' ? f.order : idx }))
        : deepClone(DEFAULT_PROFILE_DATA.favorites),
      music: (data.music && typeof data.music === 'object' && !Array.isArray(data.music))
        ? { ...DEFAULT_PROFILE_DATA.music, ...data.music }
        : deepClone(DEFAULT_PROFILE_DATA.music),
      settings: (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings))
        ? { ...DEFAULT_PROFILE_DATA.settings, ...data.settings }
        : deepClone(DEFAULT_PROFILE_DATA.settings),
    };

    // Offload multi-megabyte media to IndexedDB so localStorage (<5MB) and Supabase REST body (<2MB) stay ultra-lightweight
    const lightweight = await this.offloadLargeMedia(sanitized);

    let localSaved = false;
    let localError = null;

    // 1. Synchronously persist to LocalStorage
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweight));
        localSaved = true;
      } else {
        localError = new Error('localStorage is undefined');
      }
    } catch (err) {
      console.warn('[DataProvider] LocalStorage save failed, attempting emergency compression:', err);
      localError = err;
      // Emergency recovery: strip large data: URLs from lightweight to guarantee persistence
      try {
        const emergencyClean = deepClone(lightweight);
        if (emergencyClean.music?.audioUrl?.startsWith('data:')) {
          emergencyClean.music.audioUrl = 'indexeddb://custom_audio_file';
        }
        if (emergencyClean.profile?.avatarUrl?.startsWith('data:')) {
          emergencyClean.profile.avatarUrl = DEFAULT_PROFILE_DATA.profile.avatarUrl;
        }
        if (emergencyClean.profile?.bannerUrl?.startsWith('data:')) {
          emergencyClean.profile.bannerUrl = DEFAULT_PROFILE_DATA.profile.bannerUrl;
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(emergencyClean));
          localSaved = true;
          localError = null;
        }
      } catch (emergencyErr) {
        console.error('[DataProvider] Emergency cleanup save also failed:', emergencyErr);
      }
    }

    // 2. If Supabase is active, persist to PostgreSQL tables (with 4000ms timeout)
    if (this.isSupabaseActive()) {
      try {
        await fetchWithTimeout((async () => {
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)
            .maybeSingle();

          let profileId = existingProfile?.id;

          const profilePayload = {
            name: lightweight.profile.name,
            handle: lightweight.profile.handle,
            bio: lightweight.profile.bio,
            quote: lightweight.profile.quote,
            avatar_url: lightweight.profile.avatarUrl,
            banner_url: lightweight.profile.bannerUrl,
            location: lightweight.profile.location,
            status_badge: lightweight.profile.statusBadge,
          };

          if (profileId) {
            await supabase.from('profiles').update(profilePayload).eq('id', profileId);
          } else {
            const { data: newProfile, error: insertErr } = await supabase
              .from('profiles')
              .insert(profilePayload)
              .select('id')
              .single();

            if (insertErr) throw insertErr;
            profileId = newProfile?.id;
          }

          if (profileId) {
            // Sync links
            await supabase.from('links').delete().eq('profile_id', profileId);
            if (lightweight.links && lightweight.links.length > 0) {
              const linksPayload = lightweight.links.map((link, idx) => ({
                profile_id: profileId,
                title: link.title || 'Untitled',
                url: link.url || 'https://',
                icon: link.icon || 'Globe',
                category: link.category || 'social',
                sort_order: link.order ?? idx,
                is_active: link.isActive !== false,
                highlight_color: link.highlightColor || null,
              }));
              await supabase.from('links').insert(linksPayload);
            }

            // Sync favorites
            await supabase.from('favorites').delete().eq('profile_id', profileId);
            if (lightweight.favorites && lightweight.favorites.length > 0) {
              const favsPayload = lightweight.favorites.map((fav, idx) => ({
                profile_id: profileId,
                category: fav.category || 'tech',
                title: fav.title || 'Favorite',
                subtitle: fav.subtitle || null,
                icon_or_image: fav.iconOrImage || null,
                badge: fav.badge || null,
                sort_order: fav.order ?? idx,
              }));
              await supabase.from('favorites').insert(favsPayload);
            }

            // Sync site settings
            await supabase.from('site_settings').upsert({
              profile_id: profileId,
              theme_preset: lightweight.settings.themePreset,
              layout_style: lightweight.settings.layoutStyle,
              card_style: lightweight.settings.cardStyle,
              particle_density: lightweight.settings.particleDensity,
              music_title: lightweight.music.title,
              music_artist: lightweight.music.artist,
              music_audio_url: lightweight.music.audioUrl,
              music_cover_url: lightweight.music.coverUrl,
              music_spotify_url: lightweight.music.spotifyUrl,
              music_youtube_url: lightweight.music.youtubeUrl,
              custom_css_or_config: {
                isAutoPlay: lightweight.music.isAutoPlay ?? false,
                defaultVolume: lightweight.music.defaultVolume ?? 0.7,
                customColors: lightweight.settings.customColors || null,
              },
            }, { onConflict: 'profile_id' });
          }
        })(), 4000);

        return {
          success: true,
          source: 'supabase',
          warning: localError ? `Saved to Supabase, but LocalStorage cache failed: ${localError.message}` : undefined,
        };
      } catch (cloudErr) {
        console.warn('[DataProvider] Supabase sync failed or timed out:', cloudErr);
        if (localSaved) {
          return {
            success: true,
            source: 'local',
            warning: 'Changes saved locally. Supabase sync timed out or encountered an error.',
          };
        } else {
          return {
            success: false,
            source: 'supabase',
            error: `Both cloud and local storage failed. Cloud: ${cloudErr.message}. Local: ${localError?.message || 'Storage error'}`,
          };
        }
      }
    }

    // Offline / Local-only storage
    if (!localSaved) {
      return {
        success: false,
        source: 'local',
        error: localError ? localError.message : 'Failed to write to LocalStorage',
      };
    }

    return { success: true, source: 'local' };
  },

  /**
   * Resets stored profile data back to default initial seed
   * @returns {Promise<typeof DEFAULT_PROFILE_DATA>}
   */
  async resetData() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
      await mediaStorage.removeItem('custom_audio_file');
      await mediaStorage.removeItem('custom_music_cover');
      await mediaStorage.removeItem('custom_avatar_url');
      await mediaStorage.removeItem('custom_banner_url');
    } catch {
      // Ignore
    }
    const seed = deepClone(DEFAULT_PROFILE_DATA);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seed));
      }
    } catch {
      // Ignore
    }
    return seed;
  },

  /**
   * Exports data as a downloadable JSON file or formatted JSON string
   * @param {typeof DEFAULT_PROFILE_DATA} data
   * @param {string} [filename='profile-hub-config.json']
   * @returns {string} Formatted JSON string
   */
  exportDataToJson(data, filename = 'profile-hub-config.json') {
    const jsonStr = JSON.stringify(data, null, 2);
    if (typeof document !== 'undefined') {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'profile-hub-config.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    return jsonStr;
  },

  /**
   * Validates and normalizes imported JSON data
   * @param {string | object} raw
   * @returns {typeof DEFAULT_PROFILE_DATA} Sanitized data
   */
  validateImportData(raw) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Invalid JSON: Root must be an object');
    }
    if (!data.profile || typeof data.profile !== 'object' || Array.isArray(data.profile)) {
      throw new Error('Invalid JSON: profile must be an object');
    }
    if (typeof data.profile.name !== 'string') {
      throw new Error('Invalid JSON: Missing required profile.name');
    }
    if (!Array.isArray(data.links)) {
      throw new Error('Invalid JSON: links must be an array');
    }
    if (data.favorites !== undefined && !Array.isArray(data.favorites)) {
      throw new Error('Invalid JSON: favorites must be an array');
    }

    // Sanitize links array against null, undefined, or non-object elements
    const sanitizedLinks = data.links
      .filter((l) => l !== null && typeof l === 'object' && !Array.isArray(l))
      .map((l, idx) => ({
        ...l,
        order: typeof l.order === 'number' ? l.order : idx,
      }));

    // Sanitize favorites array against null, undefined, or non-object elements
    const rawFavs = Array.isArray(data.favorites) ? data.favorites : DEFAULT_PROFILE_DATA.favorites;
    const sanitizedFavorites = rawFavs
      .filter((f) => f !== null && typeof f === 'object' && !Array.isArray(f))
      .map((f, idx) => ({
        ...f,
        order: typeof f.order === 'number' ? f.order : idx,
      }));

    return {
      profile: {
        ...DEFAULT_PROFILE_DATA.profile,
        ...data.profile,
      },
      links: sanitizedLinks,
      favorites: sanitizedFavorites,
      music: {
        ...DEFAULT_PROFILE_DATA.music,
        ...(data.music && typeof data.music === 'object' && !Array.isArray(data.music) ? data.music : {}),
      },
      settings: {
        ...DEFAULT_PROFILE_DATA.settings,
        ...(data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings) ? data.settings : {}),
      },
    };
  },
};
