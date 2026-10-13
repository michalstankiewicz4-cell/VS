// Wejście + statystyki. Zasady prywatności:
//  - zliczamy AKCJE GRY (ruch, atak...), nigdy kody klawiszy ani znaki,
//  - klawisze spoza mapy ACTIONS są ignorowane w całości,
//  - nie zapisujemy pozycji myszy,
//  - zdarzenia z pól formularzy (input/textarea/select) są pomijane,
//  - do przyszłego modułu AI trafiają wyłącznie zaokrąglone cechy z features().

const MOVE = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0]
};
const ACTIONS = {
  KeyW: 'move', KeyA: 'move', KeyS: 'move', KeyD: 'move',
  ArrowUp: 'move', ArrowDown: 'move', ArrowLeft: 'move', ArrowRight: 'move',
  Space: 'dash', KeyE: 'interact', KeyB: 'build'
};
const WINDOW_S = 60;

const typing = (t) => !!(t && t.closest && t.closest('input,textarea,select,[contenteditable],#hud,#ui,#build,#ed,#top'));
const round = (x, step) => +(Math.round(x / step) * step).toFixed(2);

export class Input {
  constructor() {
    this.held = new Set();
    this.enabled = true;
    this.buckets = [];
    this.cur = { a: 0, c: 0, m: 0 };
    this.acc = 0;
    this.counts = { move: 0, dash: 0, interact: 0, build: 0, click: 0 };
    this.firing = false;                 // tylko do celowania/strzelania w grze
    this.mouse = { x: 0, y: 0 };         // pozycja tylko w pamięci, nigdy w statystykach

    addEventListener('keydown', (e) => this.#key(e, true));
    addEventListener('keyup', (e) => this.#key(e, false));
    addEventListener('mousedown', (e) => {
      if (typing(e.target)) return;
      if (e.button === 0) this.firing = true;
      if (!this.enabled) return;
      this.counts.click++; this.cur.c++; this.cur.a++;
    });
    addEventListener('mouseup', () => { this.firing = false; });
    addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX / innerWidth * 2 - 1;
      this.mouse.y = -(e.clientY / innerHeight * 2 - 1);
    });
    addEventListener('blur', () => { this.held.clear(); this.firing = false; });
  }

  #key(e, down) {
    if (typing(e.target)) return;
    const act = ACTIONS[e.code];
    if (!act) return;
    if (MOVE[e.code]) { down ? this.held.add(e.code) : this.held.delete(e.code); }
    if (down && !e.repeat && this.enabled) { this.counts[act]++; this.cur.a++; }
  }

  moveVector() {
    let x = 0, z = 0;
    for (const k of this.held) { x += MOVE[k][0]; z += MOVE[k][1]; }
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

  // Jedyny obiekt przeznaczony do wysłania modelowi: grube, zaokrąglone cechy z ostatnich ~60 s.
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
      idle_share: round(idle / n, 0.1)
    };
  }

  reset() {
    this.buckets = []; this.cur = { a: 0, c: 0, m: 0 }; this.acc = 0;
    for (const k in this.counts) this.counts[k] = 0;
  }
}
