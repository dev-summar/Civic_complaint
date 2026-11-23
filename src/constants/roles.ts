export const ROLES = {
  CITIZEN: 'citizen',
  OFFICER: 'officer',
  WORKER: 'field_worker',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  citizen: 'Citizen',
  officer: 'Municipal Officer',
  field_worker: 'Field Worker',
  admin: 'Administrator',
};
