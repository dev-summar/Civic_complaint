import * as api from './api';
import type {User, Department, Zone, Assignment} from '@/types';
import {normalizeAssignment} from '@/utils/assignment';

export async function updateProfile(data: Partial<User>): Promise<User> {
  return api.patch<User>('/users/profile', data);
}

export async function listUsers(params?: Record<string, unknown>): Promise<User[]> {
  return api.get<User[]>('/users', params);
}

export async function listWorkers(params?: Record<string, unknown>): Promise<User[]> {
  return api.get<User[]>('/users/workers', params);
}

export async function listOfficers(params?: Record<string, unknown>): Promise<User[]> {
  return api.get<User[]>('/users/officers', params);
}

export async function getUser(id: string): Promise<User> {
  return api.get<User>(`/users/${id}`);
}

export async function createUser(data: Partial<User> & {password: string}): Promise<User> {
  return api.post<User>('/users', data);
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  return api.patch<User>(`/users/${id}`, data);
}

export async function changeUserStatus(
  id: string,
  isActive: boolean,
): Promise<User> {
  return api.patch<User>(`/users/${id}/status`, {isActive});
}

export async function deleteUser(id: string): Promise<void> {
  await api.del(`/users/${id}`);
}

export async function listDepartments(): Promise<Department[]> {
  return api.get<Department[]>('/departments');
}

export async function createDepartment(data: Partial<Department>): Promise<Department> {
  return api.post<Department>('/departments', data);
}

export async function updateDepartment(
  id: string,
  data: Partial<Department>,
): Promise<Department> {
  return api.patch<Department>(`/departments/${id}`, data);
}

export async function deleteDepartment(id: string): Promise<void> {
  await api.del(`/departments/${id}`);
}

export async function listZones(): Promise<Zone[]> {
  return api.get<Zone[]>('/zones');
}

export async function createZone(data: Partial<Zone>): Promise<Zone> {
  return api.post<Zone>('/zones', data);
}

export async function updateZone(id: string, data: Partial<Zone>): Promise<Zone> {
  return api.patch<Zone>(`/zones/${id}`, data);
}

export async function deleteZone(id: string): Promise<void> {
  await api.del(`/zones/${id}`);
}

export async function listAssignments(): Promise<Assignment[]> {
  const items = await api.get<Assignment[]>('/assignments');
  return (Array.isArray(items) ? items : []).map(normalizeAssignment);
}

export async function getAssignment(id: string): Promise<Assignment> {
  const item = await api.get<Assignment>(`/assignments/${id}`);
  return normalizeAssignment(item);
}

export async function updateAssignmentStatus(
  id: string,
  status: string,
  notes?: string,
): Promise<Assignment> {
  const item = await api.patch<Assignment>(`/assignments/${id}/status`, {
    status,
    notes,
  });
  return normalizeAssignment(item);
}
