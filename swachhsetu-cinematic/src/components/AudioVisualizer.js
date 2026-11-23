export function createAudioVisualizer(count = 40) {
  const root = document.createElement('div');
  root.className = 'visualizer';
  root.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i += 1) {
    const bar = document.createElement('span');
    const height = 18 + Math.abs(Math.sin(i * 0.55)) * 70;
    bar.style.setProperty('--rest', `${height}px`);
    root.append(bar);
  }
  return root;
}
