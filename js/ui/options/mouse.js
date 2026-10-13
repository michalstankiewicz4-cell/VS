// Options > Mouse: sensitivity, inversion and button assignment.
import { h, btn, tx } from '../dom.js';
import { t, onLang } from '../../i18n/index.js';
import { RANGES } from '../../core/settings.js';
import { slider, checkbox, choice } from './widgets.js';

export function buildMouse({ settings }) {
  const m = () => settings.data.mouse;
  const set = (k) => (v) => settings.update((d) => { d.mouse[k] = v; });
  const buttons = [0, 1, 2].map((i) => ({ value: i, key: 'mouse.b' + i }));
  const rows = [
    slider({ label: 'mouse.rot', range: RANGES.rotSens, get: () => m().rotSens, set: set('rotSens'), fmt: (v) => v.toFixed(1) + '×' }),
    slider({ label: 'mouse.zoom', range: RANGES.zoomSens, get: () => m().zoomSens, set: set('zoomSens'), fmt: (v) => v.toFixed(1) + '×' }),
    checkbox({ label: 'mouse.invRot', get: () => m().invertRotate, set: set('invertRotate') }),
    checkbox({ label: 'mouse.invZoom', get: () => m().invertZoom, set: set('invertZoom') }),
    choice({ label: 'mouse.fire', items: buttons, get: () => m().fireButton, set: set('fireButton') }),
    choice({ label: 'mouse.drag', items: buttons, get: () => m().dragButton, set: set('dragButton') }),
  ];
  // The two buttons must differ: the settings sanitiser fixes conflicts, the UI just re-reads the values.
  settings.onChange(() => rows.forEach((r) => r.refresh()));
  return h('div', { class: 'tabbody' }, rows.map((r) => r.el), h('div', { class: 'btns' }, btn('mouse.reset', () => settings.resetSection('mouse'))));
}
