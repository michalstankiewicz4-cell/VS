// The labs' start screen: one tile per lab (js/labs/labs-list.js). Tiles are built with the DOM (the CSP allows no inline styles).
import { LABS, ROOT } from './labs-list.js';

const NS = 'http://www.w3.org/2000/svg';
// Line art for the tile pictures: a sentry gun, and a plain question mark for the planned labs.
const ART = {
  turret: '<g fill="#5d5a50"><rect x="62" y="64" width="76" height="16"/></g><g fill="#3a3a34"><rect x="72" y="56" width="56" height="9"/></g><rect x="92" y="44" width="16" height="13" fill="#6b6860"/><rect x="78" y="30" width="44" height="16" fill="#3b4636"/><rect x="118" y="35" width="48" height="5" fill="#15171a"/><rect x="164" y="33" width="6" height="9" fill="#15171a"/><rect x="66" y="22" width="44" height="9" fill="#2d3328" transform="rotate(-6 88 26)"/><rect x="84" y="20" width="5" height="10" fill="#ff5a3c"/><g fill="#8a8460"><rect x="46" y="76" width="18" height="10" rx="2"/><rect x="136" y="76" width="18" height="10" rx="2"/><rect x="64" y="80" width="18" height="10" rx="2"/><rect x="118" y="80" width="18" height="10" rx="2"/></g>',
  car: '<rect x="46" y="54" width="108" height="18" rx="3" fill="#3a5a8a"/><rect x="72" y="40" width="58" height="16" rx="3" fill="#1c2a3a"/><rect x="68" y="36" width="66" height="5" rx="2" fill="#3a5a8a"/><rect x="146" y="58" width="8" height="6" fill="#ffd27a"/><rect x="46" y="58" width="6" height="6" fill="#d03030"/><circle cx="72" cy="74" r="9" fill="#0b0c0f"/><circle cx="128" cy="74" r="9" fill="#0b0c0f"/><circle cx="72" cy="74" r="3.5" fill="#8a8f98"/><circle cx="128" cy="74" r="3.5" fill="#8a8f98"/>',
  wall: '<g fill="#8a9096"><rect x="38" y="30" width="5" height="52"/><rect x="98" y="30" width="5" height="52"/><rect x="158" y="30" width="5" height="52"/></g><g stroke="#5d6064" stroke-width="1.2"><path d="M43 36L98 78M43 50L98 82M43 64L98 82M43 78L98 36M43 64L98 36M43 50L98 64M98 36L158 78M98 50L158 82M98 64L158 82M98 78L158 36M98 64L158 36M98 50L158 64"/></g><g stroke="#a58a64" stroke-width="1.6"><path d="M43 24H158M43 18H158"/></g>',
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
