import gsap from 'gsap';
import { createFilm } from './animation/masterTimeline.js';
import { createPlaybackControls } from './components/PlaybackControls.js';
import { createAudioDirector } from './animation/audioDirector.js';
import { mountGrain, mountParticleField } from './animation/motionGraphics.js';
import { SCENE_MARKS } from './config/timeline.js';
import './style.css';

const params = new URLSearchParams(window.location.search);
const clean = params.has('clean');
const loop = params.has('loop');
const startAt = Number(params.get('t'));

const viewport = document.getElementById('viewport');
const scaler = document.getElementById('scaler');
const stage = document.getElementById('stage');
const world = document.getElementById('world');
const controlsHost = document.getElementById('controls');
const replay = document.getElementById('replay');
const particles = document.getElementById('particles');

gsap.ticker.lagSmoothing(0);

function fitStage() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  scaler.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

fitStage();
window.addEventListener('resize', fitStage);
mountGrain(stage.querySelector('.grain'));

const audio = createAudioDirector();
audio.load();

const timeline = createFilm(world, stage);
const drawParticles = mountParticleField(particles, () => timeline.time());
gsap.ticker.add(drawParticles);

function restart() {
  replay.hidden = true;
  audio.sync(0, true);
  timeline.restart();
}

if (!clean) {
  controlsHost.append(createPlaybackControls(timeline, audio, { onReplay: restart }));
} else {
  controlsHost.hidden = true;
  replay.hidden = true;
}

replay.addEventListener('click', () => {
  audio.unlock();
  restart();
});

timeline.eventCallback('onComplete', () => {
  if (loop) {
    restart();
    return;
  }
  if (!clean) replay.hidden = false;
});

timeline.eventCallback('onUpdate', () => {
  if (timeline.time() < timeline.duration() - 0.25) replay.hidden = true;
});

function seekTo(seconds) {
  const next = Math.max(0, Math.min(timeline.duration(), seconds));
  timeline.time(next);
  audio.sync(next, timeline.isActive());
}

window.addEventListener('keydown', (event) => {
  const typing = ['INPUT', 'TEXTAREA'].includes(event.target.tagName);
  if (typing) return;
  if (event.code === 'Space') {
    event.preventDefault();
    if (timeline.isActive()) timeline.pause();
    else if (timeline.progress() >= 0.999) restart();
    else timeline.play();
  } else if (event.key === 'ArrowRight') {
    seekTo(timeline.time() + 2);
  } else if (event.key === 'ArrowLeft') {
    seekTo(timeline.time() - 2);
  } else if (event.key.toLowerCase() === 'r') {
    restart();
  } else if (event.key.toLowerCase() === 'f') {
    if (!document.fullscreenElement) viewport.requestFullscreen?.();
    else document.exitFullscreen?.();
  } else if (event.key.toLowerCase() === 'm') {
    audio.unlock();
    audio.setMuted(!audio.isMuted());
    audio.sync(timeline.time(), timeline.isActive());
  } else {
    const scene = SCENE_MARKS.find((item) => item.key === event.key);
    if (scene) seekTo(scene.time);
  }
});

window.SwachhSetuFilm = {
  play: () => timeline.play(),
  pause: () => timeline.pause(),
  restart,
  seekTo,
  getTime: () => timeline.time(),
  getDuration: () => timeline.duration(),
  timeline,
};

const initial = Number.isFinite(startAt) ? startAt : 0;
timeline.seek(initial, false);
timeline.play();
