// Zombies: one instanced mesh, simple chase AI with separation and obstacle pushing.
import * as THREE from '../../vendor/three.module.js';
import { ENEMIES, SIZE_DEFAULT } from './constants.js';

function mergeBoxes(list) {
  const pos = [], nor = [];
  for (const [w, h, d, x, y, z] of list) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(x, y, z);
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
// torso, head, outstretched arms, legs (merged into one geometry for instancing)
const zombieGeo = () => mergeBoxes([
  [0.6, 0.7, 0.34, 0, 0.85, 0], [0.34, 0.34, 0.34, 0, 1.4, 0.05],
  [0.14, 0.14, 0.65, -0.26, 1.0, 0.4], [0.14, 0.14, 0.65, 0.26, 1.05, 0.4],
  [0.22, 0.55, 0.26, -0.15, 0.28, 0], [0.22, 0.55, 0.26, 0.15, 0.28, 0],
]);

export function createEnemies({ scene, rnd, dummy, col, S, around, vehicles, player }) {
  const mesh = new THREE.InstancedMesh(zombieGeo(), new THREE.MeshLambertMaterial({ color: 0xffffff }), ENEMIES);
  mesh.castShadow = true; mesh.frustumCulled = false;
  const ex = new Float32Array(ENEMIES), ez = new Float32Array(ENEMIES), es = new Float32Array(ENEMIES);
  const ep = new Float32Array(ENEMIES), eh = new Float32Array(ENEMIES);
  const colr = new THREE.Color();
  let sc = SIZE_DEFAULT;   // size multiplier (1 = original): speed, contact and hit radii follow it
  const hpFor = () => S.time > 180 ? 4 : S.time > 90 ? 3 : 2;
  const spawn = (i) => {
    const a = rnd() * Math.PI * 2, r = 20 + rnd() * 6;
    ex[i] = around.x + Math.cos(a) * r; ez[i] = around.z + Math.sin(a) * r; eh[i] = hpFor();
  };
  const hide = (i) => { dummy.position.set(0, -50, 0); dummy.scale.set(0, 0, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); };
  for (let i = 0; i < ENEMIES; i++) {
    es[i] = 1.2 + rnd() * 1.4; ep[i] = rnd() * 6.28; hide(i);
    mesh.setColorAt(i, colr.setHSL(0.2 + rnd() * 0.1, 0.15 + rnd() * 0.2, 0.26 + rnd() * 0.14));
  }
  mesh.instanceColor.needsUpdate = true;
  scene.add(mesh);

  function reset() {
    for (let i = 0; i < ENEMIES; i++) hide(i);
    mesh.instanceMatrix.needsUpdate = true;
  }
  // A bullet hit: knock back, count the kill and respawn the zombie when it dies.
  function hit(j, dx, dz) {
    eh[j] -= 1; ex[j] -= dx * 0.4 * sc; ez[j] -= dz * 0.4 * sc;
    if (eh[j] <= 0) { S.kills++; S.pts++; spawn(j); }
  }
  // Advances all zombies; returns how many are touching the player.
  function update(dt, t) {
    const act = Math.min(ENEMIES, 18 + Math.floor(S.time));    // the wave grows over time
    for (let i = S.active; i < act; i++) spawn(i);
    S.active = act;
    const px = around.x, pz = around.z, car = vehicles.driving;
    const sp = 1 + Math.min(S.time / 240, 0.8);
    let touching = 0;
    const pk = (player.scale + sc) / 2, ck = (vehicles.scale + sc) / 2;   // contact distances scale with the sizes of both parties
    for (let i = 0; i < S.active; i++) {
      const dx = px - ex[i], dz = pz - ez[i];
      const dist = Math.hypot(dx, dz) || 1;
      if (dist > 34) { spawn(i); continue; }
      if (car && vehicles.runsOver(ex[i], ez[i])) { S.kills++; S.pts++; spawn(i); continue; }
      let vx = dx / dist, vz = dz / dist;
      if (car ? (dist < 2.6 * ck && Math.abs(car.vel) < 3 * vehicles.scale) : dist < 1.1 * pk) touching++;
      if (dist < 1.0 * pk) { vx = 0; vz = 0; }
      for (let j = 0; j < S.active; j++) {
        if (j === i) continue;
        const sx = ex[i] - ex[j], sz = ez[i] - ez[j], sd = sx * sx + sz * sz;
        if (sd < 0.8 * sc * sc && sd > 1e-4) { const k = 1 / Math.sqrt(sd); vx += sx * k * 0.9; vz += sz * k * 0.9; }
      }
      const nx = { v: ex[i] + vx * es[i] * sp * sc * dt }, nz = { v: ez[i] + vz * es[i] * sp * sc * dt };
      col.push(nx, nz, 0.4 * sc);
      ex[i] = nx.v; ez[i] = nz.v;
      dummy.position.set(ex[i], Math.abs(Math.sin(t * 6 + ep[i])) * 0.06 * sc, ez[i]);
      dummy.rotation.set(0, Math.atan2(dx, dz), 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return { touching, car: !!car };
  }
  // Editor size preview: shows one zombie (instance 0) at (x, z) or hides it.
  function preview(on, x, z) {
    if (on) { dummy.position.set(x, 0, z); dummy.rotation.set(0, 2.4, 0); dummy.scale.set(sc, sc, sc); dummy.updateMatrix(); mesh.setMatrixAt(0, dummy.matrix); }
    else hide(0);
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { ex, ez, reset, hit, update, preview, hitR2: () => 0.55 * sc * sc, setScale: (k) => { sc = k; } };
}
