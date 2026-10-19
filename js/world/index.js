// World facade: composes terrain, sky, city, vehicles, enemies, projectiles and structures
// behind one small API used by the game modes.
import { mulberry32, clamp, wrapAngle } from '../core/util.js';
import { START, EDGE, ENEMIES, COST } from './constants.js';
import * as THREE from '../../vendor/three.module.js';
import { createCollision } from './collision.js';
import { createTerrain } from './terrain.js';
import { createSky, DAY_LEN } from './sky.js';
import { createPlayer } from './player.js';
import { createVehicles } from './vehicles.js';
import { createCity } from './city.js';
import { createEnemies } from './enemies.js';
import { createProjectiles } from './projectiles.js';
import { createStructures } from './structures.js';

export { COST, DAY_LEN };

// Modes: 'menu' (showcase: character + cars, nothing moves), 'play', 'idle' (build/edit, player hidden), 'dead' (frozen).
export function createWorld(scene) {
  const rnd = mulberry32(1337);
  const dummy = new THREE.Object3D();
  const S = { hp: 100, maxHp: 100, kills: 0, pts: 0, time: 0, mode: 'idle', fireCd: 0, active: 0, night: 0, driving: false, speed: 0, carNear: false };

  const col = createCollision();
  const sky = createSky({ scene });
  const terrain = createTerrain({ scene, rnd, dummy });
  const player = createPlayer({ scene });
  const vehicles = createVehicles({ scene, dummy, col, S, player });
  const city = createCity({ scene, dummy, col, vehicles, nightU: sky.nightU });
  const enemies = createEnemies({ scene, rnd, dummy, col, S, around: player.state.pos, vehicles });
  const bullets = createProjectiles({ scene, dummy, col, S, enemies });
  const base = createStructures({ scene, col });
  base.setBlockTest((x, z) => city.map.blocksSquare(x, z, 1));
  city.map.extra = (b) => base.overlapsBox(b);
  city.setStartCar(() => ({ ...base.carSpot(base.spawn()), th: 0 }));

  let saved = null;   // player position stashed while the editor size preview borrows the player model
  function reset(mode) {
    saved = null;
    vehicles.exit();
    S.mode = mode;
    const live = mode === 'play' || mode === 'menu';
    city.setLive(live); city.rebuild();                         // cars back to their parking spots
    const sp = base.spawn();
    player.state.pos.set(live ? sp.x : 0, 0, live ? sp.z : 0);
    player.state.face = 0; player.setVisible(live); player.animate(false, 0);
    S.maxHp = 100 + 25 * base.count('crypt'); S.hp = S.maxHp;
    S.kills = 0; S.pts = 0; S.time = 0; S.night = 0; S.fireCd = 0; S.active = 0; S.driving = false; S.speed = 0; S.carNear = false;
    enemies.reset(); bullets.reset();
  }

  // inp: { mv: {x,z} walking vector, aim: {x,z}|null world point under the cursor, firing, drv: {thr, steer} }
  function update(dt, t, inp) {
    S.night = (S.mode === 'play' || S.mode === 'dead') ? sky.nightAt(S.time) : 0;
    sky.apply(S.night);
    const p = player.state.pos;
    if (S.mode === 'menu') { player.animate(false, t); sky.follow(p.x, p.z, t, 0, false); terrain.follow(p.x, p.z); return; }
    if (S.mode !== 'play') { sky.follow(p.x, p.z, t, S.night, false); terrain.follow(p.x, p.z); return; }
    S.time += dt;
    const { mv, aim, firing, drv } = inp;

    if (vehicles.driving) {
      vehicles.step(dt, drv.thr, drv.steer);
      S.carNear = false;
    } else {
      const nx = { v: p.x + mv.x * player.state.speed * dt }, nz = { v: p.z + mv.z * player.state.speed * dt };
      col.push(nx, nz, 0.45);
      p.x = clamp(nx.v, -EDGE, EDGE); p.z = clamp(nz.v, -EDGE, EDGE);
      const moving = mv.x !== 0 || mv.z !== 0;
      let want = moving ? Math.atan2(mv.x, mv.z) : player.state.face;
      if (firing && aim) want = Math.atan2(aim.x - p.x, aim.z - p.z);
      player.state.face += wrapAngle(want - player.state.face) * Math.min(1, dt * 14);
      player.animate(moving, t);
      S.carNear = !!vehicles.nearest(3.4);
    }

    // shooting (on foot only)
    S.fireCd -= dt;
    if (!vehicles.driving && firing && aim && S.fireCd <= 0) {
      const a = Math.atan2(aim.x - p.x, aim.z - p.z) + (rnd() - 0.5) * 0.08;
      const dx = Math.sin(a), dz = Math.cos(a);
      bullets.shoot(p.x + dx * 0.7, p.z + dz * 0.7, dx, dz);
      S.fireCd = 0.16;
    }

    sky.follow(p.x, p.z, t, S.night, true);
    terrain.follow(p.x, p.z);

    const { touching, car } = enemies.update(dt, t);
    S.hp -= touching * 8 * dt * (car ? 0.5 : 1);
    if (S.hp <= 0) { S.hp = 0; S.mode = 'dead'; }
    base.updateTowers(dt, enemies, S, bullets.shoot);
    bullets.update(dt);
  }

  const driveState = () => {
    const v = vehicles.driving;
    return v ? { x: v.x, z: v.z, th: v.th, vel: v.vel, steer: v.steer } : null;
  };

  return {
    player: player.state, S, fade: city.fade, map: city.map, setCityOpacity: city.setOpacity, enemyCount: ENEMIES,
    nightAt: sky.nightAt, DAY_LEN,
    reset, update, driveState,
    // Editor size multipliers for people (player), vehicles and enemies.
    setScales: ({ p, v, e }) => { player.setScale(p); vehicles.setScale(v); enemies.setScale(e); },
    // Editor preview: shows the player and a zombie at (x, z) so sizes can be compared with buildings.
    setPreview: (on, x, z) => {
      enemies.preview(on, x + 1.6, z);
      if (on) { if (!saved) saved = player.state.pos.clone(); player.state.pos.set(x, 0, z); player.setVisible(true); player.animate(false, 0); }
      else if (saved) {   // restore exactly what the current mode expects (the player is only visible in live modes)
        player.state.pos.copy(saved); saved = null;
        player.setVisible(S.mode === 'play' || S.mode === 'menu');
      }
    },
    setMode: (m) => { S.mode = m; },
    toggleCar: vehicles.toggle,
    spawn: base.spawn, hq: base.hq,
    place: base.place, remove: base.remove, canPlace: base.canPlace, list: base.list, load: base.load, count: base.count,
    setGhost: base.setGhost, setGhostBox: base.setGhostBox,
  };
}
