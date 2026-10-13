// In-game HUD: health bar, run summary line, control hint, optional FPS counter.
import { h } from './dom.js';

export function createHud(root) {
  const bar = h('i');
  const run = h('div', { id: 'run' });
  const top = h('div', { id: 'top', hidden: true }, h('div', { id: 'hpbar' }, bar), run);
  const hint = h('div', { id: 'hint', hidden: true });
  const fps = h('div', { id: 'fps', hidden: true });
  root.append(top, hint, fps);
  return {
    showTop: (on) => { top.hidden = !on; },
    showHint: (on) => { hint.hidden = !on; },
    showFps: (on) => { fps.hidden = !on; },
    setHp: (frac) => { bar.style.width = Math.max(0, Math.min(1, frac)) * 100 + '%'; },
    setRun: (s) => { run.textContent = s; },
    setHint: (s) => { hint.textContent = s; },
    setFps: (s) => { fps.textContent = s; },
  };
}
