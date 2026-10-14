// City map editor: place/remove buildings and cars, import/export the map as JSON. Needs no build points.
import * as THREE from '../../vendor/three.module.js';
import { h, btn, tx } from '../ui/dom.js';
import { t, onLang } from '../i18n/index.js';
import { createUnderlay } from './underlay.js';
import { read, write, KEYS } from '../core/storage.js';
import { moveLabel, camLabel, firstKey } from '../input/bindings.js';

export function createEditor({ scene, root, canvas, world, settings, groundAt, pickIndex, project, isPaused, onPlay, saveMap }) {
  let active = false, top = false, tool = 'b', hot = -1, grace = 0, barFor = '', barOver = false, moving = null, rot = 0, why = '', whyShown = '', note = '';
  const pan = new THREE.Vector3(0, 0, 44);

  const slider = (labelKey, min, max, step, val) => {
    const out = h('span', {}, String(val)), inp = h('input', { type: 'range', min, max, step, value: val });
    inp.addEventListener('input', () => { out.textContent = inp.value; });
    return { el: h('label', { class: 'row' }, tx(labelKey), inp, out), inp };
  };
  const W = slider('ed.width', 4, 14, 1, 8), D = slider('ed.depth', 4, 14, 1, 8), H = slider('ed.height', 2, 9, 0.5, 4);
  const RW = slider('ed.roadWidth', 2, 12, 1, 4), RL = slider('ed.roadLength', 4, 60, 2, 20);
  const applyScales = () => world.setScales({ p: +SP.inp.value, v: +SV.inp.value, e: +SE.inp.value });
  const sc = (key) => { const s = slider(key, 0.5, 2, 0.05, 1); s.inp.addEventListener('input', () => { s.el.lastChild.textContent = (+s.inp.value).toFixed(2); applyScales(); }); return s; };
  const SP = sc('ed.scale.player'), SV = sc('ed.scale.car'), SE = sc('ed.scale.enemy');
  const scaleBox = h('details', { class: 'under' }, h('summary', {}, tx('ed.scale.title')), SP.el, SV.el, SE.el, h('p', { class: 'note' }, tx('ed.scale.hint')));
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
  const credit = h('p', { class: 'note' });
  const uCity = uSlider('ed.u.city', 0.1, 1, 0.05, 1, (v) => v.toFixed(2), (v) => world.setCityOpacity(v));
  const tiles = (prov) => async () => {
    note = t('ed.u.loading'); refresh();
    try {
      const w = await under.loadTiles(prov, (d, n) => { note = t('ed.u.progress', { d, n }); refresh(); });
      uW.inp.step = 1; uW.inp.value = Math.round(w); uW.out.textContent = String(Math.round(w)); under.setWidth(w);
      note = t('ed.u.ok');
    } catch (e) { note = t('ed.u.net'); }
    refresh();
  };
  const uOsm = btn('ed.u.osm', tiles('osm')), uEsri = btn('ed.u.esri', tiles('esri'));
  const uCenter = btn('ed.u.center', () => under.center());
  const uClear = btn('ed.u.clear', () => { under.clear(); refresh(); });
  const uLoad = btn('ed.u.load', () => file.click());
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0]; file.value = '';
    if (!f) return;
    try { await under.load(f); note = t('ed.u.ok'); } catch (e) { note = t(e.message === 'big' ? 'ed.u.big' : 'ed.u.bad'); }
    refresh();
  });
  const underBox = h('details', { class: 'under' }, h('summary', {}, tx('ed.u.title')),
    h('div', { class: 'btns' }, uLoad, uCenter, uClear), h('p', { class: 'note' }, tx('ed.u.online')), h('div', { class: 'btns' }, uOsm, uEsri), credit, file, uCity.el, uW.el, uO.el, uR.el, h('p', { class: 'note' }, tx('ed.u.hint')));
  const info = h('p', { class: 'note' }), json = h('textarea', { rows: 5, spellcheck: 'false', hidden: true, 'aria-label': 'Map JSON' });
  const tools = {};
  const mkTool = (id, key) => { const b = btn(key, () => { cancelMove(); tool = id; note = ''; refresh(); }); tools[id] = b; return b; };
  const cancelMove = () => { if (moving) { world.map.restore(moving.orig); moving = null; } };
  const cancelBtn = btn('ed.cancelMove', () => { cancelMove(); refresh(); });
  cancelBtn.hidden = true;
  // Floating options next to the clicked (selected) object (Select tool): move, rotate, resize, delete.
  const bar = h('div', { id: 'edbar', hidden: true });
  bar.addEventListener('mouseenter', () => { barOver = true; });
  bar.addEventListener('mouseleave', () => { barOver = false; });
  const modify = (patch) => {
    const o = world.map.item(hot); if (!o) return;
    const n = { ...o, ...patch(o) };
    if (world.map.replace(hot, n)) { saveMap(); note = ''; } else note = t('ed.o.cant', { why: t('ed.why.' + world.map.why(n, hot)) });
    barFor = ''; refresh();
  };
  const turn = (o) => (o.t === 'b' ? { w: o.d, d: o.w } : { r: o.r ? 0 : 1 });
  const buildBar = (o) => {
    bar.replaceChildren();
    const add = (key, fn) => bar.append(btn(key, fn));
    add('ed.o.move', () => { moving = { orig: world.map.item(hot) }; world.map.removeAt(hot); hot = -1; barFor = ''; refresh(); });
    if (o.t !== 'p') add('ed.o.rotate', () => modify(turn));
    if (o.t === 'b') {
      add('ed.o.taller', () => modify((q) => ({ h: q.h + 0.5 })));
      add('ed.o.lower', () => modify((q) => ({ h: q.h - 0.5 })));
      add('ed.o.bigger', () => modify((q) => ({ w: q.w + 1, d: q.d + 1 })));
      add('ed.o.smaller', () => modify((q) => ({ w: q.w - 1, d: q.d - 1 })));
    }
    if (o.t === 'r') {
      add('ed.o.longer', () => modify((q) => ({ d: q.d + 2 })));
      add('ed.o.shorter', () => modify((q) => ({ d: q.d - 2 })));
    }
    add('ed.o.delete', () => { if (world.map.removeAt(hot)) saveMap(); hot = -1; barFor = ''; barOver = false; note = ''; refresh(); });
  };
  const topBtn = h('button', { type: 'button', on: { click: () => { top = !top; refresh(); } } });
  const rotBtn = h('button', { type: 'button', on: { click: () => { rot ^= 1; refresh(); } } });

  const panel = h('div', { id: 'ed', hidden: true },
    h('div', { class: 'btns tools' }, mkTool('s', 'ed.select'), mkTool('b', 'ed.building'), mkTool('c', 'ed.car'), mkTool('r', 'ed.road'), mkTool('p', 'ed.palace'), mkTool('x', 'ed.remove'), rotBtn, topBtn, cancelBtn),
    W.el, D.el, H.el, RW.el, RL.el, scaleBox, underBox,
    h('div', { class: 'btns' }, btn('ed.play', onPlay),
      btn('ed.resetSettings', () => {
        tool = 'b'; rot = 0; top = false;
        for (const [k, s] of Object.entries(sliders)) { s.inp.value = DEF[k]; s.inp.dispatchEvent(new Event('input')); }
        world.setCityOpacity(1); note = t('ed.settingsReset'); refresh();
      }),
      btn('ed.default', () => { moving = null; world.map.reset(); saveMap(); note = t('ed.restored'); refresh(); }),
      btn('ed.export', async () => {
        const txt = JSON.stringify(world.map.list());
        json.hidden = false; json.value = txt;
        let ok = false; try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { json.select(); }
        note = t(ok ? 'ed.copied' : 'ed.selected'); refresh();
      }),
      btn('ed.import', () => {
        cancelMove();
        if (json.hidden) { json.hidden = false; json.value = ''; note = t('ed.pasteHint'); refresh(); return; }
        try {
          if (json.value.length > 300000) throw new Error('too large');
          const n = world.map.set(JSON.parse(json.value));
          saveMap(); note = t('ed.loaded', { n }); refresh();
        } catch (e) { note = t('ed.badJson'); refresh(); }
      })),
    json, info);
  // Remember editor settings (tool, rotation, top view, sliders) between sessions; the underlay image itself is not saved.
  const DEF = { sp: 1, sv: 1, se: 1, w: 8, d: 8, h: 4, rw: 4, rl: 20, city: 1, uo: 0.6 };
  const sliders = { sp: SP, sv: SV, se: SE, w: W, d: D, h: H, rw: RW, rl: RL, city: uCity, uo: uO };
  const sv = read(KEYS.editor), clampN = (v, s) => Math.min(+s.inp.max, Math.max(+s.inp.min, +v));
  if (sv && typeof sv === 'object') {
    if (['s', 'b', 'c', 'r', 'p', 'x'].includes(sv.tool)) tool = sv.tool;
    rot = sv.rot ? 1 : 0; top = !!sv.top;
    for (const [k, s] of Object.entries(sliders)) {
      if (!Number.isFinite(+sv[k]) || sv[k] === null) continue;
      s.inp.value = clampN(sv[k], s);
      if (s === SP || s === SV || s === SE) { s.inp.dispatchEvent(new Event('input')); continue; }
      if (s === uCity) s.out.textContent = (+s.inp.value).toFixed(2);   // applied on open(), not now
      else s.inp.dispatchEvent(new Event('input'));
    }
  }
  let saved = '';
  const persist = () => {
    const o = { tool, rot, top }; for (const [k, s] of Object.entries(sliders)) o[k] = +s.inp.value;
    const j = JSON.stringify(o); if (j !== saved) { saved = j; write(KEYS.editor, o); }
  };
  panel.addEventListener('input', persist);
  root.append(panel, bar);

  function refresh() {
    persist();
    for (const [id, b] of Object.entries(tools)) b.classList.toggle('on', id === tool);
    rotBtn.textContent = t('ed.rotate', { key: firstKey(settings.data.keys, 'editRotate') });
    rotBtn.classList.toggle('on', rot === 1);
    topBtn.textContent = t('ed.top', { key: firstKey(settings.data.keys, 'editTopView') });
    topBtn.classList.toggle('on', top);
    for (const s of [W, D, H]) s.el.hidden = tool !== 'b';
    for (const s of [RW, RL]) s.el.hidden = tool !== 'r';
    credit.textContent = under.source === 'osm' || under.source === 'esri' ? t('ed.u.credit.' + under.source) : '';
    const k = settings.data.keys;
    cancelBtn.hidden = !moving;
    let s = t('ed.info', { n: world.map.count() + (moving ? 1 : 0), max: world.map.max, action: t(tool === 'x' ? 'ed.act.remove' : tool === 's' && !moving ? 'ed.act.select' : 'ed.act.place'), move: moveLabel(k), cam: camLabel(k) });
    if (moving) s += '\n' + t('ed.moving');
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
    if (moving) return { ...moving.orig, x, z };
    return tool === 'b' ? { t: 'b', x, z, w: +W.inp.value, d: +D.inp.value, h: +H.inp.value, s: Math.random() }
      : tool === 'p' ? { t: 'p', x, z, s: 0.5 }
      : tool === 'r' ? { t: 'r', x, z, w: +RW.inp.value, d: +RL.inp.value, r: rot, s: Math.random() }
      : { t: 'c', x, z, r: rot, s: Math.random() };
  }

  canvas.addEventListener('mousedown', (e) => {
    if (!active || isPaused() || e.button !== settings.data.mouse.fireButton) return;
    note = '';
    if (tool === 'x') { const i = pickIndex(); if (i >= 0 && world.map.removeAt(i)) saveMap(); }
    else if (tool === 's' && !moving) { const i = pickIndex(); hot = i; barFor = ''; if (i < 0) { bar.hidden = true; return; } }
    else { const o = currentObject(); if (o && world.map.add(o)) { saveMap(); moving = null; } else if (o && moving) note = t('ed.o.cant', { why: t('ed.why.' + world.map.why(o)) }); }
    refresh();
  });

  return {
    pan,
    get top() { return active && top; },
    toggleTop() { if (active) { top = !top; refresh(); } },
    rotate() { if (!active) return; if (moving) moving.orig = { ...moving.orig, ...turn(moving.orig) }; else rot ^= 1; refresh(); },
    open() { active = true; applyScales(); under.setVisible(true); world.setCityOpacity(+uCity.inp.value); panel.hidden = false; pan.set(0, 0, 44); note = ''; refresh(); },
    close() { cancelMove(); active = false; bar.hidden = true; hot = -1; barFor = ''; world.setPreview(false, 0, 0); under.setVisible(false); world.setCityOpacity(1); panel.hidden = true; world.setGhostBox(false, 0, 0, 0, 1, 1, 1, false); },
    // mv: camera-relative pan vector; zoom: current user zoom (pans slower when zoomed in)
    update(dt, mv, zoom) {
      if (!active) return;
      pan.x = Math.max(-70, Math.min(70, pan.x + mv.x * 28 * dt / zoom));
      pan.z = Math.max(-70, Math.min(70, pan.z + mv.z * 28 * dt / zoom));
      if (tool !== 's' || moving) { bar.hidden = true; hot = -1; barFor = ''; }
      world.setPreview(scaleBox.open, pan.x + 3, pan.z);   // size preview only while the "Size of things" section is open, at the view centre
      if (tool === 's' && !moving) {
        why = '';
        if (hot >= world.map.count()) hot = -1;
        const o = hot >= 0 ? world.map.item(hot) : null;
        if (!o) { bar.hidden = true; barFor = ''; world.setGhostBox(false, 0, 0, 0, 1, 1, 1, false); }
        else {
          const b = world.map.bounds(hot);
          world.setGhostBox(true, b.x, b.h / 2, b.z, b.hw * 2 + 0.2, b.h + 0.2, b.hd * 2 + 0.2, true);
          if (barFor !== hot + o.t) { barFor = hot + o.t; buildBar(o); }
          bar.hidden = false;
          const a = project(b.x, b.h, b.z), bw = bar.offsetWidth || 90, bh = bar.offsetHeight || 150;
          const left = a.x + 36 + bw > innerWidth - 336 ? a.x - 36 - bw : a.x + 36;
          bar.style.left = Math.max(4, left) + 'px'; bar.style.top = Math.max(4, Math.min(innerHeight - bh - 4, a.y - 20)) + 'px';
        }
      } else if (tool === 'x') {
        why = '';
        const i = pickIndex();
        if (i >= 0) { const b = world.map.bounds(i); world.setGhostBox(true, b.x, b.h / 2, b.z, b.hw * 2 + 0.2, b.h + 0.2, b.hd * 2 + 0.2, false); }
        else world.setGhostBox(false, 0, 0, 0, 1, 1, 1, false);
      } else {
        bar.hidden = true;
        const o = currentObject();
        if (o) { const b = world.map.boundsOf(o); world.setGhostBox(true, b.x, b.h / 2, b.z, b.hw * 2, b.h, b.hd * 2, world.map.canPlace(o)); why = world.map.why(o); }
        else { why = ''; world.setGhostBox(false, 0, 0, 0, 1, 1, 1, false); }
      }
      if (why !== whyShown) { whyShown = why; refresh(); }
    },
  };
}
