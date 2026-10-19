// TurretKit: the sentry-gun model as a function of a few numbers. The game's base builder and the turret lab (labs/turret.html)
// both build the turret from here, so what is tuned in the lab is what the game shows.
// buildTurret(params) -> { group, head, gun, fire(), update(dt), stats }:
//  - `head` turns about the vertical axis (the game points it at the nearest zombie, +z is the barrel direction),
//  - `gun` is the barrel cradle on `head` (recoil slides it back), `fire()` starts a recoil + muzzle flash, `update(dt)` plays them.
import * as THREE from '../../vendor/three.module.js';
import { schemaDefaults, makeSanitize } from '../core/params.js';

// Parameter schema: [key, label, min, max, step, default]. The lab builds its sliders from this list (a toggle is 0..1).
export const SCHEMA = [
  ['Platform'],
  ['baseW', 'Base width', 1.2, 2.0, 0.05, 1.7],
  ['baseH', 'Base height', 0.2, 0.9, 0.05, 0.5],
  ['taper', 'Base tier inset', 0, 0.4, 0.02, 0.18],
  ['sandbags', 'Sandbags', 0, 1, 1, 1],
  ['pedR', 'Pedestal radius', 0.25, 0.6, 0.02, 0.4],
  ['pedH', 'Pedestal height', 0.2, 1.0, 0.05, 0.5],
  ['Turret'],
  ['headW', 'Head width', 0.5, 1.1, 0.02, 0.8],
  ['headH', 'Head height', 0.3, 0.7, 0.02, 0.42],
  ['shield', 'Front shield', 0, 1, 1, 1],
  ['shieldW', 'Shield width', 0.6, 1.4, 0.05, 1.0],
  ['ammo', 'Ammo box', 0, 1, 1, 1],
  ['sensor', 'Sensor lamp', 0, 1, 1, 1],
  ['antenna', 'Antenna', 0, 1, 1, 0],
  ['Guns'],
  ['guns', 'Barrels', 1, 4, 1, 1],
  ['spacing', 'Barrel spacing', 0.1, 0.4, 0.02, 0.2],
  ['barrelLen', 'Barrel length', 0.5, 1.8, 0.05, 1.1],
  ['barrelR', 'Barrel radius', 0.04, 0.14, 0.01, 0.07],
  ['jacket', 'Cooling jacket', 0, 1, 1, 1],
  ['muzzle', 'Muzzle brake', 0, 1, 1, 1],
  ['Look'],
  ['palette', 'Palette (0 olive, 1 desert, 2 urban, 3 rust)', 0, 3, 1, 0],
];
export const DEFAULTS = schemaDefaults(SCHEMA);
export const sanitize = makeSanitize(SCHEMA);

// base, dark base, metal, head, dark head, accent, sandbag, lamp
export const PALETTES = [
  { base: 0x5d5a50, dark: 0x3a3a34, metal: 0x15171a, head: 0x3b4636, headDark: 0x2d3328, accent: 0xc8682a, bag: 0x8a8460, lamp: 0xff5a3c },
  { base: 0x8a7a5a, dark: 0x5e5238, metal: 0x1f1d18, head: 0xa8946a, headDark: 0x7a6a48, accent: 0x3a5a7a, bag: 0xb4a070, lamp: 0xffb040 },
  { base: 0x6a6c72, dark: 0x3c3e44, metal: 0x101216, head: 0x4a4e58, headDark: 0x2e3138, accent: 0xd8d048, bag: 0x7c7e84, lamp: 0x40d0ff },
  { base: 0x6a4a3a, dark: 0x40291f, metal: 0x1a1412, head: 0x7a4a30, headDark: 0x4e2e1e, accent: 0x9aa0a8, bag: 0x7a6a50, lamp: 0xff3030 },
];

export const PRESETS = {
  Sentry: {},
  Twin: { guns: 2, spacing: 0.26, barrelLen: 1.0, headW: 0.95, shieldW: 1.2 },
  Quad: { guns: 4, spacing: 0.17, barrelLen: 0.9, barrelR: 0.06, headW: 1.0, headH: 0.5, jacket: 0, palette: 2 },
  Sniper: { guns: 1, barrelLen: 1.8, barrelR: 0.05, headW: 0.6, shield: 0, sensor: 1, antenna: 1, pedH: 0.8, palette: 1 },
  Bunker: { baseW: 2.0, baseH: 0.8, taper: 0.3, pedH: 0.25, headW: 1.0, headH: 0.55, guns: 2, spacing: 0.3, barrelLen: 0.8, palette: 3 },
};

export function buildTurret(raw) {
  const p = sanitize(raw), pal = PALETTES[p.palette] || PALETTES[0];
  const mats = {};
  const mat = (c) => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
  const group = new THREE.Group();
  let tris = 0, meshes = 0;
  const add = (geo, color, x, y, z, parent = group, rot) => {
    const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); if (rot) m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true; parent.add(m);
    tris += (geo.index ? geo.index.count : geo.attributes.position.count) / 3; meshes++; return m;
  };
  const box = (w, h, d, c, x, y, z, parent) => add(new THREE.BoxGeometry(w, h, d), c, x, y, z, parent);
  const cyl = (rt, rb, h, seg, c, x, y, z, parent, rot) => add(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, parent, rot);

  // platform: two tiers, an accent stripe, sandbags around it
  const bw = p.baseW, bh = p.baseH, tw = bw * (1 - p.taper), th = bh * 0.45;
  box(bw, bh, bw, pal.base, 0, bh / 2, 0);
  box(bw + 0.04, 0.07, bw + 0.04, pal.accent, 0, bh * 0.62, 0);
  box(tw, th, tw, pal.dark, 0, bh + th / 2, 0);
  const topY = bh + th;
  if (p.sandbags) {
    const n = Math.max(3, Math.round(bw / 0.42)), s = bw / n;
    for (let side = 0; side < 4; side++) for (let i = 0; i < n; i++) {
      const u = -bw / 2 + s * (i + 0.5), off = bw / 2 + 0.17, a = side * Math.PI / 2;
      const x = Math.cos(a) * u - Math.sin(a) * off, z = Math.sin(a) * u + Math.cos(a) * off;
      box(0.34, 0.2, 0.26, pal.bag, x, 0.1, z, undefined).rotation.y = a + ((i % 2) ? 0.06 : -0.05);
    }
  }
  // pedestal + a ring under the head
  cyl(p.pedR, p.pedR * 1.1, p.pedH, 10, pal.base, 0, topY + p.pedH / 2, 0);
  const headY = topY + p.pedH;
  cyl(p.pedR * 1.25, p.pedR * 1.25, 0.08, 12, pal.accent, 0, headY + 0.04, 0);

  // head: turns about the vertical axis
  const head = new THREE.Group(); head.position.set(0, headY + 0.08, 0); group.add(head);
  const hw = p.headW, hh = p.headH;
  box(hw, hh, hw * 0.9, pal.head, 0, hh / 2, 0, head);
  box(hw * 0.92, 0.06, hw * 0.82, pal.headDark, 0, hh + 0.03, 0, head);
  if (p.shield) {   // a sloped armour plate in front of the cradle
    const sh = box(p.shieldW, hh * 1.15, 0.09, pal.headDark, 0, hh * 0.62, hw * 0.42, head); sh.rotation.x = -0.18;
    box(p.shieldW * 0.94, 0.05, 0.1, pal.accent, 0, hh * 1.12, hw * 0.42 - 0.02, head).rotation.x = -0.18;
  }
  if (p.ammo) {     // ammo box on the right with a feed belt towards the guns
    box(0.24, 0.26, 0.34, pal.dark, hw / 2 + 0.12, hh * 0.45, -0.05, head);
    box(0.26, 0.05, 0.36, pal.accent, hw / 2 + 0.12, hh * 0.45 + 0.15, -0.05, head);
    box(0.1, 0.05, 0.26, pal.metal, hw / 2 - 0.02, hh * 0.6, 0.12, head);
  }
  let lamp = null;
  if (p.sensor) {   // sensor mast with a glowing lamp
    box(0.06, 0.18, 0.06, pal.metal, -hw * 0.28, hh + 0.12, -hw * 0.2, head);
    lamp = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.13), new THREE.MeshBasicMaterial({ color: pal.lamp }));
    lamp.position.set(-hw * 0.28, hh + 0.26, -hw * 0.2); head.add(lamp); tris += 12; meshes++;
  }
  if (p.antenna) box(0.025, 0.7, 0.025, pal.metal, hw * 0.3, hh + 0.4, -hw * 0.25, head);

  // gun cradle (slides back on recoil) with 1-4 barrels, pointing along +z
  const gun = new THREE.Group(); gun.position.set(0, hh * 0.62, hw * 0.18); head.add(gun);
  box(Math.max(0.3, (p.guns - 1) * p.spacing + 0.34), hh * 0.55, 0.36, pal.headDark, 0, 0, 0.05, gun);
  const L = p.barrelLen, R = p.barrelR, tips = [];
  for (let i = 0; i < p.guns; i++) {
    const x = (i - (p.guns - 1) / 2) * p.spacing, rot = [Math.PI / 2, 0, 0];
    cyl(R, R, L, 8, pal.metal, x, 0, 0.2 + L / 2, gun, rot);
    if (p.jacket) {
      cyl(R * 1.7, R * 1.7, L * 0.5, 8, pal.dark, x, 0, 0.2 + L * 0.3, gun, rot);
      for (let r = 0; r < 3; r++) cyl(R * 1.85, R * 1.85, 0.03, 8, pal.metal, x, 0, 0.2 + L * 0.12 + r * L * 0.14, gun, rot);
    }
    if (p.muzzle) cyl(R * 1.5, R * 1.5, 0.14, 8, pal.metal, x, 0, 0.2 + L - 0.02, gun, rot);
    tips.push([x, 0.2 + L + 0.08]);
  }
  // muzzle flashes (shown for a moment by fire())
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd070 });
  const flashes = tips.map(([x, z]) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.34), flashMat); f.position.set(x, 0, z + 0.12); f.visible = false; gun.add(f); return f; });

  let recoil = 0, flash = 0;
  return {
    group, head, gun, params: p,
    stats: { triangles: Math.round(tris), meshes },
    fire() { recoil = 1; flash = 0.07; },
    update(dt) {
      recoil = Math.max(0, recoil - dt * 6); flash = Math.max(0, flash - dt);
      gun.position.z = hw * 0.18 - recoil * 0.16;
      for (const f of flashes) f.visible = flash > 0;
      if (lamp) lamp.visible = ((performance.now() / 600) | 0) % 2 === 0;   // the lamp blinks
    },
  };
}
