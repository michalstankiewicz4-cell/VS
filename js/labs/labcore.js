// The shared body of the model labs: the scene with the game's lighting and pixel filter, an orbit camera, the slider panel built from a
// kit's SCHEMA (presets, random, export / import, view toggles) and the render loop. A lab page only supplies the kit and its own extras.
//   createLab({ key, SCHEMA, DEFAULTS, PRESETS, sanitize, build, extra, onFrame, hint, cam })
//   build(params, extras) -> { group, update?(dt), stats }      extra(panel, lab): adds lab-specific controls     onFrame(dt, t, lab)
import * as THREE from '../../vendor/three.module.js';
import { PixelPipeline } from '../render/pixel-pipeline.js';
import { createPlayer } from '../world/player.js';

export const el = (t, props = {}, ...kids) => { const e = document.createElement(t); Object.assign(e, props); e.append(...kids); return e; };

export function createLab(o) {
  const view = document.getElementById('view'), panel = document.getElementById('panel');
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.shadowMap.enabled = true; view.append(renderer.domElement);
  const pipe = new PixelPipeline(renderer), scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  const hemi = new THREE.HemisphereLight(0xc2ccd6, 0x5a4a3c, 3.0), sun = new THREE.DirectionalLight(0xfff0d0, 2.8), torch = new THREE.PointLight(0xff8a44, 0, 16, 2);
  sun.position.set(6, 10, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 34 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.04;
  torch.position.set(0, 2.6, 2); scene.add(hemi, sun, torch);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(16, 40), new THREE.MeshLambertMaterial({ color: 0x3a3a3e })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  const grid = new THREE.GridHelper(14, 14, 0x555a66, 0x2a2d34); grid.position.y = 0.01;
  scene.add(ground, grid); scene.background = new THREE.Color(0x8d9aa4);
  const person = createPlayer({ scene }); person.state.pos.set(...(o.personAt || [-2.4, 0, 0.9])); person.state.face = 1.2; person.animate(false, 0);   // a player at the game's scale

  const store = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const lab = { scene, cam, renderer, st: { p: o.sanitize(store(o.key, null)), x: store(o.key + ':x', {}), pixel: true, night: false, wire: false, grid: true, person: true, orbit: true }, model: null, panel, torch, person };
  const save = () => { try { localStorage.setItem(o.key, JSON.stringify(lab.st.p)); localStorage.setItem(o.key + ':x', JSON.stringify(lab.st.x)); } catch { /* storage blocked */ } };
  lab.save = save;

  function rebuild() {
    if (lab.model) { scene.remove(lab.model.group); lab.model.group.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }
    lab.model = o.build(lab.st.p, lab.st.x); scene.add(lab.model.group);
    lab.model.group.traverse((m) => { if (m.isMesh && m.material.wireframe !== undefined) m.material.wireframe = lab.st.wire; });
    save(); stats.textContent = Object.entries(lab.model.stats || {}).map(([k, v]) => `${k} ${v}`).join('\n');
  }
  lab.rebuild = rebuild;

  /* orbit camera */
  const orb = { az: 0.7, el: 0.42, dist: o.dist || 7.5, tgt: new THREE.Vector3(0, o.lookY ?? 0.9, 0) };
  let drag = null;
  view.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; view.setPointerCapture(e.pointerId); });
  view.addEventListener('pointerup', () => { drag = null; });
  view.addEventListener('pointermove', (e) => {
    lab.mouse = e.clientX / innerWidth * 2 - 1;
    if (!drag) return;
    orb.az -= (e.clientX - drag.x) * 0.008; orb.el = Math.min(1.45, Math.max(0.05, orb.el + (e.clientY - drag.y) * 0.006)); drag = { x: e.clientX, y: e.clientY };
  });
  view.addEventListener('wheel', (e) => { e.preventDefault(); orb.dist = Math.min(30, Math.max(2.5, orb.dist * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
  lab.mouse = 0;

  /* panel */
  const flag = (label, key, apply) => {
    const b = el('button', { textContent: label, className: lab.st[key] ? 'on' : '' });
    b.addEventListener('click', () => { lab.st[key] = !lab.st[key]; b.classList.toggle('on', lab.st[key]); apply && apply(lab.st[key]); }); return b;
  };
  lab.flag = flag; lab.h3 = (t) => panel.append(el('h3', { textContent: t }));
  const sliders = {};
  const isToggle = (s) => s[2] === 0 && s[3] === 1 && s[4] === 1;
  const fmt = (s) => (isToggle(s) ? (lab.st.p[s[0]] ? 'on' : 'off') : String(lab.st.p[s[0]]));
  lab.h3('Presets');
  const pr = el('div', { className: 'btns' });
  for (const [name, over] of Object.entries(o.PRESETS)) { const b = el('button', { textContent: name }); b.addEventListener('click', () => setParams({ ...o.DEFAULTS, ...over })); pr.append(b); }
  const rnd = el('button', { textContent: 'Random' });
  rnd.addEventListener('click', () => { const r = {}; for (const s of o.SCHEMA) if (s.length > 1) r[s[0]] = s[2] + Math.random() * (s[3] - s[2]); setParams(r); });
  pr.append(rnd); panel.append(pr);
  for (const s of o.SCHEMA) {
    if (s.length === 1) { lab.h3(s[0]); continue; }
    const [k, label, lo, hi, step] = s, inp = el('input', { type: 'range', min: lo, max: hi, step }), val = el('span');
    inp.addEventListener('input', () => { lab.st.p[k] = +inp.value; val.textContent = fmt(s); rebuild(); });
    sliders[k] = { inp, val, s }; panel.append(el('div', { className: 'row' }, el('span', { textContent: label }), inp, val));
  }
  const sync = () => { for (const k in sliders) { sliders[k].inp.value = lab.st.p[k]; sliders[k].val.textContent = fmt(sliders[k].s); } };
  function setParams(r) { lab.st.p = o.sanitize(r); sync(); rebuild(); }
  lab.setParams = setParams;

  lab.h3('View');
  const vb = el('div', { className: 'btns' });
  vb.append(flag('Pixel filter', 'pixel'), flag('Night', 'night', (on) => {
    hemi.intensity = on ? 0.6 : 3.0; hemi.color.set(on ? 0x6a6080 : 0xc2ccd6); sun.intensity = on ? 0.8 : 2.8; sun.color.set(on ? 0x7f8fff : 0xfff0d0);
    torch.intensity = on ? 30 : 0; scene.background = new THREE.Color(on ? 0x07040b : 0x8d9aa4); lab.onNight && lab.onNight(on);
  }), flag('Wireframe', 'wire', rebuild), flag('Grid', 'grid', (on) => { grid.visible = on; }), flag('Player (scale)', 'person', (on) => { person.group.visible = on; }), flag('Auto orbit', 'orbit'));
  panel.append(vb);

  if (o.extra) o.extra(panel, lab);

  lab.h3('Export / import');
  const ta = el('textarea', { spellcheck: false }), msg = el('div', { id: 'msg' }), eb = el('div', { className: 'btns' });
  const btn = (t, f) => { const b = el('button', { textContent: t }); b.addEventListener('click', f); return b; };
  eb.append(
    btn('Export', () => { ta.value = JSON.stringify(lab.st.p); msg.textContent = 'Parameters exported.'; }),
    btn('Copy', async () => { ta.value = JSON.stringify(lab.st.p); try { await navigator.clipboard.writeText(ta.value); msg.textContent = 'Copied.'; } catch { ta.select(); msg.textContent = 'Press Ctrl+C.'; } }),
    btn('Import', () => { try { setParams(JSON.parse(ta.value)); msg.textContent = 'Imported.'; } catch { msg.textContent = 'Not valid JSON.'; } }),
    btn('Reset', () => { setParams(o.DEFAULTS); msg.textContent = "Back to the game's defaults."; }));
  panel.append(eb, ta, msg, el('p', { className: 'hint', textContent: o.hint || '' }));
  const stats = el('div', { className: 'stats' }); panel.append(stats);

  /* loop */
  function resize() { const w = view.clientWidth, h = view.clientHeight; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); pipe.resize(w, h); }
  addEventListener('resize', resize);
  let last = performance.now(), t = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (lab.st.orbit && !drag) orb.az += dt * 0.25;
    if (o.onFrame) o.onFrame(dt, t, lab);
    if (lab.model.update) lab.model.update(dt);
    const c = Math.cos(orb.el);
    cam.position.set(orb.tgt.x + Math.sin(orb.az) * c * orb.dist, orb.tgt.y + Math.sin(orb.el) * orb.dist, orb.tgt.z + Math.cos(orb.az) * c * orb.dist); cam.lookAt(orb.tgt);
    if (lab.st.pixel) pipe.render(scene, cam); else renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  sync(); rebuild(); resize(); requestAnimationFrame(frame);
  window.__lab = lab;
  return lab;
}
