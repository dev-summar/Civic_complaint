import { BEATS } from '../config/timeline.js';
import { createCameraRig } from '../components/CameraRig.js';
import { createDashboardFrame } from '../components/DashboardFrame.js';
import { fadeScene, showLine, hideLine } from '../animation/transitions.js';
import { createDeviceSlot, tweenCamera, tweenSlot } from '../animation/cameraSystem.js';

export function mountDashboardScene(world) {
  const scene = document.createElement('section');
  scene.className = 'scene scene-dashboard';
  scene.dataset.scene = 'dashboard';
  const { rig, camera } = createCameraRig();
  camera.z = -180;
  camera.ry = 8;
  camera.apply();

  const dashboard = createDeviceSlot(createDashboardFrame('adminDashboard', { size: 'xl' }));
  const maps = createDeviceSlot(createDashboardFrame('complaintMaps', { size: 'lg' }));
  const detail = createDeviceSlot(createDashboardFrame('complaintDetail', { size: 'lg' }));

  Object.assign(dashboard.state, { x: 0, y: 18, z: -40, ry: -18, rx: 8, s: 0.96 });
  Object.assign(maps.state, { x: 520, y: 40, z: -120, ry: -28, rx: 10, s: 0.58 });
  Object.assign(detail.state, { x: -520, y: 40, z: -120, ry: 22, rx: 10, s: 0.58 });
  dashboard.state.apply();
  maps.state.apply();
  detail.state.apply();
  maps.slot.style.opacity = '0';
  detail.slot.style.opacity = '0';
  rig.append(dashboard.slot, maps.slot, detail.slot);

  const hud = document.createElement('div');
  hud.className = 'scene-hud';
  hud.innerHTML = `
    <p class="headline dash-a">Complete Civic Visibility.</p>
    <p class="headline dash-b">Complaint Maps. Case Detail.</p>
    <p class="headline dash-c">One Unified Dashboard.</p>
    <div class="dash-labels">
      <span>Monitor</span>
      <span>Maps</span>
      <span>Assign</span>
      <span>Resolve</span>
    </div>
  `;

  scene.append(rig, hud);
  world.append(scene);

  return {
    el: scene,
    animate(tl) {
      fadeScene(tl, scene, BEATS.dashboard);
      tweenCamera(tl, camera, { z: 30, ry: 0, duration: 6.2, ease: 'power2.out' }, 80.4);
      tweenSlot(tl, dashboard.state, { ry: -4, rx: 2, z: 30, s: 1, duration: 6.5, ease: 'power2.inOut' }, 80.6);

      showLine(tl, hud.querySelector('.dash-a'), 81.1);
      hideLine(tl, hud.querySelector('.dash-a'), 84.8);
      tl.fromTo(hud.querySelectorAll('.dash-labels span'),
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.1, immediateRender: false },
        81.8);

      // Bring complaint maps forward
      tl.to(maps.slot, { opacity: 1, duration: 0.5, immediateRender: false }, 85);
      tweenSlot(tl, maps.state, { x: 210, y: 10, z: 50, ry: -8, rx: 2, s: 0.82, duration: 4.2, ease: 'power2.out' }, 85);
      tweenSlot(tl, dashboard.state, { x: -280, y: 30, z: -30, s: 0.72, ry: 8, duration: 4.2, ease: 'power2.inOut' }, 85);
      showLine(tl, hud.querySelector('.dash-b'), 85.4);
      hideLine(tl, hud.querySelector('.dash-b'), 89.2);

      // Bring complaint detail / assign board
      tl.to(detail.slot, { opacity: 1, duration: 0.5, immediateRender: false }, 89);
      tweenSlot(tl, detail.state, { x: -200, y: 8, z: 60, ry: 6, rx: 1, s: 0.84, duration: 4, ease: 'power2.out' }, 89);
      tweenSlot(tl, maps.state, { x: 260, y: 24, z: 10, s: 0.7, duration: 4, ease: 'power2.inOut' }, 89);
      tweenSlot(tl, dashboard.state, { x: 0, y: 120, z: -80, s: 0.55, duration: 4, ease: 'power2.inOut' }, 89);
      showLine(tl, hud.querySelector('.dash-c'), 89.6);
      hideLine(tl, hud.querySelector('.dash-c'), 94);

      tl.to([dashboard.floater, maps.floater, detail.floater], {
        y: -8,
        duration: 2.8,
        yoyo: true,
        repeat: 2,
        ease: 'sine.inOut',
        stagger: 0.15,
      }, 86);
    },
  };
}
