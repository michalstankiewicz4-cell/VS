// WallKit: the base barricade and the fences (barbed wire, chain-link) as one parametric piece. The game builds every placed piece with
// buildWallPiece() and the wall lab (labs/wall.html) shows the same thing, so what is tuned in the lab is what the game shows.
// A piece fills one 2-unit grid cell: a post in the middle and an arm (half a cell long) towards each neighbour; `arms` is [+x, -x, +z, -z].
// The whole piece is merged into a single mesh with vertex colours (a long fence is hundreds of boxes).
import * as THREE from '../../vendor/three.module.js';
import { schemaDefaults, makeSanitize } from '../core/params.js';

export const SCHEMA = [
  ['Type'],
  ['style', 'Style (0 barricade, 1 barbed wire, 2 chain-link)', 0, 2, 1, 0],
  ['Posts'],
  ['postH', 'Post height (fence height)', 0.5, 2.2, 0.05, 1.15],
  ['postW', 'Post width', 0.08, 0.7, 0.02, 0.55],
  ['Barricade'],
  ['wallH', 'Wall height', 0.3, 1.6, 0.05, 0.9],
  ['wallT', 'Wall thickness', 0.3, 1.2, 0.05, 0.7],
  ['stripe', 'Orange top', 0, 1, 1, 1],
  ['Fence'],
  ['wires', 'Wires (barbed wire)', 2, 8, 1, 4],
  ['barbs', 'Barbs', 0, 1, 1, 1],
  ['gauge', 'Wire thickness', 0.015, 0.08, 0.005, 0.03],
  ['mesh', 'Mesh size (chain-link)', 0.15, 0.5, 0.01, 0.25],
  ['topRail', 'Top rail', 0, 1, 1, 1],
  ['coil', 'Barbed wire on top', 0, 1, 1, 0],
  ['rust', 'Rust', 0, 1, 0.05, 0.4],
  ['Preview (lab only)'],
  ['layout', 'Layout (0 piece, 1 line, 2 corner, 3 crossing)', 0, 3, 1, 1],
];
export const DEFAULTS = schemaDefaults(SCHEMA);   // the game's barricade
export const sanitize = makeSanitize(SCHEMA);
export const PRESETS = {
  Barricade: {},
  Low: { wallH: 0.5, wallT: 0.9, postH: 0.7 },
  'Barbed wire': { style: 1, postH: 1.3, postW: 0.14, wires: 4, barbs: 1, gauge: 0.03 },
  'Chain-link': { style: 2, postH: 1.6, postW: 0.12, topRail: 1, mesh: 0.25, gauge: 0.025 },
  Razor: { style: 2, postH: 1.9, postW: 0.12, coil: 1, mesh: 0.2, rust: 0.1 },
};
// The base-building types: which look each one uses (the game's `wall`, `wire` and `mesh`).
export const TYPES = { wall: {}, wire: PRESETS['Barbed wire'], mesh: PRESETS['Chain-link'] };
export const typeParams = (type) => sanitize({ ...DEFAULTS, ...(TYPES[type] || {}) });
// The half-width of the cell, i.e. how long an arm is.
const HALF = 1.0;
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];   // +x, -x, +z, -z (index ^ 1 = the opposite direction)

// Which arms a piece shows, from which neighbours exist: an arm towards every neighbour; a lone piece shows both ends of its own axis
// (rot 0 = x, 1 = z); an end piece (one neighbour) also shows the opposite arm.
export function armsFor(near, rot = 0) {
  const arms = near.map(Boolean), n = arms.filter(Boolean).length;
  if (n === 0) { if (rot) arms[2] = arms[3] = true; else arms[0] = arms[1] = true; }
  else if (n === 1) arms[arms.indexOf(true) ^ 1] = true;
  return arms;
}

const mix = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
const base = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

// boxes: [{ p: [x, y, z], r: [rx, ry, rz], s: [sx, sy, sz], c: Color }]  ->  one geometry with normals and vertex colours
function merge(boxes) {
  const pos = [], nor = [], col = [];
  for (const b of boxes) {
    const g = base.clone().applyMatrix4(_m.compose(_p.set(...b.p), _q.setFromEuler(_e.set(...b.r)), _s.set(...b.s)));
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    for (let i = 0; i < g.attributes.position.count; i++) col.push(b.c.r, b.c.g, b.c.b);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

export const wallMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

export function wallGeometry(raw, arms) {
  const p = sanitize(raw), boxes = [], hex = (c) => new THREE.Color(c);
  const box = (x, y, z, sx, sy, sz, c, r = [0, 0, 0]) => boxes.push({ p: [x, y, z], s: [sx, sy, sz], r, c });
  const steel = mix(0x8a9096, 0x7a4a2a, p.rust * 0.7), wire = mix(0x5d6064, 0x7a4a2a, p.rust), wood = mix(0x6a5a45, 0x3a3026, p.rust * 0.5);
  const fence = p.style > 0, top = p.postH + (fence && p.coil && p.style === 2 ? 0.3 : 0);
  // the post
  if (p.style === 0) box(0, p.postH / 2, 0, p.postW, p.postH, p.postW, hex(0x4a4036));
  else box(0, top / 2, 0, p.postW, top, p.postW, p.style === 1 ? wood : steel);
  // a segment in an arm's plane: u along the arm (0 = the post, HALF = the cell edge), v = height; thickness t across the arm
  const seg = (i, u0, v0, u1, v1, t, c) => {
    const [dx, dz] = DIRS[i], du = u1 - u0, dv = v1 - v0, len = Math.hypot(du, dv), um = (u0 + u1) / 2, vm = (v0 + v1) / 2, a = Math.atan2(dv, du);
    if (dx) box(dx * um, vm, 0, len, t, t, c, [0, 0, dx * a]);          // arm along x: rotate about z
    else box(0, vm, dz * um, t, t, len, c, [-dz * a, 0, 0]);            // arm along z: rotate about x
  };
  const barbed = (i, v, c) => {                                          // a wire with a barb (two small crossed bars) every 0.25
    seg(i, 0, v, HALF, v, p.gauge, c);
    if (!p.barbs) return;
    const [dx] = DIRS[i];
    for (let u = 0.14; u < HALF; u += 0.25) {
      const px = dx ? DIRS[i][0] * u : 0, pz = dx ? 0 : DIRS[i][1] * u;
      box(px, v, pz, p.gauge * 0.8, 0.1, p.gauge * 0.8, c);
      box(px, v, pz, dx ? p.gauge * 0.8 : 0.1, p.gauge * 0.8, dx ? 0.1 : p.gauge * 0.8, c);
    }
  };
  arms.forEach((on, i) => {
    if (!on) return;
    const [dx, dz] = DIRS[i];
    if (p.style === 0) {                                                // barricade: a solid block, optionally with an orange top
      const l = HALF + 0.02;
      box(dx * HALF / 2, p.wallH / 2, dz * HALF / 2, dx ? l : p.wallT, p.wallH, dz ? l : p.wallT, hex(0x6b6860));
      if (p.stripe) box(dx * HALF / 2, p.wallH - 0.06, dz * HALF / 2, dx ? l : p.wallT + 0.02, 0.16, dz ? l : p.wallT + 0.02, hex(0xc8682a));
    } else if (p.style === 1) {                                         // barbed wire: evenly spaced strands and a thin stay in the middle
      for (let k = 0; k < p.wires; k++) barbed(i, 0.22 + k * (p.postH - 0.3) / Math.max(1, p.wires - 1), wire);
      box(dx * HALF * 0.5, p.postH / 2, dz * HALF * 0.5, 0.04, p.postH - 0.1, 0.04, wood);
    } else {                                                            // chain-link: a diamond mesh between a bottom and a top rail
      const v0 = 0.12, v1 = p.postH - 0.08, h = v1 - v0, s = p.mesh;
      for (let c = -h; c < HALF; c += s) {                              // diagonals going up (v - v0 = u - c), clipped to the panel
        const ua = Math.max(0, c), ub = Math.min(HALF, c + h);
        if (ub - ua > 0.03) seg(i, ua, v0 + ua - c, ub, v0 + ub - c, p.gauge, wire);
      }
      for (let c = 0; c < HALF + h; c += s) {                           // diagonals going down (v - v0 = c - u)
        const ua = Math.max(0, c - h), ub = Math.min(HALF, c);
        if (ub - ua > 0.03) seg(i, ua, v0 + c - ua, ub, v0 + c - ub, p.gauge, wire);
      }
      seg(i, 0, v0, HALF, v0, p.gauge * 1.6, steel);
      if (p.topRail) seg(i, 0, v1, HALF, v1, p.gauge * 2, steel);
      if (p.coil) { barbed(i, p.postH + 0.08, wire); barbed(i, p.postH + 0.24, wire); }
    }
  });
  return merge(boxes);
}

export function buildWallPiece(raw, arms) {
  const m = new THREE.Mesh(wallGeometry(raw, arms), wallMaterial);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// For the lab: a preview layout of pieces on the grid (0 a single piece, 1 a line, 2 a corner, 3 a crossing), arms joined like in the game.
export function buildWall(raw) {
  const p = sanitize(raw), group = new THREE.Group();
  const cells = [[[0, 0]], [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]], [[-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [1, -2]], [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]][p.layout];
  const at = (x, z) => cells.some(([cx, cz]) => cx === x && cz === z);
  for (const [cx, cz] of cells) {
    const mesh = buildWallPiece(p, armsFor(DIRS.map(([dx, dz]) => at(cx + dx, cz + dz)), 0));
    mesh.position.set(cx * 2, 0, cz * 2); group.add(mesh);
  }
  return { group, stats: { pieces: cells.length, boxes: group.children.reduce((n, m) => n + m.geometry.attributes.position.count / 36, 0) } };
}
