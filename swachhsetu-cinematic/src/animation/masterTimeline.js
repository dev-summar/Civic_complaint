import gsap from 'gsap';
import { BEATS } from '../config/timeline.js';
import { addSweeps } from './transitions.js';
import { mountProblemScene } from '../scenes/ProblemScene.js';
import { mountProductRevealScene } from '../scenes/ProductRevealScene.js';
import { mountVoiceScene } from '../scenes/VoiceScene.js';
import { mountReportingScene } from '../scenes/ReportingScene.js';
import { mountAIScene } from '../scenes/AIScene.js';
import { mountAssignmentScene } from '../scenes/AssignmentScene.js';
import { mountDashboardScene } from '../scenes/DashboardScene.js';
import { mountResolutionScene } from '../scenes/ResolutionScene.js';
import { mountFinalHeroScene } from '../scenes/FinalHeroScene.js';

export function createFilm(world, stage) {
  const scenes = [
    mountProblemScene(world),
    mountProductRevealScene(world),
    mountVoiceScene(world),
    mountReportingScene(world),
    mountAIScene(world),
    mountAssignmentScene(world),
    mountDashboardScene(world),
    mountResolutionScene(world),
    mountFinalHeroScene(world),
  ];

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.inOut', force3D: true },
  });

  scenes.forEach((scene) => scene.animate(tl));
  addSweeps(tl);

  const orbA = stage.querySelector('.orb-a');
  const orbB = stage.querySelector('.orb-b');
  tl.to(orbA, { x: 80, y: 40, duration: 120, ease: 'none' }, 0);
  tl.to(orbB, { x: -60, y: -30, duration: 120, ease: 'none' }, 0);

  tl.set({}, {}, BEATS.hero.end);
  return tl;
}
