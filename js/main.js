import * as THREE from '../vendor/three.module.js';
import { PixelPipeline } from './render.js';
import { createWorld, COST } from './world.js';
import { Input } from './input.js';
import { VERSION } from './version.js';

const $ = (id) => document.getElementById(id);
document.title = `Capital Quarantine — Free Zombie Survival Browser Game v${VERSION}`;

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const world = createWorld(scene);
const input = new Input();
const pipe = new PixelPipeline(renderer);
const S = world.S;

/* ---- kamera ortograficzna, pochylona (top-down) ---- */
const VIEW_H = 16;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -30, 90);
const camOffset = new THREE.Vector3(0, 14, 10);
const camLook = new THREE.Vector3();
const fwdTmp = new THREE.Vector3(), camRot = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
const YAW0 = 10 * Math.PI / 180;   // domyślny obrót kamery: 10° (jak po przesunięciu myszy w lewo)
let yaw = YAW0, userZoom = 1;
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  userZoom = Math.min(2.2, Math.max(0.5, userZoom * Math.exp(-e.deltaY * 0.0012)));
}, { passive: false });

/* ---- obrót kamery: Q/E albo PPM + przeciągnięcie ---- */
const camKeys = { KeyQ: false, KeyE: false };
const inForm = (t) => !!(t && t.closest && t.closest('input,textarea,select'));
addEventListener('keydown', (e) => { if (e.code in camKeys && !inForm(e.target)) camKeys[e.code] = true; });
addEventListener('keyup', (e) => { if (e.code in camKeys) camKeys[e.code] = false; });
addEventListener('blur', () => { camKeys.KeyQ = camKeys.KeyE = false; });
let drag = false;
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
renderer.domElement.addEventListener('mousedown', (e) => { if (e.button === 2) drag = true; });
addEventListener('mouseup', (e) => { if (e.button === 2) drag = false; });
addEventListener('mousemove', (e) => { if (drag) yaw -= e.movementX * 0.006; });

function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setSize(w, h, false);
  camera.left = -a * VIEW_H / 2; camera.right = a * VIEW_H / 2;
  camera.top = VIEW_H / 2; camera.bottom = -VIEW_H / 2;
  camera.updateProjectionMatrix();
  pipe.resize(w, h);
}
addEventListener('resize', resize);
resize();

/* ---- panel renderu ---- */
for (const k of ['pixelH', 'levels', 'dither', 'edge', 'bright']) {
  const el = $(k), out = $(k + 'v');
  el.addEventListener('input', () => {
    pipe.params[k] = +el.value;
    out.textContent = el.value;
    if (k === 'pixelH') pipe.resize(innerWidth, innerHeight);
  });
  pipe.params[k] = +el.value;
}
$('cnt').addEventListener('change', (e) => { input.enabled = e.target.checked; });
$('rst').addEventListener('click', () => input.reset());

/* ---- zapis lokalny (tylko ta przeglądarka) ---- */
const SAVE = 'gra:save:v1';
let bank = 0, best = 0;
function save() {
  try { localStorage.setItem(SAVE, JSON.stringify({ bank, best, s: world.list() })); } catch (e) { /* brak zapisu */ }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE) || 'null');
    if (!d) return;
    bank = Math.max(0, Math.floor(+d.bank) || 0);
    best = Math.max(0, Math.floor(+d.best) || 0);
    world.load(Array.isArray(d.s) ? d.s.slice(0, 200) : []);
  } catch (e) { /* uszkodzony zapis – ignorujemy */ }
}
load();

/* ---- mapa miasta: zapis lokalny ---- */
const MAPKEY = 'gra:map:v1';
function saveMap() { try { localStorage.setItem(MAPKEY, JSON.stringify(world.map.list())); } catch (e) { /* brak zapisu */ } }
try { const d = JSON.parse(localStorage.getItem(MAPKEY) || 'null'); if (Array.isArray(d)) world.map.set(d); } catch (e) { /* uszkodzona mapa – zostaje domyślna */ }

/* ---- stany gry: menu / play / dead / build ---- */
let mode = 'menu', sel = 'tower', zoomT = 1, tool = 'b', rot = 0;
const editCam = new THREE.Vector3();
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function ground(y) {
  plane.constant = -y;
  ray.setFromCamera(new THREE.Vector2(input.mouse.x, input.mouse.y), camera);
  return ray.ray.intersectPlane(plane, hit) ? hit : null;
}
const cell = (p) => ({ gx: Math.round(p.x / 2), gz: Math.round(p.z / 2) });

function setHud(on) { $('hud').hidden = !on; }
function showUi(title, info) {
  setHud(true);
  $('uiT').textContent = title; $('uiP').textContent = info; $('ui').hidden = false; $('build').hidden = true; $('ed').hidden = true;
}
function menuText() {
  return `Bank: ${bank} pkt · rekord: ${best}\nCeluj myszą, trzymaj LPM, aby strzelać. Ruch: WASD.\nObrót kamery: Q / E albo PPM + przeciągnięcie. Zoom: kółko myszy.\nModel Pałacu Kultury: kon.kp, CC BY 4.0 (uproszczony)\nwersja ${VERSION}`;
}
const START_Z = -36.5;   // punkt startu: dziedziniec przed Pałacem Kultury (Pałac stoi w (0, -46))
function startRun() {
  setHud(false);
  world.reset(); world.player.pos.set(0, 0, START_Z); world.setMode('play'); mode = 'play'; zoomT = 1;
  $('ui').hidden = true; $('build').hidden = true; $('ed').hidden = true;
}
function openBuild() {
  setHud(false);
  world.reset(); world.setMode('idle'); mode = 'build'; zoomT = 0.7;
  $('ui').hidden = true; $('build').hidden = false; $('ed').hidden = true; refreshBuild();
}
function die() {
  mode = 'dead'; world.setMode('idle');
  const bonus = Math.floor(S.time / 10), total = S.pts + bonus;
  bank += total; best = Math.max(best, total); save();
  showUi('Nie żyjesz', `Zabójstwa: ${S.kills} · czas: ${Math.floor(S.time)} s\nPunkty: ${S.pts} + bonus za czas ${bonus} = ${total}\nBank: ${bank} pkt`);
}
function refreshBuild() {
  $('bank').textContent = `Bank: ${bank} pkt · schrony: ${world.count('crypt')}/3`;
  for (const b of document.querySelectorAll('#build [data-t]')) b.classList.toggle('on', b.dataset.t === sel);
  $('bInfo').textContent = sel === 'tower' ? 'Stanowisko CKM: samo strzela do zombie.'
    : sel === 'wall' ? 'Barykada: blokuje zombie i pociski.'
    : sel === 'crypt' ? 'Schron: +25 maks. HP w kolejnych rundach (max 3).'
    : 'Usuń: zwraca połowę kosztu.';
}
function openEdit() {
  setHud(false);
  world.reset(); world.setMode('idle'); mode = 'edit'; zoomT = 0.55; editCam.set(0, 0, 44);
  $('ui').hidden = true; $('build').hidden = true; $('ed').hidden = false; refreshEd();
}
let edWhy = '', edWhyShown = '';
function refreshEd() {
  for (const b of document.querySelectorAll('#ed [data-e]')) b.classList.toggle('on', b.dataset.e === tool);
  $('eRot').classList.toggle('on', rot === 1);
  $('eInfo').textContent = `Obiekty: ${world.map.count()}/${world.map.max} · LPM: ${tool === 'x' ? 'usuń' : 'postaw'} · WASD: przesuń widok · Q/E, PPM, kółko: kamera. Strefa bazy (środek) zostaje wolna.` + (edWhy ? `\nNie można tu postawić: ${edWhy}.` : '');
}
function curObj() {
  const p = ground(0);
  if (!p) return null;
  const x = Math.round(p.x), z = Math.round(p.z);
  return tool === 'b' ? { t: 'b', x, z, w: +$('eW').value, d: +$('eD').value, h: +$('eH').value, s: Math.random() }
    : { t: 'c', x, z, r: rot, s: Math.random() };
}
function pickIdx() {
  ray.setFromCamera(new THREE.Vector2(input.mouse.x, input.mouse.y), camera);
  return world.map.pick(ray);
}
for (const b of document.querySelectorAll('#ed [data-e]')) b.addEventListener('click', () => { tool = b.dataset.e; refreshEd(); });
$('eRot').addEventListener('click', () => { rot ^= 1; refreshEd(); });
for (const k of ['eW', 'eD', 'eH']) $(k).addEventListener('input', () => { $(k + 'v').textContent = $(k).value; });
addEventListener('keydown', (e) => { if (mode === 'edit' && e.code === 'KeyR' && !inForm(e.target)) { rot ^= 1; refreshEd(); } });
renderer.domElement.addEventListener('mousedown', (e) => {
  if (mode !== 'edit' || e.button !== 0) return;
  if (tool === 'x') { const i = pickIdx(); if (i >= 0 && world.map.removeAt(i)) saveMap(); }
  else { const o = curObj(); if (o && world.map.add(o)) saveMap(); }
  refreshEd();
});
$('eDone').addEventListener('click', startRun);
$('eDef').addEventListener('click', () => { world.map.reset(); saveMap(); $('eInfo').textContent = 'Przywrócono domyślną mapę.'; });
$('eExp').addEventListener('click', async () => {
  const txt = JSON.stringify(world.map.list());
  $('eJson').hidden = false; $('eJson').value = txt;
  let ok = false; try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { $('eJson').select(); }
  $('eInfo').textContent = ok ? 'Skopiowano JSON mapy do schowka.' : 'Zaznaczone — skopiuj Ctrl+C.';
});
$('eImp').addEventListener('click', () => {
  if ($('eJson').hidden) { $('eJson').hidden = false; $('eJson').value = ''; $('eInfo').textContent = 'Wklej JSON mapy i kliknij Import jeszcze raz.'; return; }
  try {
    const txt = $('eJson').value;
    if (txt.length > 300000) throw new Error('za duży');
    const n = world.map.set(JSON.parse(txt));
    saveMap(); refreshEd(); $('eInfo').textContent = `Wczytano ${n} obiektów.`;
  } catch (e) { $('eInfo').textContent = 'Niepoprawny JSON mapy.'; }
});
function openMenu() {
  world.reset(); world.setMode('idle'); mode = 'menu'; zoomT = 1;
  showUi('Capital Quarantine', menuText());
}
addEventListener('keydown', (e) => {
  if (e.code === 'KeyF' && mode === 'play' && !e.repeat && !inForm(e.target)) world.toggleCar();
  if (e.code === 'Escape' && mode !== 'menu' && mode !== 'dead') openMenu();
});
$('bEdit').addEventListener('click', openEdit);
$('bPlay').addEventListener('click', startRun);
$('bBuild').addEventListener('click', openBuild);
$('bDone').addEventListener('click', startRun);
$('bWipe').addEventListener('click', () => {
  bank = 0; best = 0; world.load([]); save(); $('uiP').textContent = menuText();
});
for (const b of document.querySelectorAll('#build [data-t]')) {
  b.addEventListener('click', () => { sel = b.dataset.t; refreshBuild(); });
}
renderer.domElement.addEventListener('mousedown', (e) => {
  if (mode !== 'build' || e.button !== 0) return;
  const p = ground(0);
  if (!p) return;
  const { gx, gz } = cell(p);
  if (sel === 'remove') {
    const t = world.remove(gx, gz);
    if (t) { bank += Math.floor(COST[t] / 2); save(); }
  } else if (bank >= COST[sel] && world.place(sel, gx, gz)) {
    bank -= COST[sel]; save();
  }
  refreshBuild();
});
showUi('Capital Quarantine', menuText());

/* ---- pętla ---- */
let last = performance.now(), frames = 0, fpsT = last, hudT = 0;
camLook.copy(world.player.pos);

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  yaw += ((camKeys.KeyE ? 1 : 0) - (camKeys.KeyQ ? 1 : 0)) * 1.8 * dt;
  const raw = (mode === 'play' || mode === 'edit') ? input.moveVector() : { x: 0, z: 0 };
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const mv = { x: raw.x * cy + raw.z * sy, z: -raw.x * sy + raw.z * cy };
  let aim = null;
  if (mode === 'play') aim = ground(0.9);
  world.update(dt, now / 1000, mv, aim, input.firing, input.axes());
  if (mode === 'play') {
    input.tick(dt, raw.x !== 0 || raw.z !== 0);
    if (S.mode === 'dead') die();
  }
  if (mode === 'edit') {
    editCam.x = Math.max(-70, Math.min(70, editCam.x + mv.x * 28 * dt / userZoom));
    editCam.z = Math.max(-70, Math.min(70, editCam.z + mv.z * 28 * dt / userZoom));
    if (tool === 'x') {
      edWhy = ''; if (edWhyShown) { edWhyShown = ''; refreshEd(); }
      const i = pickIdx();
      if (i >= 0) { const b = world.map.bounds(i); world.setGhostBox(true, b.x, b.h / 2, b.z, b.hw * 2 + 0.2, b.h + 0.2, b.hd * 2 + 0.2, false); }
      else world.setGhostBox(false, 0, 0, 0, 1, 1, 1, false);
    } else {
      const o = curObj();
      if (edWhy !== edWhyShown) { edWhyShown = edWhy; refreshEd(); }
      if (o) { const b = world.map.boundsOf(o); world.setGhostBox(true, b.x, b.h / 2, b.z, b.hw * 2, b.h, b.hd * 2, world.map.canPlace(o)); edWhy = world.map.why(o); }
      else { edWhy = ''; world.setGhostBox(false, 0, 0, 0, 1, 1, 1, false); }
    }
  } else if (mode === 'build') {
    const p = ground(0);
    if (p) { const { gx, gz } = cell(p); world.setGhost(sel !== 'remove', gx, gz, world.canPlace(sel, gx, gz) && bank >= COST[sel]); }
  } else world.setGhost(false, 0, 0, true);

  // kamera: w trybie budowy nad bazą, w grze za graczem
  const target = mode === 'play' ? world.player.pos : mode === 'edit' ? editCam : new THREE.Vector3(0, 0, 0);
  camLook.lerp(target, 1 - Math.exp(-6 * dt));
  camera.position.copy(camLook).add(camRot.copy(camOffset).applyAxisAngle(UP, yaw));
  camera.lookAt(camLook);
  camera.updateMatrixWorld();
  camera.getWorldDirection(fwdTmp);
  world.fade.fwd.copy(fwdTmp);
  world.fade.player.set(world.player.pos.x, 1, world.player.pos.z);
  world.fade.setOn(mode === 'play' ? 1 : 0);
  const zt = zoomT * userZoom;
  if (Math.abs(camera.zoom - zt) > 0.002) { camera.zoom += (zt - camera.zoom) * Math.min(1, dt * 8); camera.updateProjectionMatrix(); }

  pipe.render(scene, camera);

  frames++;
  if (now - fpsT > 500) {
    $('fps').textContent = `v${VERSION} · ${Math.round(frames * 1000 / (now - fpsT))} fps · render ${pipe.rt.width}×${pipe.rt.height}`;
    frames = 0; fpsT = now;
  }
  hudT += dt;
  if (hudT > 0.2) {
    hudT = 0;
    $('hpbar').firstElementChild.style.width = (S.maxHp ? S.hp / S.maxHp * 100 : 0) + '%';
    const m = Math.floor(S.time / 60), s = String(Math.floor(S.time % 60)).padStart(2, '0');
    $('run').textContent = mode === 'play'
      ? `HP ${Math.ceil(S.hp)}/${S.maxHp} · pkt ${S.pts} · zabójstwa ${S.kills} · ${m}:${s} · ${S.night > 0.5 ? 'noc' : 'dzień'} · bank ${bank}${S.driving ? ` · auto ${Math.round(S.speed * 3.6)} km/h · F: wysiądź` : S.carNear ? ' · F: wsiądź do auta' : ''}`
      : `bank ${bank} pkt`;
    const c = input.counts;
    $('stats').textContent = `ruch ${c.move} · kliknięcia ${c.click}\nuniki ${c.dash} · interakcje ${c.interact} · budowa ${c.build}`;
    $('feat').textContent = JSON.stringify(input.features(), null, 1);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
