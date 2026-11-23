import { BEATS } from '../config/timeline.js';
import { createCameraRig } from '../components/CameraRig.js';
import { fadeScene, showLine, hideLine } from '../animation/transitions.js';
import { tweenCamera } from '../animation/cameraSystem.js';

const NODES = [
  { id: 'voice', kicker: 'Input', title: 'Voice', x: 180, y: 390 },
  { id: 'whisper', kicker: 'Speech', title: 'Whisper', x: 460, y: 390 },
  { id: 'qwen', kicker: 'Workers AI', title: 'Qwen3-30B', x: 790, y: 330 },
  { id: 'class', kicker: 'Understanding', title: 'Classification', x: 1140, y: 330 },
  { id: 'priority', kicker: 'Severity · Urgency · Impact', title: 'Priority', x: 1480, y: 390 },
  { id: 'photo', kicker: 'Optional', title: 'Photo', x: 460, y: 690 },
  { id: 'llama', kicker: 'Vision', title: 'Llama 4 Scout', x: 790, y: 690 },
  { id: 'hint', kicker: 'Does not decide', title: 'Image Hint', x: 1140, y: 620 },
];

export function mountAIScene(world) {
  const scene = document.createElement('section');
  scene.className = 'scene scene-ai';
  scene.dataset.scene = 'ai';
  const { rig, camera } = createCameraRig();
  camera.z = -180;
  camera.ry = 7;
  camera.apply();

  const nodes = NODES.map((node) => `
    <article class="ai-node" data-node="${node.id}" style="left:${node.x}px;top:${node.y}px">
      <em>${node.kicker}</em>
      <strong>${node.title}</strong>
    </article>
  `).join('');

  rig.innerHTML = `
    <svg class="ai-links" viewBox="0 0 1920 1080" aria-hidden="true">
      <path class="link link-main" d="M285 444 H520 C700 444 780 384 895 384 H1245 C1400 384 1480 444 1585 444" />
      <path class="link link-photo" d="M565 744 H895 H1180 C1245 744 1245 700 1245 520" />
    </svg>
    ${nodes}
  `;

  const hud = document.createElement('div');
  hud.className = 'scene-hud';
  hud.innerHTML = `
    <p class="headline ai-line-a">AI-Powered Understanding.</p>
    <p class="headline ai-line-b">Intelligent Prioritization.</p>
  `;

  scene.append(rig, hud);
  world.append(scene);

  return {
    el: scene,
    animate(tl) {
      fadeScene(tl, scene, BEATS.ai);
      tweenCamera(tl, camera, { z: 40, x: -40, ry: -4, duration: 8, ease: 'power1.inOut' }, 48.5);
      tweenCamera(tl, camera, { z: 120, x: -120, duration: 5.5, ease: 'power1.inOut' }, 57);

      const prepare = (selector) => {
        const path = rig.querySelector(selector);
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        return path;
      };
      const main = prepare('.link-main');
      const photo = prepare('.link-photo');

      tl.to(main, { strokeDashoffset: 0, duration: 3.4, ease: 'power1.inOut', immediateRender: false }, 49);
      tl.to(photo, { strokeDashoffset: 0, duration: 2.6, ease: 'power1.inOut', immediateRender: false }, 54.2);

      const order = ['voice', 'whisper', 'qwen', 'class', 'priority', 'photo', 'llama', 'hint'];
      order.forEach((id, index) => {
        const node = rig.querySelector(`[data-node="${id}"]`);
        const delay = id === 'photo' || id === 'llama' || id === 'hint' ? 53.6 : 48.8;
        const stagger = id === 'photo' || id === 'llama' || id === 'hint' ? (index - 5) * 0.35 : index * 0.42;
        tl.fromTo(node,
          { autoAlpha: 0, y: 24, filter: 'blur(8px)' },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power2.out', immediateRender: false },
          delay + stagger);
      });

      showLine(tl, hud.querySelector('.ai-line-a'), 49.4);
      hideLine(tl, hud.querySelector('.ai-line-a'), 55.6);
      showLine(tl, hud.querySelector('.ai-line-b'), 56.1);
      hideLine(tl, hud.querySelector('.ai-line-b'), 63.2);
    },
  };
}
