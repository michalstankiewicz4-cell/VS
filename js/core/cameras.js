// Camera rig: isometric (orthographic) follow camera for on-foot play, building and editing;
// chase and cockpit (driver's seat) perspective views while driving (C cycles them);
// and a low perspective showcase camera for the start screen.
import * as THREE from '../../vendor/three.module.js';
import { clamp, wrapAngle } from './util.js';
import { SEAT } from '../world/vehicles.js';

const VIEW_H = 16;                              // visible world height of the isometric view
const ISO_OFFSET = new THREE.Vector3(0, 14, 10);
const YAW0 = 10 * Math.PI / 180;                // default iso rotation
const UP = new THREE.Vector3(0, 1, 0);
export const DRIVE_VIEWS = ['iso', 'chase', 'cockpit'];

export function createCameraRig({ scene, settings, input }) {
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -30, 90);
  const persp = new THREE.PerspectiveCamera(70, 1, 0.05, 150);
  scene.add(persp);                             // so the cockpit dash (child of the camera) renders
  let camera = ortho;

  let yaw = YAW0, userZoom = 1, topDown = false;
  let lookYaw = 0, lookPitch = 0, chaseTh = 0, viewIdx = 0;
  const look = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  let initialised = false, hadCar = false;

  /* ---- cockpit props: dashboard and steering wheel attached to the perspective camera ---- */
  const cockpit = new THREE.Group();
  const dark = (c) => new THREE.MeshLambertMaterial({ color: c });
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.5), dark(0x2a2c34));
  dash.position.set(0, -0.57, -0.9);
  const pivot = new THREE.Group();
  pivot.position.set(0, -0.3, -0.62); pivot.rotation.x = -0.9;
  const spin = new THREE.Group();
  spin.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 16), dark(0x0c0c0e)));
  spin.add(new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.035, 0.03), dark(0x0c0c0e)));
  spin.add(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.03), dark(0x0c0c0e)));
  pivot.add(spin);
  cockpit.add(dash, pivot);
  cockpit.visible = false;
  persp.add(cockpit);

  /* ---- input wiring ---- */
  input.onWheel = (dy) => {
    const m = settings.data.mouse;
    userZoom = clamp(userZoom * Math.exp(-dy * 0.0012 * m.zoomSens * (m.invertZoom ? -1 : 1)), 0.5, 2.2);
  };
  input.onDrag = (dx, dy) => {
    const m = settings.data.mouse, k = m.rotSens * (m.invertRotate ? -1 : 1);
    if (camera === ortho) yaw -= dx * 0.006 * k;
    else { lookYaw = clamp(lookYaw - dx * 0.006 * k, -Math.PI, Math.PI); lookPitch = clamp(lookPitch - dy * 0.004 * k, -0.6, 0.6); }
  };

  function resize(w, h) {
    const a = w / h;
    ortho.left = -a * VIEW_H / 2; ortho.right = a * VIEW_H / 2; ortho.top = VIEW_H / 2; ortho.bottom = -VIEW_H / 2;
    ortho.updateProjectionMatrix();
    persp.aspect = a; persp.updateProjectionMatrix();
  }

  const cycleView = () => { viewIdx = (viewIdx + 1) % DRIVE_VIEWS.length; lookYaw = 0; lookPitch = 0; };

  // ctx: { mode: 'menu'|'play'|'build'|'edit'|'dead', target: Vector3, zoomT: number, car: {x,z,th,vel,steer}|null }
  // Returns the name of the active view: 'showcase' | 'iso' | 'chase' | 'cockpit'.
  function update(dt, t, ctx) {
    const { mode, car } = ctx;
    if (car && !hadCar) { chaseTh = car.th; lookYaw = 0; lookPitch = 0; }   // entering a car: chase camera starts behind it
    hadCar = !!car;
    let view = mode === 'menu' ? 'showcase' : (mode === 'play' && car ? DRIVE_VIEWS[viewIdx] : 'iso');
    if (persp.fov !== (view === 'showcase' ? 52 : settings.data.gfx.fov)) { persp.fov = view === 'showcase' ? 52 : settings.data.gfx.fov; persp.updateProjectionMatrix(); }

    if (view === 'iso') {
      camera = ortho;
      yaw += (input.isDown('camRight') - input.isDown('camLeft')) * 1.8 * dt;
      if (!initialised) { look.copy(ctx.target); initialised = true; }
      look.lerp(ctx.target, 1 - Math.exp(-6 * dt));
      if (topDown) { ortho.position.copy(look).set(look.x, 24, look.z); ortho.up.set(0, 0, -1).applyAxisAngle(UP, yaw); }   // straight down, 90°
      else { ortho.position.copy(look).add(tmp.copy(ISO_OFFSET).applyAxisAngle(UP, yaw)); ortho.up.set(0, 1, 0); }
      ortho.lookAt(look);
      const zt = ctx.zoomT * userZoom;
      if (Math.abs(ortho.zoom - zt) > 0.002) { ortho.zoom += (zt - ortho.zoom) * Math.min(1, dt * 8); ortho.updateProjectionMatrix(); }
    } else {
      camera = persp;
      if (!input.dragging) { const k = 1 - Math.exp(-4 * dt); lookYaw -= lookYaw * k; lookPitch -= lookPitch * k; }   // recentre when released
      cockpit.visible = view === 'cockpit';
      if (view === 'showcase') {
        const sway = Math.sin(t * 0.12) * 1.2;
        const sx = ctx.target.x, sz = ctx.target.z;   // the spawn point (start courtyard or the starting bunker)
        persp.position.set(sx - 4.5 + sway, 1.5, sz + 9.5);
        persp.lookAt(sx - 1.2 + sway * 0.5, 4.2, sz - 10);
        persp.up.copy(UP);
      } else {
        const c = Math.cos(car.th), s = Math.sin(car.th), k = car.sc || 1;   // k: car size, so the chase and driver views scale with it
        if (view === 'chase') {
          chaseTh += wrapAngle(car.th - chaseTh) * Math.min(1, dt * 4);
          const a = chaseTh + lookYaw;
          persp.position.set(car.x - Math.sin(a) * 7.5 * k, (3.6 + lookPitch * 6) * k, car.z - Math.cos(a) * 7.5 * k);
          const ahead = 3 * k * (1 - Math.min(1, Math.abs(lookYaw)));
          persp.lookAt(tmp2.set(car.x + Math.sin(chaseTh) * ahead, 1.1 * k, car.z + Math.cos(chaseTh) * ahead));
        } else {
          chaseTh = car.th; cockpit.scale.setScalar(k);
          persp.position.set(car.x + (SEAT.dx * c + SEAT.dz * s) * k, SEAT.dy * k, car.z + (-SEAT.dx * s + SEAT.dz * c) * k);
          persp.rotation.order = 'YXZ';
          persp.rotation.set(-0.1 + lookPitch, car.th + Math.PI + lookYaw, 0);
          spin.rotation.z = -car.steer * 1.1;
        }
      }
    }
    if (view !== 'cockpit') cockpit.visible = false;
    camera.updateMatrixWorld();
    return view;
  }

  return {
    update, resize, cycleView,
    get camera() { return camera; },
    get yaw() { return yaw; },
    set topDown(v) { topDown = !!v; },
    get zoom() { return userZoom; },
    get view() { return camera === ortho ? 'iso' : 'persp'; },
  };
}
