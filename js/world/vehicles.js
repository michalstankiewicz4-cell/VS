// Drivable cars. Cars from the city map become vehicles in live modes; F enters/exits the nearest one.
import * as THREE from '../../vendor/three.module.js';
import { clamp } from '../core/util.js';
import { EDGE } from './constants.js';

const VMAX = 64;
// [dx (side, + = left), dy, dz (forward), sx, sy, sz, kind]  kind: 0 body, 1 glass, 2 wheels, 3 lights
const PARTS = [
  [0, 0.65, 0, 1.8, 0.7, 3.8, 0], [0, 1.25, -0.2, 1.5, 0.5, 2.0, 1],
  [-0.95, 0.35, 1.25, 0.3, 0.7, 0.7, 2], [0.95, 0.35, 1.25, 0.3, 0.7, 0.7, 2],
  [-0.95, 0.35, -1.25, 0.3, 0.7, 0.7, 2], [0.95, 0.35, -1.25, 0.3, 0.7, 0.7, 2],
  [-0.6, 0.7, 1.92, 0.4, 0.22, 0.1, 3], [0.6, 0.7, 1.92, 0.4, 0.22, 0.1, 3],
];
const CAR = { max: 15, rev: 6, acc: 14, racc: 9, brake: 28, coast: 4, turn: 1.9 };
// Driver seat (car-local, + x = left) used by the cockpit camera.
export const SEAT = { dx: 0.42, dy: 1.4, dz: 0.15 };

export function createVehicles({ scene, dummy, col, S, player }) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), VMAX * PARTS.length);
  mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.count = 0;
  scene.add(mesh);
  const list = [];
  const cc = new THREE.Color();
  let driving = null, sc = 1;   // sc: editor-chosen size multiplier

  function place(v) {
    const c = Math.cos(v.th), sn = Math.sin(v.th);
    PARTS.forEach(([dx, dy, dz, sx, sy, sz], k) => {
      dummy.position.set(v.x + (dx * c + dz * sn) * sc, dy * sc, v.z + (dz * c - dx * sn) * sc);
      dummy.rotation.set(0, v.th, 0); dummy.scale.set(sx * sc, sy * sc, sz * sc); dummy.updateMatrix();
      mesh.setMatrixAt(v.i * PARTS.length + k, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  function paint(v) {
    PARTS.forEach((p, k) => {
      const c = p[6] === 0 ? cc.setHSL(v.hue, v.sa, v.l) : p[6] === 1 ? cc.setHSL(0.6, 0.2, 0.1) : p[6] === 2 ? cc.setHSL(0, 0, 0.04) : cc.setHSL(0.13, 0.9, 0.6);
      mesh.setColorAt(v.i * PARTS.length + k, c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  // A parked car is snapped to the axes and blocks movement and bullets.
  const park = (v) => {
    const alongZ = Math.abs(Math.sin(v.th)) < 0.5;
    v.blk.x = v.x; v.blk.z = v.z; v.blk.hw = (alongZ ? 0.95 : 1.95) * sc; v.blk.hd = (alongZ ? 1.95 : 0.95) * sc;
  };

  // Called by the city before it re-creates its objects (its obstacle list is cleared separately).
  function clear() { list.length = 0; driving = null; S.driving = false; mesh.count = 0; }
  function spawn({ x, z, th, hue, sa, l }) {
    if (list.length >= VMAX) return null;
    const v = { i: list.length, x, z, th, vel: 0, steer: 0, hue, sa, l, blk: {} };
    park(v); list.push(v); col.cityBlk.push(v.blk);
    return v;
  }
  function finish() {
    for (const v of list) park(v);
    mesh.count = list.length * PARTS.length;
    for (const v of list) { place(v); paint(v); }
  }

  function nearest(maxD) {
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
    const ox = { v: v.x + 2.0 * c }, oz = { v: v.z - 2.0 * sn };      // exit on the driver's (left) side
    col.push(ox, oz, 0.45);
    player.state.pos.set(ox.v, 0, oz.v); player.setVisible(true); S.driving = false;
  }
  function toggle() {
    if (S.mode !== 'play') return;
    if (driving) { exit(); return; }
    const v = nearest(3.4);
    if (!v) return;
    const i = col.cityBlk.indexOf(v.blk); if (i >= 0) col.cityBlk.splice(i, 1);
    driving = v; player.setVisible(false); S.driving = true; player.state.pos.set(v.x, 0, v.z);
  }

  function step(dt, thr, steer) {
    const v = driving;
    if (thr > 0) v.vel += (v.vel < 0 ? CAR.brake : CAR.acc) * thr * dt;
    else if (thr < 0) v.vel += (v.vel > 0 ? -CAR.brake : -CAR.racc) * -thr * dt;
    else v.vel -= Math.sign(v.vel) * Math.min(Math.abs(v.vel), CAR.coast * dt);
    v.vel = clamp(v.vel, -CAR.rev, CAR.max);
    // steering scales with speed (right = clockwise turn on screen)
    v.th -= steer * CAR.turn * clamp(v.vel / 5, -1, 1) * dt;
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
    S.speed = Math.abs(v.vel);
  }
  // Is the point (x, z) under the moving car's body? (used to run zombies over)
  function runsOver(x, z) {
    const v = driving; if (!v || Math.abs(v.vel) < 3) return false;
    const dx = x - v.x, dz = z - v.z, c = Math.cos(v.th), sn = Math.sin(v.th);
    return Math.abs(dx * sn + dz * c) < 2.2 * sc && Math.abs(dx * c - dz * sn) < 1.2 * sc;
  }
  return {
    setScale(k) { sc = k; for (const v of list) { if (v !== driving) park(v); place(v); } },
    list, clear, spawn, finish, nearest, toggle, exit, step, runsOver,
    get driving() { return driving; },
  };
}
