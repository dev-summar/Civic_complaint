import { IMAGE_EXTENSIONS } from '../config/screenshots.js';

function candidateUrls(src) {
  const base = src.replace(/\.(png|jpe?g|webp)$/i, '');
  const preferred = src;
  const rest = IMAGE_EXTENSIONS.map((ext) => `${base}.${ext}`).filter((url) => url !== preferred);
  return [preferred, ...rest];
}

/**
 * Screenshot surface. Loads the real image when a file exists.
 * Falls back to a glass placeholder without breaking the surrounding frame.
 */
export function createScreenshotFrame(shot) {
  const frame = document.createElement('div');
  frame.className = `shot shot--${shot.layout}`;
  frame.dataset.shot = shot.id;

  const placeholder = document.createElement('div');
  placeholder.className = 'shot-placeholder';
  placeholder.innerHTML = `
    <div class="shot-grid" aria-hidden="true"></div>
    <div class="shot-sheen" aria-hidden="true"></div>
    <p>${shot.label}</p>
  `;

  const img = document.createElement('img');
  img.alt = '';
  img.draggable = false;
  img.decoding = 'async';

  frame.append(placeholder, img);

  const urls = candidateUrls(shot.src);
  let index = 0;
  let settled = false;

  const fail = () => {
    if (settled) return;
    settled = true;
    img.remove();
    frame.classList.add('is-placeholder');
  };

  const tryNext = () => {
    if (settled) return;
    if (index >= urls.length) {
      fail();
      return;
    }
    img.src = urls[index];
    index += 1;
  };

  img.addEventListener('load', () => {
    if (!img.naturalWidth) {
      tryNext();
      return;
    }
    settled = true;
    frame.classList.add('has-image');
    placeholder.remove();
  });

  img.addEventListener('error', () => {
    tryNext();
  });

  tryNext();
  return frame;
}
