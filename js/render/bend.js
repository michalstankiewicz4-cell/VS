// "Inception" fold: every world vertex ahead of the player (along the camera's horizontal direction) is bent
// along a circular arc that rises into the sky and curls over. Purely visual; physics and aiming stay flat.
// Implemented as a vertex-shader patch applied to every material in the scene (chained after existing patches).
import * as THREE from '../../vendor/three.module.js';

const DECL = `
uniform float uBK; uniform vec3 uBP; uniform vec2 uBF;
vec3 bendWorld(vec3 w){
  if (uBK < 1e-4) return w;
  vec2 d = w.xz - uBP.xz;
  float s = dot(d, uBF);
  if (s <= 0.0) return w;
  vec2 lat = d - uBF * s;
  float amax = 2.9;
  float af = min(uBK * s, amax);
  float c = cos(af), sn = sin(af);
  float rest = max(0.0, s - amax / uBK);
  float ahead = sn / uBK + rest * c - sn * w.y;
  float up = (1.0 - c) / uBK + rest * sn + c * w.y;
  vec2 xz = uBP.xz + lat + uBF * ahead;
  return vec3(xz.x, up, xz.y);
}`;
// Replaces the standard project_vertex chunk: world position is bent before the view transform.
const PROJECT = `
vec4 mvPosition = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 bwp = modelMatrix * mvPosition;
bwp.xyz = bendWorld(bwp.xyz);
mvPosition = viewMatrix * bwp;
gl_Position = projectionMatrix * mvPosition;`;

export function createBend() {
  const u = { uBK: { value: 0 }, uBP: { value: new THREE.Vector3() }, uBF: { value: new THREE.Vector2(0, -1) } };
  const state = { target: 0, amount: 0 };
  const RADIUS = 9;            // arc radius at full fold (world units)

  function patch(mat) {
    if (mat.userData.bend) return;
    mat.userData.bend = true;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev.call(mat, sh, r);
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n' + DECL)
        .replace('#include <project_vertex>', PROJECT);
    };
    mat.customProgramCacheKey = () => 'bend' + (prev ? prev.toString().length : 0);
    mat.needsUpdate = true;
  }
  // Patches new materials and disables frustum culling (culling would use the un-bent bounds).
  function patchScene(scene) {
    scene.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      if (Array.isArray(o.material)) o.material.forEach(patch); else patch(o.material);
    });
  }
  // dir: horizontal camera forward (x, z); player: world position the fold is anchored to.
  function update(dt, player, dir) {
    state.amount += (state.target - state.amount) * Math.min(1, dt * 2.2);
    if (Math.abs(state.target - state.amount) < 0.002) state.amount = state.target;
    const e = state.amount, k = e * e * (3 - 2 * e);          // eased
    u.uBK.value = k / RADIUS;
    u.uBP.value.copy(player);
    const l = Math.hypot(dir.x, dir.z) || 1;
    u.uBF.value.set(dir.x / l, dir.z / l);
  }
  return {
    patchScene, update, state,
    toggle() { state.target = state.target > 0.5 ? 0 : 1; },
    off() { state.target = 0; state.amount = 0; u.uBK.value = 0; },
    get active() { return state.amount > 0.01; },
  };
}
