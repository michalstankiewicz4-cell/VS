// Menu overlay: main menu, single player, multiplayer (soon), pause, death and options screens.
import { h, btn, tx } from './dom.js';
import { t, bind } from '../i18n/index.js';
import { buildOptions } from './options/index.js';
import { VERSION } from '../version.js';

// actions: { start, build, editor, resume, quit }
export function createMenu(root, { actions, ctx, progress }) {
  const screens = {};
  const history = [];
  let current = null;

  const bankLine = () => h('p', { class: 'info bank' });
  const deadInfo = h('p', { class: 'info' });
  const screen = (name, ...kids) => { screens[name] = h('section', { class: 'screen', hidden: true }, ...kids); return screens[name]; };
  const back = () => btn('common.back', () => menu.back(), 'sub');
  const soon = (key) => {
    const b = h('button', { type: 'button', disabled: true, class: 'soonbtn' }, tx(key), h('span', { class: 'badge' }, tx('multi.soon')));
    return b;
  };

  screen('main',
    h('h1', { class: 'logo' }, 'CAPITAL', h('br'), 'QUARANTINE'),
    tx('menu.tagline', 'p'),
    h('div', { class: 'stack' },
      btn('menu.single', () => menu.go('single')),
      btn('menu.multi', () => menu.go('multi')),
      btn('menu.editor', actions.editor),
      btn('menu.options', () => menu.go('options'))),
    bankLine(),
    h('p', { class: 'foot' }, 'v' + VERSION, ' · ', tx('menu.credit')));
  screen('single', tx('single.title', 'h2'),
    h('div', { class: 'stack' }, btn('single.start', actions.start), btn('single.build', actions.build), back()), bankLine());
  screen('multi', tx('multi.title', 'h2'),
    h('div', { class: 'stack' }, soon('multi.pve'), soon('multi.pvp'), back()), tx('multi.note', 'p'));
  screen('pause', tx('pause.title', 'h2'),
    h('div', { class: 'stack' }, btn('pause.resume', actions.resume), btn('menu.options', () => menu.go('options')), btn('pause.quit', actions.quit)));
  screen('dead', tx('dead.title', 'h2'), deadInfo,
    h('div', { class: 'stack' }, btn('dead.again', actions.start), btn('single.build', actions.build), btn('pause.quit', actions.quit)));
  const options = buildOptions(ctx);
  screen('options', tx('opt.title', 'h2'), options.el, h('div', { class: 'stack' }, back()));

  const overlay = h('div', { id: 'menu', hidden: true }, Object.values(screens));
  root.append(overlay);

  function refreshInfo() {
    const s = t('menu.bank', { bank: progress.bank, best: progress.best });
    root.querySelectorAll('.info.bank').forEach((e) => { e.textContent = s; });
  }

  const menu = {
    get current() { return current; },
    get open() { return !overlay.hidden; },
    // Opens a screen without history (used for the first screen of a flow).
    show(name) {
      history.length = 0; menu.switchTo(name);
    },
    switchTo(name) {
      for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
      current = name; overlay.hidden = false;
      overlay.dataset.screen = name;
      if (name === 'options') options.select('graphics');
      refreshInfo();
    },
    go(name) { history.push(current); menu.switchTo(name); },
    // Back one screen; returns false when there is nothing to go back to (main menu, pause, death).
    back() {
      if (!history.length) return false;
      menu.switchTo(history.pop()); return true;
    },
    hide() { overlay.hidden = true; current = null; history.length = 0; },
    setDeath(params) { bind(deadInfo, 'dead.stats', undefined, params); },
    refresh: refreshInfo,
  };
  return menu;
}
