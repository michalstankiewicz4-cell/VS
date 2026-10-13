// Static obstacles: axis-aligned boxes ({x,z,hw,hd}) and circles ({x,z,r}).
// `blockers` = base structures, `cityBlk` = city objects and parked cars.

export function createCollision() {
  const blockers = [];
  const cityBlk = [];
  const lists = [blockers, cityBlk];

  // Pushes the point (x.v, z.v) out of every obstacle so a circle of radius `rad` does not overlap it.
  function push(x, z, rad) {
    for (const L of lists) for (const b of L) {
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
  }
  const hits = (b, x, z) => b.hw !== undefined
    ? Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd
    : Math.hypot(x - b.x, z - b.z) < b.r;
  const hitsAny = (x, z) => { for (const L of lists) for (const b of L) if (hits(b, x, z)) return true; return false; };

  return { blockers, cityBlk, push, hits, hitsAny };
}
