// Lighting, fog and the day/night cycle (3 min of day + 3 min of night).
import * as THREE from '../../vendor/three.module.js';

export const DAY_LEN = 180;                 // seconds of day (and of night)
const CYCLE = DAY_LEN * 2;
const T0 = 24;                               // runs start in daylight
const TRANSITION = 0.2;                      // half-width of the dusk/dawn blend (sine units, about 40 s total)

// The torch is a point light a few units above the player: right next to a wall the 1/d² falloff made a blinding orange hotspot.
// Floor the falloff at 2.5 units so the light stays soft up close (the only point light in the game).
THREE.ShaderChunk.lights_pars_begin = THREE.ShaderChunk.lights_pars_begin.replace('max( pow( lightDistance, decayExponent ), 0.01 )', 'max( pow( lightDistance, decayExponent ), 6.25 )');

export function createSky({ scene }) {
  scene.background = new THREE.Color(0x07040b);
  scene.fog = new THREE.Fog(0x07040b, 20, 46);
  const hemi = new THREE.HemisphereLight(0x6a6080, 0x2a1410, 1.3);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x7f8fff, 1.6);       // sun by day, moon by night
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  Object.assign(moon.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  moon.shadow.bias = -0.0008;
  moon.shadow.normalBias = 0.04;   // flat roofs: avoids shadow-map acne (stripes / dither on lit tops)
  scene.add(moon, moon.target);
  const torch = new THREE.PointLight(0xff8a44, 30, 16, 2);       // the player's flashlight/torch
  scene.add(torch);

  const nightU = { value: 0 };                                   // shared with the city material (lit windows)
  const k = {
    bgD: new THREE.Color(0x8d9aa4), bgN: new THREE.Color(0x07040b),
    hsD: new THREE.Color(0xc2ccd6), hsN: new THREE.Color(0x6a6080),
    hgD: new THREE.Color(0x5a4a3c), hgN: new THREE.Color(0x2a1410),
    dlD: new THREE.Color(0xfff0d0), dlN: new THREE.Color(0x7f8fff),
  };
  // 0 = day, 1 = night, smooth transitions.
  const nightAt = (time) => {
    const v = -Math.sin(2 * Math.PI * (time + T0) / CYCLE);
    const x = Math.min(1, Math.max(0, (v + TRANSITION) / (2 * TRANSITION)));
    return x * x * (3 - 2 * x);
  };
  // Name of the part of the day: dawn, morning, noon, afternoon, evening or night (the sun peaks at 1/4 of the cycle, the moon at 3/4).
  const PARTS = [[0.17, 'morning'], [0.33, 'noon'], [0.42, 'afternoon'], [0.56, 'evening'], [0.94, 'night'], [1, 'dawn']];
  const dayPart = (time) => { const p = (((time + T0) / CYCLE) % 1 + 1) % 1; return PARTS.find(([end]) => p < end)[1]; };
  function apply(n) {
    scene.background.copy(k.bgD).lerp(k.bgN, n);
    scene.fog.color.copy(scene.background);
    scene.fog.far = 74 - 34 * n; scene.fog.near = 30 - 12 * n;
    hemi.color.copy(k.hsD).lerp(k.hsN, n); hemi.groundColor.copy(k.hgD).lerp(k.hgN, n);
    hemi.intensity = 3.0 - 2.4 * n;                                   // nights are dark: the torch and the moon do the work
    moon.color.copy(k.dlD).lerp(k.dlN, n); moon.intensity = 2.8 - 2.0 * n;
    nightU.value = n;
  }
  const warm = new THREE.Color(0xff9a55);
  const ORBIT = 22;                                                     // distance of the shadow-casting light from the player (the shadow camera is tuned for it)
  // Moves the shadow-casting light along its arc: the sun by day, the moon by night. `time` is the run clock (null = a fixed late-morning sun).
  function orbit(px, pz, time, n) {
    const p = time == null ? 0.2 : (((time + T0) / CYCLE) % 1 + 1) % 1;
    const q = (p % 0.5) * 2;                                            // 0..1 across the sky: rises in the east, sets in the west
    const el = 0.3 + 0.9 * Math.sin(Math.PI * q);                       // elevation in radians: low (long shadows) at the horizon, high at noon
    const hx = -Math.cos(Math.PI * q), hz = 0.6, hl = Math.hypot(hx, hz);
    moon.position.set(px + hx / hl * Math.cos(el) * ORBIT, Math.sin(el) * ORBIT, pz + hz / hl * Math.cos(el) * ORBIT);
    moon.intensity *= 0.55 + 0.45 * Math.sin(Math.PI * q);              // dimmer near the horizon
    moon.color.lerp(warm, (1 - Math.sin(Math.PI * q)) * 0.6 * (1 - n)); // warm light at sunrise and sunset
  }
  // Moves the shadow-casting light (sun / moon) and the torch with the player.
  function follow(px, pz, t, n, torchOn, time = null) {
    torch.position.set(px, 2.6, pz);
    torch.intensity = torchOn ? (30 + Math.sin(t * 13) * 3 + Math.sin(t * 7.3) * 2) * (0.15 + 0.85 * n) : 0;
    moon.target.position.set(px, 0, pz);
    orbit(px, pz, time, n);
  }
  return { nightU, nightAt, dayPart, apply, follow };
}
