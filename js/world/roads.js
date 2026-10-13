// Asphalt avenues with lane markings (flat, subdivided along their length so the Inception fold can bend them).
import * as THREE from '../../vendor/three.module.js';
import { EDGE } from './constants.js';

const WIDTH = 4, AT = 7;        // two avenues: x = 7 and z = 7 (the car lines of the default map)

export function createRoads({ scene }) {
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 32;
  const g = cv.getContext('2d');
  g.fillStyle = '#1b1a1f'; g.fillRect(0, 0, 16, 32);
  g.fillStyle = '#2a2830'; for (let i = 0; i < 40; i++) g.fillRect((i * 7) % 16, (i * 13) % 32, 1, 1);
  g.fillStyle = '#7a7566'; g.fillRect(0, 0, 1, 32); g.fillRect(15, 0, 1, 32);       // edge lines
  g.fillStyle = '#b8a86a'; g.fillRect(7, 2, 2, 12);                                  // dashed centre line
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const len = EDGE * 2;
  tex.repeat.set(1, len / 8);
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const geo = new THREE.PlaneGeometry(WIDTH, len, 1, 110);
  const mk = (x, z, ry) => {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
    const grp = new THREE.Group(); grp.add(m); grp.position.set(x, 0.03, z); grp.rotation.y = ry;
    scene.add(grp);
  };
  mk(AT, 0, 0);                 // along z
  mk(0, AT, Math.PI / 2);       // along x
}
