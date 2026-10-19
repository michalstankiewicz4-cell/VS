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
import { createDevReset } from '../ui/devreset.js';
import { VERSION } from '../version.js';

const ZERO = { x: 0, z: 0 };
const MOVE_KEYS = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'camLeft', 'camRight'];
const KEYSETS = { play: new Set([...MOVE_KEYS, 'interact', 'cameraView', 'inventory', 'useFood', 'useBandage', 'useWater']), build: new Set(MOVE_KEYS), edit: new Set([...MOVE_KEYS, 'editRotate', 'editTopView']) };
const ZOOM = { menu: 1, play: 1.27, dead: 1.27, build: 0.55, edit: 0.55 };   // play/dead 1.27 = two default mouse-wheel steps closer than 1

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
    bank: 0, best: 0, pending: false, deathAt: null,   // pending: base building is open (set by a death, cleared when a run starts)
    save() { write(KEYS.save, { bank: this.bank, best: this.best, s: world.list(), pb: this.pending, dp: this.deathAt }); },
    load() {
      const d = read(KEYS.save);
      if (!d || typeof d !== 'object') return;
      this.bank = Math.max(0, Math.floor(+d.bank) || 0);
      this.best = Math.max(0, Math.floor(+d.best) || 0);
      this.pending = d.pb === true;
      this.deathAt = Array.isArray(d.dp) && d.dp.every((v) => Number.isFinite(+v)) ? [Math.max(-76, Math.min(76, +d.dp[0])), Math.max(-76, Math.min(76, +d.dp[1]))] : null;
      world.load(Array.isArray(d.s) ? d.s.slice(0, 200) : []);
    },
    wipe() { this.bank = 0; this.best = 0; this.pending = false; this.deathAt = null; world.load([]); this.save(); menu.refresh(); },
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
  const hud = createHud(uiEl, (kind) => world.use(kind));
  const builder = createBuilder({ root: uiEl, canvas, world, progress, settings, groundAt, isPaused, onPlay: () => startRun() });
  createDevReset({ root: uiEl });
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
    hud.showTop(m === 'play'); hud.showInv(false); menu.hide();
  }
  function goMenu() { enter('menu', 'menu'); menu.show('main'); }
  function startRun() { if (progress.pending) { progress.pending = false; progress.save(); } enter('play', 'play'); }
  // The build camera starts at the starting bunker's spawn point if there is one, otherwise where the player died.
  function openBuild() {
    if (!progress.pending) return;
    enter('build', 'idle');
    const d = progress.deathAt, at = world.hq() ? world.spawn() : d ? { x: d[0], z: d[1] } : world.spawn();
    builder.open(at);
  }
  function openEdit() { enter('edit', 'idle'); editor.open(); }
  function pause() { paused = true; input.clear(); hud.showInv(false); menu.show('pause'); }
  function resume() { paused = false; input.clear(); menu.hide(); }
  function die() {
    mode = 'dead';
    const bonus = Math.floor(S.time / 10), total = S.pts + bonus;
    progress.bank += total; progress.best = Math.max(progress.best, total); progress.pending = true;
    progress.deathAt = [Math.round(world.player.pos.x * 10) / 10, Math.round(world.player.pos.z * 10) / 10]; progress.save();
    menu.setDeath({ kills: S.kills, time: Math.floor(S.time), pts: S.pts, bonus, total, bank: progress.bank });
    hud.showTop(false); hud.showInv(false);
    menu.show('dead');
  }

  addEventListener('keydown', (e) => {
    const tab = e.code === 'Tab' && mode === 'play' && !e.ctrlKey && !e.altKey && !e.metaKey && !e.target.closest?.('input,textarea,select,button');   // Tab pauses / resumes a run like Esc
    if ((e.code !== 'Escape' && !tab) || e.repeat) return;
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
    else if (act === 'inventory' && mode === 'play') hud.toggleInv();
    else if (act === 'useFood' && mode === 'play') world.use('food');
    else if (act === 'useBandage' && mode === 'play') world.use('bandage');
    else if (act === 'useWater' && mode === 'play') world.use('water');
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
  const fwd = new THREE.Vector3(), up = new THREE.Vector3(), origin = new THREE.Vector3();
  let last = performance.now(), frames = 0, fpsT = last, hudT = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t0 = now / 1000;
    const sdt = paused ? 0 : dt;
    const running = !paused && (mode === 'play' || mode === 'edit' || mode === 'build');
    const acts = running ? KEYSETS[mode] : null;   // only the keys that mean something in this mode are handled (none in menus, pause, the death screen)
    if (input.acts !== acts) { input.acts = acts; input.clear(); }
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
      else if (mode === 'build') builder.update(dt, mv, rig.zoom);
    }

    rig.topDown = mode === 'edit' && editor.top;
    const target = mode === 'play' || mode === 'dead' || mode === 'menu' ? world.player.pos : mode === 'edit' ? editor.pan : mode === 'build' ? builder.pan : origin;
    const view = rig.update(sdt, t0, { mode, target, zoomT: ZOOM[mode], car: mode === 'play' ? world.driveState() : null });
    rig.camera.getWorldDirection(fwd);
    world.fade.fwd.copy(fwd);
    const fk = (mode === 'play' && world.driveState()?.sc) || world.player.scale;   // size of whoever is hidden: person or car
    world.fade.radius.value = 2.8 * fk; world.fade.player.set(world.player.pos.x, fk, world.player.pos.z);
    if (mode === 'play' && view === 'iso') world.updateFade(world.player.pos.x, fk, world.player.pos.z, up.copy(fwd).negate(), -0.3 * fk);
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
    let s = t('hud.run', { hp: Math.ceil(S.hp), max: S.maxHp, pts: S.pts, kills: S.kills, time: `${mm}:${ss}`, tod: t(S.night > 0.5 ? 'hud.night' : 'hud.day'), bank: progress.bank, hunger: Math.round(S.hunger), thirst: Math.round(S.thirst) });
    if (S.driving) s += t('hud.carIn', { kmh: Math.round(S.speed * 3.6), exit: firstKey(k, 'interact'), view: firstKey(k, 'cameraView') });
    else if (S.carNear) s += t('hud.carNear', { key: firstKey(k, 'interact') });
    hud.setRun(s);
    hud.setHint(t('hud.hint', { move: moveLabel(k), fire: BUTTON_NAMES[m.fireButton], cam: camLabel(k), drag: BUTTON_NAMES[m.dragButton], interact: firstKey(k, 'interact'), inv: firstKey(k, 'inventory') }));
    hud.setInvKey(firstKey(k, 'inventory'));
    hud.setItems(S.items, { food: firstKey(k, 'useFood'), bandage: firstKey(k, 'useBandage'), water: firstKey(k, 'useWater') });
  }

  goMenu();
  requestAnimationFrame(frame);
  return { world, settings, input, pipe, rig, menu, progress, get mode() { return mode; }, get paused() { return paused; }, goMenu, startRun, openBuild, openEdit, pause, resume };
}
