import { BEATS } from '../config/timeline.js';
import { createCameraRig } from '../components/CameraRig.js';
import { fadeScene } from '../animation/transitions.js';
import { tweenCamera } from '../animation/cameraSystem.js';
import { mulberry32 } from '../animation/motionGraphics.js';

export function mountProblemScene(world) {
  const scene = document.createElement('section');
  scene.className = 'scene scene-problem';
  scene.dataset.scene = 'problem';

  const { rig, camera } = createCameraRig();
  camera.z = -120;
  camera.ry = -8;
  camera.rx = 7;
  camera.apply();

  const rand = mulberry32(21);
  const buildings = Array.from({ length: 22 }, () => {
    const width = 26 + rand() * 38;
    const height = 80 + rand() * 250;
    const lit = rand() > 0.7;
    return `<div class="building${lit ? ' building--lit' : ''}" style="width:${width}px;height:${height}px"></div>`;
  }).join('');

  const markers = [
    [48, 46, true],
    [62, 38, false],
    [36, 34, false],
    [70, 52, false],
    [42, 58, false],
    [58, 28, false],
    [30, 50, false],
  ].map(([x, y]) => `<span class="marker" style="left:${x}%;top:${y}%"><i></i></span>`).join('');

  rig.innerHTML = `
    <div class="city-grid"></div>
    <div class="horizon"></div>
    <div class="skyline">${buildings}</div>
    <div class="marker-layer">${markers}</div>
  `;

  const hud = document.createElement('div');
  hud.className = 'scene-hud';
  hud.innerHTML = `
    <p class="headline headline--center problem-line">Every City Has Problems.</p>
  `;

  scene.append(rig, hud);
  world.append(scene);

  return {
    el: scene,
    animate(tl) {
      fadeScene(tl, scene, BEATS.problem);
      tweenCamera(tl, camera, { z: 70, ry: 2, rx: 2, duration: 8.2, ease: 'power1.inOut' }, 1.2);
      tweenCamera(tl, camera, { z: 150, duration: 0.9, ease: 'power2.in' }, 9.05);

      const marks = rig.querySelectorAll('.marker');
      tl.fromTo(marks[0],
        { scale: 0.4, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.6)', immediateRender: false },
        2.4);
      tl.fromTo([...marks].slice(1),
        { scale: 0.4, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.55, stagger: 0.38, ease: 'power2.out', immediateRender: false },
        4.1);

      const line = hud.querySelector('.problem-line');
      tl.fromTo(line,
        { autoAlpha: 0, y: 26, filter: 'blur(12px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out', immediateRender: false },
        3.3);
      tl.to(line, { autoAlpha: 0, y: -16, duration: 0.5, immediateRender: false }, 8.3);
    },
  };
}
