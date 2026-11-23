import {create} from 'zustand';
import * as storage from '@/services/storage';
import {STORAGE_KEYS} from '@/constants';
import {setLocale, getLocale} from '@/utils/i18n';
import type {SavedLocation} from '@/types';

type ThemeMode = 'light' | 'dark' | 'system';

interface AppState {
  theme: ThemeMode;
  language: string;
  savedLocations: SavedLocation[];
  unreadNotifications: number;
  isGlobalLoading: boolean;
  onboardingComplete: boolean;
  pushEnabled: boolean;
  locationEnabled: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (lang: string) => Promise<void>;
  setUnreadNotifications: (count: number) => void;
  setGlobalLoading: (loading: boolean) => void;
  setOnboardingComplete: (done: boolean) => Promise<void>;
  setPushEnabled: (enabled: boolean) => Promise<void>;
  setLocationEnabled: (enabled: boolean) => Promise<void>;
  addSavedLocation: (location: SavedLocation) => Promise<void>;
  removeSavedLocation: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'light',
  language: 'en',
  savedLocations: [],
  unreadNotifications: 0,
  isGlobalLoading: false,
  onboardingComplete: false,
  pushEnabled: true,
  locationEnabled: true,

  hydrate: async () => {
    const data = await storage.hydrateStorage([
      STORAGE_KEYS.THEME,
      STORAGE_KEYS.LANGUAGE,
      STORAGE_KEYS.SAVED_LOCATIONS,
      STORAGE_KEYS.ONBOARDING_DONE,
      STORAGE_KEYS.PUSH_ENABLED,
      STORAGE_KEYS.LOCATION_ENABLED,
    ]);

    const theme = (data[STORAGE_KEYS.THEME] as ThemeMode) ?? 'light';
    const language = data[STORAGE_KEYS.LANGUAGE] ?? 'en';
    setLocale(language as 'en' | 'hi' | 'ur');

    let savedLocations: SavedLocation[] = [];
    const rawSaved = data[STORAGE_KEYS.SAVED_LOCATIONS];
    if (rawSaved) {
      try {
        savedLocations = JSON.parse(rawSaved);
      } catch {
        savedLocations = [];
      }
    }

    set({
      theme,
      language,
      savedLocations,
      onboardingComplete: data[STORAGE_KEYS.ONBOARDING_DONE] === 'true',
      pushEnabled: data[STORAGE_KEYS.PUSH_ENABLED] !== 'false',
      locationEnabled: data[STORAGE_KEYS.LOCATION_ENABLED] !== 'false',
    });
  },

  setTheme: async theme => {
    await storage.setItem(STORAGE_KEYS.THEME, theme);
    set({theme});
  },

  setLanguage: async language => {
    await storage.setItem(STORAGE_KEYS.LANGUAGE, language);
    setLocale(language as 'en' | 'hi' | 'ur');
    set({language});
  },

  setUnreadNotifications: count => set({unreadNotifications: count}),
  setGlobalLoading: loading => set({isGlobalLoading: loading}),

  setOnboardingComplete: async done => {
    await storage.setItem(STORAGE_KEYS.ONBOARDING_DONE, done ? 'true' : 'false');
    set({onboardingComplete: done});
  },

  setPushEnabled: async enabled => {
    await storage.setItem(STORAGE_KEYS.PUSH_ENABLED, enabled ? 'true' : 'false');
    set({pushEnabled: enabled});
  },

  setLocationEnabled: async enabled => {
    await storage.setItem(STORAGE_KEYS.LOCATION_ENABLED, enabled ? 'true' : 'false');
    set({locationEnabled: enabled});
  },

  addSavedLocation: async location => {
    const updated = [...get().savedLocations, location];
    await storage.setJSON(STORAGE_KEYS.SAVED_LOCATIONS, updated);
    set({savedLocations: updated});
  },

  removeSavedLocation: async id => {
    const updated = get().savedLocations.filter(l => l.id !== id);
    await storage.setJSON(STORAGE_KEYS.SAVED_LOCATIONS, updated);
    set({savedLocations: updated});
  },
}));

export {getLocale};
