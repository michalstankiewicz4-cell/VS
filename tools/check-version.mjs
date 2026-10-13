// Kontrola wersji przed pushem: node tools/check-version.mjs
// Sprawdza: (1) wersja w js/version.js == najnowszy wpis w CHANGELOG.md,
// (2) wersja jest wyższa od ostatniego tagu vX.Y.Z (chyba że HEAD ma już ten tag).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const sh = (c) => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const parse = (v) => v.split('.').map(Number);
const gt = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };
const fail = (m) => { console.error('BŁĄD wersji: ' + m); process.exit(1); };

const ver = /VERSION\s*=\s*'(\d+\.\d+\.\d+)'/.exec(readFileSync(new URL('../js/version.js', import.meta.url), 'utf8'))?.[1];
if (!ver) fail('nie znaleziono VERSION w js/version.js');
const log = /^## \[(\d+\.\d+\.\d+)\]/m.exec(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'))?.[1];
if (log !== ver) fail(`js/version.js = ${ver}, a pierwszy wpis w CHANGELOG.md = ${log}`);

const tags = sh("git tag --list 'v*.*.*' --sort=-v:refname").split('\n').filter(Boolean);
const last = tags[0]?.slice(1);
if (last) {
  const onHead = sh('git tag --points-at HEAD').split('\n').includes('v' + ver);
  if (!onHead && !gt(parse(ver), parse(last))) fail(`wersja ${ver} nie jest wyższa od ostatniego tagu v${last}`);
}
console.log(`OK: wersja ${ver}` + (last ? ` (poprzednia v${last})` : ' (brak wcześniejszych tagów)'));
