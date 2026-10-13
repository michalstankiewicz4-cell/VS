// Kontrola wersji przed pushem: node tools/check-version.mjs
// Sprawdza: (1) wersja w js/version.js == najnowszy wpis w CHANGELOG.md,
// (2) wersja jest wyższa od wersji ostatnio wysłanej (origin/main) i od najwyższego tagu vX.Y.Z (jeśli są).
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const sh = (c) => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const RE = /VERSION\s*=\s*'(\d+\.\d+\.\d+)'/;
const parse = (v) => v.split('.').map(Number);
const gt = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };
const fail = (m) => { console.error('BŁĄD wersji: ' + m); process.exit(1); };

const ver = RE.exec(readFileSync(new URL('../js/version.js', import.meta.url), 'utf8'))?.[1];
if (!ver) fail('nie znaleziono VERSION w js/version.js');
const log = /^## \[(\d+\.\d+\.\d+)\]/m.exec(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'))?.[1];
if (log !== ver) fail(`js/version.js = ${ver}, a pierwszy wpis w CHANGELOG.md = ${log}`);

sh('git fetch -q origin +refs/heads/main:refs/remotes/origin/main');   // odśwież punkt odniesienia (best-effort)
const head = sh('git rev-parse HEAD'), remote = sh('git rev-parse origin/main');
const dirty = !!sh('git status --porcelain');
if (head && head === remote && !dirty) { console.log(`OK: wersja ${ver}, HEAD == origin/main (nic nowego do wysłania)`); process.exit(0); }
if (dirty) console.log('Uwaga: są niezatwierdzone zmiany — wersja musi być wyższa od wysłanej.');

const baseline = [];
const sent = RE.exec(sh('git show origin/main:js/version.js'))?.[1];
if (sent) baseline.push(['origin/main', sent]);
const tag = sh("git tag --list 'v*.*.*' --sort=-v:refname").split('\n').filter(Boolean)[0]?.slice(1);
if (tag) baseline.push(['tag v' + tag, tag]);
for (const [name, v] of baseline) if (!gt(parse(ver), parse(v))) fail(`wersja ${ver} nie jest wyższa od ${name} (${v}) — podbij numer`);
console.log(`OK: wersja ${ver}` + (baseline.length ? ' (> ' + baseline.map(([n, v]) => `${n} ${v}`).join(', ') + ')' : ' (brak punktu odniesienia)'));
