// The labs' start screen: one tile per lab (js/labs/labs-list.js). Tiles are built with the DOM (the CSP allows no inline styles).
import { LABS, ROOT } from './labs-list.js';

const NS = 'http://www.w3.org/2000/svg';
// Line art for the tile pictures: a sentry gun, and a plain question mark for the planned labs.
const ART = {
  turret: '<g fill="#5d5a50"><rect x="62" y="64" width="76" height="16"/></g><g fill="#3a3a34"><rect x="72" y="56" width="56" height="9"/></g><rect x="92" y="44" width="16" height="13" fill="#6b6860"/><rect x="78" y="30" width="44" height="16" fill="#3b4636"/><rect x="118" y="35" width="48" height="5" fill="#15171a"/><rect x="164" y="33" width="6" height="9" fill="#15171a"/><rect x="66" y="22" width="44" height="9" fill="#2d3328" transform="rotate(-6 88 26)"/><rect x="84" y="20" width="5" height="10" fill="#ff5a3c"/><g fill="#8a8460"><rect x="46" y="76" width="18" height="10" rx="2"/><rect x="136" y="76" width="18" height="10" rx="2"/><rect x="64" y="80" width="18" height="10" rx="2"/><rect x="118" y="80" width="18" height="10" rx="2"/></g>',
  soon: '<text x="100" y="66" text-anchor="middle" font-size="46" fill="#3a4256" font-family="system-ui">?</text>',
};

for (const lab of LABS) {
  const el = document.createElement(lab.ready ? 'a' : 'div');
  el.className = 'tile' + (lab.ready ? '' : ' soon');
  if (lab.ready) el.href = ROOT + lab.file;
  const art = document.createElement('div'); art.className = 'art ' + lab.art;
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 200 100'); svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.innerHTML = ART[lab.art] || '';
  art.append(svg);
  const body = document.createElement('div'); body.className = 'tbody';
  const name = document.createElement('div'); name.className = 'tname';
  const n = document.createElement('span'); n.textContent = lab.name;
  const kit = document.createElement('small'); kit.textContent = lab.kit;
  name.append(n, kit);
  const desc = document.createElement('div'); desc.className = 'tdesc'; desc.textContent = lab.desc;
  const tag = document.createElement('span');
  tag.className = 'tag ' + (lab.ready ? (lab.game ? 'game' : 'lab') : '');
  tag.textContent = lab.ready ? (lab.game ? 'In the game' : 'Lab only') : 'Soon';
  body.append(name, desc, tag);
  el.append(art, body);
  document.getElementById('labs').append(el);
}
