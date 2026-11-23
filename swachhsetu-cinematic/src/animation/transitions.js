export function fadeScene(tl, element, beat) {
  tl.set(element, { autoAlpha: 0 }, 0);
  tl.to(element, {
    autoAlpha: 1,
    duration: Math.max(0.35, beat.visible - beat.fadeIn),
    ease: 'power1.out',
    immediateRender: false,
  }, beat.fadeIn);
  tl.to(element, {
    autoAlpha: 0,
    duration: Math.max(0.35, beat.end - beat.fadeOut),
    ease: 'power1.in',
    immediateRender: false,
  }, beat.fadeOut);
}

export function addSweeps(tl) {
  const times = [9.55, 19.6, 34.5, 47.55, 64.5, 79.55, 94.5, 107.55];
  times.forEach((time) => {
    tl.fromTo('.sweep',
      { xPercent: -140, autoAlpha: 0 },
      { xPercent: -10, autoAlpha: 1, duration: 0.38, ease: 'power2.out', immediateRender: false },
      time);
    tl.to('.sweep', {
      xPercent: 160,
      autoAlpha: 0,
      duration: 0.5,
      ease: 'power2.in',
      immediateRender: false,
    }, time + 0.34);
  });
}

export function showLine(tl, element, time, duration = 0.8) {
  tl.fromTo(element,
    { autoAlpha: 0, y: 22, filter: 'blur(10px)' },
    {
      autoAlpha: 1,
      y: 0,
      filter: 'blur(0px)',
      duration,
      ease: 'power3.out',
      immediateRender: false,
    },
    time);
}

export function hideLine(tl, element, time, duration = 0.45) {
  tl.to(element, {
    autoAlpha: 0,
    y: -12,
    duration,
    ease: 'power2.in',
    immediateRender: false,
  }, time);
}
