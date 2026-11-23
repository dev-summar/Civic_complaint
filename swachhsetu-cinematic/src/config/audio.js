/**
 * Optional cues. A file plays only when its filename is listed in
 * public/assets/audio/manifest.json — missing files stay silent and do not 404.
 */
export const AUDIO_CUES = [
  { id: 'bed', file: 'bed.mp3', start: 0, loop: true, volume: 0.32 },
  { id: 'reveal', file: 'reveal.mp3', start: 10.3, volume: 0.5 },
  { id: 'whoosh-voice', file: 'whoosh.mp3', start: 19.7, volume: 0.28 },
  { id: 'whoosh-ai', file: 'whoosh.mp3', start: 47.6, volume: 0.28 },
  { id: 'whoosh-dash', file: 'whoosh.mp3', start: 79.6, volume: 0.28 },
  { id: 'assign', file: 'tick.mp3', start: 74.4, volume: 0.4 },
  { id: 'resolve', file: 'resolve.mp3', start: 103.2, volume: 0.42 },
  { id: 'end', file: 'reveal.mp3', start: 114.8, volume: 0.4 },
];
