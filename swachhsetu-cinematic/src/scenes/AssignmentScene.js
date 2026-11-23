import { BEATS } from '../config/timeline.js';
import { createCameraRig } from '../components/CameraRig.js';
import { createDashboardFrame } from '../components/DashboardFrame.js';
import { fadeScene, showLine, hideLine } from '../animation/transitions.js';
import { createDeviceSlot, tweenCamera, tweenSlot } from '../animation/cameraSystem.js';

export function mountAssignmentScene(world) {
  const scene = document.createElement('section');
  scene.className = 'scene scene-assignment';
  scene.dataset.scene = 'assignment';
  const { rig, camera } = createCameraRig();
  camera.z = -80;
  camera.rx = 18;
  camera.apply();

  const mapsShot = createDeviceSlot(createDashboardFrame('complaintMaps', { size: 'md' }));
  Object.assign(mapsShot.state, { x: -520, y: 180, z: -40, ry: 16, rx: 8, s: 0.48 });
  mapsShot.state.apply();
  mapsShot.slot.style.opacity = '0';
  rig.append(mapsShot.slot);

  const board = document.createElement('div');
  board.className = 'assign-board';
  board.innerHTML = `
      <svg class="assign-links" viewBox="0 0 1500 820" aria-hidden="true">
        <path class="route route-ward" d="M390 400 C540 400 640 230 760 220" />
        <path class="route route-dept" d="M960 220 H1080" />
        <path class="route route-worker" d="M1120 290 C1120 380 1040 430 1040 470" />
        <path class="route route-officer" d="M1280 220 H1420" />
        <path class="route route-manual" d="M1120 640 C1220 690 1320 690 1400 650" />
      </svg>
      <div class="ward-map">
        <div class="ward-grid"></div>
        <svg viewBox="0 0 640 560" class="ward-shape" aria-hidden="true">
          <path class="ward-boundary" d="M170 120 H430 L520 250 L470 430 H190 L110 280 Z" />
        </svg>
        <div class="ward-pin"><i></i><em>Location</em></div>
      </div>
      <article class="route-card ward-card"><em>01</em><strong>Ward</strong><small>Geofence match</small></article>
      <article class="route-card dept-card"><em>02</em><strong>Department</strong><small>From category</small></article>
      <div class="worker-stack">
        <article class="worker"><span>Eligible</span><b><i style="--load:76%"></i></b></article>
        <article class="worker worker--pick"><span>Eligible</span><b><i style="--load:32%"></i></b></article>
        <article class="worker"><span>Eligible</span><b><i style="--load:58%"></i></b></article>
        <article class="worker worker--off"><span>Inactive</span><b><i style="--load:18%"></i></b></article>
      </div>
      <article class="route-card officer-card"><em>03</em><strong>Officer notified</strong></article>
      <article class="route-card manual-card"><strong>Manual assign</strong><small>If no eligible match</small></article>
  `;
  rig.append(board);

  const hud = document.createElement('div');
  hud.className = 'scene-hud';
  hud.innerHTML = `
    <p class="headline assign-a">Right Ward.</p>
    <p class="headline assign-b">Right Department.</p>
    <p class="headline assign-c">Right Worker.</p>
    <p class="headline assign-d">Smart Assignment.</p>
  `;

  scene.append(rig, hud);
  world.append(scene);

  return {
    el: scene,
    animate(tl) {
      fadeScene(tl, scene, BEATS.assignment);
      tweenCamera(tl, camera, { rx: 4, z: 20, duration: 6, ease: 'power2.out' }, 65.4);
      tweenCamera(tl, camera, { x: -70, z: 50, duration: 6.5, ease: 'power1.inOut' }, 72);
      tl.to(mapsShot.slot, { opacity: 1, duration: 0.55, immediateRender: false }, 66.4);
      tweenSlot(tl, mapsShot.state, { x: -420, y: 120, z: 20, s: 0.56, duration: 5.5, ease: 'power2.out' }, 66.5);

      const boundary = board.querySelector('.ward-boundary');
      const length = boundary.getTotalLength();
      boundary.style.strokeDasharray = `${length}`;
      boundary.style.strokeDashoffset = `${length}`;
      tl.to(boundary, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.out', immediateRender: false }, 66.2);
      tl.to(boundary, { fill: 'rgba(0, 212, 170, 0.12)', duration: 0.6, immediateRender: false }, 67.3);

      const dash = (selector) => {
        const path = board.querySelector(selector);
        const pathLength = path.getTotalLength();
        path.style.strokeDasharray = `${pathLength}`;
        path.style.strokeDashoffset = `${pathLength}`;
        return path;
      };
      tl.to(dash('.route-ward'), { strokeDashoffset: 0, duration: 0.8, immediateRender: false }, 67.2);
      tl.to(dash('.route-dept'), { strokeDashoffset: 0, duration: 0.7, immediateRender: false }, 70.1);
      tl.to(dash('.route-worker'), { strokeDashoffset: 0, duration: 0.8, immediateRender: false }, 73.2);
      tl.to(dash('.route-officer'), { strokeDashoffset: 0, duration: 0.7, immediateRender: false }, 75.4);
      tl.to(dash('.route-manual'), { strokeDashoffset: 0, duration: 0.8, immediateRender: false }, 76.4);

      tl.fromTo(board.querySelector('.ward-pin'),
        { autoAlpha: 0, y: -28 },
        { autoAlpha: 1, y: 0, duration: 0.55, ease: 'back.out(1.7)', immediateRender: false },
        65.8);
      tl.fromTo(board.querySelector('.ward-card'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, immediateRender: false }, 67.5);
      tl.fromTo(board.querySelector('.dept-card'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, immediateRender: false }, 70.3);
      tl.fromTo(board.querySelectorAll('.worker'),
        { autoAlpha: 0, x: 16 },
        { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.12, immediateRender: false },
        71.5);
      tl.fromTo(board.querySelectorAll('.worker b i'),
        { scaleX: 0 },
        { scaleX: 1, duration: 0.7, stagger: 0.1, ease: 'power2.out', immediateRender: false },
        72.2);
      tl.fromTo(board.querySelector('.worker--pick'),
        { boxShadow: '0 0 0 0 rgba(0,212,170,0)' },
        { boxShadow: '0 0 0 1px rgba(0,212,170,0.8), 0 10px 40px rgba(0,212,170,0.18)', duration: 0.5, immediateRender: false },
        74.2);
      tl.fromTo(board.querySelector('.officer-card'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, 75.5);
      tl.fromTo(board.querySelector('.manual-card'), { autoAlpha: 0 }, { autoAlpha: 0.55, duration: 0.4, immediateRender: false }, 76.6);

      showLine(tl, hud.querySelector('.assign-a'), 66.6);
      hideLine(tl, hud.querySelector('.assign-a'), 69.5);
      showLine(tl, hud.querySelector('.assign-b'), 70.2);
      hideLine(tl, hud.querySelector('.assign-b'), 73);
      showLine(tl, hud.querySelector('.assign-c'), 73.6);
      hideLine(tl, hud.querySelector('.assign-c'), 76.5);
      showLine(tl, hud.querySelector('.assign-d'), 76.9);
      hideLine(tl, hud.querySelector('.assign-d'), 79);
    },
  };
}
