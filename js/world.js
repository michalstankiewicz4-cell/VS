import * as THREE from '../vendor/three.module.js';
import { PALACE, PALACE_HW, PALACE_HD, PALACE_H } from './palace.js';

export function mulberry32(a) {
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const TILE = 5;            // jednostki świata na jedną powtórkę tekstury
const GROUND = 200;
const ENEMIES = 110;
const GRAVES = 260;
const RANGE = 40;          // promień obszaru, w którym zawijają się nagrobki
const PN = 96;             // pula pocisków
const CELL = 2;            // siatka budowania
export const COST = { tower: 25, wall: 8, crypt: 40 };
export const CRYPT_MAX = 3;

function mergeBoxes(list) {
  const pos = [], nor = [];
  for (const [w, h, d, x, y, z] of list) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(x, y, z);
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
// zombie: tułów, głowa, wyciągnięte ręce, nogi (złożone w jedną geometrię dla instancji)
const zombieGeo = () => mergeBoxes([
  [0.6, 0.7, 0.34, 0, 0.85, 0], [0.34, 0.34, 0.34, 0, 1.4, 0.05],
  [0.14, 0.14, 0.65, -0.26, 1.0, 0.4], [0.14, 0.14, 0.65, 0.26, 1.05, 0.4],
  [0.22, 0.55, 0.26, -0.15, 0.28, 0], [0.22, 0.55, 0.26, 0.15, 0.28, 0]
]);

export function createWorld(scene) {
  const rnd = mulberry32(1337);
  const dummy = new THREE.Object3D();

  /* ---- teren: tekstura generowana proceduralnie ---- */
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

  /* ---- światła i mgła ---- */
  scene.background = new THREE.Color(0x07040b);
  scene.fog = new THREE.Fog(0x07040b, 20, 46);
  scene.add(new THREE.HemisphereLight(0x6a6080, 0x2a1410, 1.3));
  const moon = new THREE.DirectionalLight(0x7f8fff, 1.6);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  moon.shadow.bias = -0.0008;
  scene.add(moon, moon.target);
  const torch = new THREE.PointLight(0xff8a44, 30, 16, 2);
  scene.add(torch);

  /* ---- cykl dnia i nocy: 5 min dnia + 5 min nocy (okres 600 s), przejścia ok. 40 s ---- */
  const DAY_LEN = 300, CYCLE = DAY_LEN * 2, T0 = 40;     // T0: bieg zaczyna się już za dnia
  const hemi = scene.children.find((c) => c.isHemisphereLight);
  const sk = {
    bgD: new THREE.Color(0x8d9aa4), bgN: new THREE.Color(0x07040b),
    hsD: new THREE.Color(0xc2ccd6), hsN: new THREE.Color(0x6a6080),
    hgD: new THREE.Color(0x5a4a3c), hgN: new THREE.Color(0x2a1410),
    dlD: new THREE.Color(0xfff0d0), dlN: new THREE.Color(0x7f8fff),
  };
  const nightAt = (time) => {            // 0 = dzień, 1 = noc (gładko)
    const v = -Math.sin(2 * Math.PI * (time + T0) / CYCLE), e0 = -0.2, e1 = 0.2;
    const x = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
    return x * x * (3 - 2 * x);
  };
  function applySky(n) {
    scene.background.copy(sk.bgD).lerp(sk.bgN, n);
    scene.fog.color.copy(scene.background);
    scene.fog.far = 74 - 28 * n; scene.fog.near = 30 - 10 * n;
    hemi.color.copy(sk.hsD).lerp(sk.hsN, n); hemi.groundColor.copy(sk.hgD).lerp(sk.hgN, n);
    hemi.intensity = 3.4 - 2.1 * n;
    moon.color.copy(sk.dlD).lerp(sk.dlN, n); moon.intensity = 3.6 - 2.0 * n;
    S.night = n;
  }

  /* ---- gruz (instancje, zawijany wokół gracza, bez kolizji) ---- */
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
  const placeGraves = () => {
    for (let i = 0; i < GRAVES; i++) {
      dummy.position.set(gx[i], gh[i] / 2, gz[i]);
      dummy.rotation.set(0, gr[i], 0);
      dummy.scale.set(gsx[i], gh[i], gsz[i]);
      dummy.updateMatrix();
      gm.setMatrixAt(i, dummy.matrix);
    }
    gm.instanceMatrix.needsUpdate = true;
  };
  placeGraves();
  scene.add(gm);

  /* ---- gracz: człowiek z karabinem (bryły proceduralne) ---- */
  const player = new THREE.Group();
  const rig = new THREE.Group();
  player.add(rig);
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const part = (geo, c, x, y, z, parent = rig) => {
    const m = new THREE.Mesh(geo, M(c)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  };
  part(new THREE.BoxGeometry(0.62, 0.72, 0.36), 0x4a5638, 0, 1.0, 0);            // kurtka
  part(new THREE.BoxGeometry(0.5, 0.5, 0.22), 0x2b2f26, 0, 1.05, -0.26);         // plecak
  part(new THREE.SphereGeometry(0.22, 8, 6), 0xcfa88a, 0, 1.58, 0);              // głowa
  part(new THREE.CylinderGeometry(0.25, 0.28, 0.17, 8), 0x2f3a2a, 0, 1.72, 0);   // hełm
  part(new THREE.BoxGeometry(0.14, 0.14, 0.55), 0x4a5638, -0.3, 1.1, 0.32);      // lewa ręka
  part(new THREE.BoxGeometry(0.14, 0.14, 0.45), 0x4a5638, 0.3, 1.05, 0.28);      // prawa ręka
  part(new THREE.BoxGeometry(0.1, 0.13, 1.25), 0x17181b, 0.05, 1.12, 0.6);       // karabin
  part(new THREE.BoxGeometry(0.1, 0.22, 0.35), 0x3a2a1c, 0.05, 1.08, 0.0);       // kolba
  const mkLeg = (x) => {
    const pv = new THREE.Group(); pv.position.set(x, 0.65, 0); rig.add(pv);
    part(new THREE.BoxGeometry(0.24, 0.65, 0.28), 0x2a2d36, 0, -0.325, 0, pv);
    return pv;
  };
  const legL = mkLeg(-0.16), legR = mkLeg(0.16);
  scene.add(player);
  const state = { pos: player.position, face: 0, speed: 5.2 };

  /* ---- stan rozgrywki ---- */
  const S = { hp: 100, maxHp: 100, kills: 0, pts: 0, time: 0, mode: 'idle', fireCd: 0, active: 0 };
  const blockers = [];
  const cityBlk = [];
  const blkLists = [blockers, cityBlk];
  const structs = new Map();
  const key = (gx, gz) => gx + ',' + gz;
  const countType = (t) => { let n = 0; for (const v of structs.values()) if (v.type === t) n++; return n; };
  const push = (x, z, rad) => {
    for (const L of blkLists) for (const b of L) {
      if (b.hw !== undefined) {
        const cx = Math.max(b.x - b.hw, Math.min(x.v, b.x + b.hw)), cz = Math.max(b.z - b.hd, Math.min(z.v, b.z + b.hd));
        const dx = x.v - cx, dz = z.v - cz, d = Math.hypot(dx, dz);
        if (d < rad) {
          if (d > 1e-4) { x.v = cx + dx / d * rad; z.v = cz + dz / d * rad; }
          else {
            const px = b.hw - Math.abs(x.v - b.x), pz = b.hd - Math.abs(z.v - b.z);
            if (px < pz) x.v = b.x + (x.v >= b.x ? 1 : -1) * (b.hw + rad); else z.v = b.z + (z.v >= b.z ? 1 : -1) * (b.hd + rad);
          }
        }
      } else {
        const dx = x.v - b.x, dz = z.v - b.z, d = Math.hypot(dx, dz), m = b.r + rad;
        if (d < m && d > 1e-4) { x.v = b.x + dx / d * m; z.v = b.z + dz / d * m; }
      }
    }
  };
  const hitsB = (b, x, z) => b.hw !== undefined ? Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd : Math.hypot(x - b.x, z - b.z) < b.r;

  /* ---- mapa miasta (edytowalna): lista obiektów -> instancje + kolizje ---- */
  const MAP_MAX = 380, BASE_ZONE = 30, EDGE = 76;
  const fade = { player: new THREE.Vector3(), fwd: new THREE.Vector3(0, -0.8, -0.6), on: { value: 0 }, setOn(v) { this.on.value = v; } };
  const bmat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  // budynki między kamerą a graczem robią się "kratkowo" przezroczyste (dither jak w filtrze pixel-art)
  bmat.onBeforeCompile = (sh) => {
    sh.uniforms.uPlayer = { value: fade.player };
    sh.uniforms.uFwd = { value: fade.fwd };
    sh.uniforms.uOn = fade.on;
    sh.uniforms.uR = { value: 2.8 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;\nuniform vec3 uPlayer, uFwd;\nuniform float uOn, uR;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (uOn > 0.5) {
        vec3 dd = vWP - uPlayer;
        float al = dot(dd, uFwd);
        if (al < -0.3) {
          float k = smoothstep(uR * 0.55, uR, length(dd - uFwd * al));
          float a = mix(0.1, 1.0, k);
          vec2 pp = floor(mod(gl_FragCoord.xy, 4.0));
          float v2 = mod(2.0 * mod(pp.x, 2.0) + 3.0 * mod(pp.y, 2.0), 4.0);
          float v1 = mod(2.0 * floor(pp.x / 2.0) + 3.0 * floor(pp.y / 2.0), 4.0);
          if (a < (v2 * 4.0 + v1) / 16.0 + 0.02) discard;
        }
      }`);
  };
  const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bmat, 1300);
  bm.castShadow = bm.receiveShadow = true; bm.frustumCulled = false;
  scene.add(bm);

  let city = [];
  const own = [];
  const cc = new THREE.Color();
  const num = (v, lo, hi, d) => { v = +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
  const r1 = (v) => Math.round(v * 10) / 10;
  function clean(o) {
    if (!o || typeof o !== 'object') return null;
    const x = r1(num(o.x, -EDGE, EDGE, 0)), z = r1(num(o.z, -EDGE, EDGE, 0)), s = num(o.s, 0, 1, 0.5);
    if (o.t === 'b') return { t: 'b', x, z, w: r1(num(o.w, 3, 16, 8)), d: r1(num(o.d, 3, 16, 8)), h: r1(num(o.h, 1.5, 9, 4)), s };
    if (o.t === 'c') return { t: 'c', x, z, r: o.r ? 1 : 0, s };
    if (o.t === 'p') return { t: 'p', x: 0, z: -46, s };
    return null;
  }
  const bounds = (o) => o.t === 'b' ? { x: o.x, z: o.z, hw: o.w / 2, hd: o.d / 2, h: o.h }
    : o.t === 'c' ? (o.r ? { x: o.x, z: o.z, hw: 1.95, hd: 0.95, h: 1.4 } : { x: o.x, z: o.z, hw: 0.95, hd: 1.95, h: 1.4 })
    : { x: o.x, z: o.z, hw: PALACE_HW, hd: PALACE_HD, h: PALACE_H };
  const inBase = (b) => Math.abs(b.x) - b.hw < BASE_ZONE && Math.abs(b.z) - b.hd < BASE_ZONE;
  const inWorld = (b) => Math.abs(b.x) + b.hw <= EDGE && Math.abs(b.z) + b.hd <= EDGE;

  function rebuildCity() {
    let bn = 0; own.length = 0; cityBlk.length = 0;
    const add = (i, x, y, z, sx, sy, sz, ry, h, sa, l) => {
      dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
      bm.setMatrixAt(bn, dummy.matrix); bm.setColorAt(bn, cc.setHSL(h, sa, l)); own[bn] = i; bn++;
    };
    city.forEach((o, i) => {
      const r = mulberry32(Math.floor(o.s * 1e9) + 1);
      if (o.t === 'b') {
        const hue = 0.05 + r() * 0.06, li = 0.2 + r() * 0.14, { w, d, h } = o;
        add(i, o.x, h / 2, o.z, w, h, d, 0, hue, 0.1, li);
        add(i, o.x, h * 0.55, o.z + d * 0.51, w * 0.7, h * 0.5, 0.15, 0, 0, 0, 0.05);   // ciemne wybite okna
        const roof = r() < 0.6, ax = (r() - 0.5) * w * 0.4, az = (r() - 0.5) * d * 0.4, ry = r() * 3;
        if (roof) add(i, o.x + ax, h + 0.3, o.z + az, w * 0.5, 0.6, d * 0.5, ry, hue, 0.08, li * 0.8);  // zawalony strop
      } else if (o.t === 'c') {
        const hue = r() < 0.5 ? 0.04 : 0.6, sa = 0.25 + r() * 0.25, ry = o.r ? Math.PI / 2 : 0;
        add(i, o.x, 0.5, o.z, 1.8, 0.9, 3.8, ry, hue, sa, 0.18 + r() * 0.1);
        add(i, o.x, 1.15, o.z, 1.5, 0.5, 2.0, ry, hue, sa, 0.12);
      } else {   // Pałac Kultury i Nauki — model z pliku SketchUp (js/palace.js)
        for (const [px, pz, w, d, h] of PALACE) {
          const l = 0.2 + Math.min(h, 34) / 34 * 0.14;
          add(i, o.x + px, h / 2, o.z + pz, w, h, d, 0, 0.08, 0.1, l);
        }
        for (const [px, pz, w, d, , blk] of PALACE) if (blk) cityBlk.push({ x: o.x + px, z: o.z + pz, hw: w / 2, hd: d / 2 });
        return;
      }
      const bd = bounds(o);
      cityBlk.push({ x: bd.x, z: bd.z, hw: bd.hw, hd: bd.hd });
    });
    bm.count = bn;
    bm.instanceMatrix.needsUpdate = true;
    if (bm.instanceColor) bm.instanceColor.needsUpdate = true;
    bm.boundingSphere = null; bm.boundingBox = null;
  }

  function defaultMap() {
    const cr = mulberry32(2026), out = [];
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
      const cx = i * 14, cz = j * 14;
      if (Math.abs(cx) <= 28 && Math.abs(cz) <= 28) continue;      // strefa bazy
      if (Math.abs(cx) <= 28 && cz <= -42 && cz >= -56) continue;   // miejsce na Pałac
      if (cr() < 0.2) continue;
      const w = 5.5 + cr() * 3.5, d = 5.5 + cr() * 3.5, h = 2.5 + cr() * 4;
      out.push({ t: 'b', x: cx + (cr() - 0.5) * 1.5, z: cz + (cr() - 0.5) * 1.5, w, d, h, s: cr() });
    }
    for (let k = 0; k < 44; k++) {
      const along = cr() < 0.5, line = (Math.floor(cr() * 10) - 5) * 14 + 7, t = (cr() * 2 - 1) * 68;
      const x = along ? line + (cr() - 0.5) * 2 : t, z = along ? t : line + (cr() - 0.5) * 2;
      if (Math.abs(x) < 32 && Math.abs(z) < 32) continue;
      out.push({ t: 'c', x, z, r: along ? 0 : 1, s: cr() });
    }
    out.push({ t: 'p', x: 0, z: -46, s: 0.5 });
    return out;
  }

  const map = {
    list: () => city.map((o) => ({ ...o })),
    count: () => city.length,
    max: MAP_MAX,
    bounds: (i) => bounds(city[i]),
    boundsOf: (o) => bounds(o),
    canPlace(o) {
      const c = clean(o);
      if (!c || c.t === 'p' || city.length >= MAP_MAX) return false;
      const b = bounds(c);
      return inWorld(b) && !inBase(b);
    },
    why(o) {                         // powód odmowy (do podpowiedzi w edytorze)
      const c = clean(o);
      if (!c) return 'niepoprawny obiekt';
      if (c.t === 'p') return 'Pałac Kultury jest stały';
      if (city.length >= MAP_MAX) return 'limit obiektów';
      const b = bounds(c);
      if (!inWorld(b)) return 'poza granicą mapy';
      if (inBase(b)) return 'strefa bazy (środek) musi zostać wolna';
      return '';
    },
    add(o) {
      if (!map.canPlace(o)) return false;
      city.push(clean(o)); rebuildCity(); return true;
    },
    removeAt(i) {
      if (!city[i]) return false;
      city.splice(i, 1); rebuildCity(); return true;
    },
    pick(raycaster) {
      const hit = raycaster.intersectObject(bm)[0];
      return hit && hit.instanceId !== undefined && own[hit.instanceId] !== undefined ? own[hit.instanceId] : -1;
    },
    set(arr) {                       // walidacja: nic spoza schematu nie przechodzi, strefa bazy zawsze wolna
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
      city = out; rebuildCity(); return out.length;
    },
    reset() { return map.set(defaultMap()); }
  };
  map.reset();

  /* ---- wrogowie ---- */
  const em = new THREE.InstancedMesh(zombieGeo(), new THREE.MeshLambertMaterial({ color: 0xffffff }), ENEMIES);
  em.castShadow = true;
  em.frustumCulled = false;
  const ex = new Float32Array(ENEMIES), ez = new Float32Array(ENEMIES), es = new Float32Array(ENEMIES), ep = new Float32Array(ENEMIES), eh = new Float32Array(ENEMIES);
  const col = new THREE.Color();
  const hpFor = () => S.time > 180 ? 4 : S.time > 90 ? 3 : 2;
  const spawn = (i, around) => {
    const a = rnd() * Math.PI * 2, r = 20 + rnd() * 6;
    ex[i] = around.x + Math.cos(a) * r; ez[i] = around.z + Math.sin(a) * r; eh[i] = hpFor();
  };
  const park = (i) => { dummy.position.set(0, -50, 0); dummy.scale.set(0, 0, 0); dummy.updateMatrix(); em.setMatrixAt(i, dummy.matrix); };
  for (let i = 0; i < ENEMIES; i++) {
    es[i] = 1.2 + rnd() * 1.4; ep[i] = rnd() * 6.28; park(i);
    em.setColorAt(i, col.setHSL(0.2 + rnd() * 0.1, 0.15 + rnd() * 0.2, 0.26 + rnd() * 0.14));
  }
  em.instanceColor.needsUpdate = true;
  scene.add(em);

  /* ---- pociski ---- */
  const pm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.16, 0.55), new THREE.MeshBasicMaterial({ color: 0xffd070 }), PN);
  pm.frustumCulled = false;
  scene.add(pm);
  const ppx = new Float32Array(PN), ppz = new Float32Array(PN), pvx = new Float32Array(PN), pvz = new Float32Array(PN), pl = new Float32Array(PN);
  let pi = 0;
  const hideP = (i) => { dummy.position.set(0, -50, 0); dummy.scale.set(0, 0, 0); dummy.updateMatrix(); pm.setMatrixAt(i, dummy.matrix); };
  for (let i = 0; i < PN; i++) hideP(i);
  const shoot = (x, z, dx, dz) => { const i = pi; pi = (pi + 1) % PN; ppx[i] = x; ppz[i] = z; pvx[i] = dx * 26; pvz[i] = dz * 26; pl[i] = 0.9; };

  /* ---- budowle ---- */
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  function makeObj(type) {
    const grp = new THREE.Group();
    let head = null;
    const box = (w, h, d, c, x, y, z, parent = grp) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y, z); parent.add(m); return m;
    };
    if (type === 'tower') {           // stanowisko z karabinem maszynowym
      box(1.7, 0.7, 1.7, 0x5d5a50, 0, 0.35, 0);
      box(1.0, 0.5, 1.0, 0x3b4636, 0, 0.95, 0);
      head = new THREE.Group(); head.position.set(0, 1.4, 0); grp.add(head);
      box(0.22, 0.22, 1.1, 0x15171a, 0, 0, 0.5, head);
      box(0.7, 0.45, 0.12, 0x2d3328, 0, 0, 0.1, head);
    } else if (type === 'wall') {     // barykada
      box(1.9, 0.9, 0.7, 0x6b6860, 0, 0.45, 0);
      box(1.9, 0.16, 0.72, 0xc8682a, 0, 0.78, 0);
      box(0.3, 1.2, 0.3, 0x4a4036, -0.8, 0.6, 0.4);
    } else {                          // schron
      box(1.8, 1.1, 1.8, 0x3a4232, 0, 0.55, 0);
      box(0.6, 0.8, 0.1, 0x151513, 0, 0.4, 0.91);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffb050 }));
      lamp.position.set(0.6, 0.9, 0.91); grp.add(lamp);
    }
    grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { grp, head };
  }
  const canPlace = (type, gx, gz) => COST[type] !== undefined && Math.abs(gx) <= 14 && Math.abs(gz) <= 14 &&
    !structs.has(key(gx, gz)) && Math.hypot(gx * CELL, gz * CELL) > 3 && (type !== 'crypt' || countType('crypt') < CRYPT_MAX);
  function place(type, gx, gz) {
    if (!canPlace(type, gx, gz)) return false;
    const { grp, head } = makeObj(type), x = gx * CELL, z = gz * CELL;
    grp.position.set(x, 0, z);
    scene.add(grp);
    const blk = type === 'tower' ? { x, z, r: 0.8 } : type === 'wall' ? { x, z, r: 0.9 } : { x, z, r: 1.0 };
    blockers.push(blk);
    structs.set(key(gx, gz), { type, gx, gz, grp, head, blk, cd: 0 });
    return true;
  }
  function remove(gx, gz) {
    const v = structs.get(key(gx, gz));
    if (!v) return null;
    scene.remove(v.grp);
    blockers.splice(blockers.indexOf(v.blk), 1);
    structs.delete(key(gx, gz));
    return v.type;
  }
  const list = () => [...structs.values()].map((v) => ({ t: v.type, gx: v.gx, gz: v.gz }));
  function load(arr) {
    for (const v of [...structs.values()]) remove(v.gx, v.gz);
    for (const o of arr) if (o && Number.isInteger(o.gx) && Number.isInteger(o.gz)) place(o.t, o.gx, o.gz);
  }
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.8), new THREE.MeshBasicMaterial({ color: 0x40ff80, transparent: true, opacity: 0.35, depthWrite: false }));
  ghost.visible = false;
  scene.add(ghost);
  function setGhost(show, gx, gz, ok) {
    ghost.visible = show;
    ghost.scale.set(1, 1, 1);
    ghost.position.set(gx * CELL, 0.6, gz * CELL);
    ghost.material.color.setHex(ok ? 0x40ff80 : 0xff4050);
  }
  function setGhostBox(show, x, y, z, sx, sy, sz, ok) {
    ghost.visible = show;
    ghost.scale.set(sx / 1.8, sy / 1.2, sz / 1.8);
    ghost.position.set(x, y, z);
    ghost.material.color.setHex(ok ? 0x40ff80 : 0xff4050);
  }

  function reset() {
    state.pos.set(0, 0, 0); state.face = 0;
    S.maxHp = 100 + 25 * countType('crypt'); S.hp = S.maxHp;
    S.kills = 0; S.pts = 0; S.time = 0; S.night = 0; S.fireCd = 0; S.active = 0;
    for (let i = 0; i < ENEMIES; i++) park(i);
    for (let i = 0; i < PN; i++) { pl[i] = 0; hideP(i); }
    em.instanceMatrix.needsUpdate = true; pm.instanceMatrix.needsUpdate = true;
  }
  const setMode = (m) => { S.mode = m; };

  function update(dt, t, mv, aim, firing) {
    const nightN = S.mode === 'play' ? nightAt(S.time) : 0;
    applySky(nightN);
    if (S.mode !== 'play') return;
    S.time += dt;

    // gracz
    const px0 = { v: state.pos.x + mv.x * state.speed * dt }, pz0 = { v: state.pos.z + mv.z * state.speed * dt };
    push(px0, pz0, 0.45);
    state.pos.x = px0.v; state.pos.z = pz0.v;
    const moving = mv.x !== 0 || mv.z !== 0;
    const px = state.pos.x, pz = state.pos.z;
    let want = moving ? Math.atan2(mv.x, mv.z) : state.face;
    if (firing && aim) want = Math.atan2(aim.x - px, aim.z - pz);
    let d = want - state.face; d = Math.atan2(Math.sin(d), Math.cos(d));
    state.face += d * Math.min(1, dt * 14);
    player.rotation.y = state.face;
    rig.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.07 : 0;
    legL.rotation.x = moving ? Math.sin(t * 11) * 0.7 : 0;
    legR.rotation.x = moving ? -Math.sin(t * 11) * 0.7 : 0;
    state.pos.x = Math.max(-76, Math.min(76, state.pos.x)); state.pos.z = Math.max(-76, Math.min(76, state.pos.z));

    // strzelanie
    S.fireCd -= dt;
    if (firing && aim && S.fireCd <= 0) {
      let dx = aim.x - px, dz = aim.z - pz; const l = Math.hypot(dx, dz) || 1;
      const a = Math.atan2(dx, dz) + (rnd() - 0.5) * 0.08;
      dx = Math.sin(a); dz = Math.cos(a);
      shoot(px + dx * 0.7, pz + dz * 0.7, dx, dz);
      S.fireCd = 0.16;
    }

    // światła
    torch.position.set(px, 2.6, pz);
    torch.intensity = (30 + Math.sin(t * 13) * 3 + Math.sin(t * 7.3) * 2) * (0.15 + 0.85 * S.night);
    moon.position.set(px - 10 + 8 * S.night, 18, pz + 8 - 4 * S.night);
    moon.target.position.set(px, 0, pz);
    ground.position.set(Math.round(px / TILE) * TILE, 0, Math.round(pz / TILE) * TILE);

    // nagrobki
    let wrapped = false;
    for (let i = 0; i < GRAVES; i++) {
      const dx = gx[i] - px, dz = gz[i] - pz;
      if (dx > RANGE) { gx[i] -= RANGE * 2; wrapped = true; } else if (dx < -RANGE) { gx[i] += RANGE * 2; wrapped = true; }
      if (dz > RANGE) { gz[i] -= RANGE * 2; wrapped = true; } else if (dz < -RANGE) { gz[i] += RANGE * 2; wrapped = true; }
    }
    if (wrapped) placeGraves();

    // fala: liczba aktywnych wrogów rośnie z czasem
    const act = Math.min(ENEMIES, 18 + Math.floor(S.time));
    for (let i = S.active; i < act; i++) spawn(i, state.pos);
    S.active = act;

    // wrogowie
    const sp = 1 + Math.min(S.time / 240, 0.8);
    let touching = 0;
    for (let i = 0; i < S.active; i++) {
      const dx = px - ex[i], dz = pz - ez[i];
      const dist = Math.hypot(dx, dz) || 1;
      if (dist > 34) { spawn(i, state.pos); continue; }
      let vx = dx / dist, vz = dz / dist;
      if (dist < 1.1) touching++;
      if (dist < 1.0) { vx = 0; vz = 0; }
      for (let j = 0; j < S.active; j++) {
        if (j === i) continue;
        const sx = ex[i] - ex[j], sz = ez[i] - ez[j], sd = sx * sx + sz * sz;
        if (sd < 0.8 && sd > 1e-4) { const k = 1 / Math.sqrt(sd); vx += sx * k * 0.9; vz += sz * k * 0.9; }
      }
      const nx = { v: ex[i] + vx * es[i] * sp * dt }, nz = { v: ez[i] + vz * es[i] * sp * dt };
      push(nx, nz, 0.4);
      ex[i] = nx.v; ez[i] = nz.v;
      dummy.position.set(ex[i], Math.abs(Math.sin(t * 6 + ep[i])) * 0.06, ez[i]);
      dummy.rotation.set(0, Math.atan2(dx, dz), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      em.setMatrixAt(i, dummy.matrix);
    }
    em.instanceMatrix.needsUpdate = true;
    S.hp -= touching * 8 * dt;
    if (S.hp <= 0) { S.hp = 0; S.mode = 'dead'; }

    // wieże
    for (const v of structs.values()) {
      if (v.type !== 'tower') continue;
      v.cd -= dt;
      let best = -1, bd = 100;
      for (let i = 0; i < S.active; i++) {
        const dx = ex[i] - v.grp.position.x, dz = ez[i] - v.grp.position.z, dd = dx * dx + dz * dz;
        if (dd < bd) { bd = dd; best = i; }
      }
      if (best >= 0) {
        const dx = ex[best] - v.grp.position.x, dz = ez[best] - v.grp.position.z, l = Math.hypot(dx, dz) || 1;
        v.head.rotation.y = Math.atan2(dx, dz);
        if (v.cd <= 0) { shoot(v.grp.position.x + dx / l, v.grp.position.z + dz / l, dx / l, dz / l); v.cd = 0.75; }
      }
    }

    // pociski
    for (let i = 0; i < PN; i++) {
      if (pl[i] <= 0) { hideP(i); continue; }
      pl[i] -= dt; ppx[i] += pvx[i] * dt; ppz[i] += pvz[i] * dt;
      let wall = false;
      for (const L of blkLists) { for (const b of L) if (hitsB(b, ppx[i], ppz[i])) { wall = true; break; } if (wall) break; }
      if (wall) pl[i] = 0;
      for (let j = 0; j < S.active && pl[i] > 0; j++) {
        const dx = ppx[i] - ex[j], dz = ppz[i] - ez[j];
        if (dx * dx + dz * dz < 0.55) {
          pl[i] = 0; eh[j] -= 1;
          ex[j] -= dx * 0.4; ez[j] -= dz * 0.4;
          if (eh[j] <= 0) { S.kills++; S.pts++; spawn(j, state.pos); }
        }
      }
      if (pl[i] <= 0) { hideP(i); continue; }
      dummy.position.set(ppx[i], 1, ppz[i]);
      dummy.rotation.set(0, Math.atan2(pvx[i], pvz[i]), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      pm.setMatrixAt(i, dummy.matrix);
    }
    pm.instanceMatrix.needsUpdate = true;
  }

  return { player: state, S, nightAt, DAY_LEN, update, reset, setMode, place, remove, canPlace, list, load, count: countType, setGhost, setGhostBox, map, fade, enemyCount: ENEMIES };
}
