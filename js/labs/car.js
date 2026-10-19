// Car lab: the car from CarKit (see labcore.js for the shared scene, panel and loop), plus its paint.
import { buildCar, SCHEMA, DEFAULTS, PRESETS, sanitize } from '../carkit/carkit.js';
import { createLab, el } from './labcore.js';

const PAINT = { h: 0.58, s: 0.38, l: 0.3 };   // the start car's colour in the game

createLab({
  key: 'cq:lab:car:v1', SCHEMA, DEFAULTS, PRESETS, sanitize, dist: 9, lookY: 0.8, personAt: [3.2, 0, 1.2],
  build: (p, x) => buildCar(p, { ...PAINT, ...x.paint }, document.body.dataset.night === '1'),
  hint: "The game builds its cars from the parameters in js/carkit/carkit.js (DEFAULTS); each car on the map gets its own paint. To change the game's car, export the JSON here and send it.",
  extra(panel, lab) {
    lab.h3('Paint (preview only)');
    const rows = [['h', 'Hue', 0, 1, 0.01], ['s', 'Saturation', 0, 1, 0.01], ['l', 'Lightness', 0.1, 0.8, 0.01]];
    for (const [k, label, lo, hi, step] of rows) {
      const inp = el('input', { type: 'range', min: lo, max: hi, step, value: (lab.st.x.paint || PAINT)[k] ?? PAINT[k] }), val = el('span', { textContent: String(inp.value) });
      inp.addEventListener('input', () => { lab.st.x.paint = { ...PAINT, ...lab.st.x.paint, [k]: +inp.value }; val.textContent = inp.value; lab.rebuild(); });
      panel.append(el('div', { className: 'row' }, el('span', { textContent: label }), inp, val));
    }
    lab.onNight = (on) => { document.body.dataset.night = on ? '1' : '0'; lab.rebuild(); };   // headlights glow at night
  },
});
