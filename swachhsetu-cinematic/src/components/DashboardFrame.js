import { SCREENSHOTS } from '../config/screenshots.js';
import { createScreenshotFrame } from './ScreenshotFrame.js';

export function createDashboardFrame(shotKey, { size = 'lg', chrome = 'swachhsetu.app' } = {}) {
  const shot = SCREENSHOTS[shotKey];
  const frame = document.createElement('article');
  frame.className = `desktop desktop--${size}`;
  frame.dataset.device = shot.id;
  frame.innerHTML = `
    <div class="desktop-body">
      <header class="desktop-bar">
        <span class="desktop-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="desktop-url">${chrome}</span>
      </header>
      <div class="desktop-screen"></div>
      <div class="desktop-glint" aria-hidden="true"></div>
    </div>
    <div class="desktop-shadow" aria-hidden="true"></div>
  `;
  frame.querySelector('.desktop-screen').append(createScreenshotFrame(shot));
  return frame;
}
