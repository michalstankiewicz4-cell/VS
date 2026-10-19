// Bullet pool shared by the player and sentry guns, plus the player's grenades.
import * as THREE from '../../vendor/three.module.js';
import { PN, SIZE_DEFAULT } from './constants.js';

export function createProjectiles({ scene, dummy, col, S, enemies }) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.55), new THREE.MeshBasicMaterial({ color: 0xffd070 }), PN);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const px = new Float32Array(PN), pz = new Float32Array(PN), vx = new Float32Array(PN), vz = new Float32Array(PN), life = new Float32Array(PN);
  let next = 0, sc = SIZE_DEFAULT;   // bullets are drawn at the player's size
  const hide = (i) => { dummy.position.set(0, -50, 0); dummy.scale.set(0, 0, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); };
  for (let i = 0; i < PN; i++) hide(i);

  // Grenades: thrown in an arc to a point, explode on landing (area damage), then a short fireball.
  const GN = 4, FLIGHT = 0.7, BLAST_T = 0.35, BLAST_R = 3.2, BLAST_DMG = 5;   // BLAST_R is for a full-size (scale 1) person; it follows the player's size
  const gmesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x3a4a2a }), GN);
  const fmesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.75, depthWrite: false }), GN);
  gmesh.frustumCulled = fmesh.frustumCulled = false; scene.add(gmesh, fmesh);
  const gx0 = new Float32Array(GN), gz0 = new Float32Array(GN), gx1 = new Float32Array(GN), gz1 = new Float32Array(GN), gt = new Float32Array(GN), gph = new Uint8Array(GN);   // phase: 0 free, 1 in flight, 2 fireball
  const gHide = (i) => { dummy.position.set(0, -50, 0); dummy.scale.set(0, 0, 0); dummy.updateMatrix(); gmesh.setMatrixAt(i, dummy.matrix); fmesh.setMatrixAt(i, dummy.matrix); };
  for (let i = 0; i < GN; i++) gHide(i);
  const blastR = () => BLAST_R * sc * 2;
  function throwGrenade(x, z, tx, tz) {
    const i = gph.indexOf(0); if (i < 0) return false;
    const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz) || 1, k = Math.min(d, 14) / d;   // at most 14 units away
    gx0[i] = x; gz0[i] = z; gx1[i] = x + dx * k; gz1[i] = z + dz * k; gt[i] = 0; gph[i] = 1;
    return true;
  }
  function updateGrenades(dt) {
    for (let i = 0; i < GN; i++) {
      if (!gph[i]) continue;
      gt[i] += dt;
      if (gph[i] === 1) {
        const u = Math.min(1, gt[i] / FLIGHT);
        dummy.position.set(gx0[i] + (gx1[i] - gx0[i]) * u, sc + Math.sin(u * Math.PI) * 2.2 * sc * 2, gz0[i] + (gz1[i] - gz0[i]) * u);
        dummy.rotation.set(u * 9, 0, 0); dummy.scale.set(sc * 2, sc * 2, sc * 2); dummy.updateMatrix(); gmesh.setMatrixAt(i, dummy.matrix);
        if (u >= 1) { gph[i] = 2; gt[i] = 0; enemies.blast(gx1[i], gz1[i], blastR(), BLAST_DMG); dummy.scale.set(0, 0, 0); dummy.updateMatrix(); gmesh.setMatrixAt(i, dummy.matrix); }
      } else {
        const u = gt[i] / BLAST_T;
        if (u >= 1) { gph[i] = 0; gHide(i); continue; }
        const r = blastR() * (0.35 + 0.65 * Math.sqrt(u));
        dummy.position.set(gx1[i], r * 0.5, gz1[i]); dummy.rotation.set(0, 0, 0); dummy.scale.set(r, r * 0.7, r); dummy.updateMatrix(); fmesh.setMatrixAt(i, dummy.matrix);
      }
    }
    gmesh.instanceMatrix.needsUpdate = fmesh.instanceMatrix.needsUpdate = true;
  }

  function shoot(x, z, dx, dz) {
    const i = next; next = (next + 1) % PN;
    px[i] = x; pz[i] = z; vx[i] = dx * 26; vz[i] = dz * 26; life[i] = 0.9;
  }
  function reset() {
    for (let i = 0; i < PN; i++) { life[i] = 0; hide(i); }
    mesh.instanceMatrix.needsUpdate = true;
    gph.fill(0); for (let i = 0; i < GN; i++) gHide(i);
    gmesh.instanceMatrix.needsUpdate = fmesh.instanceMatrix.needsUpdate = true;
  }
  function update(dt) {
    updateGrenades(dt);
    const { ex, ez } = enemies;
    for (let i = 0; i < PN; i++) {
      if (life[i] <= 0) { hide(i); continue; }
      life[i] -= dt; px[i] += vx[i] * dt; pz[i] += vz[i] * dt;
      if (col.hitsAny(px[i], pz[i])) life[i] = 0;
      for (let j = 0; j < S.active && life[i] > 0; j++) {
        const dx = px[i] - ex[j], dz = pz[i] - ez[j];
        if (dx * dx + dz * dz < enemies.hitR2()) { life[i] = 0; enemies.hit(j, dx, dz); }
      }
      if (life[i] <= 0) { hide(i); continue; }
      dummy.position.set(px[i], sc, pz[i]);
      dummy.rotation.set(0, Math.atan2(vx[i], vz[i]), 0);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { shoot, throwGrenade, reset, update, setScale: (k) => { sc = k; } };
}
