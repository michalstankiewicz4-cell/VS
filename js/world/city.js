// The city map: an editable list of objects ({t:'b'} building, {t:'c'} car, {t:'p'} Palace) rendered as
// instanced boxes, plus their collision shapes. Cars become drivable vehicles in live modes.
import * as THREE from '../../vendor/three.module.js';
import { mulberry32 } from '../core/util.js';
import { PALACE, PALACE_HW, PALACE_HD, PALACE_H } from './data/palace.js';
import { MAP_MAX, BASE_ZONE, EDGE, START_CAR } from './constants.js';
import { createCityMaterial } from './city-material.js';
import { defaultMap } from './default-map.js';

const CAP = 3000;
const num = (v, lo, hi, d) => { v = +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const r1 = (v) => Math.round(v * 10) / 10;

// Whitelists and clamps one map object; returns null if it is not valid.
function clean(o) {
  if (!o || typeof o !== 'object') return null;
  const x = r1(num(o.x, -EDGE, EDGE, 0)), z = r1(num(o.z, -EDGE, EDGE, 0)), s = num(o.s, 0, 1, 0.5);
  if (o.t === 'b') return { t: 'b', x, z, w: r1(num(o.w, 3, 16, 8)), d: r1(num(o.d, 3, 16, 8)), h: r1(num(o.h, 1.5, 9, 4)), s };
  if (o.t === 'c') return { t: 'c', x, z, r: o.r ? 1 : 0, s };
  if (o.t === 'r') return { t: 'r', x, z, w: r1(num(o.w, 2, 12, 4)), d: r1(num(o.d, 4, 60, 20)), r: o.r ? 1 : 0, s };
  if (o.t === 'p') return { t: 'p', x, z, s };
  return null;
}
const bounds = (o) => o.t === 'b' ? { x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2, h: o.h }
  : o.t === 'r' ? (o.r ? { x: o.x, z: o.z, hw: o.d / 2, hd: o.w / 2, h: 0.1 } : { x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2, h: 0.1 })
  : o.t === 'c' ? (o.r ? { x: o.x, z: o.z, hw: 1.95, hd: 0.95, h: 1.4 } : { x: o.x, z: o.z, hw: 0.95, hd: 1.95, h: 1.4 })
  : { x: o.x, z: o.z, hw: PALACE_HW, hd: PALACE_HD, h: PALACE_H };
const inBase = (b) => Math.abs(b.x) - b.hw < BASE_ZONE && Math.abs(b.z) - b.hd < BASE_ZONE;
// Two footprints overlap (roads may cross roads and lie under cars; everything else is solid).
const flat = (o) => o.t === 'r';
const overlap = (a, b) => Math.abs(a.x - b.x) < a.hw + b.hw - 0.05 && Math.abs(a.z - b.z) < a.hd + b.hd - 0.05;
const inWorld = (b) => Math.abs(b.x) + b.hw <= EDGE && Math.abs(b.z) + b.hd <= EDGE;

export function createCity({ scene, dummy, col, vehicles, nightU }) {
  const { material, fade } = createCityMaterial({ nightU });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  // per-instance attribute: (facade kind, top y) for the Palace shader
  const aK = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 2), 2);
  geo.setAttribute('aK', aK);
  const mesh = new THREE.InstancedMesh(geo, material, CAP);
  mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
  scene.add(mesh);

  let items = [];
  const owner = [];            // instance index -> map object index (for picking in the editor)
  const cc = new THREE.Color();
  let startCar = () => START_CAR;   // set by the world: the start car follows the spawn point
  let live = false;            // live = cars are drivable vehicles and the start car exists

  function rebuild() {
    let n = 0; owner.length = 0; col.cityBlk.length = 0; vehicles.clear();
    const add = (i, x, y, z, sx, sy, sz, ry, h, sa, l, kind = 0, top = 0) => {
      aK.setXY(n, kind, top);
      dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix); mesh.setColorAt(n, cc.setHSL(h, sa, l)); owner[n] = i; n++;
    };
    items.forEach((o, i) => {
      const r = mulberry32(Math.floor(o.s * 1e9) + 1);
      if (o.t === 'b') {
        const hue = 0.05 + r() * 0.06, li = 0.2 + r() * 0.14, { w, d, h } = o;
        add(i, o.x, h / 2, o.z, w, h, d, 0, hue, 0.1, li);
        add(i, o.x, h * 0.55, o.z + d * 0.51, w * 0.7, h * 0.5, 0.15, 0, 0, 0, 0.05);   // dark broken windows
        const roof = r() < 0.6, ax = (r() - 0.5) * w * 0.4, az = (r() - 0.5) * d * 0.4, ry = r() * 3;
        if (roof) add(i, o.x + ax, h + 0.28, o.z + az, w * 0.5, 0.6, d * 0.5, ry, hue, 0.08, li * 0.8);   // collapsed roof
      } else if (o.t === 'r') {   // road: flat asphalt slab with a centre line; no collision
        const b = bounds(o), L = o.d * 0.96;
        add(i, o.x, 0.04, o.z, b.hw * 2, 0.08, b.hd * 2, 0, 0.66, 0.06, 0.09);
        add(i, o.x, 0.085, o.z, o.r ? L : 0.14, 0.02, o.r ? 0.14 : L, 0, 0.13, 0.5, 0.42);
        return;
      } else if (o.t === 'c') {
        const hue = r() < 0.5 ? 0.04 : 0.6, sa = 0.25 + r() * 0.25, ry = o.r ? Math.PI / 2 : 0, li = 0.18 + r() * 0.1;
        if (live) {
          const th = o.r ? (r() < 0.5 ? 1 : -1) * Math.PI / 2 : (r() < 0.5 ? 0 : Math.PI);
          if (vehicles.spawn({ x: o.x, z: o.z, th, hue, sa, l: li })) return;
        }
        add(i, o.x, 0.5, o.z, 1.8, 0.9, 3.8, ry, hue, sa, li);
        add(i, o.x, 1.15, o.z, 1.5, 0.5, 2.0, ry, hue, sa, 0.12);
      } else {   // Palace of Culture and Science (simplified boxes + shader facade)
        for (const [px, pz, w, d, y1, , kind, y0 = 0] of PALACE) {
          const l = 0.34 + Math.min(y1, 30) / 30 * 0.1 + (kind === 0 ? 0.06 : 0);   // sandstone
          add(i, o.x + px, (y0 + y1) / 2, o.z + pz, w, y1 - y0, d, 0, 0.09, 0.32, l, kind, y1);
        }
        for (const [px, pz, w, d, , blk] of PALACE) if (blk) col.cityBlk.push({ x: o.x + px, z: o.z + pz, hw: w / 2, hd: d / 2 });
        return;
      }
      const b = bounds(o);
      col.cityBlk.push({ x: b.x, z: b.z, hw: b.hw, hd: b.hd });
    });
    if (live) vehicles.spawn({ ...startCar(), hue: 0.58, sa: 0.38, l: 0.3 });     // the showcase / start car
    vehicles.finish();
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true; aK.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.boundingSphere = null; mesh.boundingBox = null;
  }

  const map = {
    max: MAP_MAX,
    extra: null,   // set by the world: extra(b) is true when a base structure overlaps the footprint
    // Is a solid city object (not a road) within r of the point? Used to keep base structures off buildings, cars and the Palace.
    blocksSquare(x, z, r) {
      return items.some((o, i) => { if (o.t === 'r') return false; const b = bounds(o); return Math.abs(b.x - x) < b.hw + r && Math.abs(b.z - z) < b.hd + r; });
    },
    list: () => items.map((o) => ({ ...o })),
    count: () => items.length,
    bounds: (i) => bounds(items[i]),
    boundsOf: (o) => bounds(o),
    // skip: index of an item being modified (ignored in the overlap / limit checks)
    canPlace(o, skip = -1) { return map.why(o, skip) === ''; },
    // Reason code for a refused placement ('' = fine); the UI translates it.
    why(o, skip = -1) {
      const c = clean(o);
      if (!c) return 'invalid';
      if (skip < 0 && items.length >= MAP_MAX) return 'limit';
      if (c.t === 'p' && items.some((q, i) => i !== skip && q.t === 'p')) return 'palace';
      const b = bounds(c);
      if (!inWorld(b)) return 'edge';
      if (inBase(b)) return 'base';
      if (map.extra && map.extra(b)) return 'structure';
      for (let i = 0; i < items.length; i++) {
        if (i === skip) continue;
        const q = items[i];
        if (flat(c) && (flat(q) || q.t === 'c')) continue;
        if (flat(q) && c.t === 'c') continue;
        if (overlap(b, bounds(q))) return 'overlap';
      }
      return '';
    },
    add(o) { if (!map.canPlace(o)) return false; items.push(clean(o)); rebuild(); return true; },
    // Replaces item i with a modified copy (validated against everything else).
    replace(i, o) { if (!items[i] || !map.canPlace(o, i)) return false; items[i] = clean(o); rebuild(); return true; },
    item: (i) => (items[i] ? { ...items[i] } : null),
    // Puts a previously removed object back without validation (cancelling a move).
    restore(o) { const c = clean(o); if (c) { items.push(c); rebuild(); } },
    removeAt(i) { if (!items[i]) return false; items.splice(i, 1); rebuild(); return true; },
    pick(raycaster) {
      const hit = raycaster.intersectObject(mesh)[0];
      return hit && hit.instanceId !== undefined && owner[hit.instanceId] !== undefined ? owner[hit.instanceId] : -1;
    },
    // Validated import: nothing outside the schema passes and the base zone always stays free.
    set(arr) {
      const out = []; let palace = false;
      for (const o of Array.isArray(arr) ? arr : []) {
        if (out.length >= MAP_MAX) break;
        const c = clean(o);
        if (!c) continue;
        if (c.t === 'p') { if (palace) continue; palace = true; }
        const b = bounds(c);
        if (!inWorld(b) || inBase(b)) continue;
        out.push(c);
      }
      items = out; rebuild(); return out.length;
    },
    reset() { return map.set(defaultMap()); },
  };
  map.reset();

  return {
    map, fade, rebuild,
    setLive(v) { live = v; },
    setStartCar(fn) { startCar = fn; },
    // Editor only: see-through city so an underlay image shows through (restored to 1 afterwards).
    setOpacity(o) { material.opacity = o; material.transparent = o < 1; material.needsUpdate = true; },
    get live() { return live; },
  };
}
