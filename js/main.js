import * as THREE from '../vendor/three.module.js';
import { PixelPipeline } from './render.js';
import { createWorld, COST } from './world.js';
import { Input } from './input.js';

const $ = (id) => document.getElementById(id);

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
const camRot = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
let yaw = 0, userZoom = 1;
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

/* ---- stany gry: menu / play / dead / build ---- */
let mode = 'menu', sel = 'tower', zoomT = 1;
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function ground(y) {
  plane.constant = -y;
  ray.setFromCamera(new THREE.Vector2(input.mouse.x, input.mouse.y), camera);
  return ray.ray.intersectPlane(plane, hit) ? hit : null;
}
const cell = (p) => ({ gx: Math.round(p.x / 2), gz: Math.round(p.z / 2) });

function showUi(title, info) {
  $('uiT').textContent = title; $('uiP').textContent = info; $('ui').hidden = false; $('build').hidden = true;
}
function menuText() {
  return `Bank: ${bank} pkt · rekord: ${best}\nCeluj myszą, trzymaj LPM, aby strzelać. Ruch: WASD.\nObrót kamery: Q / E albo PPM + przeciągnięcie. Zoom: kółko myszy.`;
}
function startRun() {
  world.reset(); world.setMode('play'); mode = 'play'; zoomT = 1;
  $('ui').hidden = true; $('build').hidden = true;
}
function openBuild() {
  world.reset(); world.setMode('idle'); mode = 'build'; zoomT = 0.7;
  $('ui').hidden = true; $('build').hidden = false; refreshBuild();
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
showUi('Warszawa — Strefa Zero', menuText());

/* ---- pętla ---- */
let last = performance.now(), frames = 0, fpsT = last, hudT = 0;
camLook.copy(world.player.pos);

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  yaw += ((camKeys.KeyE ? 1 : 0) - (camKeys.KeyQ ? 1 : 0)) * 1.8 * dt;
  const raw = mode === 'play' ? input.moveVector() : { x: 0, z: 0 };
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const mv = { x: raw.x * cy + raw.z * sy, z: -raw.x * sy + raw.z * cy };
  let aim = null;
  if (mode === 'play') aim = ground(0.9);
  world.update(dt, now / 1000, mv, aim, input.firing);
  if (mode === 'play') {
    input.tick(dt, raw.x !== 0 || raw.z !== 0);
    if (S.mode === 'dead') die();
  }
  if (mode === 'build') {
    const p = ground(0);
    if (p) { const { gx, gz } = cell(p); world.setGhost(sel !== 'remove', gx, gz, world.canPlace(sel, gx, gz) && bank >= COST[sel]); }
  } else world.setGhost(false, 0, 0, true);

  // kamera: w trybie budowy nad bazą, w grze za graczem
  const target = mode === 'play' ? world.player.pos : new THREE.Vector3(0, 0, 0);
  camLook.lerp(target, 1 - Math.exp(-6 * dt));
  camera.position.copy(camLook).add(camRot.copy(camOffset).applyAxisAngle(UP, yaw));
  camera.lookAt(camLook);
  const zt = zoomT * userZoom;
  if (Math.abs(camera.zoom - zt) > 0.002) { camera.zoom += (zt - camera.zoom) * Math.min(1, dt * 8); camera.updateProjectionMatrix(); }

  pipe.render(scene, camera);

  frames++;
  if (now - fpsT > 500) {
    $('fps').textContent = `${Math.round(frames * 1000 / (now - fpsT))} fps · render ${pipe.rt.width}×${pipe.rt.height}`;
    frames = 0; fpsT = now;
  }
  hudT += dt;
  if (hudT > 0.2) {
    hudT = 0;
    $('hpbar').firstElementChild.style.width = (S.maxHp ? S.hp / S.maxHp * 100 : 0) + '%';
    const m = Math.floor(S.time / 60), s = String(Math.floor(S.time % 60)).padStart(2, '0');
    $('run').textContent = mode === 'play'
      ? `HP ${Math.ceil(S.hp)}/${S.maxHp} · pkt ${S.pts} · zabójstwa ${S.kills} · ${m}:${s} · bank ${bank}`
      : `bank ${bank} pkt`;
    const c = input.counts;
    $('stats').textContent = `ruch ${c.move} · kliknięcia ${c.click}\nuniki ${c.dash} · interakcje ${c.interact} · budowa ${c.build}`;
    $('feat').textContent = JSON.stringify(input.features(), null, 1);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
