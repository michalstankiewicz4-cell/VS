import * as THREE from '../vendor/three.module.js';

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
  const structs = new Map();
  const key = (gx, gz) => gx + ',' + gz;
  const countType = (t) => { let n = 0; for (const v of structs.values()) if (v.type === t) n++; return n; };
  const push = (x, z, rad) => {
    for (const b of blockers) {
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

  /* ---- zniszczona Warszawa: kwartały, wraki aut, Pałac Kultury ---- */
  {
    const cr = mulberry32(2026), cc = new THREE.Color();
    const bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), 600);
    bm.castShadow = bm.receiveShadow = true; bm.frustumCulled = false;
    let bn = 0;
    const addBox = (x, y, z, sx, sy, sz, ry, h, sa, l) => {
      dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
      bm.setMatrixAt(bn, dummy.matrix); bm.setColorAt(bn, cc.setHSL(h, sa, l)); bn++;
    };
    for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
      const cx = i * 14, cz = j * 14;
      if (Math.abs(cx) <= 28 && Math.abs(cz) <= 28) continue;      // strefa bazy
      if (Math.abs(cx) <= 14 && cz <= -42 && cz >= -56) continue;   // miejsce na Pałac
      if (cr() < 0.2) continue;
      const w = 5.5 + cr() * 3.5, d = 5.5 + cr() * 3.5, h = 2.5 + cr() * 4;
      const x = cx + (cr() - 0.5) * 1.5, z = cz + (cr() - 0.5) * 1.5, hue = 0.05 + cr() * 0.06, li = 0.2 + cr() * 0.14;
      addBox(x, h / 2, z, w, h, d, 0, hue, 0.1, li);
      addBox(x, h * 0.55, z + d * 0.51, w * 0.7, h * 0.5, 0.15, 0, 0.0, 0.0, 0.05);   // ciemne wybite okna
      if (cr() < 0.6) addBox(x + (cr() - 0.5) * w * 0.4, h + 0.3, z + (cr() - 0.5) * d * 0.4, w * 0.5, 0.6, d * 0.5, cr() * 3, hue, 0.08, li * 0.8); // zawalony strop
      blockers.push({ x, z, hw: w / 2, hd: d / 2 });
    }
    for (let k = 0; k < 44; k++) {
      const along = cr() < 0.5, line = (Math.floor(cr() * 10) - 5) * 14 + 7, t = (cr() * 2 - 1) * 68;
      const x = along ? line + (cr() - 0.5) * 2 : t, z = along ? t : line + (cr() - 0.5) * 2;
      if (Math.abs(x) < 32 && Math.abs(z) < 32) continue;
      const ry = along ? 0 : Math.PI / 2, hue = cr() < 0.5 ? 0.04 : 0.6, sa = 0.25 + cr() * 0.25;
      addBox(x, 0.5, z, 1.8, 0.9, 3.8, ry, hue, sa, 0.18 + cr() * 0.1);
      addBox(x, 1.15, z, 1.5, 0.5, 2.0, ry, hue, sa, 0.12);
      blockers.push(along ? { x, z, hw: 0.95, hd: 1.95 } : { x, z, hw: 1.95, hd: 0.95 });
    }
    // Pałac Kultury i Nauki: schodkowa wieża ze szpilą
    const pz = -46;
    addBox(0, 5, pz, 24, 10, 24, 0, 0.08, 0.1, 0.24);
    addBox(0, 16, pz, 15, 12, 15, 0, 0.08, 0.1, 0.27);
    addBox(0, 27, pz, 9, 10, 9, 0, 0.08, 0.1, 0.3);
    addBox(0, 35, pz, 5, 6, 5, 0, 0.08, 0.1, 0.32);
    addBox(0, 43, pz, 0.8, 10, 0.8, 0, 0.1, 0.05, 0.4);
    blockers.push({ x: 0, z: pz, hw: 12, hd: 12 });
    bm.count = bn; bm.instanceMatrix.needsUpdate = true; bm.instanceColor.needsUpdate = true;
    scene.add(bm);
  }

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
    ghost.position.set(gx * CELL, 0.6, gz * CELL);
    ghost.material.color.setHex(ok ? 0x40ff80 : 0xff4050);
  }

  function reset() {
    state.pos.set(0, 0, 0); state.face = 0;
    S.maxHp = 100 + 25 * countType('crypt'); S.hp = S.maxHp;
    S.kills = 0; S.pts = 0; S.time = 0; S.fireCd = 0; S.active = 0;
    for (let i = 0; i < ENEMIES; i++) park(i);
    for (let i = 0; i < PN; i++) { pl[i] = 0; hideP(i); }
    em.instanceMatrix.needsUpdate = true; pm.instanceMatrix.needsUpdate = true;
  }
  const setMode = (m) => { S.mode = m; };

  function update(dt, t, mv, aim, firing) {
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
    torch.intensity = 30 + Math.sin(t * 13) * 3 + Math.sin(t * 7.3) * 2;
    moon.position.set(px - 10, 18, pz + 8);
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
      for (const b of blockers) if (hitsB(b, ppx[i], ppz[i])) { pl[i] = 0; break; }
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

  return { player: state, S, update, reset, setMode, place, remove, canPlace, list, load, count: countType, setGhost, enemyCount: ENEMIES };
}
