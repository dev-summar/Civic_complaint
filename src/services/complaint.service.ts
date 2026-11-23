import * as api from './api';
import type {ComplaintCategory} from '@/constants';
import type {ComplaintStatus, Priority} from '@/constants/status';
import type {
  Complaint,
  CreateComplaintData,
  TimelineEvent,
  Comment,
} from '@/types';

export interface ComplaintFilters {
  page?: number;
  limit?: number;
  status?: ComplaintStatus | ComplaintStatus[];
  category?: string;
  priority?: Priority;
  search?: string;
  zone?: string;
  department?: string;
}

function normalizeComplaint(raw: unknown): Complaint {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
  let media = row.media;
  if (typeof media === 'string') {
    try {
      media = JSON.parse(media);
    } catch {
      media = [];
    }
  }
  if (!Array.isArray(media)) media = [];

  const latitude = Number(row.location?.latitude ?? row.latitude);
  const longitude = Number(row.location?.longitude ?? row.longitude);
  const createdAt = row.createdAt || row.created_at || new Date().toISOString();
  const updatedAt = row.updatedAt || row.updated_at || createdAt;

  return {
    ...row,
    _id: String(row._id || row.id || ''),
    title: row.title || 'Complaint',
    description: row.description || '',
    category: row.category || 'others',
    status: row.status || 'submitted',
    priority: row.priority || 'medium',
    createdAt,
    updatedAt,
    resolutionNotes: row.resolutionNotes || row.resolution_notes || undefined,
    assignmentDueAt: row.assignmentDueAt || row.assignment_due_at || undefined,
    resolutionDueAt: row.resolutionDueAt || row.resolution_due_at || undefined,
    escalatedAt: row.escalated_at || undefined,
    departmentName: row.department_name || undefined,
    workerName: row.worker_name || undefined,
    officerName: row.officer_name || undefined,
    triageReason: row.triage_reason || undefined,
    reviewReason: row.review_reason || undefined,
    media: media
      .filter((item: {url?: string}) => typeof item?.url === 'string' && !item.url.startsWith('data:'))
      .slice(0, 5),
    location: {
      latitude: Number.isFinite(latitude) ? latitude : Number.NaN,
      longitude: Number.isFinite(longitude) ? longitude : Number.NaN,
      address: row.location?.address || row.address || '',
    },
  };
}

function normalizeComplaints(value: unknown): Complaint[] {
  return Array.isArray(value) ? value.map(normalizeComplaint) : [];
}

function toParams(filters?: ComplaintFilters): Record<string, unknown> | undefined {
  if (!filters) return undefined;
  const params: Record<string, unknown> = {...filters};
  if (Array.isArray(filters.status)) {
    params.status = filters.status.join(',');
  }
  return params;
}

export async function getMyComplaints(filters?: ComplaintFilters): Promise<Complaint[]> {
  return normalizeComplaints(await api.get<Complaint[]>('/complaints/mine', toParams(filters)));
}

export async function listComplaints(filters?: ComplaintFilters): Promise<Complaint[]> {
  return normalizeComplaints(await api.get<Complaint[]>('/complaints', toParams(filters)));
}

export async function getNearby(
  latitude: number,
  longitude: number,
  radius = 5000,
): Promise<Complaint[]> {
  return normalizeComplaints(await api.get<Complaint[]>('/complaints/nearby', {latitude, longitude, radius}));
}

export async function getComplaint(id: string): Promise<Complaint> {
  return normalizeComplaint(await api.get<Complaint>(`/complaints/${id}`));
}

export async function createComplaint(data: CreateComplaintData): Promise<Complaint> {
  const latitude = Number(data.location?.latitude);
  const longitude = Number(data.location?.longitude);
  const address = data.location?.address || data.address;
  return api.post<Complaint>('/complaints', {
    clientRequestId: data.clientRequestId,
    title: data.title,
    description: data.description,
    category: data.category,
    priority: data.priority,
    isAnonymous: !!data.isAnonymous,
    latitude,
    longitude,
    address,
    location: {latitude, longitude, address},
    media: data.media,
    aiCategory: data.aiCategory,
    aiSummary: data.aiSummary,
    language: data.language,
    originalReport: data.originalReport,
  }).then(normalizeComplaint);
}

export async function updateTriage(id: string, priority: Priority, reason: string): Promise<Complaint> {
  return normalizeComplaint(await api.patch<Complaint>(`/complaints/${id}/triage`, {priority, reason}));
}

export async function createComplaintWithMedia(
  data: CreateComplaintData,
  photos: {uri: string; name: string; type: string; base64?: string}[],
): Promise<Complaint> {
  const media = photos
    .filter(photo => photo.base64 && photo.base64.length < 1400000)
    .map(photo => ({
      url: `data:${photo.type || 'image/jpeg'};base64,${photo.base64}`,
      type: 'image' as const,
    }));
  return createComplaint({...data, media});
}

export async function updateComplaint(
  id: string,
  data: Partial<CreateComplaintData>,
): Promise<Complaint> {
  return normalizeComplaint(await api.patch<Complaint>(`/complaints/${id}`, data));
}

export async function assignComplaint(
  id: string,
  workerId: string,
  notes?: string,
): Promise<Complaint> {
  return normalizeComplaint(await api.post<Complaint>(`/complaints/${id}/assign`, {
    workerId,
    notes,
  }));
}

export async function resolveComplaint(
  id: string,
  resolutionNotes: string,
): Promise<Complaint> {
  return normalizeComplaint(await api.post<Complaint>(`/complaints/${id}/resolve`, {resolutionNotes}));
}

export async function rejectComplaint(
  id: string,
  reason: string,
): Promise<Complaint> {
  return normalizeComplaint(await api.post<Complaint>(`/complaints/${id}/reject`, {reason}));
}

export async function confirmResolution(
  id: string,
  fixed: boolean,
  feedback?: string,
): Promise<Complaint> {
  return normalizeComplaint(
    await api.post<Complaint>(`/complaints/${id}/confirm`, {fixed, feedback}),
  );
}

export async function escalateComplaint(id: string): Promise<Complaint> {
  return normalizeComplaint(await api.post<Complaint>(`/complaints/${id}/escalate`));
}

export async function getTimeline(id: string): Promise<TimelineEvent[]> {
  return api.get<TimelineEvent[]>(`/complaints/${id}/timeline`);
}

export async function getComments(id: string): Promise<Comment[]> {
  return api.get<Comment[]>(`/comments/${id}`);
}

export async function addComment(id: string, text: string): Promise<Comment> {
  return api.post<Comment>(`/comments/${id}`, {text});
}

export async function getAnalytics(): Promise<Record<string, unknown>> {
  return api.get('/complaints/analytics');
}

export async function deleteComplaint(id: string): Promise<void> {
  await api.del(`/complaints/${id}`);
}
