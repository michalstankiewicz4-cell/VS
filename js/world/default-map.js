// The default city layout: the owner's tuned map (data in data/default-layout.js).
import { DEFAULT_LAYOUT } from './data/default-layout.js';

export function defaultMap() {
  return DEFAULT_LAYOUT.map(o => ({ ...o }));
}
