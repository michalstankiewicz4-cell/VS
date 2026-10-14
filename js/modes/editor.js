// City map editor: place/remove buildings and cars, import/export the map as JSON. Needs no build points.
import * as THREE from '../../vendor/three.module.js';
import { h, btn, tx } from '../ui/dom.js';
import { t, onLang } from '../i18n/index.js';
import { createUnderlay } from './underlay.js';
import { moveLabel, camLabel, firstKey } from '../input/bindings.js';

export function createEditor({ scene, root, canvas, world, settings, groundAt, pickIndex, isPaused, onPlay, saveMap }) {
  let active = false, tool = 'b', rot = 0, why = '', whyShown = '', note = '';
  const pan = new THREE.Vector3(0, 0, 44);

  const slider = (labelKey, min, max, step, val) => {
    const out = h('span', {}, String(val)), inp = h('input', { type: 'range', min, max, step, value: val });
    inp.addEventListener('input', () => { out.textContent = inp.value; });
    return { el: h('label', { class: 'row' }, tx(labelKey), inp, out), inp };
  };
  const W = slider('ed.width', 4, 14, 1, 8), D = slider('ed.depth', 4, 14, 1, 8), H = slider('ed.height', 2, 9, 0.5, 4);
  const under = createUnderlay({ scene });
  const file = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const uSlider = (key, min, max, step, val, fmt, fn) => {
    const out = h('span', {}, fmt(val)), inp = h('input', { type: 'range', min, max, step, value: val });
    inp.addEventListener('input', () => { out.textContent = fmt(+inp.value); fn(+inp.value); });
    return { el: h('label', { class: 'row' }, tx(key), inp, out), inp, out };
  };
  const uW = uSlider('ed.u.width', 20, 400, 5, under.width, (v) => String(v), (v) => under.setWidth(v));
  const uO = uSlider('ed.u.opacity', 0.1, 1, 0.05, 0.6, (v) => v.toFixed(2), (v) => under.setOpacity(v));
  const uR = uSlider('ed.u.rotate', -180, 180, 1, 0, (v) => v + '°', (v) => under.setRotation(v));
  const uCenter = btn('ed.u.center', () => under.center());
  const uClear = btn('ed.u.clear', () => { under.clear(); });
  const uLoad = btn('ed.u.load', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0]; file.value = '';
    if (!f) return;
    try { await under.load(f); note = t('ed.u.ok'); } catch (e) { note = t(e.message === 'big' ? 'ed.u.big' : 'ed.u.bad'); }
    refresh();
  });
  const underBox = h('details', { class: 'under' }, h('summary', {}, tx('ed.u.title')),
    h('div', { class: 'btns' }, uLoad, uCenter, uClear), file, uW.el, uO.el, uR.el, h('p', { class: 'note' }, tx('ed.u.hint')));
  const info = h('p', { class: 'note' }), json = h('textarea', { rows: 5, spellcheck: 'false', hidden: true, 'aria-label': 'Map JSON' });
  const tools = {};
  const mkTool = (id, key) => { const b = btn(key, () => { tool = id; note = ''; refresh(); }); tools[id] = b; return b; };
  const rotBtn = h('button', { type: 'button', on: { click: () => { rot ^= 1; refresh(); } } });

  const panel = h('div', { id: 'ed', hidden: true },
    h('div', { class: 'btns' }, mkTool('b', 'ed.building'), mkTool('c', 'ed.car'), mkTool('x', 'ed.remove'), rotBtn),
    W.el, D.el, H.el, underBox,
    h('div', { class: 'btns' }, btn('ed.play', onPlay),
      btn('ed.default', () => { world.map.reset(); saveMap(); note = t('ed.restored'); refresh(); }),
      btn('ed.export', async () => {
        const txt = JSON.stringify(world.map.list());
        json.hidden = false; json.value = txt;
        let ok = false; try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { json.select(); }
        note = t(ok ? 'ed.copied' : 'ed.selected'); refresh();
      }),
      btn('ed.import', () => {
        if (json.hidden) { json.hidden = false; json.value = ''; note = t('ed.pasteHint'); refresh(); return; }
        try {
          if (json.value.length > 300000) throw new Error('too large');
          const n = world.map.set(JSON.parse(json.value));
          saveMap(); note = t('ed.loaded', { n }); refresh();
        } catch (e) { note = t('ed.badJson'); refresh(); }
      })),
    json, info);
  root.append(panel);

  function refresh() {
    for (const [id, b] of Object.entries(tools)) b.classList.toggle('on', id === tool);
    rotBtn.textContent = t('ed.rotate', { key: firstKey(settings.data.keys, 'editRotate') });
    rotBtn.classList.toggle('on', rot === 1);
    const k = settings.data.keys;
    let s = t('ed.info', { n: world.map.count(), max: world.map.max, action: t(tool === 'x' ? 'ed.act.remove' : 'ed.act.place'), move: moveLabel(k), cam: camLabel(k) });
    if (note) s += '\n' + note;
    else if (why) s += '\n' + t('ed.cant', { why: t('ed.why.' + why) });
    info.textContent = s;
  }
  onLang(refresh);
  settings.onChange(() => { if (active) refresh(); });

  function currentObject() {
    const p = groundAt(0);
    if (!p) return null;
    const x = Math.round(p.x), z = Math.round(p.z);
    return tool === 'b' ? { t: 'b', x, z, w: +W.inp.value, d: +D.inp.value, h: +H.inp.value, s: Math.random() }
      : { t: 'c', x, z, r: rot, s: Math.random() };
  }

  canvas.addEventListener('mousedown', (e) => {
    if (!active || isPaused() || e.button !== settings.data.mouse.fireButton) return;
    note = '';
    if (tool === 'x') { const i = pickIndex(); if (i >= 0 && world.map.removeAt(i)) saveMap(); }
    else { const o = currentObject(); if (o && world.map.add(o)) saveMap(); }
    refresh();
  });

  return {
    pan,
    rotate() { if (active) { rot ^= 1; refresh(); } },
    open() { active = true; under.setVisible(true); panel.hidden = false; pan.set(0, 0, 44); note = ''; refresh(); },
    close() { active = false; under.setVisible(false); panel.hidden = true; world.setGhostBox(false, 0, 0, 0, 1, 1, 1, false); },
    // mv: camera-relative pan vector; zoom: current user zoom (pans slower when zoomed in)
    update(dt, mv, zoom) {
      if (!active) return;
      pan.x = Math.max(-70, Math.min(70, pan.x + mv.x * 28 * dt / zoom));
      pan.z = Math.max(-70, Math.min(70, pan.z + mv.z * 28 * dt / zoom));
      if (tool === 'x') {
        why = '';
        const i = pickIndex();
        if (i >= 0) { const b = world.map.bounds(i); world.setGhostBox(true, b.x, b.h / 2, b.z, b.hw * 2 + 0.2, b.h + 0.2, b.hd * 2 + 0.2, false); }
        else world.setGhostBox(false, 0, 0, 0, 1, 1, 1, false);
      } else {
        const o = currentObject();
        if (o) { const b = world.map.boundsOf(o); world.setGhostBox(true, b.x, b.h / 2, b.z, b.hw * 2, b.h, b.hd * 2, world.map.canPlace(o)); why = world.map.why(o); }
        else { why = ''; world.setGhostBox(false, 0, 0, 0, 1, 1, 1, false); }
      }
      if (why !== whyShown) { whyShown = why; refresh(); }
    },
  };
}
