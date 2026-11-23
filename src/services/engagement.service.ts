import * as api from './api';
import type {
  CleanCityScore,
  Hotspot,
  Leaderboard,
  PhotoSuggestion,
  SpeedStats,
} from '@/types';

export async function getCleanCityScore(): Promise<CleanCityScore> {
  return api.get<CleanCityScore>('/engagement/score');
}

export async function getLeaderboard(): Promise<Leaderboard> {
  return api.get<Leaderboard>('/engagement/leaderboard');
}

export async function getHotspots(): Promise<Hotspot[]> {
  return api.get<Hotspot[]>('/analytics/hotspots');
}

export async function getComplaintAnalytics(): Promise<
  SpeedStats & {
    byCategory: {_id: string; count: number}[];
    byStatus: {_id: string; count: number}[];
    resolvedCount: number;
    hotspots: Hotspot[];
  }
> {
  return api.get('/analytics/complaints');
}

export async function classifyPhoto(base64: string, language: 'en' | 'hi' | 'hinglish' | 'ur' | 'ks' | 'doi' = 'en', signal?: AbortSignal): Promise<PhotoSuggestion> {
  return api.post<PhotoSuggestion>('/ai/classify', {image: base64, language}, {signal, timeout: 60000});
}

export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round((hours / 24) * 10) / 10}d`;
}
