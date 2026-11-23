export function splitGlyphs(text) {
  return [...text].map((glyph) => `<span class="mask"><span class="glyph">${glyph}</span></span>`).join('');
}

export function riseGlyphs(tl, glyphs, time, stagger = 0.035) {
  tl.fromTo(glyphs,
    { yPercent: 115 },
    {
      yPercent: 0,
      duration: 0.95,
      ease: 'power3.out',
      stagger,
      immediateRender: false,
    },
    time);
}
