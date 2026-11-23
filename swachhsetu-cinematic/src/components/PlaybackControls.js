function icon(name) {
  const paths = {
    play: '<path d="M8 5.5v13l11-6.5-11-6.5Z"/>',
    pause: '<path d="M7 5h3.2v14H7V5Zm6.8 0H17v14h-3.2V5Z"/>',
    restart: '<path d="M12 5a7 7 0 1 1-6.3 4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 4.5V9h4.4"/>',
    mute: '<path d="M4 9.5h3.2L11 6.2v11.6L7.2 14.5H4v-5Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M15 9.5l4 5M19 9.5l-4 5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    volume: '<path d="M4 9.5h3.2L11 6.2v11.6L7.2 14.5H4v-5Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M14.5 9.2a3.4 3.4 0 0 1 0 5.6M16.8 7a6 6 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    full: '<path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    exit: '<path d="M9 5v4H5M15 5v4h4M19 15h-4v4M9 19H5v-4" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function button(className, label, glyph) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.setAttribute('aria-label', label);
  el.innerHTML = icon(glyph);
  return el;
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remain = Math.floor(safe % 60);
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

export function createPlaybackControls(timeline, audio, { onReplay }) {
  const root = document.createElement('div');
  root.className = 'controls';

  const play = button('control', 'Pause', 'pause');
  const restart = button('control', 'Restart', 'restart');
  const mute = button('control', 'Unmute', 'mute');
  const full = button('control', 'Fullscreen', 'full');

  const scrub = document.createElement('input');
  scrub.type = 'range';
  scrub.min = '0';
  scrub.max = '1000';
  scrub.value = '0';
  scrub.className = 'scrub';
  scrub.setAttribute('aria-label', 'Seek');

  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = `0:00 / ${formatTime(timeline.duration())}`;

  root.append(play, restart, scrub, time, mute, full);

  let scrubbing = false;
  let wasPlaying = false;
  let hideTimer = 0;

  const show = () => {
    root.classList.add('is-visible');
    clearTimeout(hideTimer);
    if (timeline.isActive()) {
      hideTimer = window.setTimeout(() => root.classList.remove('is-visible'), 2400);
    }
  };

  const syncPlayIcon = () => {
    const playing = timeline.isActive();
    play.innerHTML = icon(playing ? 'pause' : 'play');
    play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    if (!playing) root.classList.add('is-visible');
  };

  play.addEventListener('click', () => {
    if (timeline.isActive()) timeline.pause();
    else if (timeline.progress() >= 0.999) onReplay();
    else timeline.play();
    syncPlayIcon();
    show();
  });

  restart.addEventListener('click', () => {
    onReplay();
    syncPlayIcon();
  });

  mute.addEventListener('click', () => {
    audio.unlock();
    audio.setMuted(!audio.isMuted());
    mute.innerHTML = icon(audio.isMuted() ? 'mute' : 'volume');
    mute.setAttribute('aria-label', audio.isMuted() ? 'Unmute' : 'Mute');
    if (!audio.isMuted()) audio.sync(timeline.time(), timeline.isActive());
  });

  full.addEventListener('click', async () => {
    const viewport = document.getElementById('viewport');
    if (!document.fullscreenElement) {
      await viewport.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    full.innerHTML = icon(active ? 'exit' : 'full');
    full.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Fullscreen');
  });

  scrub.addEventListener('pointerdown', () => {
    scrubbing = true;
    wasPlaying = timeline.isActive();
    timeline.pause();
  });

  const seekFromInput = () => {
    const next = (Number(scrub.value) / 1000) * timeline.duration();
    timeline.time(next);
    audio.sync(next, false);
  };

  scrub.addEventListener('input', seekFromInput);
  scrub.addEventListener('pointerup', () => {
    scrubbing = false;
    if (wasPlaying) timeline.play();
    syncPlayIcon();
  });
  scrub.addEventListener('change', () => {
    scrubbing = false;
  });

  timeline.eventCallback('onUpdate', () => {
    if (!scrubbing) {
      const now = timeline.time();
      scrub.value = String((now / timeline.duration()) * 1000);
      time.textContent = `${formatTime(now)} / ${formatTime(timeline.duration())}`;
    }
    audio.sync(timeline.time(), timeline.isActive());
  });

  timeline.eventCallback('onComplete', () => {
    syncPlayIcon();
    show();
  });

  window.addEventListener('pointermove', show);
  show();
  syncPlayIcon();

  return root;
}
