// Ground plane (procedural texture) and wrapping rubble that follows the player.
import * as THREE from '../../vendor/three.module.js';
import { TILE, GROUND, GRAVES, RANGE } from './constants.js';

export function createTerrain({ scene, rnd, dummy }) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const g = cv.getContext('2d');
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const n = rnd(), v = n < 0.1 ? 50 : n < 0.35 ? 40 : 31;
    g.fillStyle = `rgb(${v + 2 | 0},${v | 0},${v + 3 | 0})`;
    g.fillRect(x, y, 1, 1);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(GROUND / TILE, GROUND / TILE);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND, GROUND), new THREE.MeshLambertMaterial({ map: tex }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Rubble: instanced boxes wrapped around the player (no collisions).
  const gm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), GRAVES);
  gm.castShadow = gm.receiveShadow = true;
  gm.frustumCulled = false;
  const gx = new Float32Array(GRAVES), gz = new Float32Array(GRAVES), gr = new Float32Array(GRAVES), gh = new Float32Array(GRAVES);
  const gsx = new Float32Array(GRAVES), gsz = new Float32Array(GRAVES);
  const c0 = new THREE.Color();
  for (let i = 0; i < GRAVES; i++) {
    gx[i] = (rnd() * 2 - 1) * RANGE; gz[i] = (rnd() * 2 - 1) * RANGE;
    gr[i] = rnd() * 3.1; gh[i] = 0.15 + rnd() * 0.55; gsx[i] = 0.3 + rnd() * 1.1; gsz[i] = 0.3 + rnd() * 1.1;
    gm.setColorAt(i, c0.setHSL(0.06 + rnd() * 0.04, 0.08 + rnd() * 0.12, 0.2 + rnd() * 0.18));
  }
  gm.instanceColor.needsUpdate = true;
  const place = () => {
    for (let i = 0; i < GRAVES; i++) {
      dummy.position.set(gx[i], gh[i] / 2, gz[i]);
      dummy.rotation.set(0, gr[i], 0);
      dummy.scale.set(gsx[i], gh[i], gsz[i]);
      dummy.updateMatrix();
      gm.setMatrixAt(i, dummy.matrix);
    }
    gm.instanceMatrix.needsUpdate = true;
  };
  place();
  scene.add(gm);

  // Keeps the ground tile and rubble centred on (px, pz).
  function follow(px, pz) {
    ground.position.set(Math.round(px / TILE) * TILE, 0, Math.round(pz / TILE) * TILE);
    let wrapped = false;
    for (let i = 0; i < GRAVES; i++) {
      const dx = gx[i] - px, dz = gz[i] - pz;
      if (dx > RANGE) { gx[i] -= RANGE * 2; wrapped = true; } else if (dx < -RANGE) { gx[i] += RANGE * 2; wrapped = true; }
      if (dz > RANGE) { gz[i] -= RANGE * 2; wrapped = true; } else if (dz < -RANGE) { gz[i] += RANGE * 2; wrapped = true; }
    }
    if (wrapped) place();
  }
  return { follow };
}
