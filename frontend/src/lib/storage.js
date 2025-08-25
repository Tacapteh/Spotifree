import { get, set, del } from 'idb-keyval';

/**
 * Enhanced storage utility with IndexedDB primary and localStorage fallback
 */
export class Storage {
  static PREFIX = 'spotifree_';

  /**
   * Get value from storage (tries IDB first, falls back to localStorage)
   */
  static async dbGet(key) {
    try {
      // Try IndexedDB first
      const value = await get(this.PREFIX + key);
      if (value !== undefined) {
        return value;
      }
    } catch (error) {
      console.warn('IndexedDB get failed, falling back to localStorage:', error);
    }

    try {
      // Fallback to localStorage
      const value = localStorage.getItem(this.PREFIX + key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('localStorage get failed:', error);
      return null;
    }
  }

  /**
   * Set value in storage (tries IDB first, falls back to localStorage)
   */
  static async dbSet(key, value) {
    try {
      // Try IndexedDB first
      await set(this.PREFIX + key, value);
    } catch (error) {
      console.warn('IndexedDB set failed, falling back to localStorage:', error);
      try {
        // Fallback to localStorage
        localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      } catch (localError) {
        console.error('localStorage set failed:', localError);
        throw localError;
      }
    }
  }
}

// Convenience exports
export const dbGet = Storage.dbGet.bind(Storage);
export const dbSet = Storage.dbSet.bind(Storage);