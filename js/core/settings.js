// User settings (graphics, keys, mouse, language, privacy), persisted locally and always sanitised.
import { read, write, KEYS } from './storage.js';
import { clamp } from './util.js';
import { sanitizeKeys } from '../input/bindings.js';

export const DEFAULTS = {
  lang: 'en',
  gfx: { pixelH: 200, levels: 7, dither: 0.8, edge: 0.8, bright: 1.4, fov: 70, showFps: false },
  mouse: { rotSens: 1, zoomSens: 1, invertRotate: false, invertZoom: false, fireButton: 0, dragButton: 2 },
  privacy: { stats: true },
};
// numeric ranges used by both the sanitiser and the option sliders
export const RANGES = {
  pixelH: [100, 400, 10], levels: [3, 16, 1], dither: [0, 1, 0.05], edge: [0, 1, 0.05], bright: [0.5, 3, 0.05], fov: [50, 100, 1],
  rotSens: [0.2, 3, 0.1], zoomSens: [0.2, 3, 0.1],
};
const num = (v, key, d) => { const [lo, hi] = RANGES[key]; v = +v; return Number.isFinite(v) ? clamp(v, lo, hi) : d; };
const btn = (v, d) => (v === 0 || v === 1 || v === 2 ? v : d);

export function sanitize(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const g = r.gfx || {}, m = r.mouse || {}, p = r.privacy || {}, D = DEFAULTS;
  const out = {
    lang: r.lang === 'pl' ? 'pl' : 'en',
    gfx: {
      pixelH: Math.round(num(g.pixelH, 'pixelH', D.gfx.pixelH) / 10) * 10, levels: Math.round(num(g.levels, 'levels', D.gfx.levels)),
      dither: num(g.dither, 'dither', D.gfx.dither), edge: num(g.edge, 'edge', D.gfx.edge), bright: num(g.bright, 'bright', D.gfx.bright),
      fov: Math.round(num(g.fov, 'fov', D.gfx.fov)), showFps: g.showFps === true,
    },
    mouse: {
      rotSens: num(m.rotSens, 'rotSens', 1), zoomSens: num(m.zoomSens, 'zoomSens', 1),
      invertRotate: m.invertRotate === true, invertZoom: m.invertZoom === true,
      fireButton: btn(m.fireButton, 0), dragButton: btn(m.dragButton, 2),
    },
    privacy: { stats: p.stats !== false },
    keys: sanitizeKeys(r.keys),
  };
  if (out.mouse.dragButton === out.mouse.fireButton) out.mouse.dragButton = [2, 1, 0].find((b) => b !== out.mouse.fireButton);
  return out;
}

export function createSettings() {
  let data = sanitize(read(KEYS.settings));
  const subs = new Set();
  const api = {
    get data() { return data; },
    // Mutates a draft, validates the result, saves and notifies listeners.
    update(fn) {
      const draft = structuredClone(data);
      fn(draft);
      data = sanitize(draft);
      write(KEYS.settings, data);
      subs.forEach((f) => f(data));
    },
    // Restores one section ('gfx' | 'mouse' | 'keys') to defaults.
    resetSection(name) {
      api.update((d) => { d[name] = name === 'keys' ? undefined : structuredClone(DEFAULTS[name]); });
    },
    onChange(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
  return api;
}
