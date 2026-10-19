// Developer helper: a tiny button (top centre) that wipes ALL data this game stored in the browser
// (settings, map, save, editor settings) and reloads. Two clicks, so it cannot be hit by accident.
import { h } from './dom.js';
import { t, onLang } from '../i18n/index.js';

export function createDevReset({ root }) {
  let armed = 0, timer = 0;
  const b = h('button', { id: 'devreset', type: 'button' });
  const label = () => { b.textContent = t(armed ? 'dev.confirm' : 'dev.reset'); b.title = t('dev.tip'); b.setAttribute('aria-label', t('dev.tip')); b.classList.toggle('on', !!armed); };
  b.addEventListener('click', () => {
    if (!armed) { armed = 1; label(); timer = setTimeout(() => { armed = 0; label(); }, 3000); return; }
    clearTimeout(timer);
    try { localStorage.clear(); } catch { /* blocked storage: nothing to clear */ }
    try { sessionStorage.clear(); } catch { /* same */ }
    location.reload();
  });
  onLang(label); label();
  root.append(b);
}
