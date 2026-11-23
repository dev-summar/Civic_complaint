export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mountParticleField(canvas, getTime) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const rand = mulberry32(19);
  const dots = Array.from({ length: 64 }, () => ({
    x: rand() * 1920,
    y: rand() * 1080,
    size: rand() * 1.5 + 0.4,
    speed: rand() * 10 + 3,
    alpha: 0.12 + rand() * 0.38,
    teal: rand() > 0.35,
  }));

  const draw = () => {
    const time = getTime();
    ctx.clearRect(0, 0, 1920, 1080);
    dots.forEach((dot) => {
      const y = (dot.y - time * dot.speed) % 1080;
      const paintY = y < 0 ? y + 1080 : y;
      ctx.fillStyle = dot.teal
        ? `rgba(0, 212, 170, ${dot.alpha})`
        : `rgba(248, 250, 252, ${dot.alpha * 0.7})`;
      ctx.fillRect(dot.x, paintY, dot.size, dot.size);
    });
  };

  return draw;
}

export function mountGrain(target) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(4);
  const image = ctx.createImageData(160, 160);
  for (let i = 0; i < image.data.length; i += 4) {
    const shade = 180 + rand() * 75;
    image.data[i] = shade;
    image.data[i + 1] = shade;
    image.data[i + 2] = shade;
    image.data[i + 3] = 46;
  }
  ctx.putImageData(image, 0, 0);
  target.style.backgroundImage = `url(${canvas.toDataURL()})`;
}

export function bridgeMark() {
  const mark = document.createElement('div');
  mark.className = 'mark';
  mark.innerHTML = `
    <svg viewBox="0 0 86 48" aria-hidden="true">
      <path d="M8 34c14-20 56-20 70 0" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <path d="M8 34h70" fill="none" stroke="currentColor" stroke-width="1.1" opacity="0.45"/>
      <circle cx="8" cy="34" r="3" fill="currentColor"/>
      <circle cx="78" cy="34" r="3" fill="#00B8D9"/>
    </svg>
  `;
  return mark;
}

export async function applyOptionalLogo(mark) {
  try {
    const response = await fetch('/assets/logo/manifest.json', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    if (!data.file) return;
    const img = new Image();
    img.alt = '';
    img.src = `/assets/logo/${data.file}`;
    img.onload = () => {
      mark.replaceChildren(img);
      mark.classList.add('mark--image');
    };
  } catch {
    /* The drawn mark remains. */
  }
}
