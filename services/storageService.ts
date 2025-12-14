
import { ProductInput, AnalysisResult, ProcessingStep, AppSettings } from '../types';

const DB_NAME = 'EComGenAIDesignerDB';
const STORE_NAME = 'appState';
const DB_VERSION = 1;

export interface AppState {
  inputData: ProductInput | null;
  analysis: AnalysisResult | null;
  step: ProcessingStep;
  timestamp: number;
}

// IndexedDB Helper for Large Data
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveAppState = async (state: Partial<AppState>) => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ ...state, id: 'current_draft', timestamp: Date.now() }, 'current_draft');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to save state to DB", e);
  }
};

export const loadAppState = async (): Promise<AppState | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current_draft');
      request.onsuccess = () => resolve(request.result as AppState);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to load state from DB", e);
    return null;
  }
};

export const clearAppState = async () => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('current_draft');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to clear state from DB", e);
  }
};

// LocalStorage Helper for Settings (Small Data)
const SETTINGS_KEY = 'douyin_genai_settings';

export const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings", e);
  }
};

export const loadSettings = (): AppSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.error("Failed to load settings", e);
    return {};
  }
};
