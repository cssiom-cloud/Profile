/**
 * src/lib/dataProvider.js
 * Storage Provider Pattern implementation with automatic LocalStorage read/write cache,
 * seed data fallback, schema normalization, and optional Supabase cloud persistence.
 */
import { isSupabaseConfigured, supabase } from './supabase.js';
import { DEFAULT_PROFILE_DATA } from '../data/defaultData.js';

export const LOCAL_STORAGE_KEY = 'profile_hub_local_storage_v1';

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

export const dataProvider = {
  /**
   * Probes if Supabase is active and connected
   * @returns {boolean}
   */
  isSupabaseActive() {
    return isSupabaseConfigured() && supabase !== null;
  },

  /**
   * Fetches profile data following the cascade:
   * 1. Supabase (if active)
   * 2. LocalStorage cache (with schema normalization & deep merge)
   * 3. Built-in seed data (DEFAULT_PROFILE_DATA)
   * @returns {Promise<typeof DEFAULT_PROFILE_DATA>}
   */
  async fetchData() {
    // 1. Try Supabase cloud if active
    if (this.isSupabaseActive()) {
      try {
        const { data: profileRecord, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!profileErr && profileRecord) {
          const profileId = profileRecord.id;

          const [linksRes, favsRes, settingsRes] = await Promise.all([
            supabase.from('links').select('*').eq('profile_id', profileId).order('sort_order', { ascending: true }),
            supabase.from('favorites').select('*').eq('profile_id', profileId).order('sort_order', { ascending: true }),
            supabase.from('site_settings').select('*').eq('profile_id', profileId).maybeSingle(),
          ]);

          const cloudData = {
            profile: {
              name: profileRecord.name || DEFAULT_PROFILE_DATA.profile.name,
              handle: profileRecord.handle || DEFAULT_PROFILE_DATA.profile.handle,
              bio: profileRecord.bio || DEFAULT_PROFILE_DATA.profile.bio,
              quote: profileRecord.quote || DEFAULT_PROFILE_DATA.profile.quote,
              avatarUrl: profileRecord.avatar_url || DEFAULT_PROFILE_DATA.profile.avatarUrl,
              bannerUrl: profileRecord.banner_url || DEFAULT_PROFILE_DATA.profile.bannerUrl,
              location: profileRecord.location || DEFAULT_PROFILE_DATA.profile.location,
              statusBadge: profileRecord.status_badge || DEFAULT_PROFILE_DATA.profile.statusBadge,
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

          // Cache cloud data to LocalStorage for offline resilience
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudData));
            }
          } catch (storageErr) {
            console.warn('[DataProvider] Failed caching to LocalStorage:', storageErr);
          }

          return cloudData;
        }
      } catch (err) {
        console.warn('[DataProvider] Supabase fetch failed, continuing to LocalStorage:', err);
      }
    }

    // 2. Fallback to LocalStorage with schema normalization & deep merge
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached !== null) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const hasProfile = Boolean(
              parsed.profile &&
              (typeof parsed.profile === 'string' || (typeof parsed.profile === 'object' && !Array.isArray(parsed.profile)))
            );

            // Accept and deep merge if either valid profile or links array is present
            if (hasProfile || Array.isArray(parsed.links)) {
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
                profile: normalizedProfile,
                links: normalizedLinks,
                favorites: normalizedFavorites,
                music: normalizedMusic,
                settings: normalizedSettings,
              };
            }
          }
        }
      }
    } catch (e) {
      console.warn('[DataProvider] LocalStorage read failed, falling back to seed:', e);
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

    let localSaved = false;
    let localError = null;

    // 1. Synchronously persist to LocalStorage
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
        localSaved = true;
      } else {
        localError = new Error('localStorage is undefined');
      }
    } catch (err) {
      console.error('[DataProvider] LocalStorage save failed:', err);
      localError = err;
    }

    // 2. If Supabase is active, persist to PostgreSQL tables
    if (this.isSupabaseActive()) {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .maybeSingle();

        let profileId = existingProfile?.id;

        if (profileId) {
          await supabase.from('profiles').update({
            name: sanitized.profile.name,
            handle: sanitized.profile.handle,
            bio: sanitized.profile.bio,
            quote: sanitized.profile.quote,
            avatar_url: sanitized.profile.avatarUrl,
            banner_url: sanitized.profile.bannerUrl,
            location: sanitized.profile.location,
            status_badge: sanitized.profile.statusBadge,
          }).eq('id', profileId);
        } else {
          const { data: newProfile, error: insertErr } = await supabase.from('profiles').insert({
            name: sanitized.profile.name,
            handle: sanitized.profile.handle,
            bio: sanitized.profile.bio,
            quote: sanitized.profile.quote,
            avatar_url: sanitized.profile.avatarUrl,
            banner_url: sanitized.profile.bannerUrl,
            location: sanitized.profile.location,
            status_badge: sanitized.profile.statusBadge,
          }).select('id').single();

          if (insertErr) throw insertErr;
          profileId = newProfile.id;
        }

        // Sync links
        await supabase.from('links').delete().eq('profile_id', profileId);
        if (sanitized.links && sanitized.links.length > 0) {
          const linksPayload = sanitized.links.map((link, idx) => ({
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
        if (sanitized.favorites && sanitized.favorites.length > 0) {
          const favsPayload = sanitized.favorites.map((fav, idx) => ({
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
          theme_preset: sanitized.settings.themePreset,
          layout_style: sanitized.settings.layoutStyle,
          card_style: sanitized.settings.cardStyle,
          particle_density: sanitized.settings.particleDensity,
          music_title: sanitized.music.title,
          music_artist: sanitized.music.artist,
          music_audio_url: sanitized.music.audioUrl,
          music_cover_url: sanitized.music.coverUrl,
          music_spotify_url: sanitized.music.spotifyUrl,
          music_youtube_url: sanitized.music.youtubeUrl,
          custom_css_or_config: {
            isAutoPlay: sanitized.music.isAutoPlay ?? false,
            defaultVolume: sanitized.music.defaultVolume ?? 0.7,
            customColors: sanitized.settings.customColors || null,
          },
        }, { onConflict: 'profile_id' });

        return {
          success: true,
          source: 'supabase',
          warning: localError ? `Saved to Supabase, but LocalStorage cache failed: ${localError.message}` : undefined,
        };
      } catch (cloudErr) {
        console.warn('[DataProvider] Supabase sync failed:', cloudErr);
        if (localSaved) {
          return {
            success: true,
            source: 'local',
            warning: 'Changes saved locally. Supabase sync encountered an error.',
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
