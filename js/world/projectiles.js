// Bullet pool shared by the player and sentry guns.
import * as THREE from '../../vendor/three.module.js';
import { PN } from './constants.js';

export function createProjectiles({ scene, dummy, col, S, enemies }) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.55), new THREE.MeshBasicMaterial({ color: 0xffd070 }), PN);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const px = new Float32Array(PN), pz = new Float32Array(PN), vx = new Float32Array(PN), vz = new Float32Array(PN), life = new Float32Array(PN);
  let next = 0;
  const hide = (i) => { dummy.position.set(0, -50, 0); dummy.scale.set(0, 0, 0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); };
  for (let i = 0; i < PN; i++) hide(i);

  function shoot(x, z, dx, dz) {
    const i = next; next = (next + 1) % PN;
    px[i] = x; pz[i] = z; vx[i] = dx * 26; vz[i] = dz * 26; life[i] = 0.9;
  }
  function reset() {
    for (let i = 0; i < PN; i++) { life[i] = 0; hide(i); }
    mesh.instanceMatrix.needsUpdate = true;
  }
  function update(dt) {
    const { ex, ez } = enemies;
    for (let i = 0; i < PN; i++) {
      if (life[i] <= 0) { hide(i); continue; }
      life[i] -= dt; px[i] += vx[i] * dt; pz[i] += vz[i] * dt;
      if (col.hitsAny(px[i], pz[i])) life[i] = 0;
      for (let j = 0; j < S.active && life[i] > 0; j++) {
        const dx = px[i] - ex[j], dz = pz[i] - ez[j];
        if (dx * dx + dz * dz < 0.55) { life[i] = 0; enemies.hit(j, dx, dz); }
      }
      if (life[i] <= 0) { hide(i); continue; }
      dummy.position.set(px[i], 1, pz[i]);
      dummy.rotation.set(0, Math.atan2(vx[i], vz[i]), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { shoot, reset, update };
}
