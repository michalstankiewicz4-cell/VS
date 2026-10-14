// Application shell: owns the renderer, world, UI and the game-mode state machine
// (menu -> play / build / edit -> dead) plus pause handling and the frame loop.
import * as THREE from '../../vendor/three.module.js';
import { PixelPipeline } from '../render/pixel-pipeline.js';
import { createWorld } from '../world/index.js';
import { Input } from '../input/input.js';
import { moveLabel, camLabel, firstKey, BUTTON_NAMES } from '../input/bindings.js';
import { createSettings } from './settings.js';
import { createCameraRig } from './cameras.js';
import { read, write, KEYS } from './storage.js';
import { setLang, onLang, t } from '../i18n/index.js';
import { createHud } from '../ui/hud.js';
import { createMenu } from '../ui/menu.js';
import { createBuilder } from '../modes/builder.js';
import { createEditor } from '../modes/editor.js';
import { VERSION } from '../version.js';

const ZERO = { x: 0, z: 0 };
const ZOOM = { menu: 1, play: 1, dead: 1, build: 0.7, edit: 0.55 };

export function createApp({ appEl, uiEl }) {
  const settings = createSettings();
  setLang(settings.data.lang);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  appEl.appendChild(renderer.domElement);
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  const world = createWorld(scene);
  const S = world.S;
  const input = new Input(canvas, settings);
  const pipe = new PixelPipeline(renderer);
  const rig = createCameraRig({ scene, settings, input });

  /* ---- persistent progress (points bank, best run, built structures) ---- */
  const progress = {
    bank: 0, best: 0,
    save() { write(KEYS.save, { bank: this.bank, best: this.best, s: world.list() }); },
    load() {
      const d = read(KEYS.save);
      if (!d || typeof d !== 'object') return;
      this.bank = Math.max(0, Math.floor(+d.bank) || 0);
      this.best = Math.max(0, Math.floor(+d.best) || 0);
      world.load(Array.isArray(d.s) ? d.s.slice(0, 200) : []);
    },
    wipe() { this.bank = 0; this.best = 0; world.load([]); this.save(); menu.refresh(); },
  };
  progress.load();
  const savedMap = read(KEYS.map);
  if (Array.isArray(savedMap)) world.map.set(savedMap);
  const saveMap = () => write(KEYS.map, world.map.list());

  /* ---- picking helpers (isometric view only) ---- */
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  function groundAt(y) {
    if (!rig.camera.isOrthographicCamera) return null;
    plane.constant = -y;
    ray.setFromCamera(ndc.set(input.mouse.x, input.mouse.y), rig.camera);
    return ray.ray.intersectPlane(plane, hit) ? hit : null;
  }
  const pv = new THREE.Vector3();
  function project(x, y, z) {   // world point -> screen pixels (for editor floating options)
    pv.set(x, y, z).project(rig.camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (pv.x + 1) / 2 * r.width, y: r.top + (1 - pv.y) / 2 * r.height };
  }
  function pickIndex() {
    if (!rig.camera.isOrthographicCamera) return -1;
    ray.setFromCamera(ndc.set(input.mouse.x, input.mouse.y), rig.camera);
    return world.map.pick(ray);
  }

  /* ---- state machine ---- */
  let mode = 'menu', paused = false;
  const isPaused = () => paused;
  const hud = createHud(uiEl);
  const builder = createBuilder({ root: uiEl, canvas, world, progress, settings, groundAt, isPaused, onPlay: () => startRun() });
  const editor = createEditor({ scene, root: uiEl, canvas, world, settings, groundAt, pickIndex, project, isPaused, onPlay: () => startRun(), saveMap });
  const menu = createMenu(uiEl, {
    actions: { start: () => startRun(), build: () => openBuild(), editor: () => openEdit(), resume: () => resume(), quit: () => goMenu() },
    ctx: { settings, input, progress },
    progress,
  });

  function enter(m, worldMode) {
    mode = m; paused = false;
    world.reset(worldMode); input.clear();
    builder.close(); editor.close();
    hud.showTop(m === 'play'); menu.hide();
  }
  function goMenu() { enter('menu', 'menu'); menu.show('main'); }
  function startRun() { enter('play', 'play'); }
  function openBuild() { enter('build', 'idle'); builder.open(); }
  function openEdit() { enter('edit', 'idle'); editor.open(); }
  function pause() { paused = true; input.clear(); menu.show('pause'); }
  function resume() { paused = false; input.clear(); menu.hide(); }
  function die() {
    mode = 'dead';
    const bonus = Math.floor(S.time / 10), total = S.pts + bonus;
    progress.bank += total; progress.best = Math.max(progress.best, total); progress.save();
    menu.setDeath({ kills: S.kills, time: Math.floor(S.time), pts: S.pts, bonus, total, bank: progress.bank });
    hud.showTop(false);
    menu.show('dead');
  }

  addEventListener('keydown', (e) => {
    if (e.code !== 'Escape' || e.repeat) return;
    e.preventDefault();
    if (mode === 'dead') return;
    if (mode === 'menu') { menu.back(); return; }
    if (!paused) pause();
    else if (!menu.back()) resume();       // inside Options: back to the pause menu; on the pause menu: resume
  });
  input.onPress = (act) => {
    if (paused) return;
    if (act === 'interact' && mode === 'play') world.toggleCar();
    else if (act === 'cameraView' && mode === 'play' && S.driving) rig.cycleView();
    else if (act === 'editRotate' && mode === 'edit') editor.rotate();
    else if (act === 'editTopView' && mode === 'edit') editor.toggleTop();
  };

  /* ---- settings -> systems ---- */
  function applySettings() {
    const d = settings.data;
    pipe.setParams(d.gfx);
    hud.showFps(d.gfx.showFps);
    setLang(d.lang);
  }
  settings.onChange(applySettings);
  onLang(() => menu.refresh());
  applySettings();
  document.title = `Capital Quarantine — Free Zombie Survival Browser Game v${VERSION}`;

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    rig.resize(w, h);
    pipe.resize(w, h);
  }
  addEventListener('resize', resize);
  resize();

  /* ---- frame loop ---- */
  const fwd = new THREE.Vector3(), origin = new THREE.Vector3();
  let last = performance.now(), frames = 0, fpsT = last, hudT = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t0 = now / 1000;
    const sdt = paused ? 0 : dt;
    const running = !paused && (mode === 'play' || mode === 'edit');
    const raw = running ? input.moveVector() : ZERO;
    const yaw = rig.yaw, cy = Math.cos(yaw), sy = Math.sin(yaw);
    const mv = rig.camera.isOrthographicCamera ? { x: raw.x * cy + raw.z * sy, z: -raw.x * sy + raw.z * cy } : raw;
    const playing = !paused && mode === 'play';
    const aim = playing && !S.driving ? groundAt(0.9) : null;
    world.update(sdt, t0, { mv: playing ? mv : ZERO, aim, firing: playing && input.firing, drv: playing ? input.axes() : { thr: 0, steer: 0 } });
    if (playing) {
      input.tick(dt, raw.x !== 0 || raw.z !== 0);
      if (S.mode === 'dead') die();
    }

    if (!paused) {
      if (mode === 'edit') editor.update(dt, mv, rig.zoom);
      else if (mode === 'build') builder.update();
    }

    rig.topDown = mode === 'edit' && editor.top;
    const target = mode === 'play' || mode === 'dead' ? world.player.pos : mode === 'edit' ? editor.pan : origin;
    const view = rig.update(sdt, t0, { mode, target, zoomT: ZOOM[mode], car: mode === 'play' ? world.driveState() : null });
    rig.camera.getWorldDirection(fwd);
    world.fade.fwd.copy(fwd);
    world.fade.player.set(world.player.pos.x, 1, world.player.pos.z);
    world.fade.setOn(mode === 'play' && view === 'iso' ? 1 : 0);

    pipe.render(scene, rig.camera);

    frames++;
    if (now - fpsT > 500) {
      if (settings.data.gfx.showFps) hud.setFps(t('hud.fps', { version: VERSION, fps: Math.round(frames * 1000 / (now - fpsT)), w: pipe.rt.width, h: pipe.rt.height }));
      frames = 0; fpsT = now;
    }
    hudT += dt;
    if (hudT > 0.2) { hudT = 0; updateHud(); }
    requestAnimationFrame(frame);
  }

  function updateHud() {
    hud.setHp(S.maxHp ? S.hp / S.maxHp : 0);
    const k = settings.data.keys, m = settings.data.mouse;
    hud.showHint(mode === 'play' && !paused);
    if (mode !== 'play') return;
    const mm = Math.floor(S.time / 60), ss = String(Math.floor(S.time % 60)).padStart(2, '0');
    let s = t('hud.run', { hp: Math.ceil(S.hp), max: S.maxHp, pts: S.pts, kills: S.kills, time: `${mm}:${ss}`, tod: t(S.night > 0.5 ? 'hud.night' : 'hud.day'), bank: progress.bank });
    if (S.driving) s += t('hud.carIn', { kmh: Math.round(S.speed * 3.6), exit: firstKey(k, 'interact'), view: firstKey(k, 'cameraView') });
    else if (S.carNear) s += t('hud.carNear', { key: firstKey(k, 'interact') });
    hud.setRun(s);
    hud.setHint(t('hud.hint', { move: moveLabel(k), fire: BUTTON_NAMES[m.fireButton], cam: camLabel(k), drag: BUTTON_NAMES[m.dragButton], interact: firstKey(k, 'interact') }));
  }

  goMenu();
  requestAnimationFrame(frame);
  return { world, settings, input, pipe, rig, menu, progress, get mode() { return mode; }, get paused() { return paused; }, goMenu, startRun, openBuild, openEdit, pause, resume };
}
