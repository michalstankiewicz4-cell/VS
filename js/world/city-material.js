// City material: instanced boxes with a procedural Palace facade shader (windows, arcades, clock faces),
// lit windows at night and dithered see-through fading of buildings that hide the player (isometric view only).
import * as THREE from '../../vendor/three.module.js';

export function createCityMaterial({ nightU }) {
  const fade = {
    player: new THREE.Vector3(), fwd: new THREE.Vector3(0, -0.8, -0.6), on: { value: 0 },
    setOn(v) { this.on.value = v; },
  };
  const bmat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  // Buildings between the camera and the player turn into a dithered checkerboard (same dither as the pixel filter).
  bmat.onBeforeCompile = (sh) => {
    sh.uniforms.uPlayer = { value: fade.player };
    sh.uniforms.uFwd = { value: fade.fwd };
    sh.uniforms.uOn = fade.on;
    sh.uniforms.uR = { value: 2.8 };
    sh.uniforms.uNight = nightU;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP, vC, vS, vN;\nvarying vec2 vK;\nattribute vec2 aK;')
      .replace('#include <project_vertex>', `#include <project_vertex>
      mat4 mI = modelMatrix * instanceMatrix;
      vWP = (mI * vec4(transformed, 1.0)).xyz;
      vK = aK; vN = normal;
      vC = (mI * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      vS = vec3(length(mI[0].xyz), length(mI[1].xyz), length(mI[2].xyz));`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP, vC, vS, vN;\nvarying vec2 vK;\nuniform vec3 uPlayer, uFwd;\nuniform float uOn, uR, uNight;\nfloat hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }')
      .replace('#include <color_fragment>', `#include <color_fragment>
      float gW = 0.0;
      if (vK.x > 0.5 && abs(vN.y) < 0.5) {   // Palace facade: windows, arcades, clock drawn in the shader
        float kd = vK.x, top = vK.y, y = vWP.y;
        bool xf = abs(vN.x) > 0.5;
        float W = xf ? vS.z : vS.x;
        float a = (xf ? vWP.z - vC.z : vWP.x - vC.x) + 0.5 * W;
        float fid = dot(sign(vN), vec3(1.0, 2.0, 3.0)) + vC.x * 0.37 + vC.z * 0.91;
        float cw = 0.8, ch = 1.15, ww = 0.42, y0 = 1.3, y1 = top - 1.6;
        if (kd > 1.5 && kd < 2.5) { cw = 0.9; ch = 0.95; ww = 0.5; y0 = 0.9; y1 = top - 0.7; }
        if (kd > 2.5 && kd < 3.5) { cw = 0.8; ch = 1.15; ww = 0.4; y0 = 1.3; y1 = top - 5.0; }
        if (kd > 3.5 && kd < 4.5) { cw = 0.5; ch = 1.0; ww = 0.2; y0 = 23.4; y1 = top - 0.8; }
        float cols = max(1.0, floor(W / cw)), cell = W / cols;
        float u = fract(a / cell), id = floor(a / cell);
        bool win = false;
        if (kd < 4.5) {
          float v = fract(y / ch);
          if (y > y0 && y < y1 && abs(u - 0.5) < 0.5 * ww / cell && v > 0.2 && v < 0.78) { win = true; gW = step(hsh(vec2(id + fid, floor(y / ch))), 0.16); }
          if (kd > 2.5 && kd < 3.5) {   // arcade band under the cornice
            float t = (y - (top - 4.4)) / 3.1;
            float px = (u - 0.5) * cell, py = (t - 0.62) * 3.1;
            bool ar = t > 0.04 && t < 1.0 && (t < 0.62 ? abs(px) < 0.26 : px * px + py * py < 0.26 * 0.26) && abs(px) < 0.26;
            if (ar) { win = true; gW = step(hsh(vec2(id + fid, 77.0)), 0.2); }
          }
        } else if (kd < 5.5 && kd > 3.5 && y > y0 && y < y1 && abs(u - 0.5) < 0.5 * ww / cell) { win = true; gW = step(hsh(vec2(id + fid, 5.0)), 0.25); }
        if (kd > 4.5) {   // clock faces
          float dd = length(vec2(a - 0.5 * W, y - vC.y));
          if (dd < 0.46) { diffuseColor.rgb = dd > 0.37 ? diffuseColor.rgb * 0.25 : vec3(0.78, 0.74, 0.62); }
        }
        if (win) diffuseColor.rgb *= 0.1;
        else gW = 0.0;
      }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.62, 0.28) * gW * uNight * 1.8;')
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
  return { material: bmat, fade };
}
