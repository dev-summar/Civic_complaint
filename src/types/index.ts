import {UserRole, ComplaintCategory, ComplaintStatus, Priority} from '@/constants';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPoint extends Coordinates {
  address?: string;
  landmark?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  department?: string | Department;
  zone?: string | Zone;
  isActive?: boolean;
  isVerified?: boolean;
  community?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthPayload extends AuthTokens {
  user: User;
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  head?: string;
  isActive?: boolean;
}

export interface Zone {
  _id: string;
  name: string;
  code: string;
  district?: string;
  description?: string;
  isActive?: boolean;
}

export interface ComplaintMedia {
  url: string;
  type: 'image' | 'video';
  publicId?: string;
}

export interface Complaint {
  _id: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  status: ComplaintStatus;
  priority: Priority;
  location: LocationPoint;
  latitude?: number;
  longitude?: number;
  address?: string;
  media?: ComplaintMedia[];
  beforePhotos?: ComplaintMedia[];
  afterPhotos?: ComplaintMedia[];
  isAnonymous?: boolean;
  citizen?: User | string;
  assignedTo?: User | string;
  assignedWorker?: User | string;
  department?: Department | string;
  zone?: Zone | string;
  referenceNumber?: string;
  resolutionNotes?: string;
  resolution_notes?: string;
  citizen_id?: string | null;
  citizen_feedback?: string | null;
  reopen_count?: number;
  assigned_worker_id?: string | null;
  ai_summary?: string | null;
  assignmentDueAt?: string;
  resolutionDueAt?: string;
  escalatedAt?: string;
  departmentName?: string;
  workerName?: string;
  officerName?: string;
  triageReason?: string;
  reviewReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  _id?: string;
  action?: string;
  status?: string;
  description?: string;
  note?: string;
  performedBy?: User | string;
  by?: User | string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  at?: string;
}

export interface Comment {
  _id: string;
  text: string;
  author?: User | string;
  userId?: User | string;
  complaint: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface Assignment {
  _id: string;
  complaint: Complaint | string;
  worker: User | string;
  assignedBy?: User | string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'reassigned';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalComplaints?: number;
  pending?: number;
  inProgress?: number;
  resolved?: number;
  closed?: number;
  overdue?: number;
  avgAssignHours?: number | null;
  avgResolutionHours?: number | null;
  rejected?: number;
  escalated?: number;
  byCategory?: Record<string, number>;
  byStatus?: Record<string, number>;
  byPriority?: Record<string, number>;
  recentComplaints?: Complaint[];
  myAssignments?: Assignment[];
  unreadNotifications?: number;
}

export interface SavedLocation extends LocationPoint {
  id: string;
  label: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface CreateComplaintData {
  clientRequestId?: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority?: Priority;
  location: LocationPoint;
  address?: string;
  isAnonymous?: boolean;
  media?: {url: string; type?: 'image' | 'video'}[];
  aiCategory?: string;
  aiSummary?: string;
  language?: 'en' | 'hi' | 'hinglish' | 'ur' | 'ks' | 'doi';
  originalReport?: string;
}

export interface PhotoSuggestion {
  status: 'issue_visible' | 'no_clear_issue' | 'unclear';
  confidence: 'high' | 'low';
  category: ComplaintCategory;
  priority: Priority;
  title: string;
  summary: string;
  spokenSummary: string;
  evidence: string;
  message?: string;
}

export interface SpeedStats {
  total: number;
  open: number;
  awaitingConfirmation: number;
  closed: number;
  reopened: number;
  overdue: number;
  avgAssignHours: number | null;
  avgResolutionHours: number | null;
  overdueAfterHours: number;
}

export interface Hotspot {
  latitude: number;
  longitude: number;
  total: number;
  open: number;
  address: string;
  lastReported?: string;
  topCategory: string;
}

export interface CleanCityScore {
  score: number;
  grade: string;
  total: number;
  fixed: number;
  confirmed: number;
  open: number;
  overdue: number;
  avgResolutionHours: number | null;
}

export interface Leaderboard {
  points: {report: number; resolved: number; confirmed: number};
  communities: {
    rank: number;
    community: string;
    members: number;
    reports: number;
    confirmed: number;
    points: number;
  }[];
  citizens: {
    rank: number;
    name: string;
    community: string;
    reports: number;
    confirmed: number;
    points: number;
    isMe: boolean;
  }[];
  me: {
    rank: number | null;
    points: number;
    reports: number;
    confirmed: number;
    community: string;
  };
}
