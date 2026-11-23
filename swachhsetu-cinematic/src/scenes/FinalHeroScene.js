import { BEATS } from '../config/timeline.js';
import { createCameraRig } from '../components/CameraRig.js';
import { createPhoneFrame } from '../components/PhoneFrame.js';
import { createDashboardFrame } from '../components/DashboardFrame.js';
import { fadeScene } from '../animation/transitions.js';
import { createDeviceSlot, tweenCamera, tweenSlot } from '../animation/cameraSystem.js';
import { splitGlyphs, riseGlyphs } from '../animation/textEffects.js';
import { bridgeMark, applyOptionalLogo } from '../animation/motionGraphics.js';

const LAYOUT = [
  { type: 'phone', key: 'voiceAssistant', x: -560, y: 20, z: 40, ry: 18, s: 0.72 },
  { type: 'phone', key: 'complaintTracking', x: 560, y: 10, z: 30, ry: -16, s: 0.72 },
  { type: 'desktop', key: 'adminDashboard', x: 0, y: 10, z: 80, ry: -6, s: 0.78, size: 'lg' },
  { type: 'phone', key: 'complaintDraft', x: -340, y: -150, z: -180, ry: 22, s: 0.46 },
  { type: 'phone', key: 'locationPin', x: 360, y: -140, z: -200, ry: -20, s: 0.46 },
  { type: 'desktop', key: 'complaintMaps', x: -430, y: 210, z: -150, ry: 14, s: 0.42, size: 'md' },
  { type: 'desktop', key: 'complaintDetail', x: 430, y: 220, z: -160, ry: -18, s: 0.42, size: 'md' },
];

export function mountFinalHeroScene(world) {
  const scene = document.createElement('section');
  scene.className = 'scene scene-hero';
  scene.dataset.scene = 'hero';
  const { rig, camera } = createCameraRig();
  camera.z = 180;
  camera.ry = -4;
  camera.apply();

  const cluster = document.createElement('div');
  cluster.className = 'hero-devices';
  const devices = LAYOUT.map((item) => {
    const node = item.type === 'phone'
      ? createPhoneFrame(item.key)
      : createDashboardFrame(item.key, { size: item.size || 'lg' });
    const placed = createDeviceSlot(node);
    Object.assign(placed.state, {
      x: item.x * 0.72,
      y: item.y,
      z: item.z + 80,
      ry: item.ry + 8,
      s: item.s * 0.92,
    });
    placed.state.apply();
    placed.target = item;
    cluster.append(placed.slot);
    return placed;
  });

  rig.append(cluster);

  const mark = bridgeMark();
  applyOptionalLogo(mark);
  const markWrap = document.createElement('div');
  markWrap.className = 'mark-wrap hero-mark';
  markWrap.append(mark);

  const hud = document.createElement('div');
  hud.className = 'scene-hud scene-hud--center hero-hud';
  hud.innerHTML = `
    <h1 class="wordmark wordmark--final" aria-label="SwachhSetu">${splitGlyphs('SWACHHSETU')}</h1>
    <p class="subhead hero-tag">Cleaner Cities. Smarter Governance.</p>
    <p class="kicker hero-event">AI DAY 2026</p>
  `;
  hud.prepend(markWrap);

  scene.append(rig, hud);
  world.append(scene);

  return {
    el: scene,
    animate(tl) {
      fadeScene(tl, scene, BEATS.hero);
      tweenCamera(tl, camera, { z: -150, ry: 0, rx: 2, duration: 6.2, ease: 'power2.out' }, 108.4);

      devices.forEach((device, index) => {
        tweenSlot(tl, device.state, {
          x: device.target.x,
          y: device.target.y,
          z: device.target.z,
          ry: device.target.ry,
          s: device.target.s,
          duration: 5.4,
          ease: 'power2.out',
        }, 108.5 + index * 0.05);
        tl.to(device.floater, {
          y: index % 2 === 0 ? -10 : 8,
          duration: 3,
          yoyo: true,
          repeat: 1,
          ease: 'sine.inOut',
        }, 110);
      });

      tl.to(cluster, { autoAlpha: 0, duration: 1.1, ease: 'power1.in', immediateRender: false }, 114.3);
      tl.to(markWrap, { autoAlpha: 1, duration: 0.6, immediateRender: false }, 114.9);

      const wordmark = hud.querySelector('.wordmark--final');
      tl.fromTo(wordmark,
        { autoAlpha: 0, gap: '0.36em', filter: 'blur(12px)' },
        { autoAlpha: 1, gap: '0.04em', filter: 'blur(0px)', duration: 1.1, ease: 'power3.out', immediateRender: false },
        115);
      riseGlyphs(tl, hud.querySelectorAll('.wordmark--final .glyph'), 115.05, 0.03);
      tl.fromTo(hud.querySelector('.hero-tag'),
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.7, immediateRender: false },
        116.15);
      tl.fromTo(hud.querySelector('.hero-event'),
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.6, immediateRender: false },
        116.9);
    },
  };
}
