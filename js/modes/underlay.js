// Map-editor underlay: a reference image (e.g. a map screenshot) shown flat on the ground, centred on the
// Palace spire by default. The image is read locally from a file (nothing is uploaded or fetched) and downscaled.
import * as THREE from '../../vendor/three.module.js';
import { SPIRE } from '../world/constants.js';

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_SIDE = 2048;

export function createUnderlay({ scene }) {
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false, fog: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;                 // image "up" = north = -z
  const grp = new THREE.Group();
  grp.add(mesh);
  grp.position.set(SPIRE.x, 0.05, SPIRE.z);
  grp.visible = false;
  scene.add(grp);

  let aspect = 1, width = 160, has = false, shown = false;
  const apply = () => { mesh.scale.set(width, width / aspect, 1); grp.visible = has && shown; };

  return {
    get has() { return has; },
    get width() { return width; },
    setVisible(v) { shown = v; apply(); },
    setWidth(w) { width = w; apply(); },       // world units across the image
    setOpacity(o) { mat.opacity = o; },
    setRotation(deg) { grp.rotation.y = deg * Math.PI / 180; },
    center() { grp.position.set(SPIRE.x, 0.05, SPIRE.z); },
    clear() { has = false; if (mat.map) { mat.map.dispose(); mat.map = null; mat.needsUpdate = true; } apply(); },
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
            if (mat.map) mat.map.dispose();
            const tex = new THREE.CanvasTexture(cv);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 4;
            mat.map = tex; mat.needsUpdate = true;
            aspect = cv.width / cv.height; has = true; apply();
            resolve(true);
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      });
    },
  };
}
