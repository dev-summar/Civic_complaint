import {create} from 'zustand';
import * as authService from '@/services/auth.service';
import * as storage from '@/services/storage';
import {STORAGE_KEYS} from '@/constants';
import {getErrorMessage} from '@/services/api';
import type {User, LoginCredentials, SignupData} from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,
  error: null,

  hydrate: async () => {
    try {
      const user = await authService.hydrateAuth();
      set({
        user,
        isAuthenticated: !!user,
        isHydrated: true,
      });
    } catch {
      set({isHydrated: true});
    }
  },

  login: async credentials => {
    set({isLoading: true, error: null});
    try {
      const result = await authService.login(credentials);
      set({user: result.user, isAuthenticated: true, isLoading: false});
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
      throw err;
    }
  },

  signup: async data => {
    set({isLoading: true, error: null});
    try {
      const result = await authService.signup(data);
      set({user: result.user, isAuthenticated: true, isLoading: false});
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
      throw err;
    }
  },

  verifyOtp: async (phone, otp) => {
    set({isLoading: true, error: null});
    try {
      const result = await authService.verifyOtp(phone, otp);
      set({user: result.user, isAuthenticated: true, isLoading: false});
    } catch (err) {
      set({error: getErrorMessage(err), isLoading: false});
      throw err;
    }
  },

  logout: async () => {
    set({user: null, isAuthenticated: false, isLoading: false, error: null});
    await authService.logout().catch(() => {});
  },

  refreshUser: async () => {
    try {
      const user = await authService.me();
      await storage.setJSON(STORAGE_KEYS.USER, user);
      set({user});
    } catch {
      // ignore refresh failures
    }
  },

  clearError: () => set({error: null}),
}));

export async function setOnboardingDone(): Promise<void> {
  await storage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
}

export async function isOnboardingDone(): Promise<boolean> {
  const val = await storage.getItem(STORAGE_KEYS.ONBOARDING_DONE);
  return val === 'true';
}
