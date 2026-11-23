import * as api from './api';
import type {DashboardStats} from '@/types';

export async function getDashboard(): Promise<DashboardStats> {
  return api.get<DashboardStats>('/dashboard');
}

export async function getDepartmentAnalytics(): Promise<Record<string, unknown>> {
  return api.get('/analytics/departments');
}

export async function getZoneAnalytics(): Promise<Record<string, unknown>> {
  return api.get('/analytics/zones');
}

export async function getComplaintAnalytics(): Promise<Record<string, unknown>> {
  return api.get('/analytics/complaints');
}
