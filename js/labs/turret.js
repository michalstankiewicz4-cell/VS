// Turret lab: the sentry gun from TurretKit on a slider panel, shown with the game's pixel-art filter and lighting.
// Orbit with the left mouse button, zoom with the wheel. Parameters are remembered in this browser and can be exported as JSON.
import * as THREE from '../../vendor/three.module.js';
import { PixelPipeline } from '../render/pixel-pipeline.js';
import { createPlayer } from '../world/player.js';
import { buildTurret, SCHEMA, DEFAULTS, PRESETS, sanitize } from '../turretkit/turretkit.js';

const KEY = 'cq:lab:turret:v1';
const $ = (t, props = {}, ...kids) => { const e = document.createElement(t); Object.assign(e, props); e.append(...kids); return e; };

/* ---- scene ---- */
const view = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.shadowMap.enabled = true;
view.append(renderer.domElement);
const pipe = new PixelPipeline(renderer);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const hemi = new THREE.HemisphereLight(0xc2ccd6, 0x5a4a3c, 3.0); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.8);
sun.position.set(6, 10, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04;
scene.add(sun);
const torch = new THREE.PointLight(0xff8a44, 0, 16, 2); torch.position.set(0, 2.6, 2); scene.add(torch);
const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshLambertMaterial({ color: 0x3a3a3e })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(12, 12, 0x555a66, 0x2a2d34); grid.position.y = 0.01; scene.add(grid);

// a player at the game's scale, to judge the size
const person = createPlayer({ scene }); person.state.pos.set(-2.4, 0, 0.9); person.state.face = 1.2; person.animate(false, 0);

/* ---- state ---- */
const st = { p: sanitize(JSON.parse(localStorage.getItem(KEY) || 'null')), pixel: true, night: false, wire: false, grid: true, person: true, orbit: true, aim: 'sweep', yaw: 0, auto: true };
let turret = null, bullets = [];
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st.p)); } catch { /* storage blocked */ } };

function rebuild() {
  if (turret) { scene.remove(turret.group); turret.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  turret = buildTurret(st.p); scene.add(turret.group);
  turret.group.traverse((o) => { if (o.isMesh && o.material.wireframe !== undefined) o.material.wireframe = st.wire; });
  save(); refreshStats();
}

/* ---- orbit camera ---- */
const orb = { az: 0.7, el: 0.42, dist: 7.5, tgt: new THREE.Vector3(0, 0.9, 0) };
function placeCam() {
  const c = Math.cos(orb.el);
  cam.position.set(orb.tgt.x + Math.sin(orb.az) * c * orb.dist, orb.tgt.y + Math.sin(orb.el) * orb.dist, orb.tgt.z + Math.cos(orb.az) * c * orb.dist);
  cam.lookAt(orb.tgt);
}
let drag = null, idle = 0;
view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; view.setPointerCapture(e.pointerId); });
view.addEventListener('pointerup', () => { drag = null; });
view.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX / innerWidth * 2 - 1;
  if (!drag) return;
  orb.az -= (e.clientX - drag.x) * 0.008; orb.el = Math.min(1.45, Math.max(0.05, orb.el + (e.clientY - drag.y) * 0.006));
  drag = { x: e.clientX, y: e.clientY }; idle = 0;
});
view.addEventListener('wheel', (e) => { e.preventDefault(); orb.dist = Math.min(20, Math.max(2.5, orb.dist * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
const mouse = { x: 0 };

/* ---- panel ---- */
const panel = document.getElementById('panel');
const sliders = {};
const flag = (label, key, apply) => {
  const b = $('button', { textContent: label, className: st[key] ? 'on' : '' });
  b.addEventListener('click', () => { st[key] = !st[key]; b.classList.toggle('on', st[key]); apply && apply(st[key]); });
  return b;
};
panel.append($('h3', { textContent: 'Presets' }));
const pr = $('div', { className: 'btns' });
for (const [name, over] of Object.entries(PRESETS)) {
  const b = $('button', { textContent: name }); b.addEventListener('click', () => setParams({ ...DEFAULTS, ...over })); pr.append(b);
}
const rnd = $('button', { textContent: 'Random' });
rnd.addEventListener('click', () => {
  const o = {}; for (const s of SCHEMA) if (s.length > 1) o[s[0]] = s[2] + Math.random() * (s[3] - s[2]);
  setParams(o);
});
pr.append(rnd); panel.append(pr);
for (const s of SCHEMA) {
  if (s.length === 1) { panel.append($('h3', { textContent: s[0] })); continue; }
  const [k, label, lo, hi, step] = s;
  const inp = $('input', { type: 'range', min: lo, max: hi, step });
  const val = $('span');
  const row = $('div', { className: 'row' + (hi === 1 && lo === 0 && step === 1 ? '' : '') }, $('span', { textContent: label }), inp, val);
  inp.addEventListener('input', () => { st.p[k] = +inp.value; val.textContent = fmt(k); rebuild(); });
  sliders[k] = { inp, val }; panel.append(row);
}
const fmt = (k) => (SCHEMA.find((s) => s[0] === k)[3] === 1 && SCHEMA.find((s) => s[0] === k)[4] === 1 && SCHEMA.find((s) => s[0] === k)[2] === 0 ? (st.p[k] ? 'on' : 'off') : String(st.p[k]));
function syncSliders() { for (const k in sliders) { sliders[k].inp.value = st.p[k]; sliders[k].val.textContent = fmt(k); } }
function setParams(o) { st.p = sanitize(o); syncSliders(); rebuild(); }

panel.append($('h3', { textContent: 'View' }));
const vb = $('div', { className: 'btns' });
vb.append(
  flag('Pixel filter', 'pixel'), flag('Night', 'night', applyNight), flag('Wireframe', 'wire', () => rebuild()),
  flag('Grid', 'grid', (on) => { grid.visible = on; }), flag('Player (scale)', 'person', (on) => { person.group.visible = on; }), flag('Auto orbit', 'orbit'),
);
panel.append(vb);
panel.append($('h3', { textContent: 'Aim and fire' }));
const ab = $('div', { className: 'btns' });
for (const m of ['sweep', 'mouse', 'manual']) { const b = $('button', { textContent: m, className: st.aim === m ? 'on' : '' }); b.addEventListener('click', () => { st.aim = m; for (const x of ab.children) x.classList.toggle('on', x.textContent === m); }); ab.append(b); }
const fireBtn = $('button', { textContent: 'Fire (Space)' }); fireBtn.addEventListener('click', shoot);
ab.append(fireBtn, flag('Auto fire', 'auto')); panel.append(ab);
const yawRow = $('div', { className: 'row' }, $('span', { textContent: 'Manual yaw' }), $('input', { type: 'range', min: -3.14, max: 3.14, step: 0.02, value: 0 }), $('span', { textContent: '0' }));
yawRow.children[1].addEventListener('input', (e) => { st.yaw = +e.target.value; yawRow.children[2].textContent = st.yaw.toFixed(1); });
panel.append(yawRow);

panel.append($('h3', { textContent: 'Export / import' }));
const ta = $('textarea', { spellcheck: false });
const msg = $('div', { id: 'msg' });
const eb = $('div', { className: 'btns' });
const exp = $('button', { textContent: 'Export' }), imp = $('button', { textContent: 'Import' }), rst = $('button', { textContent: 'Reset' }), cp = $('button', { textContent: 'Copy' });
exp.addEventListener('click', () => { ta.value = JSON.stringify(st.p); msg.textContent = 'Parameters exported.'; });
imp.addEventListener('click', () => { try { setParams(JSON.parse(ta.value)); msg.textContent = 'Imported.'; } catch { msg.textContent = 'Not valid JSON.'; } });
rst.addEventListener('click', () => { setParams(DEFAULTS); msg.textContent = 'Back to the game\'s defaults.'; });
cp.addEventListener('click', async () => { ta.value = JSON.stringify(st.p); try { await navigator.clipboard.writeText(ta.value); msg.textContent = 'Copied.'; } catch { ta.select(); msg.textContent = 'Press Ctrl+C.'; } });
eb.append(exp, cp, imp, rst); panel.append(eb, ta, msg);
panel.append($('p', { className: 'hint', textContent: 'The game builds its sentry guns from the parameters in js/turretkit/turretkit.js (DEFAULTS). To change the game\'s turret, export the JSON here and send it.' }));
const stats = $('div', { className: 'stats' }); panel.append(stats);
function refreshStats() { stats.textContent = `triangles ${turret.stats.triangles}\nmeshes ${turret.stats.meshes}`; }

function applyNight(on) {
  hemi.intensity = on ? 0.6 : 3.0; hemi.color.set(on ? 0x6a6080 : 0xc2ccd6);
  sun.intensity = on ? 0.8 : 2.8; sun.color.set(on ? 0x7f8fff : 0xfff0d0); torch.intensity = on ? 30 : 0;
  scene.background = new THREE.Color(on ? 0x07040b : 0x8d9aa4);
}

/* ---- shooting: a tracer along the barrels, like the game's bullets ---- */
const bulletGeo = new THREE.BoxGeometry(0.1, 0.1, 0.45), bulletMat = new THREE.MeshBasicMaterial({ color: 0xffd070 });
function shoot() {
  turret.fire();
  const yaw = turret.head.rotation.y, dx = Math.sin(yaw), dz = Math.cos(yaw), p = turret.params;
  const origin = new THREE.Vector3(); turret.gun.getWorldPosition(origin);
  for (let i = 0; i < p.guns; i++) {
    const side = (i - (p.guns - 1) / 2) * p.spacing, b = new THREE.Mesh(bulletGeo, bulletMat);
    b.position.set(origin.x + dx * (0.2 + p.barrelLen) + dz * side, origin.y, origin.z + dz * (0.2 + p.barrelLen) - dx * side);
    b.rotation.y = yaw; b.userData = { vx: dx * 26, vz: dz * 26, life: 0.7 }; scene.add(b); bullets.push(b);
  }
}
addEventListener('keydown', (e) => { if (e.code === 'Space' && !e.repeat && !/input|textarea/i.test(e.target.tagName)) { e.preventDefault(); shoot(); } });

/* ---- loop ---- */
function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); pipe.resize(w, h);
}
// The pixel pipeline sizes itself from the window; the lab view is the window minus the bar, which is close enough.
addEventListener('resize', resize);
let last = performance.now(), fireT = 0, t = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
  if (st.orbit && !drag) orb.az += dt * 0.25;
  if (st.aim === 'sweep') turret.head.rotation.y = Math.sin(t * 0.6) * 1.2;
  else if (st.aim === 'mouse') turret.head.rotation.y = mouse.x * 2.6;
  else turret.head.rotation.y = st.yaw;
  if (st.auto) { fireT -= dt; if (fireT <= 0) { shoot(); fireT = 0.75; } }
  turret.update(dt);
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i], u = b.userData; u.life -= dt; b.position.x += u.vx * dt; b.position.z += u.vz * dt;
    if (u.life <= 0) { scene.remove(b); bullets.splice(i, 1); }
  }
  placeCam();
  if (st.pixel) pipe.render(scene, cam); else renderer.render(scene, cam);
  requestAnimationFrame(frame);
}
scene.background = new THREE.Color(0x8d9aa4);
syncSliders(); rebuild(); resize(); placeCam();
requestAnimationFrame(frame);
window.__lab = { st, get turret() { return turret; }, setParams };
