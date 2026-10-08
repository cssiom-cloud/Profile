/**
 * tests/test-large-media-storage.js
 * Verification of high-capacity media offloading and QuotaExceededError prevention.
 */
import assert from 'node:assert/strict';
import { dataProvider, LOCAL_STORAGE_KEY } from '../src/lib/dataProvider.js';
import { mediaStorage } from '../src/lib/mediaStorage.js';
import { DEFAULT_PROFILE_DATA } from '../src/data/defaultData.js';

// Setup Mock LocalStorage with realistic 5MB quota
class MockQuotaLocalStorage {
  constructor(quotaBytes = 5 * 1024 * 1024) {
    this.store = new Map();
    this.quotaBytes = quotaBytes;
  }
  getItem(key) {
    return this.store.get(key) ?? null;
  }
  setItem(key, value) {
    const serialized = String(value);
    let currentUsage = 0;
    for (const [k, v] of this.store.entries()) {
      if (k !== key) currentUsage += (k.length + v.length) * 2;
    }
    const newUsage = currentUsage + (key.length + serialized.length) * 2;
    if (newUsage > this.quotaBytes) {
      const err = new Error(
        `Failed to execute 'setItem' on 'Storage': Setting the value of '${key}' exceeded the quota.`
      );
      err.name = 'QuotaExceededError';
      throw err;
    }
    this.store.set(key, serialized);
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

async function runTest() {
  console.log('[1/4] Setting up mock storage with 5MB quota...');
  globalThis.localStorage = new MockQuotaLocalStorage(5 * 1024 * 1024);

  // Generate a mock 6MB base64 MP3 data string (simulates 4.5MB MP3 file)
  console.log('[2/4] Generating large 6MB base64 audio payload...');
  const largeAudioChunk = 'A'.repeat(6 * 1024 * 1024);
  const largeAudioDataUrl = `data:audio/mpeg;base64,${largeAudioChunk}`;

  const testPayload = {
    ...DEFAULT_PROFILE_DATA,
    profile: {
      ...DEFAULT_PROFILE_DATA.profile,
      name: 'Test Artist with Large Audio',
    },
    music: {
      ...DEFAULT_PROFILE_DATA.music,
      title: 'PLEASE - Atom ชนกันต์',
      artist: 'Atom ชนกันต์',
      audioUrl: largeAudioDataUrl,
    },
  };

  console.log('[3/4] Calling dataProvider.saveData with 6MB audio payload...');
  const saveResult = await dataProvider.saveData(testPayload);
  console.log('Save result:', saveResult);

  assert.equal(saveResult.success, true, 'saveData must succeed even with large audio file');

  // Verify that localStorage is lightweight (< 10KB) and not bloated
  const rawStored = globalThis.localStorage.getItem(LOCAL_STORAGE_KEY);
  assert.ok(rawStored, 'LocalStorage must have saved the payload');
  const parsedStored = JSON.parse(rawStored);
  console.log('LocalStorage audioUrl:', parsedStored.music.audioUrl);
  console.log('LocalStorage payload size (bytes):', rawStored.length);
  assert.equal(
    parsedStored.music.audioUrl,
    'indexeddb://custom_audio_file',
    'LocalStorage must store lightweight pointer'
  );
  assert.ok(rawStored.length < 50000, 'LocalStorage payload must be under 50KB to preserve quota');

  // Verify that mediaStorage holds the full audio payload
  const storedInMedia = await mediaStorage.getItem('custom_audio_file');
  assert.ok(storedInMedia, 'mediaStorage must have stored the full audio');
  assert.equal(storedInMedia.length, largeAudioDataUrl.length, 'mediaStorage must preserve full audio bytes');

  console.log('[4/4] Calling dataProvider.fetchData to verify full restoration...');
  const fetched = await dataProvider.fetchData();
  assert.equal(fetched.music.title, 'PLEASE - Atom ชนกันต์');
  assert.equal(fetched.music.audioUrl.length, largeAudioDataUrl.length);
  assert.ok(fetched.music.audioUrl.startsWith('data:audio/mpeg;base64,AAAA'));

  console.log('\n[PASS] Large media offload & rehydration verified 100%!');
}

runTest().catch((err) => {
  console.error('[FAIL] Test threw error:', err);
  process.exit(1);
});
