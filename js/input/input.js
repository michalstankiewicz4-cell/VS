// Keyboard/mouse input plus local-only action statistics.
// Privacy rules:
//  - we count GAME ACTIONS (move, interact, camera, click), never key codes or characters,
//  - keys that are not bound to an action are ignored completely,
//  - mouse position is kept in memory only (for aiming), never in statistics,
//  - events from form fields are ignored,
//  - only rounded aggregates from features() are ever meant to reach a (future) AI module.
import { ACTIONS } from './bindings.js';

const WINDOW_S = 60;
const typing = (t) => !!(t && t.closest && t.closest('input,textarea,select,[contenteditable]'));
const round = (x, step) => +(Math.round(x / step) * step).toFixed(2);
const STAT = Object.fromEntries(ACTIONS.map((a) => [a.id, a.stat]));

export class Input {
  constructor(canvas, settings) {
    this.settings = settings;
    this.held = new Set();             // currently held key codes
    this.enabled = settings.data.privacy.stats;   // are statistics collected?
    this.suspended = false;            // true while a key is being rebound
    this.acts = null;                  // Set of the action ids that work right now (set by the app per mode); null = none, e.g. in menus
    this.buckets = [];
    this.cur = { a: 0, c: 0, m: 0 };
    this.acc = 0;
    this.counts = { move: 0, interact: 0, camera: 0, click: 0 };
    this.firing = false;
    this.dragging = false;
    this.mouse = { x: 0, y: 0 };       // normalised, in memory only
    this.onPress = null; this.onDrag = null; this.onWheel = null;
    this.#rebuild();
    settings.onChange(() => { this.enabled = settings.data.privacy.stats; this.#rebuild(); });

    addEventListener('keydown', (e) => this.#key(e, true));
    addEventListener('keyup', (e) => this.#key(e, false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', (e) => {
      const m = this.settings.data.mouse;
      if (e.button === 1) e.preventDefault();
      if (e.button === m.fireButton) {
        this.firing = true;
        if (this.enabled) { this.counts.click++; this.cur.c++; this.cur.a++; }
      }
      if (e.button === m.dragButton) this.dragging = true;
    });
    addEventListener('mouseup', (e) => {
      const m = this.settings.data.mouse;
      if (e.button === m.fireButton) this.firing = false;
      if (e.button === m.dragButton) this.dragging = false;
    });
    addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX / innerWidth * 2 - 1;
      this.mouse.y = -(e.clientY / innerHeight * 2 - 1);
      if (this.dragging && this.onDrag) this.onDrag(e.movementX, e.movementY);
    });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (this.onWheel) this.onWheel(e.deltaY); }, { passive: false });
    addEventListener('blur', () => this.clear());
  }

  #rebuild() {
    this.codeMap = new Map();
    for (const a of ACTIONS) for (const c of this.settings.data.keys[a.id]) if (c) this.codeMap.set(c, a.id);
  }

  #key(e, down) {
    if (this.suspended || !this.acts || typing(e.target)) return;
    // Browser shortcuts (Ctrl+R, Ctrl+Shift+R, Ctrl+W, Alt+…) must keep working: the game does not swallow a key pressed with a modifier.
    if (down && (e.ctrlKey || e.metaKey || e.altKey) && !/^(Control|Alt|Meta|Shift)/.test(e.code)) return;
    const act = this.codeMap.get(e.code);
    if (!act || !this.acts.has(act)) return;   // a key whose action means nothing in this mode is left alone
    e.preventDefault();
    if (down) this.held.add(e.code); else this.held.delete(e.code);
    if (!down || e.repeat) return;
    const stat = STAT[act];
    if (stat && this.enabled) { this.counts[stat]++; this.cur.a++; }
    if (this.onPress) this.onPress(act);
  }

  isDown(action) {
    for (const c of this.settings.data.keys[action]) if (c && this.held.has(c)) return true;
    return false;
  }
  clear() { this.held.clear(); this.firing = false; this.dragging = false; }

  // vehicle controls: throttle/brake and steering, each in [-1, 1]
  axes() {
    const d = (a) => (this.isDown(a) ? 1 : 0);
    return { thr: d('moveUp') - d('moveDown'), steer: d('moveRight') - d('moveLeft') };
  }
  moveVector() {
    const d = (a) => (this.isDown(a) ? 1 : 0);
    const x = d('moveRight') - d('moveLeft'), z = d('moveDown') - d('moveUp');
    const l = Math.hypot(x, z);
    return l ? { x: x / l, z: z / l } : { x: 0, z: 0 };
  }

  tick(dt, moving) {
    if (!this.enabled) return;
    if (moving) this.cur.m += dt;
    this.acc += dt;
    while (this.acc >= 1) {
      this.buckets.push({ a: this.cur.a, c: this.cur.c, m: Math.min(1, this.cur.m) });
      if (this.buckets.length > WINDOW_S) this.buckets.shift();
      this.cur = { a: 0, c: 0, m: 0 };
      this.acc -= 1;
    }
  }

  // The only object meant for a model: coarse, rounded features of the last ~60 s.
  features() {
    const n = this.buckets.length;
    if (n < 5) return { warmup: true };
    let a = 0, c = 0, m = 0, idle = 0;
    for (const b of this.buckets) { a += b.a; c += b.c; m += b.m; if (!b.a && !b.m) idle++; }
    return {
      window_s: n,
      actions_per_min: round(a * 60 / n, 5),
      clicks_per_min: round(c * 60 / n, 2),
      moving_share: round(m / n, 0.1),
      idle_share: round(idle / n, 0.1),
    };
  }

  resetStats() {
    this.buckets = []; this.cur = { a: 0, c: 0, m: 0 }; this.acc = 0;
    for (const k in this.counts) this.counts[k] = 0;
  }
}
