// Options > Graphics: the pixel-art filter parameters (moved here from the old debug panel) and the FPS counter.
import { h, btn, tx } from '../dom.js';
import { RANGES } from '../../core/settings.js';
import { slider, checkbox, choice } from './widgets.js';
import { STYLES } from '../../render/look.js';

export function buildGraphics({ settings }) {
  const g = () => settings.data.gfx;
  const set = (k) => (v) => settings.update((d) => { d.gfx[k] = v; });
  const style = choice({
    label: 'gfx.style',
    items: STYLES.map((id) => ({ value: id, key: 'style.' + id })),
    get: () => g().style,
    set: (v) => settings.update((d) => { d.gfx.style = v; }),
  });
  const rows = [
    slider({ label: 'gfx.pixelH', range: RANGES.pixelH, get: () => g().pixelH, set: set('pixelH'), fmt: (v) => String(v) }),
    slider({ label: 'gfx.levels', range: RANGES.levels, get: () => g().levels, set: set('levels'), fmt: (v) => String(v) }),
    slider({ label: 'gfx.dither', range: RANGES.dither, get: () => g().dither, set: set('dither') }),
    slider({ label: 'gfx.edge', range: RANGES.edge, get: () => g().edge, set: set('edge') }),
    slider({ label: 'gfx.bright', range: RANGES.bright, get: () => g().bright, set: set('bright') }),
    slider({ label: 'gfx.fov', range: RANGES.fov, get: () => g().fov, set: set('fov'), fmt: (v) => v + '°' }),
    checkbox({ label: 'gfx.fps', get: () => g().showFps, set: set('showFps') }),
  ];
  // pixel-art sliders only for the pixel style; outline strength is not used by the realistic style
  const only = [[0, 'pixel'], [1, 'pixel'], [2, 'pixel']];
  const sync = () => {
    style.refresh(); rows.forEach((r) => r.refresh());
    for (const [i, s] of only) rows[i].el.hidden = g().style !== s;
    rows[3].el.hidden = g().style === 'real';
  };
  settings.onChange(sync);
  sync();
  return h('div', { class: 'tabbody' }, style.el, h('p', { class: 'note' }, tx('gfx.styleNote')), rows.map((r) => r.el), h('div', { class: 'btns' }, btn('gfx.reset', () => settings.resetSection('gfx'))));
}
