export {lightColors, darkColors, colors, cssVariables} from './colors';
export {typography, fonts} from './typography';
export {spacing, radius, shadows} from './spacing';
export {ThemeProvider, useTheme} from './ThemeProvider';

/** Canonical workflow stages for StatusTrail */
export const STATUS_TRAIL_STAGES = [
  'submitted',
  'acknowledged',
  'assigned',
  'in_progress',
  'resolved',
] as const;

export type StatusTrailStage = (typeof STATUS_TRAIL_STAGES)[number];

export const STATUS_TRAIL_LABELS: Record<StatusTrailStage, string> = {
  submitted: 'Reported',
  acknowledged: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Fixed',
};

/** Map any complaint status onto the 5-stage trail index (0–4). */
export function statusToTrailIndex(status: string): number {
  switch (status) {
    case 'draft':
    case 'submitted':
      return 0;
    case 'acknowledged':
      return 1;
    case 'assigned':
    case 'escalated':
      return 2;
    case 'in_progress':
      return 3;
    case 'resolved':
    case 'closed':
      return 4;
    case 'rejected':
      return 0;
    default:
      return 0;
  }
}

/** Citizen-facing next-step copy for tracking screens. */
export function statusCitizenGuidance(status: string): {title: string; body: string} {
  switch (status) {
    case 'draft':
      return {
        title: 'Draft saved',
        body: 'Finish and submit so an officer can review it.',
      };
    case 'submitted':
      return {
        title: 'We got your report',
        body: 'An officer will verify the details shortly.',
      };
    case 'acknowledged':
      return {
        title: 'Verified by an officer',
        body: 'Your local body is lining up a field worker.',
      };
    case 'assigned':
      return {
        title: 'A worker is assigned',
        body: 'They will head to the spot and start the fix.',
      };
    case 'in_progress':
      return {
        title: 'Work is underway',
        body: 'Hang tight — you will be asked to confirm once it is marked fixed.',
      };
    case 'escalated':
      return {
        title: 'Escalated for faster action',
        body: 'A senior officer is reviewing this report.',
      };
    case 'resolved':
      return {
        title: 'Marked fixed — please confirm',
        body: 'Check the spot and tell us if it is truly clean.',
      };
    case 'closed':
      return {
        title: 'You confirmed it is clean',
        body: 'Thank you — this report is closed.',
      };
    case 'rejected':
      return {
        title: 'Could not proceed',
        body: 'See the timeline for the reason, or file a new report.',
      };
    default:
      return {
        title: 'Tracking your report',
        body: 'Updates will show up here as the team works.',
      };
  }
}
