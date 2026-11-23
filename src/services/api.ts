import axios, {AxiosError, InternalAxiosRequestConfig} from 'axios';
import {API_BASE_URL} from '@/config/env';
import {STORAGE_KEYS} from '@/constants';
import * as storage from './storage';
import type {ApiResponse, AuthPayload} from '@/types';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

export function setTokens(access: string | null, refresh: string | null): void {
  accessToken = access;
  refreshToken = refresh;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function loadTokensFromStorage(): Promise<void> {
  const data = await storage.multiGet([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
  ]);
  accessToken = data[STORAGE_KEYS.ACCESS_TOKEN];
  refreshToken = data[STORAGE_KEYS.REFRESH_TOKEN];
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {'Content-Type': 'application/json'},
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

function processQueue(token: string | null): void {
  refreshQueue.forEach(cb => cb(token));
  refreshQueue = [];
}

api.interceptors.response.use(
  res => res,
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config;
    if (!original || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (original.url?.includes('/auth/refresh-token')) {
      return Promise.reject(error);
    }

    if (!refreshToken) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push(token => {
          if (!token) {
            reject(error);
            return;
          }
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const {data} = await axios.post<ApiResponse<AuthPayload>>(
        `${API_BASE_URL}/auth/refresh-token`,
        {refreshToken},
      );
      const payload = data.data;
      accessToken = payload.accessToken;
      refreshToken = payload.refreshToken;
      await storage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, payload.accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, payload.refreshToken],
      ]);
      processQueue(accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (refreshError) {
      processQueue(null);
      accessToken = null;
      refreshToken = null;
      await storage.multiSet([
        [STORAGE_KEYS.ACCESS_TOKEN, ''],
        [STORAGE_KEYS.REFRESH_TOKEN, ''],
      ]);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const {data} = await api.get<ApiResponse<T>>(url, {params});
  return data.data;
}

export async function post<T>(url: string, body?: unknown, options?: {signal?: AbortSignal; timeout?: number}): Promise<T> {
  const {data} = await api.post<ApiResponse<T>>(url, body, options);
  return data.data;
}

export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const {data} = await api.patch<ApiResponse<T>>(url, body);
  return data.data;
}

export async function del<T>(url: string): Promise<T> {
  const {data} = await api.delete<ApiResponse<T>>(url);
  return data.data;
}

export async function upload<T>(
  url: string,
  formData: FormData,
  onProgress?: (pct: number) => void,
): Promise<T> {
  const {data} = await api.post<ApiResponse<T>>(url, formData, {
    headers: {'Content-Type': 'multipart/form-data'},
    onUploadProgress: evt => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded * 100) / evt.total));
      }
    },
  });
  return data.data;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === 'string') return msg;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export default api;
