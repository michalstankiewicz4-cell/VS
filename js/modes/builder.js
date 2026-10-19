// Base builder (available after a death): spend banked points on sentry guns, barricades and bunkers on a 2-unit grid anywhere on the map.
import * as THREE from '../../vendor/three.module.js';
import { h, btn, tx } from '../ui/dom.js';
import { t, onLang } from '../i18n/index.js';
import { COST } from '../world/index.js';

export function createBuilder({ root, canvas, world, progress, settings, groundAt, isPaused, onPlay }) {
  let active = false, sel = 'tower';
  const pan = new THREE.Vector3(0, 0, -30);   // camera target: the whole map is buildable, so the view can be moved
  const bank = h('div', { id: 'bank' }), info = h('p', { class: 'note' });
  const buttons = {};
  const mk = (id, key) => { const b = btn(key, () => { sel = id; refresh(); }); buttons[id] = b; return b; };
  const panel = h('div', { id: 'build', hidden: true }, bank,
    h('div', { class: 'btns' }, mk('tower', 'build.tower'), mk('wall', 'build.wall'), mk('crypt', 'build.crypt'), mk('remove', 'build.remove'), btn('build.play', onPlay)), info);
  root.append(panel);

  function refresh() {
    bank.textContent = t('build.bank', { bank: progress.bank, n: world.count('crypt') });
    for (const [id, b] of Object.entries(buttons)) b.classList.toggle('on', id === sel);
    info.textContent = t('build.info.' + sel) + '\n' + t('build.pan');
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
    pan,
    open() { active = true; panel.hidden = false; pan.set(0, 0, -30); refresh(); },
    close() { active = false; panel.hidden = true; world.setGhost(false, 0, 0, true); },
    // mv: camera-relative pan vector; zoom: current user zoom (pans slower when zoomed in)
    update(dt, mv, zoom) {
      if (!active) return;
      pan.x = Math.max(-70, Math.min(70, pan.x + mv.x * 28 * dt / zoom));
      pan.z = Math.max(-70, Math.min(70, pan.z + mv.z * 28 * dt / zoom));
      const p = groundAt(0);
      if (p) {
        const gx = Math.round(p.x / 2), gz = Math.round(p.z / 2);
        world.setGhost(sel !== 'remove', gx, gz, world.canPlace(sel, gx, gz) && progress.bank >= COST[sel]);
      }
    },
  };
}
