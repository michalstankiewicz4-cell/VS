// The player character: a soldier with a rifle, built from primitive boxes.
import * as THREE from '../../vendor/three.module.js';
import { START } from './constants.js';

export function createPlayer({ scene }) {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  const part = (geo, c, x, y, z, parent = rig) => {
    const m = new THREE.Mesh(geo, lam(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  };
  part(new THREE.BoxGeometry(0.62, 0.72, 0.36), 0x4a5638, 0, 1.0, 0);            // jacket
  part(new THREE.BoxGeometry(0.5, 0.5, 0.22), 0x2b2f26, 0, 1.05, -0.26);         // backpack
  part(new THREE.SphereGeometry(0.22, 8, 6), 0xcfa88a, 0, 1.58, 0);              // head
  part(new THREE.CylinderGeometry(0.25, 0.28, 0.17, 8), 0x2f3a2a, 0, 1.72, 0);   // helmet
  part(new THREE.BoxGeometry(0.14, 0.14, 0.55), 0x4a5638, -0.3, 1.1, 0.32);      // left arm
  part(new THREE.BoxGeometry(0.14, 0.14, 0.45), 0x4a5638, 0.3, 1.05, 0.28);      // right arm
  part(new THREE.BoxGeometry(0.1, 0.13, 1.25), 0x17181b, 0.05, 1.12, 0.6);       // rifle
  part(new THREE.BoxGeometry(0.1, 0.22, 0.35), 0x3a2a1c, 0.05, 1.08, 0.0);       // stock
  const leg = (x) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.65, 0); rig.add(pivot);
    part(new THREE.BoxGeometry(0.24, 0.65, 0.28), 0x2a2d36, 0, -0.325, 0, pivot);
    return pivot;
  };
  const legL = leg(-0.16), legR = leg(0.16);
  group.position.set(START.x, 0, START.z);
  scene.add(group);

  const state = { pos: group.position, face: 0, speed: 5.2 };

  // Walking animation (moving) or a slow breathing idle.
  function animate(moving, t) {
    group.rotation.y = state.face;
    if (moving) {
      rig.position.y = Math.abs(Math.sin(t * 11)) * 0.07;
      legL.rotation.x = Math.sin(t * 11) * 0.7;
      legR.rotation.x = -Math.sin(t * 11) * 0.7;
    } else {
      rig.position.y = Math.sin(t * 1.7) * 0.012;
      legL.rotation.x = legR.rotation.x = 0;
    }
  }
  return { state, group, animate, setVisible: (v) => { group.visible = v; } };
}
