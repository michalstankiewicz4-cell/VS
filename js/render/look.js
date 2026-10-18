// Graphics styles (post-process looks). Unlike a full material swap, these only change how the rendered
// frame is processed, so the style can be switched live from Options > Graphics (no reload).
//   pixel — original low-res pixel-art filter (default, `pixel-pipeline.js`)
//   real  — full resolution, bloom, ACES tone mapping, vignette, film grain
//   toon  — comic / cel: ink outlines from depth and colour edges, light posterisation
//   paint — watercolour: Kuwahara filter, ink edges, paper grain, hand-drawn wobble
//   noir  — VHS film noir: high-contrast monochrome, red kept, grain, scanlines, heavy vignette
// real / toon / paint come from the Battle repo (commit 858b4e0); noir is new here.
export const STYLES = ['pixel', 'real', 'toon', 'paint', 'noir'];     // order shown in Options
export const STYLE_ID = { pixel: 0, real: 1, toon: 2, paint: 3, noir: 4 };
export const isStyle = (s) => STYLES.includes(s);
