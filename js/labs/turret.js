// Turret lab: the sentry gun from TurretKit (see labcore.js for the shared scene, panel and loop), plus aiming and a fire test.
import * as THREE from '../../vendor/three.module.js';
import { buildTurret, SCHEMA, DEFAULTS, PRESETS, sanitize } from '../turretkit/turretkit.js';
import { createLab, el } from './labcore.js';

const bulletGeo = new THREE.BoxGeometry(0.1, 0.1, 0.45), bulletMat = new THREE.MeshBasicMaterial({ color: 0xffd070 });
const bullets = [], a = { mode: 'sweep', yaw: 0, auto: true, fireT: 0 };

// A tracer along every barrel, like the game's bullets.
function shoot(lab) {
  const m = lab.model; m.fire();
  const yaw = m.head.rotation.y, dx = Math.sin(yaw), dz = Math.cos(yaw), p = m.params, origin = new THREE.Vector3(); m.gun.getWorldPosition(origin);
  for (let i = 0; i < p.guns; i++) {
    const side = (i - (p.guns - 1) / 2) * p.spacing, b = new THREE.Mesh(bulletGeo, bulletMat);
    b.position.set(origin.x + dx * (0.2 + p.barrelLen) + dz * side, origin.y, origin.z + dz * (0.2 + p.barrelLen) - dx * side);
    b.rotation.y = yaw; b.userData = { vx: dx * 26, vz: dz * 26, life: 0.7 }; lab.scene.add(b); bullets.push(b);
  }
}

createLab({
  key: 'cq:lab:turret:v1', SCHEMA, DEFAULTS, PRESETS, sanitize, build: (p) => buildTurret(p),
  hint: "The game builds its sentry guns from the parameters in js/turretkit/turretkit.js (DEFAULTS). To change the game's turret, export the JSON here and send it.",
  extra(panel, lab) {
    lab.h3('Aim and fire');
    const ab = el('div', { className: 'btns' });
    for (const m of ['sweep', 'mouse', 'manual']) { const b = el('button', { textContent: m, className: a.mode === m ? 'on' : '' }); b.addEventListener('click', () => { a.mode = m; for (const x of ab.children) if (x.dataset.aim) x.classList.toggle('on', x.textContent === m); }); b.dataset.aim = 1; ab.append(b); }
    const fb = el('button', { textContent: 'Fire (Space)' }); fb.addEventListener('click', () => shoot(lab));
    ab.append(fb, lab.flag('Auto fire', 'auto')); lab.st.auto = true; panel.append(ab);
    const yaw = el('input', { type: 'range', min: -3.14, max: 3.14, step: 0.02, value: 0 }), yv = el('span', { textContent: '0' });
    yaw.addEventListener('input', () => { a.yaw = +yaw.value; yv.textContent = a.yaw.toFixed(1); });
    panel.append(el('div', { className: 'row' }, el('span', { textContent: 'Manual yaw' }), yaw, yv));
    addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat && !/input|textarea/i.test(e.target.tagName)) { e.preventDefault(); shoot(lab); } });
  },
  onFrame(dt, t, lab) {
    const m = lab.model;
    m.head.rotation.y = a.mode === 'sweep' ? Math.sin(t * 0.6) * 1.2 : a.mode === 'mouse' ? lab.mouse * 2.6 : a.yaw;
    if (lab.st.auto) { a.fireT -= dt; if (a.fireT <= 0) { shoot(lab); a.fireT = 0.75; } }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i], u = b.userData; u.life -= dt; b.position.x += u.vx * dt; b.position.z += u.vz * dt;
      if (u.life <= 0) { lab.scene.remove(b); bullets.splice(i, 1); }
    }
  },
});
