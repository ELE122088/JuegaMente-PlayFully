import { Platform } from 'react-native';

// Memoria de respaldo para móvil y entornos sin localStorage
const memoryStore = {};

export const storage = {
  getItem: (key) => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return memoryStore[key] !== undefined ? memoryStore[key] : null;
    } catch (e) {
      return memoryStore[key] !== undefined ? memoryStore[key] : null;
    }
  },
  setItem: (key, value) => {
    try {
      const strVal = String(value);
      memoryStore[key] = strVal;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, strVal);
      }
    } catch (e) {
      memoryStore[key] = String(value);
    }
  },
  removeItem: (key) => {
    try {
      delete memoryStore[key];
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      delete memoryStore[key];
    }
  },
  clear: () => {
    try {
      for (const k in memoryStore) delete memoryStore[k];
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}
  },
};

export default storage;
