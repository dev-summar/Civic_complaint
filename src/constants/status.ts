export const COMPLAINT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  ACKNOWLEDGED: 'acknowledged',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
  CLOSED: 'closed',
} as const;

export type ComplaintStatus =
  (typeof COMPLAINT_STATUS)[keyof typeof COMPLAINT_STATUS];

export const STATUS_LABELS: Record<ComplaintStatus, string> = {
  draft: 'Draft',
  submitted: 'Reported',
  acknowledged: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Fixed',
  rejected: 'Rejected',
  escalated: 'Escalated',
  closed: 'Citizen confirmed',
};

export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type Priority = (typeof PRIORITY)[keyof typeof PRIORITY];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};
