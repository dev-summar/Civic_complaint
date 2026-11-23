import { BEATS } from '../config/timeline.js';
import { createCameraRig } from '../components/CameraRig.js';
import { createPhoneFrame } from '../components/PhoneFrame.js';
import { createAudioVisualizer } from '../components/AudioVisualizer.js';
import { fadeScene, showLine, hideLine } from '../animation/transitions.js';
import { createDeviceSlot, tweenCamera, tweenSlot } from '../animation/cameraSystem.js';

export function mountVoiceScene(world) {
  const scene = document.createElement('section');
  scene.className = 'scene scene-voice';
  scene.dataset.scene = 'voice';

  const { rig, camera } = createCameraRig();
  camera.z = -260;
  camera.ry = -8;
  camera.rx = 4;
  camera.apply();

  const phone = createPhoneFrame('voiceAssistant');
  const placed = createDeviceSlot(phone);
  placed.state.x = 210;
  placed.state.y = 10;
  placed.state.z = -80;
  placed.state.ry = 26;
  placed.state.rx = 6;
  placed.state.apply();

  const rings = document.createElement('div');
  rings.className = 'pulse-rings';
  rings.innerHTML = '<i></i><i></i><i></i>';
  placed.floater.prepend(rings);

  const visualizer = createAudioVisualizer(36);
  rig.append(placed.slot, visualizer);

  const hud = document.createElement('div');
  hud.className = 'scene-hud';
  hud.innerHTML = `
    <div class="voice-copy">
      <p class="kicker">Qwen3-30B · Whisper</p>
      <div class="langs">
        <span>English</span>
        <span>हिन्दी</span>
        <span>Hinglish</span>
      </div>
    </div>
    <p class="headline headline--center voice-a">Just Speak.</p>
    <p class="headline headline--center voice-b">AI Understands.</p>
  `;

  scene.append(rig, hud);
  world.append(scene);

  return {
    el: scene,
    animate(tl) {
      fadeScene(tl, scene, BEATS.voice);
      tweenCamera(tl, camera, { z: 40, ry: 0, rx: 1, duration: 5.2, ease: 'power2.out' }, 20.5);
      tweenCamera(tl, camera, { z: 150, duration: 3.2, ease: 'power1.inOut' }, 26.2);
      tweenCamera(tl, camera, { z: 40, duration: 2.4, ease: 'power2.inOut' }, 30.6);
      tweenSlot(tl, placed.state, { ry: 0, rx: 0, z: 30, duration: 5.2, ease: 'power2.inOut' }, 20.6);
      tweenSlot(tl, placed.state, { x: 30, z: 150, duration: 3.3, ease: 'power1.inOut' }, 26.2);
      tweenSlot(tl, placed.state, { x: 180, z: 40, duration: 2.3, ease: 'power2.inOut' }, 30.5);
      tl.to(placed.floater, { y: -14, duration: 2.6, yoyo: true, repeat: 4, ease: 'sine.inOut' }, 21);

      tl.fromTo(visualizer,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.6, immediateRender: false },
        21.2);
      tl.to(visualizer.querySelectorAll('span'), {
        scaleY: () => gsapRandom(),
        duration: 0.35,
        repeat: 28,
        yoyo: true,
        ease: 'sine.inOut',
        stagger: { each: 0.015, from: 'center' },
        repeatRefresh: true,
      }, 21.3);

      tl.fromTo(rings.querySelectorAll('i'),
        { scale: 0.7, autoAlpha: 0.45 },
        { scale: 1.7, autoAlpha: 0, duration: 2.1, stagger: 0.45, repeat: 4, ease: 'power1.out', immediateRender: false },
        21.4);

      tl.fromTo(hud.querySelectorAll('.langs span'),
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.15, immediateRender: false },
        22.2);
      tl.to(hud.querySelectorAll('.langs span'), {
        y: -6,
        duration: 2.2,
        yoyo: true,
        repeat: 4,
        ease: 'sine.inOut',
        stagger: 0.2,
      }, 23);

      const lineA = hud.querySelector('.voice-a');
      const lineB = hud.querySelector('.voice-b');
      showLine(tl, lineA, 22.6);
      hideLine(tl, lineA, 27.2);
      showLine(tl, lineB, 27.6);
      hideLine(tl, lineB, 33.2);
    },
  };
}

function gsapRandom() {
  return 0.25 + Math.random() * 1.15;
}
