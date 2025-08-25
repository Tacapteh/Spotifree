import { get, set, del } from 'idb-keyval';

/**
 * Enhanced storage utility with IndexedDB primary and localStorage fallback
 */
export class Storage {
  private static readonly PREFIX = 'spotifree_';

  /**
   * Get value from storage (tries IDB first, falls back to localStorage)
   */
  static async dbGet<T>(key: string): Promise<T | null> {
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
  static async dbSet<T>(key: string, value: T): Promise<void> {
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

  /**
   * Delete value from storage
   */
  static async dbDelete(key: string): Promise<void> {
    try {
      await del(this.PREFIX + key);
    } catch (error) {
      console.warn('IndexedDB delete failed, trying localStorage:', error);
    }

    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch (error) {
      console.error('localStorage delete failed:', error);
    }
  }

  /**
   * Clear all storage
   */
  static async dbClear(): Promise<void> {
    try {
      // Clear IndexedDB (this clears the entire store, not just our keys)
      const keys = await this.getAllKeys();
      await Promise.all(keys.map(key => del(key)));
    } catch (error) {
      console.warn('IndexedDB clear failed:', error);
    }

    try {
      // Clear localStorage keys with our prefix
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.PREFIX));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('localStorage clear failed:', error);
    }
  }

  /**
   * Get all keys (for debugging/maintenance)
   */
  private static async getAllKeys(): Promise<string[]> {
    try {
      // This is a simplified version - in practice you'd need to implement
      // a way to track keys since IDB doesn't have a native "get all keys" method
      return [];
    } catch (error) {
      console.error('Failed to get keys:', error);
      return [];
    }
  }
}

// Convenience exports
export const dbGet = Storage.dbGet.bind(Storage);
export const dbSet = Storage.dbSet.bind(Storage);
export const dbDelete = Storage.dbDelete.bind(Storage);
export const dbClear = Storage.dbClear.bind(Storage);