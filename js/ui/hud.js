// In-game HUD: health bar, run summary line, control hint, optional FPS counter.
import { h, tx } from './dom.js';
import { bind } from '../i18n/index.js';

export function createHud(root) {
  const bar = h('i');
  const run = h('div', { id: 'run' });
  const top = h('div', { id: 'top', hidden: true }, h('div', { id: 'hpbar' }, bar), run);
  const hint = h('div', { id: 'hint', hidden: true });
  const fps = h('div', { id: 'fps', hidden: true });
  // Equipment panel (read-only): what the soldier holds, wears and carries. Toggled with the 'inventory' key during a run.
  // A grid cell: a small pictogram (a coloured shape) over a caption; no item = an empty dashed cell.
  const pic = (shape, color) => { const i = h('i', { class: 'pic ' + shape }); i.style.background = color; return i; };   // via CSSOM: inline style attributes are blocked by the CSP
  const cell = (key, shape, color) => h('div', { class: 'cell' + (key ? '' : ' empty') }, key && pic(shape, color), key && tx(key, 'span'));
  const grid = (...cells) => h('div', { class: 'slots' }, cells);
  const close = tx('inv.close', 'div', { key: 'I' }); close.className = 'invkey'; let invKey = 'I';
  const inv = h('div', { id: 'inv', hidden: true },
    tx('inv.title', 'h4'),
    tx('inv.hands', 'h5'), grid(cell('inv.rifle', 'long', '#17181b'), cell('inv.light', 'tube', '#d9c46a')),
    tx('inv.clothes', 'h5'), grid(cell('inv.helmet', 'dome', '#2f3a2a'), cell('inv.jacket', 'box', '#4a5638'), cell('inv.trousers', 'legs', '#2a2d36')),
    tx('inv.pack', 'h5'), grid(...Array.from({ length: 8 }, () => cell(null))), tx('inv.packNote', 'div'), close);
  root.append(top, hint, fps, inv);
  return {
    showTop: (on) => { top.hidden = !on; },
    showHint: (on) => { hint.hidden = !on; },
    showInv: (on) => { inv.hidden = !on; },
    toggleInv: () => { inv.hidden = !inv.hidden; },
    setInvKey: (k) => { if (k !== invKey) { invKey = k; bind(close, 'inv.close', undefined, { key: k }); } },
    showFps: (on) => { fps.hidden = !on; },
    setHp: (frac) => { bar.style.width = Math.max(0, Math.min(1, frac)) * 100 + '%'; },
    setRun: (s) => { run.textContent = s; },
    setHint: (s) => { hint.textContent = s; },
    setFps: (s) => { fps.textContent = s; },
  };
}
