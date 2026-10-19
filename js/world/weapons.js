// The player's weapons: a rifle with a magazine, reserve ammo and a reload, and a katana for melee.
const MAG = 30, RESERVE0 = 90, RELOAD = 1.4;                 // rounds per magazine, spare rounds at the start of a run, seconds to reload
const RIFLE_CD = 0.16, KATANA_CD = 0.45, KATANA_DMG = 3, KATANA_REACH = 4.2, KATANA_COS = Math.cos(1.3);   // reach is in units at scale 1; the swing covers +-75 degrees

export function createWeapons({ S, player, bullets, enemies, rnd }) {
  const reset = () => { S.weapon = 'rifle'; S.mag = MAG; S.reserve = RESERVE0; S.reload = 0; player.setWeapon('rifle'); };
  function reload() {
    if (S.mode !== 'play' || S.weapon !== 'rifle' || S.reload > 0 || S.mag >= MAG || S.reserve <= 0) return false;
    S.reload = RELOAD; return true;
  }
  function select(w) {
    if (S.mode !== 'play' || (w !== 'rifle' && w !== 'katana') || S.weapon === w) return;
    S.weapon = w; S.reload = 0; player.setWeapon(w);
  }
  const toggle = () => select(S.weapon === 'rifle' ? 'katana' : 'rifle');
  // Called every frame of a run on foot: finishes a reload and fires / swings while the fire button is held.
  function step(dt, p, aim, firing) {
    S.fireCd -= dt;
    if (S.reload > 0) {
      S.reload -= dt;
      if (S.reload <= 0) { S.reload = 0; const n = Math.min(MAG - S.mag, S.reserve); S.mag += n; S.reserve -= n; }
    }
    if (!firing || !aim || S.fireCd > 0) return;
    const sc = player.state.scale;
    if (S.weapon === 'katana') {
      const a = Math.atan2(aim.x - p.x, aim.z - p.z), dx = Math.sin(a), dz = Math.cos(a);
      enemies.slash(p.x, p.z, dx, dz, KATANA_REACH * sc, KATANA_COS, KATANA_DMG);
      player.swing(); S.fireCd = KATANA_CD;
    } else if (S.reload <= 0) {
      if (S.mag <= 0) { reload(); return; }   // empty: start reloading by itself
      const a = Math.atan2(aim.x - p.x, aim.z - p.z) + (rnd() - 0.5) * 0.08;
      const dx = Math.sin(a), dz = Math.cos(a);
      bullets.shoot(p.x + dx * 0.7 * sc, p.z + dz * 0.7 * sc, dx, dz);
      S.mag--; S.fireCd = RIFLE_CD;
    }
  }
  return { reset, reload, select, toggle, step };
}
