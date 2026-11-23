import * as api from './api';
import * as storage from './storage';
import {STORAGE_KEYS} from '@/constants';
import type {AuthPayload, LoginCredentials, SignupData, User} from '@/types';

export async function login(credentials: LoginCredentials): Promise<AuthPayload> {
  const result = await api.post<AuthPayload>('/auth/login', credentials);
  await persistAuth(result);
  return result;
}

export async function signup(data: SignupData): Promise<AuthPayload> {
  const result = await api.post<AuthPayload>('/auth/signup', data);
  await persistAuth(result);
  return result;
}

export async function phoneLogin(phone: string): Promise<{message: string}> {
  return api.post('/auth/phone-login', {phone});
}

export async function verifyOtp(phone: string, otp: string): Promise<AuthPayload> {
  const result = await api.post<AuthPayload>('/auth/verify-otp', {phone, otp});
  await persistAuth(result);
  return result;
}

export async function forgotPassword(email: string): Promise<{message: string}> {
  return api.post('/auth/forgot-password', {email});
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<{message: string}> {
  return api.post('/auth/reset-password', {token, password});
}

export async function logout(): Promise<void> {
  const refresh = await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN).catch(() => null);
  await clearAuth().catch(() => {});
  if (refresh) {
    api.post('/auth/logout', {refreshToken: refresh}).catch(() => {});
  }
}

export async function me(): Promise<User> {
  return api.get<User>('/auth/me');
}

export async function persistAuth(payload: AuthPayload): Promise<void> {
  api.setTokens(payload.accessToken, payload.refreshToken);
  await storage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, payload.accessToken],
    [STORAGE_KEYS.REFRESH_TOKEN, payload.refreshToken],
    [STORAGE_KEYS.USER, JSON.stringify(payload.user)],
  ]);
}

export async function clearAuth(): Promise<void> {
  api.setTokens(null, null);
  await storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  await storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  await storage.removeItem(STORAGE_KEYS.USER);
}

export async function hydrateAuth(): Promise<User | null> {
  await api.loadTokensFromStorage();
  const user = await storage.getJSON<User>(STORAGE_KEYS.USER);
  return user;
}
