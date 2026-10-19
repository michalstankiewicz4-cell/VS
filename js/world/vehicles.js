// Drivable cars. Cars from the city map become vehicles in live modes; F enters/exits the nearest one.
import * as THREE from '../../vendor/three.module.js';
import { clamp } from '../core/util.js';
import { EDGE, SIZE_DEFAULT } from './constants.js';
import { carParts, partColor, shapeGeo, DEFAULTS as CAR_DEFAULTS } from '../carkit/carkit.js';

const VMAX = 64;
// The car's boxes come from CarKit (tuned in labs/car.html): [dx (side, + = left), dy, dz (forward), sx, sy, sz, kind].
const MODEL = carParts(CAR_DEFAULTS), PARTS = MODEL.parts;
const CAR = { max: 15, rev: 6, acc: 14, racc: 9, brake: 28, coast: 4, turn: 1.9 };
// Driver seat (car-local, + x = left) used by the cockpit camera.
export const SEAT = MODEL.seat;

export function createVehicles({ scene, dummy, col, S, player }) {
  // One instanced mesh per part shape (box, round wheel, roof, two wedges), each with one colour per part.
  const lam = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const groups = [0, 1, 2, 3, 4].map((shape) => ({ shape, parts: PARTS.filter((p) => p[7] === shape) })).filter((g) => g.parts.length)
    .map((g) => ({ ...g, mesh: new THREE.InstancedMesh(shapeGeo(g.shape), lam, VMAX * g.parts.length) }));
  for (const g of groups) { g.mesh.castShadow = g.mesh.receiveShadow = true; g.mesh.frustumCulled = false; g.mesh.count = 0; scene.add(g.mesh); }
  const list = [];
  const cc = new THREE.Color();
  let driving = null, sc = SIZE_DEFAULT;   // sc: size multiplier (1 = original); CAR speeds, reach and steering follow it
  const reach = () => 1.5 * player.state.scale + 1.9 * sc;   // how far from the car centre the player can still enter it

  function place(v) {
    const c = Math.cos(v.th), sn = Math.sin(v.th);
    for (const { parts, mesh } of groups) {
      parts.forEach(([dx, dy, dz, sx, sy, sz], k) => {
        dummy.position.set(v.x + (dx * c + dz * sn) * sc, dy * sc, v.z + (dz * c - dx * sn) * sc);
        dummy.rotation.set(0, v.th, 0); dummy.scale.set(sx * sc, sy * sc, sz * sc); dummy.updateMatrix();
        mesh.setMatrixAt(v.i * parts.length + k, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  function paint(v) {
    for (const { parts, mesh } of groups) {
      parts.forEach((p, k) => {
        const [h, sa, l] = partColor(p[6], v.hue, v.sa, v.l);
        mesh.setColorAt(v.i * parts.length + k, cc.setHSL(h, sa, l));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  // A parked car is snapped to the axes and blocks movement and bullets.
  const park = (v) => {
    const alongZ = Math.abs(Math.sin(v.th)) < 0.5;
    v.blk.x = v.x; v.blk.z = v.z; const hw = MODEL.width / 2 + 0.05, hd = MODEL.length / 2 + 0.05;   // the footprint follows the model
    v.blk.hw = (alongZ ? hw : hd) * sc; v.blk.hd = (alongZ ? hd : hw) * sc;
  };

  // Called by the city before it re-creates its objects (its obstacle list is cleared separately).
  function clear() { list.length = 0; driving = null; S.driving = false; for (const g of groups) g.mesh.count = 0; }
  function spawn({ x, z, th, hue, sa, l }) {
    if (list.length >= VMAX) return null;
    const v = { i: list.length, x, z, th, vel: 0, steer: 0, hue, sa, l, blk: {} };
    park(v); list.push(v); col.cityBlk.push(v.blk);
    return v;
  }
  function finish() {
    for (const v of list) park(v);
    for (const g of groups) g.mesh.count = list.length * g.parts.length;
    for (const v of list) { place(v); paint(v); }
  }

  function nearest(maxD = reach()) {
    let best = null, bd = maxD * maxD;
    for (const v of list) {
      const dx = v.x - player.state.pos.x, dz = v.z - player.state.pos.z, d = dx * dx + dz * dz;
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  function exit() {
    if (!driving) return;
    const v = driving; driving = null;
    v.th = Math.round(v.th / (Math.PI / 2)) * Math.PI / 2; v.vel = 0; v.steer = 0;
    park(v); col.cityBlk.push(v.blk); place(v);
    const c = Math.cos(v.th), sn = Math.sin(v.th);
    const ox = { v: v.x + 2.0 * sc * c }, oz = { v: v.z - 2.0 * sc * sn };      // exit on the driver's (left) side
    col.push(ox, oz, 0.45 * player.state.scale);
    player.state.pos.set(ox.v, 0, oz.v); player.setVisible(true); S.driving = false;
  }
  function toggle() {
    if (S.mode !== 'play') return;
    if (driving) { exit(); return; }
    const v = nearest();
    if (!v) return;
    const i = col.cityBlk.indexOf(v.blk); if (i >= 0) col.cityBlk.splice(i, 1);
    driving = v; player.setVisible(false); S.driving = true; player.state.pos.set(v.x, 0, v.z);
  }

  function step(dt, thr, steer) {
    const v = driving;
    // every speed and acceleration is multiplied by the car's size, so a small car is as nimble (in car lengths) as a big one
    if (thr > 0) v.vel += (v.vel < 0 ? CAR.brake : CAR.acc) * sc * thr * dt;
    else if (thr < 0) v.vel += (v.vel > 0 ? -CAR.brake : -CAR.racc) * sc * -thr * dt;
    else v.vel -= Math.sign(v.vel) * Math.min(Math.abs(v.vel), CAR.coast * sc * dt);
    v.vel = clamp(v.vel, -CAR.rev * sc, CAR.max * sc);
    // steering scales with speed (right = clockwise turn on screen)
    v.th -= steer * CAR.turn * clamp(v.vel / (5 * sc), -1, 1) * dt;
    v.steer += (steer - v.steer) * Math.min(1, dt * 10);
    let nx = v.x + Math.sin(v.th) * v.vel * dt, nz = v.z + Math.cos(v.th) * v.vel * dt;
    // collisions: two circles (front and rear)
    const f = Math.sin(v.th), g = Math.cos(v.th);
    let mx = 0, mz = 0;
    for (const o of [sc, -sc]) {
      const a = { v: nx + f * o }, b = { v: nz + g * o };
      const ax = a.v, bz = b.v; col.push(a, b, 0.95 * sc);
      mx += a.v - ax; mz += b.v - bz;
    }
    if (Math.abs(mx) + Math.abs(mz) > 0.02) v.vel *= Math.max(0, 1 - 4 * dt) * 0.9;
    nx += mx; nz += mz;
    v.x = clamp(nx, -EDGE, EDGE); v.z = clamp(nz, -EDGE, EDGE);
    player.state.pos.set(v.x, 0, v.z); player.state.face = v.th;
    place(v);
    S.speed = Math.abs(v.vel) / sc;   // shown in original-size units, so the HUD speed does not depend on the size setting
  }
  // Is the point (x, z) under the moving car's body? (used to run zombies over)
  function runsOver(x, z) {
    const v = driving; if (!v || Math.abs(v.vel) < 3 * sc) return false;
    const dx = x - v.x, dz = z - v.z, c = Math.cos(v.th), sn = Math.sin(v.th);
    return Math.abs(dx * sn + dz * c) < 2.2 * sc && Math.abs(dx * c - dz * sn) < 1.2 * sc;
  }
  return {
    setScale(k) { sc = k; for (const v of list) { if (v !== driving) park(v); place(v); } },
    get scale() { return sc; }, reach,
    list, clear, spawn, finish, nearest, toggle, exit, step, runsOver,
    setRoof: (on) => { for (const g of groups) if (g.shape === 2) g.mesh.visible = on; },   // hidden in the cockpit view
    get driving() { return driving; },
  };
}
