import { BEATS } from '../config/timeline.js';
import { createCameraRig } from '../components/CameraRig.js';
import { createPhoneFrame } from '../components/PhoneFrame.js';
import { fadeScene, showLine, hideLine } from '../animation/transitions.js';
import { createDeviceSlot, tweenCamera, tweenSlot } from '../animation/cameraSystem.js';

const STEPS = [
  { key: 'complaintDraft', word: 'Review.', startX: 40, startRy: 16 },
  { key: 'locationPin', word: 'Pin.', startX: 720, startRy: -18 },
  { key: 'photoUpload', word: 'Submit.', startX: 860, startRy: -22 },
];

export function mountReportingScene(world) {
  const scene = document.createElement('section');
  scene.className = 'scene scene-reporting';
  scene.dataset.scene = 'reporting';

  const { rig, camera } = createCameraRig();
  camera.z = 20;
  camera.apply();

  const devices = STEPS.map((step, index) => {
    const phone = createPhoneFrame(step.key);
    const placed = createDeviceSlot(phone);
    placed.state.x = step.startX;
    placed.state.y = 16;
    placed.state.z = index === 0 ? 30 : -140;
    placed.state.ry = step.startRy;
    placed.state.s = index === 0 ? 0.94 : 0.86;
    placed.state.apply();
    placed.slot.dataset.step = step.key;
    rig.append(placed.slot);
    return { ...step, ...placed };
  });

  const pin = document.createElement('div');
  pin.className = 'map-pin';
  pin.innerHTML = '<span class="pin-ring"></span><span class="pin-head"></span><span class="pin-stem"></span>';
  rig.append(pin);

  const hud = document.createElement('div');
  hud.className = 'scene-hud';
  hud.innerHTML = `
    <p class="headline headline--center step-word word-review">Review.</p>
    <p class="headline headline--center step-word word-pin">Pin.</p>
    <p class="headline headline--center step-word word-submit">Submit.</p>
    <p class="lockup"><span>Speak.</span><span>Review.</span><span>Pin.</span><span>Submit.</span></p>
  `;

  scene.append(rig, hud);
  world.append(scene);

  return {
    el: scene,
    animate(tl) {
      fadeScene(tl, scene, BEATS.reporting);
      const [draft, location, photo] = devices;

      tweenSlot(tl, draft.state, { x: -30, ry: 4, z: 70, duration: 2.2 }, 35.4);
      showLine(tl, hud.querySelector('.word-review'), 35.6);
      hideLine(tl, hud.querySelector('.word-review'), 38.3);

      tweenCamera(tl, camera, { x: -30, duration: 2.4, ease: 'power2.inOut' }, 38.2);
      tweenSlot(tl, draft.state, { x: -560, z: -40, ry: 20, s: 0.78, duration: 2.2 }, 38.3);
      tweenSlot(tl, location.state, { x: 20, z: 90, ry: 4, s: 0.96, duration: 2.2 }, 38.3);
      showLine(tl, hud.querySelector('.word-pin'), 39);
      hideLine(tl, hud.querySelector('.word-pin'), 42.1);

      tl.fromTo(pin,
        { autoAlpha: 0, y: -70, scale: 0.7 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.8)', immediateRender: false },
        39.6);
      tl.to(pin, { autoAlpha: 0, duration: 0.4, immediateRender: false }, 42.3);

      tweenSlot(tl, location.state, { x: -520, z: -30, ry: 16, s: 0.78, duration: 1.8 }, 42.2);
      tweenSlot(tl, photo.state, { x: 10, z: 80, ry: -4, s: 0.96, duration: 1.8 }, 42.2);
      showLine(tl, hud.querySelector('.word-submit'), 42.5);
      hideLine(tl, hud.querySelector('.word-submit'), 44.7);

      tweenCamera(tl, camera, { x: 0, z: -20, duration: 1.8 }, 44.8);
      tweenSlot(tl, draft.state, { x: -470, y: 20, z: 0, ry: 16, s: 0.74, duration: 1.5 }, 44.8);
      tweenSlot(tl, location.state, { x: 0, y: 0, z: 40, ry: 0, s: 0.78, duration: 1.5 }, 44.8);
      tweenSlot(tl, photo.state, { x: 470, y: 20, z: 0, ry: -16, s: 0.74, duration: 1.5 }, 44.8);

      tl.fromTo(hud.querySelectorAll('.lockup span'),
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08, immediateRender: false },
        45.3);
    },
  };
}
