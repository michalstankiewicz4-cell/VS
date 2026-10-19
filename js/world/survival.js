// Needs and consumables: hunger and thirst fall over time (at 0 they hurt), the backpack holds food, water and bandages.
export const ITEMS = {
  food: { gain: 35, need: 'hunger' },        // restores hunger
  water: { gain: 35, need: 'thirst' },       // restores thirst
  bandage: { gain: 30, need: 'hp' },         // restores health
};
const START = { food: 3, water: 3, bandage: 2 };
const DRAIN = { hunger: 100 / 480, thirst: 100 / 360 };   // per second: empty after 8 / 6 minutes
const STARVE = 1.5;                                         // hp per second per empty need

export function createSurvival(S) {
  const reset = () => { S.hunger = 100; S.thirst = 100; S.items = { ...START }; };
  function update(dt) {
    S.hunger = Math.max(0, S.hunger - DRAIN.hunger * dt);
    S.thirst = Math.max(0, S.thirst - DRAIN.thirst * dt);
    S.hp -= ((S.hunger <= 0) + (S.thirst <= 0)) * STARVE * dt;
  }
  // Uses one item; false when there is none or the matching need is already full.
  function use(kind) {
    const it = ITEMS[kind];
    if (!it || S.mode !== 'play' || !(S.items[kind] > 0)) return false;
    const key = it.need, max = key === 'hp' ? S.maxHp : 100;
    if (S[key] >= max) return false;
    S.items[kind]--; S[key] = Math.min(max, S[key] + it.gain);
    return true;
  }
  return { reset, update, use };
}
