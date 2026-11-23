import { createCameraState } from '../animation/cameraSystem.js';

export function createCameraRig(className = 'scene-rig') {
  const rig = document.createElement('div');
  rig.className = className;
  const camera = createCameraState(rig);
  return { rig, camera };
}
