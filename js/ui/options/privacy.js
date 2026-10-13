// Options > Privacy & data: input statistics (local only), the AI-bound summary preview, and progress reset.
import { h, btn, tx } from '../dom.js';
import { t, bind, onLang } from '../../i18n/index.js';
import { checkbox } from './widgets.js';

export function buildPrivacy({ settings, input, progress }) {
  const stats = h('pre'), feat = h('pre');
  const cnt = checkbox({ label: 'priv.count', get: () => settings.data.privacy.stats, set: (v) => settings.update((d) => { d.privacy.stats = v; }) });
  settings.onChange(cnt.refresh);

  const refresh = () => {
    stats.textContent = t('priv.stats', input.counts);
    feat.textContent = JSON.stringify(input.features(), null, 1);
  };
  setInterval(() => { if (stats.offsetParent) refresh(); }, 300);
  onLang(refresh);
  refresh();

  // Two-step confirmation instead of a blocking confirm() dialog.
  const wipe = h('button', { type: 'button' });
  let armed = false, timer = 0;
  const label = () => bind(wipe, armed ? 'priv.wipeSure' : 'priv.wipe');
  label();
  wipe.addEventListener('click', () => {
    clearTimeout(timer);
    if (!armed) { armed = true; label(); timer = setTimeout(() => { armed = false; label(); }, 4000); wipe.blur(); return; }
    armed = false; label(); progress.wipe(); done.hidden = false; setTimeout(() => { done.hidden = true; }, 2500); wipe.blur();
  });
  const done = h('p', { class: 'note', hidden: true }, tx('priv.wiped'));

  return h('div', { class: 'tabbody' },
    h('h3', {}, tx('priv.title')), cnt.el, stats,
    h('p', { class: 'note' }, tx('priv.note')),
    h('p', { class: 'note' }, tx('priv.ai')), feat,
    h('div', { class: 'btns' }, btn('priv.resetStats', () => { input.resetStats(); refresh(); })),
    h('h3', {}, tx('priv.data')), h('div', { class: 'btns' }, wipe), done);
}
