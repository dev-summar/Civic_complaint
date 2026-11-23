import * as api from './api';

export interface AuditLogEntry {
  _id: string;
  actor?: { _id: string; name: string; email: string; role: string } | string;
  action: string;
  resource: string;
  resourceId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export async function getAuditLogs(params?: Record<string, unknown>): Promise<AuditLogEntry[]> {
  return api.get<AuditLogEntry[]>('/audit-logs', params);
}
