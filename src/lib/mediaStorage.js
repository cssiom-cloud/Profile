/**
 * src/lib/mediaStorage.js
 * High-capacity IndexedDB storage for large media assets (MP3 audio files, high-res covers).
 * Prevents localStorage QuotaExceededError (5MB limit) by storing multi-megabyte files in IndexedDB.
 */

const DB_NAME = 'ProfileHubMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

// In-memory fallback for environments without IndexedDB (e.g. Node tests, restricted sandboxes)
const memoryFallback = new Map();

const openDB = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => {
        console.warn('[mediaStorage] IndexedDB open error, using memory fallback:', event.target?.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('[mediaStorage] IndexedDB initialization failed:', err);
      resolve(null);
    }
  });
};

export const mediaStorage = {
  /**
   * Stores a media string or blob into IndexedDB
   * @param {string} key
   * @param {string | Blob} value
   * @returns {Promise<boolean>}
   */
  async setItem(key, value) {
    if (!key) return false;
    this.revokePlayableUrl(key);
    memoryFallback.set(key, value);

    const db = await openDB();
    if (!db) return true;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => {
          console.warn('[mediaStorage] setItem error:', req.error);
          resolve(false);
        };
      } catch (err) {
        console.warn('[mediaStorage] setItem transaction error:', err);
        resolve(false);
      }
    });
  },

  /**
   * Retrieves a media item from IndexedDB
   * @param {string} key
   * @returns {Promise<string | Blob | null>}
   */
  async getItem(key) {
    if (!key) return null;
    const db = await openDB();
    if (!db) return memoryFallback.get(key) || null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : memoryFallback.get(key) || null);
        req.onerror = () => resolve(memoryFallback.get(key) || null);
      } catch {
        resolve(memoryFallback.get(key) || null);
      }
    });
  },

  // Cache of generated blob URLs to avoid duplicate memory allocation
  blobUrlCache: new Map(),

  /**
   * Resolves a media key to a high-performance playable URL.
   * If the item is a Blob/File or base64 data URL, provides a fast object URL (blob:...).
   * @param {string} key
   * @returns {Promise<string | null>}
   */
  async getPlayableUrl(key) {
    if (!key) return null;

    if (this.blobUrlCache.has(key)) {
      return this.blobUrlCache.get(key);
    }

    const item = await this.getItem(key);
    if (!item) return null;

    if (typeof window === 'undefined') {
      return typeof item === 'string' ? item : null;
    }

    if (typeof Blob !== 'undefined' && item instanceof Blob) {
      const url = URL.createObjectURL(item);
      this.blobUrlCache.set(key, url);
      return url;
    }

    if (typeof item === 'string') {
      if (item.startsWith('blob:') || item.startsWith('http://') || item.startsWith('https://')) {
        return item;
      }
      if (item.startsWith('data:audio') && typeof window !== 'undefined' && window.URL && window.Blob) {
        try {
          const parts = item.split(';base64,');
          if (parts.length === 2) {
            const mime = parts[0].split(':')[1] || 'audio/mpeg';
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const url = URL.createObjectURL(blob);
            this.blobUrlCache.set(key, url);
            return url;
          }
        } catch (err) {
          console.warn('[mediaStorage] Failed converting dataUrl to Blob:', err);
        }
      }
      return item;
    }

    return null;
  },

  /**
   * Revokes cached blob URL for a key when media is updated or removed
   */
  revokePlayableUrl(key) {
    if (this.blobUrlCache.has(key)) {
      try {
        if (typeof URL !== 'undefined') {
          URL.revokeObjectURL(this.blobUrlCache.get(key));
        }
      } catch {
        // ignore
      }
      this.blobUrlCache.delete(key);
    }
  },

  /**
   * Removes a media item from IndexedDB
   * @param {string} key
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    if (!key) return;
    this.revokePlayableUrl(key);
    memoryFallback.delete(key);
    const db = await openDB();
    if (!db) return;

    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    } catch {
      // ignore
    }
  },
};
