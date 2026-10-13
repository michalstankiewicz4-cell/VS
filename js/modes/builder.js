// Base builder: spend banked points on sentry guns, barricades and bunkers on a 2-unit grid around the start.
import { h, btn, tx } from '../ui/dom.js';
import { t, onLang } from '../i18n/index.js';
import { COST } from '../world/index.js';

export function createBuilder({ root, canvas, world, progress, settings, groundAt, isPaused, onPlay }) {
  let active = false, sel = 'tower';
  const bank = h('div', { id: 'bank' }), info = h('p', { class: 'note' });
  const buttons = {};
  const mk = (id, key) => { const b = btn(key, () => { sel = id; refresh(); }); buttons[id] = b; return b; };
  const panel = h('div', { id: 'build', hidden: true }, bank,
    h('div', { class: 'btns' }, mk('tower', 'build.tower'), mk('wall', 'build.wall'), mk('crypt', 'build.crypt'), mk('remove', 'build.remove'), btn('build.play', onPlay)), info);
  root.append(panel);

  function refresh() {
    bank.textContent = t('build.bank', { bank: progress.bank, n: world.count('crypt') });
    for (const [id, b] of Object.entries(buttons)) b.classList.toggle('on', id === sel);
    info.textContent = t('build.info.' + sel);
  }
  onLang(refresh);

  canvas.addEventListener('mousedown', (e) => {
    if (!active || isPaused() || e.button !== settings.data.mouse.fireButton) return;
    const p = groundAt(0);
    if (!p) return;
    const gx = Math.round(p.x / 2), gz = Math.round(p.z / 2);
    if (sel === 'remove') {
      const type = world.remove(gx, gz);
      if (type) { progress.bank += Math.floor(COST[type] / 2); progress.save(); }
    } else if (progress.bank >= COST[sel] && world.place(sel, gx, gz)) {
      progress.bank -= COST[sel]; progress.save();
    }
    refresh();
  });

  return {
    open() { active = true; panel.hidden = false; refresh(); },
    close() { active = false; panel.hidden = true; world.setGhost(false, 0, 0, true); },
    update() {
      if (!active) return;
      const p = groundAt(0);
      if (p) {
        const gx = Math.round(p.x / 2), gz = Math.round(p.z / 2);
        world.setGhost(sel !== 'remove', gx, gz, world.canPlace(sel, gx, gz) && progress.bank >= COST[sel]);
      }
    },
  };
}
