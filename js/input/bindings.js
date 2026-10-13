// Rebindable keyboard actions. Each action has two key slots (KeyboardEvent.code values). Esc is reserved for pause/back.

export const ACTIONS = [
  { id: 'moveUp', keys: ['KeyW', 'ArrowUp'], stat: 'move' },
  { id: 'moveDown', keys: ['KeyS', 'ArrowDown'], stat: 'move' },
  { id: 'moveLeft', keys: ['KeyA', 'ArrowLeft'], stat: 'move' },
  { id: 'moveRight', keys: ['KeyD', 'ArrowRight'], stat: 'move' },
  { id: 'camLeft', keys: ['KeyQ', null], stat: 'camera' },
  { id: 'camRight', keys: ['KeyE', null], stat: 'camera' },
  { id: 'interact', keys: ['KeyF', null], stat: 'interact' },
  { id: 'cameraView', keys: ['KeyC', null], stat: 'camera' },
  { id: 'editRotate', keys: ['KeyR', null], stat: null },
];
export const RESERVED = new Set(['Escape']);

export const defaultKeys = () => Object.fromEntries(ACTIONS.map((a) => [a.id, [...a.keys]]));

// Accepts only known actions and plausible key codes; a code may be used by one action only.
export function sanitizeKeys(raw) {
  const out = defaultKeys();
  if (!raw || typeof raw !== 'object') return out;
  const used = new Set();
  for (const a of ACTIONS) {
    const slots = Array.isArray(raw[a.id]) ? raw[a.id] : a.keys;
    out[a.id] = [0, 1].map((i) => {
      const c = slots[i];
      if (typeof c !== 'string' || c.length > 24 || !/^[A-Za-z0-9]+$/.test(c) || RESERVED.has(c) || used.has(c)) return null;
      used.add(c); return c;
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
