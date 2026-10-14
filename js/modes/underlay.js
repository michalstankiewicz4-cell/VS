// Map-editor underlay: a reference image shown flat on the ground, centred on the Palace spire. Sources: a local file
// (read in the browser, downscaled) or, only on an explicit click, online map tiles (OpenStreetMap / Esri satellite).
import * as THREE from '../../vendor/three.module.js';
import { SPIRE, GEO } from '../world/constants.js';

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 2048;

const PROVIDERS = {
  osm: { url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png` },
  esri: { url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}` },
};

export function createUnderlay({ scene }) {
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false, fog: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;                 // image "up" = north = -z
  const grp = new THREE.Group();
  grp.add(mesh);
  grp.position.set(SPIRE.x, 0.05, SPIRE.z);
  grp.visible = false;
  scene.add(grp);

  let aspect = 1, width = 160, has = false, shown = false, source = '';
  let anchor = { u: 0.5, v: 0.5 };          // which point of the image sits exactly on the spire (fractions from top-left)
  const apply = () => {
    const hgt = width / aspect;
    mesh.scale.set(width, hgt, 1);
    mesh.position.set(-(anchor.u - 0.5) * width, 0, -(anchor.v - 0.5) * hgt);   // keeps the anchor on the group origin
    grp.visible = has && shown;
  };
  const setImage = (cv, src, a, w) => {
    if (mat.map) mat.map.dispose();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    mat.map = tex; mat.needsUpdate = true;
    aspect = cv.width / cv.height; anchor = a; source = src; has = true;
    if (w) width = w;
    apply();
  };

  return {
    get has() { return has; },
    get width() { return width; },
    get source() { return source; },
    setVisible(v) { shown = v; apply(); },
    setWidth(w) { width = w; apply(); },       // world units across the image
    setOpacity(o) { mat.opacity = o; },
    setRotation(deg) { grp.rotation.y = deg * Math.PI / 180; },
    center() { grp.position.set(SPIRE.x, 0.05, SPIRE.z); },
    clear() { has = false; source = ''; if (mat.map) { mat.map.dispose(); mat.map = null; mat.needsUpdate = true; } apply(); },
    // Online map tiles (OpenStreetMap or Esri satellite) around the spire at true scale. Only called on an explicit click.
    // Resolves to the image width in world units; rejects with 'net' when no tile could be loaded.
    loadTiles(provider, onProgress) {
      const P = PROVIDERS[provider];
      if (!P) return Promise.reject(new Error('bad'));
      const z = 17, n = 7, S = 256, scale = 2 ** z;
      const lat = GEO.lat * Math.PI / 180;
      const fx = (GEO.lon + 180) / 360 * scale;
      const fy = (1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2 * scale;
      const x0 = Math.floor(fx) - (n >> 1), y0 = Math.floor(fy) - (n >> 1);
      const cv = document.createElement('canvas'); cv.width = cv.height = n * S;
      const g = cv.getContext('2d'); g.fillStyle = '#20242a'; g.fillRect(0, 0, cv.width, cv.height);
      let ok = 0, done = 0;
      const jobs = [];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        jobs.push(new Promise((res) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';          // required to draw the tile into a WebGL texture
          img.onload = () => { g.drawImage(img, i * S, j * S, S, S); ok++; res(); };
          img.onerror = () => res();
          img.src = P.url(z, x0 + i, y0 + j);
        }).then(() => { done++; if (onProgress) onProgress(done, n * n); }));
      }
      const mpp = 156543.03392 * Math.cos(lat) / scale;       // metres per pixel at this latitude
      return Promise.all(jobs).then(() => {
        if (!ok) throw new Error('net');
        const w = cv.width * mpp * GEO.unitsPerMeter;
        setImage(cv, provider, { u: (fx - x0) / n, v: (fy - y0) / n }, w);
        return w;
      });
    },
    // Resolves to true on success; rejects with 'big' or 'bad'.
    load(file) {
      return new Promise((resolve, reject) => {
        if (!file || !/^image\//.test(file.type)) return reject(new Error('bad'));
        if (file.size > MAX_BYTES) return reject(new Error('big'));
        const fr = new FileReader();
        fr.onerror = () => reject(new Error('bad'));
        fr.onload = () => {
          const img = new Image();             // data: URL (allowed by the CSP, unlike blob:)
          img.onerror = () => reject(new Error('bad'));
          img.onload = () => {
            const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
            const cv = document.createElement('canvas');
            cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
            setImage(cv, 'file', { u: 0.5, v: 0.5 });
            resolve(true);
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      });
    },
  };
}
