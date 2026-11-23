import { AUDIO_CUES } from '../config/audio.js';

export function createAudioDirector() {
  const entries = [];
  let muted = true;
  let unlocked = false;
  let ready = false;

  async function load() {
    try {
      const response = await fetch('/assets/audio/manifest.json', { cache: 'no-store' });
      if (!response.ok) return;
      const manifest = await response.json();
      const available = new Set(manifest.files || []);
      AUDIO_CUES.forEach((cue) => {
        if (!available.has(cue.file)) return;
        const audio = new Audio(`/assets/audio/${cue.file}`);
        audio.preload = 'auto';
        audio.loop = Boolean(cue.loop);
        audio.volume = cue.volume ?? 0.4;
        entries.push({ ...cue, audio });
      });
    } catch {
      /* Silent without audio assets. */
    } finally {
      ready = true;
    }
  }

  function cueLength(entry) {
    if (entry.loop) return Number.POSITIVE_INFINITY;
    if (Number.isFinite(entry.audio.duration)) return entry.audio.duration;
    return 8;
  }

  return {
    load,
    isMuted: () => muted,
    isReady: () => ready,
    unlock() {
      unlocked = true;
    },
    setMuted(next) {
      muted = next;
      if (muted) entries.forEach((entry) => entry.audio.pause());
    },
    sync(time, playing) {
      if (!unlocked || muted) {
        entries.forEach((entry) => {
          if (!entry.audio.paused) entry.audio.pause();
        });
        return;
      }
      entries.forEach((entry) => {
        const local = time - entry.start;
        const active = playing && local >= 0 && local < cueLength(entry);
        if (!active) {
          if (!entry.audio.paused) entry.audio.pause();
          return;
        }
        if (Math.abs((entry.audio.currentTime || 0) - local) > 0.4) {
          try {
            entry.audio.currentTime = local;
          } catch {
            /* Metadata may still be loading. */
          }
        }
        if (entry.audio.paused) {
          entry.audio.play().catch(() => {});
        }
      });
    },
  };
}
