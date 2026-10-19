// Rebindable keyboard actions. Each action has two key slots (KeyboardEvent.code values). Esc is reserved for pause/back.

// `modes`: where the action works (play = a run, build = base builder, edit = map editor). The same key may serve two actions that never share a mode (R: reload in a run, rotate in the editor).
const PBE = ['play', 'build', 'edit'], P = ['play'], E = ['edit'];
export const ACTIONS = [
  { id: 'moveUp', keys: ['KeyW', 'ArrowUp'], stat: 'move', modes: PBE },
  { id: 'moveDown', keys: ['KeyS', 'ArrowDown'], stat: 'move', modes: PBE },
  { id: 'moveLeft', keys: ['KeyA', 'ArrowLeft'], stat: 'move', modes: PBE },
  { id: 'moveRight', keys: ['KeyD', 'ArrowRight'], stat: 'move', modes: PBE },
  { id: 'camLeft', keys: ['KeyQ', null], stat: 'camera', modes: PBE },
  { id: 'camRight', keys: ['KeyE', null], stat: 'camera', modes: PBE },
  { id: 'interact', keys: ['KeyF', null], stat: 'interact', modes: P },
  { id: 'cameraView', keys: ['KeyC', null], stat: 'camera', modes: P },
  { id: 'reload', keys: ['KeyR', null], stat: null, modes: P },
  { id: 'weapon', keys: ['KeyX', null], stat: null, modes: P },
  { id: 'useFood', keys: ['Digit1', null], stat: null, modes: P },
  { id: 'useBandage', keys: ['Digit2', null], stat: null, modes: P },
  { id: 'useWater', keys: ['Digit3', null], stat: null, modes: P },
  { id: 'useGrenade', keys: ['Digit4', null], stat: null, modes: P },
  { id: 'toggleTorch', keys: ['KeyL', null], stat: null, modes: P },
  { id: 'inventory', keys: ['KeyI', null], stat: null, modes: P },
  { id: 'buildRotate', keys: ['KeyR', null], stat: null, modes: ['build'] },
  { id: 'editRotate', keys: ['KeyR', null], stat: null, modes: E },
  { id: 'editTopView', keys: ['KeyT', null], stat: null, modes: E },
];
export const shareMode = (a, b) => a.modes.some((m) => b.modes.includes(m));
export const RESERVED = new Set(['Escape']);

export const defaultKeys = () => Object.fromEntries(ACTIONS.map((a) => [a.id, [...a.keys]]));

// Accepts only known actions and plausible key codes; a code may be used by one action only.
export function sanitizeKeys(raw) {
  const out = defaultKeys();
  if (!raw || typeof raw !== 'object') return out;
  const used = new Map();   // key code -> actions that already use it
  for (const a of ACTIONS) {
    const slots = Array.isArray(raw[a.id]) ? raw[a.id] : a.keys;
    out[a.id] = [0, 1].map((i) => {
      const c = slots[i];
      if (typeof c !== 'string' || c.length > 24 || !/^[A-Za-z0-9]+$/.test(c) || RESERVED.has(c) || (used.get(c) || []).some((o) => shareMode(a, o))) return null;
      used.set(c, [...(used.get(c) || []), a]); return c;
    });
  }
  return out;
}

const NAMES = { Space: 'Space', Enter: 'Enter', Tab: 'Tab', Backspace: '⌫', ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'L-Alt', AltRight: 'R-Alt', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
export function keyLabel(code) {
  if (!code) return '—';
  if (NAMES[code]) return NAMES[code];
  const m = /^(?:Key|Digit)(.)$/.exec(code);
  if (m) return m[1];
  const n = /^Numpad(.+)$/.exec(code);
  return n ? 'Num ' + n[1] : code;
}

// Short human-readable labels for HUD hints.
export const firstKey = (keys, id) => keyLabel(keys[id][0] || keys[id][1]);
export const moveLabel = (keys) => ['moveUp', 'moveLeft', 'moveDown', 'moveRight'].map((id) => firstKey(keys, id)).join('');
export const camLabel = (keys) => firstKey(keys, 'camLeft') + '/' + firstKey(keys, 'camRight');
export const BUTTON_NAMES = ['LMB', 'MMB', 'RMB'];
