import { BEATS } from '../config/timeline.js';
import { createCameraRig } from '../components/CameraRig.js';
import { createPhoneFrame } from '../components/PhoneFrame.js';
import { fadeScene, showLine, hideLine } from '../animation/transitions.js';
import { createDeviceSlot, tweenCamera, tweenSlot } from '../animation/cameraSystem.js';

const LIFE = ['Reported', 'Assigned', 'In Progress', 'Resolved'];

export function mountResolutionScene(world) {
  const scene = document.createElement('section');
  scene.className = 'scene scene-resolution';
  scene.dataset.scene = 'resolution';
  const { rig, camera } = createCameraRig();
  camera.z = -40;
  camera.apply();

  const tracking = createDeviceSlot(createPhoneFrame('complaintTracking'));
  const resolution = createDeviceSlot(createPhoneFrame('resolution'));
  tracking.state.x = -40;
  tracking.state.ry = 14;
  tracking.state.z = 20;
  tracking.state.apply();
  resolution.state.x = 640;
  resolution.state.ry = -18;
  resolution.state.z = -120;
  resolution.state.s = 0.9;
  resolution.state.apply();
  rig.append(tracking.slot, resolution.slot);

  const hud = document.createElement('div');
  hud.className = 'scene-hud';
  hud.innerHTML = `
    <ol class="lifecycle">
      ${LIFE.map((step) => `<li><i></i><span>${step}</span></li>`).join('<b aria-hidden="true"></b>')}
    </ol>
    <div class="resolution-symbols">
      <span class="symbol-confirm" aria-label="Citizen confirmation">
        <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18"/><path d="M15 24.5 21 31l12-13"/></svg>
      </span>
      <span class="symbol-reopen" aria-label="Reopen">
        <svg viewBox="0 0 48 48"><path d="M34 18a12 12 0 1 0 1.2 8"/><path d="M34 12v7h-7"/></svg>
      </span>
    </div>
    <p class="headline resolve-a">Every Complaint Matters.</p>
    <p class="headline resolve-b">From Report to Resolution.</p>
  `;

  scene.append(rig, hud);
  world.append(scene);

  return {
    el: scene,
    animate(tl) {
      fadeScene(tl, scene, BEATS.resolution);
      tweenCamera(tl, camera, { x: -20, z: 30, duration: 4.2, ease: 'power1.inOut' }, 95.5);
      tweenSlot(tl, tracking.state, { x: -250, ry: 8, z: -20, s: 0.84, duration: 3.4 }, 99.2);
      tweenSlot(tl, resolution.state, { x: 180, ry: -4, z: 50, s: 0.98, duration: 3.4 }, 99.2);
      tweenCamera(tl, camera, { x: 40, z: 10, duration: 3.2 }, 100.4);
      tl.to(tracking.floater, { y: -10, duration: 2.8, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 96);
      tl.to(resolution.floater, { y: 8, duration: 3, yoyo: true, repeat: 2, ease: 'sine.inOut' }, 100);

      const steps = hud.querySelectorAll('.lifecycle li');
      const links = hud.querySelectorAll('.lifecycle b');
      steps.forEach((step, index) => {
        tl.fromTo(step, { autoAlpha: 0.28 }, { autoAlpha: 1, duration: 0.35, immediateRender: false }, 96.2 + index * 1.15);
      });
      tl.fromTo(links, { scaleX: 0 }, { scaleX: 1, duration: 0.4, stagger: 1.15, ease: 'power1.out', immediateRender: false }, 96.5);

      tl.fromTo(hud.querySelector('.symbol-confirm'),
        { autoAlpha: 0, scale: 0.8 },
        { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)', immediateRender: false },
        102.6);
      tl.fromTo(hud.querySelector('.symbol-reopen'),
        { autoAlpha: 0 },
        { autoAlpha: 0.8, duration: 0.45, immediateRender: false },
        103.5);

      showLine(tl, hud.querySelector('.resolve-a'), 96.4);
      hideLine(tl, hud.querySelector('.resolve-a'), 101.2);
      showLine(tl, hud.querySelector('.resolve-b'), 101.6);
      hideLine(tl, hud.querySelector('.resolve-b'), 106.6);
    },
  };
}
