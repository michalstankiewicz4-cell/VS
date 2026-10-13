// localStorage wrappers (all failures are swallowed: private mode, blocked storage, quota...).
// Save and map keys keep their original names so existing progress survives updates.
export const KEYS = { save: 'gra:save:v1', map: 'gra:map:v1', settings: 'cq:settings:v1' };

export function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
}
export function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}
