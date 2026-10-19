// Player-built base structures on a 2-unit grid: sentry gun (tower), barricade (wall), bunker (crypt).
import * as THREE from '../../vendor/three.module.js';
import { buildTurret, DEFAULTS as TURRET } from '../turretkit/turretkit.js';
import { COST, CRYPT_MAX, CELL, EDGE, START, START_CAR } from './constants.js';

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
const key = (gx, gz) => gx + ',' + gz;

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];   // +x, -x, +z, -z (index ^ 1 = the opposite direction)
// Fills a barricade cell: a post in the middle and an arm towards each side listed in `arms` (booleans, DIRS order).
function fillWall(grp, arms) {
  for (const c of [...grp.children]) { grp.remove(c); c.geometry.dispose(); c.material.dispose(); }
  const add = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; grp.add(m); };
  add(0.55, 1.15, 0.55, 0x4a4036, 0, 0.575, 0);
  arms.forEach((on, i) => {
    if (!on) return;
    const [dx, dz] = DIRS[i], l = 1.02;
    const sx = dx ? l : 0.7, sz = dz ? l : 0.7;
    add(sx, 0.9, sz, 0x6b6860, dx * 0.5, 0.45, dz * 0.5);
    add(dx ? l : 0.72, 0.16, dz ? l : 0.72, 0xc8682a, dx * 0.5, 0.78, dz * 0.5);
  });
}

function makeObj(type) {
  const grp = new THREE.Group();
  let head = null, turret = null;
  const box = (w, h, d, c, x, y, z, parent = grp) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(c)); m.position.set(x, y, z); parent.add(m); return m;
  };
  if (type === 'tower') {           // sentry gun: the model comes from TurretKit (tuned in labs/turret.html)
    turret = buildTurret(TURRET); head = turret.head; grp.add(turret.group);
  } else if (type === 'wall') {     // barricade: its arms are (re)built by wallArms/fillWall once the neighbours are known
  } else if (type === 'hq') {       // starting bunker: bigger, with an orange roof and a beacon
    box(2.2, 1.3, 2.2, 0x3a4232, 0, 0.65, 0);
    box(2.3, 0.2, 2.3, 0xc8682a, 0, 1.4, 0);
    box(0.6, 0.9, 0.1, 0x151513, 0, 0.45, 1.11);
    box(0.12, 1.2, 0.12, 0x2d3328, -0.8, 2.0, -0.8);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), new THREE.MeshBasicMaterial({ color: 0xff7a30 }));
    lamp.position.set(-0.8, 2.7, -0.8); grp.add(lamp);
  } else {                          // bunker
    box(1.8, 1.1, 1.8, 0x3a4232, 0, 0.55, 0);
    box(0.6, 0.8, 0.1, 0x151513, 0, 0.4, 0.91);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffb050 }));
    lamp.position.set(0.6, 0.9, 0.91); grp.add(lamp);
  }
  grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { grp, head, turret };
}

export function createStructures({ scene, col }) {
  const structs = new Map();
  const count = (t) => { let n = 0; for (const v of structs.values()) if (v.type === t) n++; return n; };
  // The whole map is buildable (inside the movement limit), except the player's start spot and its car.
  let blockTest = () => false;       // set by the world: true when a city object is in the way
  const inMap = (gx, gz) => Math.abs(gx * CELL) <= EDGE - 1 && Math.abs(gz * CELL) <= EDGE - 1;
  const validCell = (type, gx, gz) => COST[type] !== undefined && Number.isInteger(gx) && Number.isInteger(gz) && inMap(gx, gz) && !structs.has(key(gx, gz));
  // Spawn point: in front of the starting bunker ('hq') when one is built, else the default start. The start car stands 3 units to the side.
  const hqOf = () => { for (const v of structs.values()) if (v.type === 'hq') return v; return null; };
  const spawnOf = (gx, gz) => ({ x: gx * CELL, z: gz * CELL + 2.8 });
  const spawn = () => { const q = hqOf(); return q ? spawnOf(q.gx, q.gz) : { x: START.x, z: START.z }; };
  const carSpot = (s) => (s.x === START.x && s.z === START.z ? START_CAR : { x: s.x + 3, z: s.z });
  const nearStart = (x, z) => { const s = spawn(), c = carSpot(s); return Math.hypot(x - s.x, z - s.z) < 4 || Math.hypot(x - c.x, z - c.z) < 4; };
  const canPlace = (type, gx, gz) => {
    if (!validCell(type, gx, gz) || blockTest(gx * CELL, gz * CELL)) return false;
    if (type === 'hq') {      // its spawn spot and car spot must be on the map and free of city objects
      const s = spawnOf(gx, gz);
      return Math.abs(s.x + 3) <= EDGE - 1 && Math.abs(s.z) <= EDGE - 1 && !blockTest(s.x, s.z) && !blockTest(s.x + 3, s.z);
    }
    return !nearStart(gx * CELL, gz * CELL) && (type !== 'crypt' || count('crypt') < CRYPT_MAX);
  };
  // force: used when loading a save (the map may have changed since); only the basic validity is checked.
  // Barricades join their neighbours on their own: an arm towards every adjacent barricade (so rows, corners, T-junctions and crossings
  // need no manual rotation); a lone piece or an end piece also shows the opposite arm, a lone piece along its own `rot` axis (0 = x, 1 = z).
  const wallAt = (gx, gz) => { const v = structs.get(key(gx, gz)); return v && v.type === 'wall' ? v : null; };
  function refreshWall(v) {
    const arms = DIRS.map(([dx, dz]) => !!wallAt(v.gx + dx, v.gz + dz)), n = arms.filter(Boolean).length;
    if (n === 0) { if (v.rot) arms[2] = arms[3] = true; else arms[0] = arms[1] = true; }
    else if (n === 1) arms[arms.indexOf(true) ^ 1] = true;
    fillWall(v.grp, arms);
  }
  const refreshAround = (gx, gz) => { for (const [dx, dz] of [[0, 0], ...DIRS]) { const w = wallAt(gx + dx, gz + dz); if (w) refreshWall(w); } };
  function place(type, gx, gz, force = false, rot = 0) {
    if (type === 'hq' && hqOf()) {   // only one starting bunker: placing it again moves it (the old one stays if the new spot is refused)
      const old = hqOf(), og = { gx: old.gx, gz: old.gz };
      remove(og.gx, og.gz);
      if (place(type, gx, gz, force)) return true;
      place(type, og.gx, og.gz, true); return false;
    }
    if (force ? !validCell(type, gx, gz) : !canPlace(type, gx, gz)) return false;
    const { grp, head, turret } = makeObj(type), x = gx * CELL, z = gz * CELL;
    grp.position.set(x, 0, z);
    scene.add(grp);
    const blk = { x, z, r: type === 'tower' ? 0.8 : type === 'wall' ? 0.9 : type === 'hq' ? 1.2 : 1.0 };
    col.blockers.push(blk);
    structs.set(key(gx, gz), { type, gx, gz, grp, head, turret, blk, cd: 0, rot: rot === 1 ? 1 : 0 });
    if (type === 'wall') refreshAround(gx, gz);
    return true;
  }
  function remove(gx, gz) {
    const v = structs.get(key(gx, gz));
    if (!v) return null;
    scene.remove(v.grp);
    col.blockers.splice(col.blockers.indexOf(v.blk), 1);
    structs.delete(key(gx, gz));
    if (v.type === 'wall') refreshAround(gx, gz);
    return v.type;
  }
  const list = () => [...structs.values()].map((v) => (v.type === 'wall' ? { t: v.type, gx: v.gx, gz: v.gz, r: v.rot } : { t: v.type, gx: v.gx, gz: v.gz }));
  function load(arr) {
    for (const v of [...structs.values()]) remove(v.gx, v.gz);
    for (const o of arr) if (o && Number.isInteger(o.gx) && Number.isInteger(o.gz)) place(o.t, o.gx, o.gz, true, o.r);
  }

  // Placement ghost (grid cell or arbitrary box, used by the base builder and the map editor).
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.8), new THREE.MeshBasicMaterial({ color: 0x40ff80, transparent: true, opacity: 0.35, depthWrite: false }));
  ghost.visible = false;
  scene.add(ghost);
  function setGhost(show, gx, gz, ok, type = '', rot = 0) {   // a barricade ghost is a flat piece along its rotation axis
    ghost.visible = show;
    if (type === 'wall') { ghost.scale.set(rot ? 0.7 / 1.8 : 2 / 1.8, 0.9 / 1.2, rot ? 2 / 1.8 : 0.7 / 1.8); ghost.position.set(gx * CELL, 0.45, gz * CELL); }
    else { ghost.scale.set(1, 1, 1); ghost.position.set(gx * CELL, 0.6, gz * CELL); }
    ghost.material.color.setHex(ok ? 0x40ff80 : 0xff4050);
  }
  function setGhostBox(show, x, y, z, sx, sy, sz, ok) {
    ghost.visible = show;
    ghost.scale.set(sx / 1.8, sy / 1.2, sz / 1.8);
    ghost.position.set(x, y, z);
    ghost.material.color.setHex(ok ? 0x40ff80 : 0xff4050);
  }

  // Sentry guns aim at the nearest zombie and fire.
  function updateTowers(dt, enemies, S, shoot) {
    for (const v of structs.values()) {
      if (v.type !== 'tower') continue;
      v.cd -= dt; v.turret.update(dt);
      const tx = v.grp.position.x, tz = v.grp.position.z;
      let best = -1, bd = 100;
      for (let i = 0; i < S.active; i++) {
        const dx = enemies.ex[i] - tx, dz = enemies.ez[i] - tz, dd = dx * dx + dz * dz;
        if (dd < bd) { bd = dd; best = i; }
      }
      if (best < 0) continue;
      const dx = enemies.ex[best] - tx, dz = enemies.ez[best] - tz, l = Math.hypot(dx, dz) || 1;
      v.head.rotation.y = Math.atan2(dx, dz);
      if (v.cd <= 0) { shoot(tx + dx / l, tz + dz / l, dx / l, dz / l); v.turret.fire(); v.cd = 0.75; }
    }
  }
  return { place, remove, canPlace, spawn, carSpot, hq: () => { const q = hqOf(); return q ? { gx: q.gx, gz: q.gz } : null; }, setBlockTest: (fn) => { blockTest = fn; }, list, load, count, setGhost, setGhostBox, updateTowers };
}
