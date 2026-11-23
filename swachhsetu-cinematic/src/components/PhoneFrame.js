import { SCREENSHOTS } from '../config/screenshots.js';
import { createScreenshotFrame } from './ScreenshotFrame.js';

/** Device chrome is separate from the screenshot surface so assets can be swapped later. */
export function createPhoneFrame(shotKey) {
  const shot = SCREENSHOTS[shotKey];
  const phone = document.createElement('article');
  phone.className = 'phone';
  phone.dataset.device = shot.id;
  phone.innerHTML = `
    <div class="phone-side phone-side--left" aria-hidden="true"></div>
    <div class="phone-side phone-side--right" aria-hidden="true"></div>
    <div class="phone-body">
      <div class="phone-screen"></div>
      <div class="phone-island" aria-hidden="true"></div>
      <div class="phone-glint" aria-hidden="true"></div>
    </div>
  `;
  phone.querySelector('.phone-screen').append(createScreenshotFrame(shot));
  return phone;
}
