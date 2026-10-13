// Palace of Culture and Science: simplified model built from the owner's SketchUp file (BezNazwy6.skp).
// Model licence: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); author per file metadata: kon.kp.
// The in-game version is a simplified derivative: boxes instead of full geometry and textures; windows and details are drawn by a shader.
// Storey outlines were derived from the model's vertices; scale 0.17 game units per metre (237 m tower = about 40 units).
// Entry: [centre x, centre z, width, depth, top y, blocks movement (1/0), facade kind, bottom y]
// Facade kinds (shader): 0 plain, 1 windows (towers), 2 windows (wings), 3 windows + arcades, 4 slim slits, 5 clock faces.
const MAIN = [
  [-0.26, 0.43, 12.41, 11.39, 4.59, 1, 2],
  [4.28, 4.24, 3.35, 3.28, 12.92, 0, 1], [4.1, -3.68, 3.37, 3.25, 12.92, 0, 1],
  [-4.73, -3.49, 3.35, 3.28, 12.92, 0, 1], [-4.56, 4.42, 3.37, 3.26, 12.92, 0, 1],
  [-0.23, 0.37, 7.74, 7.74, 22.95, 0, 3],
  [-0.23, 0.37, 3.62, 3.6, 28.39, 0, 4],
  [-0.23, 0.37, 1.99, 1.98, 30.6, 0, 5, 28.39],
  [14.62, -11.99, 5.78, 4.59, 4.59, 1, 2], [14.62, 11.22, 12.92, 4.76, 4.59, 1, 2],
  [-14.54, 11.9, 12.75, 4.76, 4.59, 1, 2], [-16.58, -11.31, 9.01, 4.59, 4.59, 1, 2],
  [-0.36, -6.24, 4.18, 3.43, 5.61, 1, 2], [9.4, -0.26, 1.84, 4.33, 5.61, 1, 2], [-10.12, 0.14, 1.84, 4.35, 5.61, 1, 2],
];
const CX = -0.23, CZ = 0.37;
const out = MAIN.map((e) => e.slice());
// pyramid clock roof and spire
[[1.6, 31.1], [1.2, 31.6], [0.85, 32.1], [0.55, 32.6]].forEach(([w, y], i, a) => out.push([CX, CZ, w, w, y, 0, 0, i ? a[i - 1][1] : 30.6]));
out.push([CX, CZ, 0.34, 0.34, 34.5, 0, 0, 32.6], [CX, CZ, 0.24, 0.24, 37.5, 0, 0, 34.5], [CX, CZ, 0.14, 0.14, 40.29, 0, 0, 37.5]);
// cornices under the roof edges
for (const [x, z, w, d, y1, , k, y0] of MAIN) {
  if (k === 5 || (y0 || 0) > 0 && k !== 5) continue;
  const t = k === 3 ? 0.4 : 0.3;
  out.push([x, z, w + t * 1.2, d + t * 1.2, y1, 0, 0, y1 - t]);
}
out.push([CX, CZ, 2.3, 2.3, 30.6, 0, 0, 30.3]);
// pinnacles on the main storey and battlements on the towers
const ring = (x, z, w, d, y, s, h, n) => {
  for (let i = 0; i <= n; i++) {
    const u = (i / n - 0.5);
    out.push([x + u * w, z - d / 2, s, s, y + h, 0, 0, y], [x + u * w, z + d / 2, s, s, y + h, 0, 0, y]);
    if (i > 0 && i < n) out.push([x - w / 2, z + u * d, s, s, y + h, 0, 0, y], [x + w / 2, z + u * d, s, s, y + h, 0, 0, y]);
  }
};
ring(CX, CZ, 7.6, 7.6, 22.95, 0.16, 0.7, 7);
for (const [x, z, w, d] of MAIN.slice(1, 5)) ring(x, z, w - 0.2, d - 0.2, 12.92, 0.32, 0.4, 2);
ring(CX, CZ, 3.5, 3.5, 28.39, 0.14, 0.45, 3);
export const PALACE = out;
export const PALACE_HW = 21.4, PALACE_HD = 14.6, PALACE_H = 40.3;
