/** Master clock. The film is one continuous 120s timeline. */
export const FILM_DURATION = 120;

export const SCENE_MARKS = [
  { id: 'problem', key: '1', time: 0, title: 'The problem' },
  { id: 'reveal', key: '2', time: 10, title: 'Reveal' },
  { id: 'voice', key: '3', time: 20, title: 'Voice' },
  { id: 'reporting', key: '4', time: 35, title: 'Review' },
  { id: 'ai', key: '5', time: 48, title: 'Intelligence' },
  { id: 'assignment', key: '6', time: 65, title: 'Assignment' },
  { id: 'dashboard', key: '7', time: 80, title: 'Dashboard' },
  { id: 'resolution', key: '8', time: 95, title: 'Resolution' },
  { id: 'hero', key: '9', time: 108, title: 'Hero' },
];

export const BEATS = {
  problem: { fadeIn: 0.35, visible: 1.5, fadeOut: 9.15, end: 10.25 },
  reveal: { fadeIn: 9.45, visible: 10.35, fadeOut: 19.15, end: 20.25 },
  voice: { fadeIn: 19.5, visible: 20.4, fadeOut: 34.2, end: 35.25 },
  reporting: { fadeIn: 34.45, visible: 35.35, fadeOut: 47.15, end: 48.25 },
  ai: { fadeIn: 47.45, visible: 48.35, fadeOut: 64.15, end: 65.25 },
  assignment: { fadeIn: 64.45, visible: 65.35, fadeOut: 79.15, end: 80.25 },
  dashboard: { fadeIn: 79.45, visible: 80.35, fadeOut: 94.15, end: 95.25 },
  resolution: { fadeIn: 94.45, visible: 95.35, fadeOut: 107.15, end: 108.25 },
  hero: { fadeIn: 107.45, visible: 108.3, fadeOut: 118.55, end: 120 },
};
