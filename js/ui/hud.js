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
  const row = (label, item) => h('div', { class: 'invrow' }, tx(label), tx(item, 'b'));
  const slots = Array.from({ length: 8 }, () => h('i'));
  const close = tx('inv.close', 'div', { key: 'I' }); close.className = 'invkey'; let invKey = 'I';
  const inv = h('div', { id: 'inv', hidden: true },
    tx('inv.title', 'h4'),
    tx('inv.hands', 'h5'), row('inv.right', 'inv.rifle'), row('inv.left', 'inv.support'),
    tx('inv.clothes', 'h5'), row('inv.head', 'inv.helmet'), row('inv.body', 'inv.jacket'), row('inv.legs', 'inv.trousers'),
    tx('inv.pack', 'h5'), h('div', { class: 'slots' }, slots), tx('inv.packNote', 'div'), close);
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
