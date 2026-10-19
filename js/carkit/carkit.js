// CarKit: the car model as a list of boxes computed from a few numbers. The game draws the list as instanced boxes (one colour per part
// kind, the body in each car's own colour) and the car lab (labs/car.html) as ordinary meshes, so what is tuned in the lab is what the game shows.
// Car-local axes: +z forward, +x to the left, y up; the origin is on the ground in the middle of the car.
//   carParts(params) -> { parts: [[dx, dy, dz, sx, sy, sz, kind, shape], ...], length, width, height, seat }
//   shape 0 = a box (sx, sy, sz), shape 1 = a round wheel: a cylinder whose axis is x, thickness sx and diameter sy = sz,
//   shape 2 = the roof slab (a box; the game hides it in the cockpit view so its underside does not cover the driver's view),
//   shape 3 / 4 = a wedge (full height at the rear / front end, sloping to zero): windshield and hood / rear window and trunk.
import * as THREE from '../../vendor/three.module.js';
import { schemaDefaults, makeSanitize } from '../core/params.js';

// kinds: 0 body, 1 glass, 2 tyre, 3 headlight, 4 tail light, 5 dark trim, 6 metal, 7 stripe
export const SCHEMA = [
  ['Body'],
  ['style', 'Style (0 sedan, 1 hatch, 2 pickup, 3 van)', 0, 3, 1, 0],
  ['length', 'Length', 3.2, 5.2, 0.05, 3.8],
  ['width', 'Width', 1.6, 2.1, 0.02, 1.8],
  ['bodyH', 'Body height', 0.5, 0.9, 0.02, 0.7],
  ['ride', 'Ground clearance', 0.2, 0.5, 0.02, 0.3],
  ['hood', 'Hood length', 0.1, 0.35, 0.01, 0.2],
  ['trunk', 'Trunk length (sedan)', 0.05, 0.25, 0.01, 0.14],
  ['Cabin'],
  ['cabinLen', 'Cabin length', 1.2, 3.0, 0.05, 2.0],
  ['cabinH', 'Cabin height', 0.4, 0.9, 0.02, 0.5],
  ['cabinShift', 'Cabin position', -0.6, 0.6, 0.05, -0.2],
  ['rake', 'Window slope', 0.2, 1.4, 0.05, 0.9],
  ['roofInset', 'Roof inset', 0, 0.4, 0.02, 0.15],
  ['mirrors', 'Side mirrors', 0, 1, 1, 1],
  ['Wheels'],
  ['wheelR', 'Wheel radius', 0.28, 0.55, 0.01, 0.35],
  ['wheelW', 'Wheel width', 0.2, 0.45, 0.01, 0.3],
  ['Details'],
  ['trim', 'Door seams, handles, skirts', 0, 1, 1, 1],
  ['bumpers', 'Bumpers', 0, 1, 1, 1],
  ['grille', 'Grille', 0, 1, 1, 1],
  ['rack', 'Roof rack', 0, 1, 1, 0],
  ['spoiler', 'Spoiler', 0, 1, 1, 0],
  ['stripe', 'Stripe', 0, 1, 1, 0],
  ['antenna', 'Antenna', 0, 1, 1, 0],
  ['exhaust', 'Exhaust', 0, 1, 1, 1],
];
export const DEFAULTS = schemaDefaults(SCHEMA);   // the game's car (a sedan: the 8-box car of the earlier versions, now with details)
export const sanitize = makeSanitize(SCHEMA);
export const PRESETS = {
  Sedan: {},
  Hatch: { style: 1, length: 3.5, cabinLen: 2.4, cabinShift: -0.45, cabinH: 0.55 },
  Pickup: { style: 2, length: 4.6, width: 1.95, cabinLen: 1.5, cabinH: 0.5, wheelR: 0.45, ride: 0.4, rack: 0 },
  Van: { style: 3, length: 4.4, width: 1.9, bodyH: 0.8, cabinH: 0.9, wheelR: 0.4, grille: 1 },
  Sport: { length: 4.2, bodyH: 0.52, cabinH: 0.4, cabinLen: 1.6, ride: 0.22, wheelR: 0.33, wheelW: 0.36, spoiler: 1, stripe: 1, roofInset: 0.3 },
};

// The colour (h, s, l) of a part kind for a car painted (hue, sa, l).
export function partColor(kind, hue, sa, l) {
  switch (kind) {
    case 0: return [hue, sa, l];
    case 1: return [0.6, 0.2, 0.1];
    case 2: return [0, 0, 0.04];
    case 3: return [0.13, 0.9, 0.6];
    case 4: return [0.0, 0.85, 0.32];
    case 5: return [0, 0, 0.09];
    case 6: return [0, 0, 0.55];
    default: return [hue, sa * 0.3, Math.min(0.9, l + 0.5)];
  }
}

const geoCache = {};
// Unit geometry of a part shape (shared by the game's instanced meshes and the lab's meshes).
export function shapeGeo(shape) {
  if (geoCache[shape]) return geoCache[shape];
  let g;
  if (shape === 1) g = new THREE.CylinderGeometry(0.5, 0.5, 1, 16).rotateZ(Math.PI / 2);
  else if (shape === 3 || shape === 4) g = wedge(shape === 3 ? 1 : -1);
  else g = new THREE.BoxGeometry(1, 1, 1);
  return (geoCache[shape] = g);
}
// A wedge: full height on one z side, zero on the other. The vertical face is left out (it is always hidden inside the car), so from
// inside the cabin the glass wedges stay see-through. s = 1: full at -z (a windshield / hood); s = -1: full at +z (a rear window / trunk).
function wedge(s) {
  const P = (x, y, z) => [x, y, z * s];
  const bL = P(-0.5, -0.5, -0.5), bR = P(0.5, -0.5, -0.5), tL = P(-0.5, 0.5, -0.5), tR = P(0.5, 0.5, -0.5), fL = P(-0.5, -0.5, 0.5), fR = P(0.5, -0.5, 0.5);
  const pos = [];
  for (const t of [[tR, tL, fL], [tR, fL, fR], [bL, bR, fR], [bL, fR, fL], [bR, tR, fR], [bL, fL, tL]]) for (const v of (s < 0 ? [t[0], t[2], t[1]] : t)) pos.push(...v);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}

export function carParts(raw) {
  const p = sanitize(raw), { length: L, width: W, bodyH: bh, ride, wheelR: wr, wheelW: ww, style } = p;
  const parts = [], add = (dx, dy, dz, sx, sy, sz, kind, shape = 0) => parts.push([dx, dy, dz, sx, sy, sz, kind, shape]);
  const top = ride + bh;                                   // top of the lower body
  const van = style === 3, pick = style === 2, hatch = style === 1;
  // cabin (greenhouse): z range [cz - cl/2, cz + cl/2] = rear slope + the centre box + the windshield slope
  let cl = p.cabinLen, cz = p.cabinShift;
  if (hatch) { cz = Math.min(cz, -0.1); cl = Math.min(cl, L * 0.62); }
  if (pick) { cl = Math.min(cl, L * 0.4); cz = L * 0.12; }
  if (van) { cl = L * 0.82; cz = -L * 0.07; }
  const ch = van ? p.cabinH + 0.25 : p.cabinH, cTop = top + ch;
  const sf = Math.min(ch * p.rake * (van ? 0.35 : 1), cl * 0.3);                                     // windshield slope length
  const sr = pick || van ? 0 : Math.min(ch * p.rake * (hatch ? 1.1 : 0.7), cl * 0.3);                // rear window slope length
  const z0 = cz - cl / 2 + sr, z1 = cz + cl / 2 - sf, cc = z1 - z0, zc = (z0 + z1) / 2;               // the centre box: z0..z1
  const rw = W - 2 * p.roofInset, gw = Math.min(W - 0.12, rw + 0.1), gy = top + ch / 2 - 0.02, gh = ch - 0.05;
  // lower body: the main box, a lower hood and (sedan) a lower trunk, each with a wedge that slopes the top edge down towards the end
  const hl = L * p.hood * (van ? 0.5 : 1), tl = hatch || pick || van ? 0 : L * p.trunk, hb = bh * 0.8, tb = bh * 0.88;
  add(0, ride + bh / 2, (-L / 2 + tl + L / 2 - hl) / 2, W, bh, L - tl - hl, 0);
  if (hl > 0.05) { add(0, ride + hb / 2, L / 2 - hl / 2, W, hb, hl, 0); add(0, ride + hb + (bh - hb) / 2, L / 2 - hl / 2, W, bh - hb, hl, 0, 3); }
  if (tl > 0.05) { add(0, ride + tb / 2, -L / 2 + tl / 2, W, tb, tl, 0); add(0, ride + tb + (bh - tb) / 2, -L / 2 + tl / 2, W, bh - tb, tl, 0, 4); }
  // glass: the centre box and the two sloped windows; four body-coloured pillars and the roof slab around the centre box
  add(0, gy, zc, gw, gh, cc, 1);
  if (sf > 0.05) add(0, gy, z1 + sf / 2, gw, gh, sf, 1, 3);
  if (sr > 0.05) add(0, gy, z0 - sr / 2, gw, gh, sr, 1, 4);
  add(0, cTop - 0.035, zc, rw, 0.07, cc, 0, 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(sx * gw / 2, gy, zc + sz * (cc / 2 - 0.04), 0.07, gh, 0.08, 0);
  if (pick) {                                              // open bed behind the cab: floor and three walls
    const zb = cz - cl / 2;                                  // the cab's rear edge
    const zm = (zb + -L / 2) / 2, bl = zb + L / 2;
    add(0, top + 0.02, zm, W - 0.1, 0.05, bl - 0.04, 5);
    add(-W / 2 + 0.05, top + 0.15, zm, 0.07, 0.3, bl, 0); add(W / 2 - 0.05, top + 0.15, zm, 0.07, 0.3, bl, 0);
    add(0, top + 0.15, -L / 2 + 0.04, W - 0.04, 0.3, 0.07, 0); add(0, top + 0.15, zb - 0.04, W - 0.1, 0.3, 0.07, 0);
  }
  // wheels: tyre, rim, centre cap and a dark arch
  const wx = W / 2 + 0.03, wz = L * 0.33;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    add(sx * wx, wr, sz * wz, ww, wr * 2, wr * 2, 2, 1);
    add(sx * (wx + ww / 2 + 0.005), wr, sz * wz, 0.03, wr * 1.1, wr * 1.1, 6, 1);
    add(sx * (wx + ww / 2 + 0.015), wr, sz * wz, 0.03, wr * 0.36, wr * 0.36, 5, 1);
    add(sx * (W / 2 - 0.02), wr * 2 + 0.02, sz * wz, 0.1, 0.08, wr * 2 + 0.16, 5);
  }
  // lights (headlights in chrome frames ahead, tail lights behind) and plates
  const hx = W * 0.33, ly = ride + bh * 0.72;
  for (const sx of [-1, 1]) {
    add(sx * hx, ly, L / 2 + 0.005, 0.47, 0.28, 0.08, 6); add(sx * hx, ly, L / 2 + 0.015, 0.4, 0.22, 0.1, 3);
    add(sx * hx, ly, -L / 2 - 0.01, 0.36, 0.18, 0.08, 4);
  }
  add(0, ride + bh * 0.3, -L / 2 - 0.01, 0.4, 0.14, 0.04, 6);
  add(0, ride + (p.bumpers ? 0.12 : 0.2), L / 2 + (p.bumpers ? 0.115 : 0.02), 0.4, 0.14, 0.03, 6);
  if (p.grille) { add(0, ride + bh * 0.52, L / 2 + 0.015, W * 0.34, 0.2, 0.06, 5); add(0, ride + bh * 0.52, L / 2 + 0.02, W * 0.3, 0.03, 0.06, 6); }
  if (p.bumpers) { add(0, ride + 0.12, L / 2 + 0.04, W + 0.06, 0.16, 0.14, 5); add(0, ride + 0.12, -L / 2 - 0.04, W + 0.06, 0.16, 0.14, 5); }
  if (p.exhaust) add(-W * 0.3, ride + 0.07, -L / 2 - 0.1, 0.09, 0.09, 0.2, 6);
  if (p.mirrors) for (const sx of [-1, 1]) { add(sx * (W / 2 + 0.1), top + 0.1, z1 - 0.05, 0.14, 0.1, 0.1, 5); add(sx * (W / 2 + 0.03), top + 0.07, z1 - 0.05, 0.06, 0.04, 0.04, 5); }
  if (p.trim) {                                            // door seams and handles, side skirts, fog lights
    const two = !pick && !van, zs = two ? [z1 - 0.03, zc, z0 + 0.03] : [z1 - 0.03, z0 + 0.03];
    for (const sx of [-1, 1]) {
      for (const z of zs) add(sx * (W / 2 + 0.005), ride + bh * 0.5, z, 0.012, bh * 0.85, 0.02, 5);
      add(sx * (W / 2 + 0.012), top - 0.1, (two ? zc : z0 + 0.03) + 0.2, 0.02, 0.04, 0.14, 6);
      if (two) add(sx * (W / 2 + 0.012), top - 0.1, z0 + 0.03 + 0.2, 0.02, 0.04, 0.14, 6);
      const sl = 2 * (wz - wr) - 0.12; if (sl > 0.3) add(sx * (W / 2 + 0.005), ride + 0.05, 0, 0.05, 0.1, sl, 5);
      add(sx * W * 0.4, ride + bh * 0.3, L / 2 + 0.015, 0.14, 0.08, 0.06, 3);
    }
  }
  if (p.rack) {
    for (const sx of [-1, 1]) add(sx * (rw / 2 - 0.12), cTop + 0.06, zc, 0.05, 0.05, cc - 0.1, 5);
    for (const t of [-0.35, 0, 0.35]) add(0, cTop + 0.09, zc + t * cc, rw - 0.2, 0.04, 0.05, 5);
  }
  if (p.spoiler) { for (const sx of [-1, 1]) add(sx * W * 0.34, top + 0.12, -L / 2 + 0.2, 0.06, 0.24, 0.1, 5); add(0, top + 0.26, -L / 2 + 0.2, W * 0.86, 0.05, 0.28, 5); }
  if (p.stripe) {
    add(0, cTop + 0.005, zc, W * 0.2, 0.012, cc, 7);
    if (hl > 0.05) add(0, ride + hb + (bh - hb) / 2 + 0.006, L / 2 - hl / 2, W * 0.2, bh - hb, hl, 7, 3);
    if (tl > 0.05) add(0, ride + tb + (bh - tb) / 2 + 0.006, -L / 2 + tl / 2, W * 0.2, bh - tb, tl, 7, 4);
  }
  if (p.antenna) add(-W * 0.34, cTop + 0.3, z0 + cc * 0.2, 0.025, 0.6, 0.025, 5);
  const height = cTop + (p.rack ? 0.1 : 0) + (p.antenna ? 0.45 : 0);
  // driver's eye (cockpit camera): left seat, just under the roof, inside the centre box
  const seat = { dx: W * 0.23, dy: Math.min(1.4, cTop - 0.12), dz: zc + cc * 0.15 };
  return { parts, length: L, width: W, height, seat, params: p };
}

// For the lab: the same list as ordinary meshes of one group (paint = { h, s, l }).
export function buildCar(raw, paint = { h: 0.58, s: 0.38, l: 0.3 }, night = false) {
  const car = carParts(raw), group = new THREE.Group(), mats = {};
  for (const [dx, dy, dz, sx, sy, sz, kind, shape] of car.parts) {
    const geo = shapeGeo(shape);
    const [h, s, l] = partColor(kind, paint.h, paint.s, paint.l), key = kind + ':' + h.toFixed(3) + s.toFixed(3) + l.toFixed(3);
    const lit = kind === 3 || kind === 4;
    const m = mats[key] || (mats[key] = lit ? new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(h, s, night && kind === 3 ? 0.9 : l) }) : new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL(h, s, l) }));
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(dx, dy, dz); mesh.scale.set(sx, sy, sz); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  }
  return { group, stats: { boxes: car.parts.length, 'size (L×W×H)': `${car.length.toFixed(1)}×${car.width.toFixed(1)}×${car.height.toFixed(2)}` }, car };
}
