import { BEATS } from '../config/timeline.js';
import { createCameraRig } from '../components/CameraRig.js';
import { fadeScene } from '../animation/transitions.js';
import { tweenCamera } from '../animation/cameraSystem.js';
import { splitGlyphs, riseGlyphs } from '../animation/textEffects.js';
import { bridgeMark, applyOptionalLogo } from '../animation/motionGraphics.js';

export function mountProductRevealScene(world) {
  const scene = document.createElement('section');
  scene.className = 'scene scene-reveal';
  scene.dataset.scene = 'reveal';

  const { rig, camera } = createCameraRig();
  camera.z = -80;
  camera.ry = 6;
  camera.apply();

  const glow = document.createElement('div');
  glow.className = 'reveal-glow';
  rig.append(glow);

  const mark = bridgeMark();
  applyOptionalLogo(mark);
  const markWrap = document.createElement('div');
  markWrap.className = 'mark-wrap';
  markWrap.append(mark);

  const hud = document.createElement('div');
  hud.className = 'scene-hud scene-hud--center';
  hud.innerHTML = `
    <h1 class="wordmark" aria-label="SwachhSetu">${splitGlyphs('SWACHHSETU')}</h1>
    <div class="wordmark-sheen" aria-hidden="true"></div>
    <p class="subhead reveal-sub">AI Civic Complaint Management</p>
    <span class="hairline" aria-hidden="true"></span>
  `;
  hud.prepend(markWrap);

  scene.append(rig, hud);
  world.append(scene);

  return {
    el: scene,
    animate(tl) {
      fadeScene(tl, scene, BEATS.reveal);
      tweenCamera(tl, camera, { z: 30, ry: 0, duration: 7.4, ease: 'power1.out' }, 10.4);

      tl.fromTo(glow,
        { scale: 0.4, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 1.6, ease: 'power2.out', immediateRender: false },
        10.1);
      tl.fromTo(markWrap,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.8, immediateRender: false },
        10.5);

      const wordmark = hud.querySelector('.wordmark');
      tl.fromTo(wordmark,
        { gap: '0.42em', filter: 'blur(16px)', autoAlpha: 0 },
        { gap: '0.04em', filter: 'blur(0px)', autoAlpha: 1, duration: 1.5, ease: 'power3.out', immediateRender: false },
        11.1);
      riseGlyphs(tl, hud.querySelectorAll('.glyph'), 11.15, 0.045);

      const sheen = hud.querySelector('.wordmark-sheen');
      tl.fromTo(sheen,
        { xPercent: -130, autoAlpha: 0 },
        { xPercent: 130, autoAlpha: 1, duration: 1.15, ease: 'power2.inOut', immediateRender: false },
        12.2);

      tl.fromTo(hud.querySelector('.reveal-sub'),
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.8, immediateRender: false },
        12.7);
      tl.fromTo(hud.querySelector('.hairline'),
        { scaleX: 0, autoAlpha: 0 },
        { scaleX: 1, autoAlpha: 1, duration: 0.9, ease: 'power2.out', immediateRender: false },
        12.55);
    },
  };
}
