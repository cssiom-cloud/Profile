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

  /**
   * Removes a media item from IndexedDB
   * @param {string} key
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    if (!key) return;
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
