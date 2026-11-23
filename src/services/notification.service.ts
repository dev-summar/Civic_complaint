import * as api from './api';
import type {Notification} from '@/types';

export async function listNotifications(): Promise<Notification[]> {
  return api.get<Notification[]>('/notifications');
}

export async function getUnreadCount(): Promise<number> {
  const result = await api.get<{count: number}>('/notifications/unread-count');
  return result.count ?? 0;
}

export async function markAllRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}

export async function markRead(id: string): Promise<Notification> {
  return api.patch<Notification>(`/notifications/${id}/read`);
}
