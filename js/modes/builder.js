// Base builder (available after a death): spend banked points on sentry guns, barricades and bunkers on a 2-unit grid anywhere on the map.
import * as THREE from '../../vendor/three.module.js';
import { h, btn } from '../ui/dom.js';
import { t, onLang } from '../i18n/index.js';
import { COST } from '../world/index.js';
import { firstKey } from '../input/bindings.js';

export function createBuilder({ root, canvas, world, progress, settings, groundAt, isPaused, onPlay }) {
  let active = false, sel = 'tower', rot = 0, drag = null;   // rot: barricade axis (0 = x, 1 = z); drag: the last cell of a barricade line being dragged
  const pan = new THREE.Vector3();   // camera target: the whole map is buildable, so the view can be moved
  const bank = h('div', { id: 'bank' }), info = h('p', { class: 'note' });
  const buttons = {};
  const rotBtn = btn('build.rotate', () => rotate());
  const mk = (id, key) => { const b = btn(key, () => { sel = id; refresh(); }); buttons[id] = b; return b; };
  const panel = h('div', { id: 'build', hidden: true }, bank,
    h('div', { class: 'btns' }, mk('hq', 'build.hq'), mk('tower', 'build.tower'), mk('wall', 'build.wall'), rotBtn, mk('crypt', 'build.crypt'), mk('remove', 'build.remove'), btn('build.play', onPlay)), info);
  root.append(panel);

  function refresh() {
    bank.textContent = t('build.bank', { bank: progress.bank, n: world.count('crypt') });
    for (const [id, b] of Object.entries(buttons)) b.classList.toggle('on', id === sel);
    const key = firstKey(settings.data.keys, 'buildRotate');
    rotBtn.textContent = t('build.rotate', { key }); rotBtn.classList.toggle('on', rot === 1);
    info.textContent = t('build.info.' + sel, { key }) + '\n' + t('build.pan');
  }
  onLang(refresh);

  const rotate = () => { rot ^= 1; refresh(); };
  // Buys one barricade piece (the drag may place many; it stops by itself when the bank runs out).
  const putWall = (gx, gz, r) => {
    if (progress.bank >= COST.wall && world.place('wall', gx, gz, false, r)) { progress.bank -= COST.wall; progress.save(); refresh(); }
  };
  window.addEventListener('mouseup', () => { drag = null; });
  canvas.addEventListener('mousedown', (e) => {
    if (!active || isPaused() || e.button !== settings.data.mouse.fireButton) return;
    const p = groundAt(0);
    if (!p) return;
    const gx = Math.round(p.x / 2), gz = Math.round(p.z / 2);
    if (sel === 'wall') { drag = { gx, gz }; putWall(gx, gz, rot); return; }
    if (sel === 'remove') {
      const type = world.remove(gx, gz);
      if (type) { progress.bank += Math.floor(COST[type] / 2); progress.save(); }
    } else if (progress.bank >= COST[sel] && world.place(sel, gx, gz)) {
      progress.bank -= COST[sel]; progress.save();
    }
    refresh();
  });

  return {
    pan, rotate,
    open(at) { active = true; panel.hidden = false; pan.set(at.x, 0, at.z); refresh(); },
    close() { active = false; drag = null; panel.hidden = true; world.setGhost(false, 0, 0, true); },
    // mv: camera-relative pan vector; zoom: current user zoom (pans slower when zoomed in)
    update(dt, mv, zoom) {
      if (!active) return;
      pan.x = Math.max(-70, Math.min(70, pan.x + mv.x * 28 * dt / zoom));
      pan.z = Math.max(-70, Math.min(70, pan.z + mv.z * 28 * dt / zoom));
      const p = groundAt(0);
      if (p) {
        const gx = Math.round(p.x / 2), gz = Math.round(p.z / 2);
        if (drag && sel === 'wall') {   // dragging: walk from the last cell to this one, one grid step at a time (corners join by themselves)
          while (drag.gx !== gx || drag.gz !== gz) {
            const ax = Math.abs(gx - drag.gx), az = Math.abs(gz - drag.gz), alongX = ax >= az;
            if (alongX) drag.gx += Math.sign(gx - drag.gx); else drag.gz += Math.sign(gz - drag.gz);
            putWall(drag.gx, drag.gz, alongX ? 0 : 1);
          }
        }
        world.setGhost(sel !== 'remove', gx, gz, world.canPlace(sel, gx, gz) && progress.bank >= COST[sel], sel, rot);
      }
    },
  };
}
