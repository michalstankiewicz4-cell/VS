// The default city layout (deterministic): a loose grid of ruined blocks, skyscrapers in the outer ring,
// parked cars along the streets and the Palace of Culture.
import { mulberry32 } from '../core/util.js';
import { PALACE_POS } from './constants.js';

export function defaultMap() {
  const cr = mulberry32(2026), out = [];
  for (let i = -7; i <= 7; i++) for (let j = -7; j <= 7; j++) {
    const cx = i * 14, cz = j * 14;
    if (Math.abs(cx) <= 28 && Math.abs(cz) <= 28) continue;      // base zone
    if (Math.abs(cx) <= 28 && cz <= -42 && cz >= -56) continue;   // room for the Palace
    if (cr() < 0.2) continue;
    const outer = Math.max(Math.abs(cx), Math.abs(cz)) >= 42;
    if (outer && cr() < 0.2) {                                      // skyscraper
      out.push({ t: 'b', x: cx + (cr() - 0.5), z: cz + (cr() - 0.5), w: 6.5 + cr() * 2.5, d: 6.5 + cr() * 2.5, h: 14 + cr() * 16, s: cr() });
      continue;
    }
    const w = 5.5 + cr() * 3.5, d = 5.5 + cr() * 3.5, h = 2.5 + cr() * 4;
    out.push({ t: 'b', x: cx + (cr() - 0.5) * 1.5, z: cz + (cr() - 0.5) * 1.5, w, d, h, s: cr() });
  }
  for (let k = 0; k < 64; k++) {
    const along = cr() < 0.5, line = (Math.floor(cr() * 14) - 7) * 14 + 7, t = (cr() * 2 - 1) * 100;
    const x = along ? line + (cr() - 0.5) * 2 : t, z = along ? t : line + (cr() - 0.5) * 2;
    if (Math.abs(x) < 32 && Math.abs(z) < 32) continue;
    out.push({ t: 'c', x, z, r: along ? 0 : 1, s: cr() });
  }
  out.push({ t: 'p', x: PALACE_POS.x, z: PALACE_POS.z, s: 0.5 });
  return out;
}
