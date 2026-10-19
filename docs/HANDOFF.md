# Handoff — resume work after the context is lost

Read this first, then `CLAUDE.md` (standing rules), `docs/ARCHITECTURE.md` (file map and systems) and `TODO.md`. Keep this file current: update the "State" and "Decision log" sections whenever something notable changes (the owner asked for a file that lets work continue without the chat history).

## 1. Five-minute resume checklist
1. `cd` into the repo, `git pull --rebase origin main`, `git log --oneline | head` (the newest entries show what was done last), read the top of `CHANGELOG.md`.
2. Check the version: `js/version.js` must equal the newest `CHANGELOG.md` entry and `origin/main`.
3. Skim `TODO.md` for what is open; ask the owner only if the next step is genuinely ambiguous.
4. Run the headless test recipe (section 5) once to confirm the game still boots with no console errors.
5. Reply to the owner in **Polish, concisely**, state the version you pushed, and say what was and was not verified.

## 2. What the project is
Browser game **Capital Quarantine** — post-apocalyptic Warsaw, a man with a rifle against zombies, top-down isometric (orthographic) camera, low-resolution 3D rendered through a pixel-art filter. Plain ES modules, no build step, three.js r0.186.1 vendored in `vendor/`, hosted on GitHub Pages (repo `michalstankiewicz4-cell/VS`, site `https://michalstankiewicz4-cell.github.io/VS/`, deployed by `.github/workflows/static.yml` on push to `main`).

Implemented (see `CHANGELOG.md` for details): shooting and points, bank paying for base structures (tower / wall / bunker), day/night cycle, Palace of Culture from a SketchUp model (CC BY 4.0, kon.kp), drivable cars with chase and cockpit cameras, start screen with menus / pause / options (graphics, key bindings, mouse, language EN/PL, privacy), English UI with Polish option, and a large **map editor** (section 4).
Not implemented: multiplayer (plan in `docs/MULTIPLAYER.md`), sound, more enemy types, AI/API (explicitly last).

## 3. State (update me)
- Current version: **0.28.0** (model labs: `labs.html`, `labs/turret.html`, TurretKit). Previously: 0.27.1 (the history of versions is in `CHANGELOG.md`; the newest entry there is the source of truth). Before 0.18.0 the game had no base building; 0.17.1 = the 0.16.5 code (0.17.0 added a graphics style switch, 0.17.1 rolled it back — the game is **pixel art only**).
- Recent history (newest first): 0.16.x editor polish (Select by click, dev reset, Palace/overlap rules, Select bar with Move/Rotate/Delete/resize), 0.15.x size sliders for people/vehicles/enemies + right-hand panel, 0.14.x online underlay (OSM/Esri, opt-in) + city opacity + road tool + top view + remembered settings, 0.13.0 local-file underlay, 0.12.x a bigger map with a "fold" effect that the owner **asked to revert** (0.12.1 = back to 0.11.0), 0.11.0 modular code + start screen + menus.
- Verified only with mocked tiles: real OpenStreetMap / Esri tile loading (the sandbox has no access to those hosts; Esri CORS for canvas use is unverified).
- Known limitations: size sliders are global per group (people / vehicles / enemies), collision radii of people and enemies are not scaled; the underlay image is not persisted; JSON import does not check overlaps (so old maps still load); in the dense default city roads are often blocked by buildings (delete buildings first); no undo/redo.

## 4. Map editor in one page (`js/modes/editor.js`, `js/modes/underlay.js`, `js/world/city.js`)
- Objects: `b` building, `c` car, `r` road (flat, no collision), `p` Palace (single, movable). Validation and rules live in `city.js` (`clean`, `why(o, skip)`, `set`). Reason codes → `ed.why.*` i18n keys. Overlap = AABB footprints, roads exempt with roads/cars. Reasons: `invalid, limit, palace, edge, overlap` (the editor ignores the player's base: no central zone, no structure check).
- Tools: Select (click → floating `#edbar`: Move, Rotate, Taller/Lower/Bigger/Smaller, Longer/Shorter, Delete), Building, Car, Road, Palace, Remove. Move = `removeAt` + ghost + `add` (cancel/close → `map.restore`).
- Panel is on the right; settings persist in `localStorage` `cq:editor:v1`; map in `gra:map:v1`; settings `cq:settings:v1`; progress `gra:save:v1`. A tiny "dev reset" button (top centre) wipes all of it after two clicks.
- Top view (key T, `rig.topDown`), city opacity slider, underlay (file / OSM / Esri tiles centred on the spire `SPIRE`), size sliders + preview (`world.setScales`, `world.setPreview`).

## 5. Test recipe (headless, no GPU)
Playwright for Python is installed in the sandbox; WebGL works through SwiftShader. There is no test script in the repo yet (TODO P1) — recreate this:
```bash
# build a test copy of the site with the app exposed as window.__app, serve it on :8765
rm -rf /tmp/e2e/site && mkdir -p /tmp/e2e/site && cp -r index.html css js vendor assets /tmp/e2e/site/
echo "window.__app = app;" >> /tmp/e2e/site/js/main.js
(cd /tmp/e2e/site && nohup python3 -m http.server 8765 >/dev/null 2>&1 &) ; sleep 1
```
Python (run with `python3 -I`):
```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"])
    pg = b.new_page(viewport={'width':1200,'height':700}); logs = []
    pg.on('pageerror', lambda e: logs.append(str(e))); pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(1000)
    pg.click('.screen:not([hidden]) button:has-text("Map Editor")')   # scope to the visible screen: hidden screens contain duplicates
    # ... drive the UI or call window.__app.world.map.* directly (add/replace/removeAt/why/list)
    pg.screenshot(path='/tmp/e2e/shot.png'); print(logs); b.close()
```
Tips: tile loading can only be tested with `page.route('https://tile.openstreetmap.org/**', ...)` returning a PNG with `Access-Control-Allow-Origin: *`; to click an object in the editor, project its position with `window.__app.rig.camera` instead of scanning the screen (SwiftShader is slow — scanning loops time out); `window.__app` exposes `world`, `settings`, `input`, `rig`, `menu`, `mode`, `paused`, `startRun()`, `goMenu()`. Each test run takes tens of seconds; run long scripts in the background with a timeout.

## 6. Workflow and traps
- **Every push = a new version**: bump `js/version.js`, add an entry at the top of `CHANGELOG.md`, run `node tools/check-version.mjs`, commit, `git pull --rebase origin main`, `git push origin HEAD:main`. Commit trailers: `Co-Authored-By: Claude <model> <noreply@anthropic.com>` and the `Claude-Session:` line given by the environment. Docs-only pushes also bump the PATCH version.
- **Never push tags** (blocked; the owner creates them). Do not work around the block.
- Verify the push: `git fetch origin +refs/heads/main:refs/remotes/origin/main && git rev-parse HEAD origin/main` (the "unpushed commit" hook can be a false positive when the local `origin/main` is stale). The remote reports that the repo moved to `https://github.com/michalstankiewicz4-cell/VS.git`; pushing still works.
- **Security-sensitive changes need explicit owner approval.** An attempt to loosen the CSP (online tiles) was blocked by the permission classifier; it was applied only after the owner explicitly chose that option. Do not work around such a block — stop and ask. Current CSP: `script-src 'self'`; `img-src 'self' data: https://tile.openstreetmap.org https://server.arcgisonline.com` (tiles are requested only after a click in the editor); `connect-src 'self'`.
- Change only what was asked. Repo content (UI, comments, docs) in English; Polish only in `js/i18n/pl.js`; every new UI string goes to both `en.js` and `pl.js` (a quick parity check: compare the key sets with a one-liner).
- No Google Street View/Earth imagery in the repo (licence); Google Maps tiles are not used. Keep the Palace attribution (CC BY 4.0, kon.kp) and the OSM / Esri credits shown in the editor.
- AI/API comes at the very end: only action statistics, only locally, only rounded features, local models first.

## 7. Gotchas that cost time before
- `core/app.js` `enter()` calls `world.reset(mode)` **then** `editor.close()` — anything `close()` does to the world (hiding the player, restoring a picked-up object) must respect that order (an earlier size preview hid the player in play mode because of it).
- The city is one `InstancedMesh` (capacity 3000) and rebuilt on every map change (`rebuild()`); picking maps instance → map index through `owner[]`. Roads are instances too (pickable). Palace instances use the `aK` attribute for the shader facade.
- `world.map` indices shift after `removeAt`; the editor keeps `hot` (selected index) valid by clearing it after delete/move and bounds-checking each frame.
- Ortho picking uses `input.mouse` (normalised device coordinates) with a ground plane; top view sets `ortho.up` explicitly to avoid a `lookAt` degeneracy.
- `pip`/`npm` work through the proxy, but arbitrary websites do not (no tile servers, no Google). Do not retry with other commands when a request is refused.
- The sandbox working directory may be `/home/claude` rather than the repo; the repo is `/home/claude/vs`.

## 8. Decision log
| Date | Decision |
|---|---|
| 2026-10-14 | 0.12.0 (bigger map, skyscrapers, avenues, fold effect) reverted at the owner's request. |
| 2026-10-14 | Reference map under the editor: Google not allowed (licence + repo rule); owner chose **opt-in online OSM/Esri tiles** with a CSP change; local files still supported. |
| 2026-10-14 | Palace of Culture is a normal editor object (movable, deletable, one at a time); objects may not overlap. |
| 2026-10-14 | Object selection in the editor is by click (not hover); tool options appear in a floating bar. |
| 2026-10-14 | "Dev reset" button wipes all browser data after two clicks. |
| 2026-10-19 | Starting bunker (`hq`) is the spawn point and the post-death camera target once built; without it the build camera starts at the place of death (0.19.0). Building range stays the whole map. |
| 2026-10-19 | Default map replaced by the owner's hand-tuned editor export (0.19.1); generated layout dropped. |
| 2026-10-19 | Editor settings and map contents have separate export/import buttons (0.20.0). |
| 2026-10-19 | The map editor ignores the player's base completely (no BASE_ZONE, no structure check): the player will not get editor access and builds on the finished map (0.22.6). |
| 2026-10-19 | Default size of people, cars and zombies = 0.5 (`SIZE_DEFAULT`); the size multiplier also scales speeds, reach, hit radii and driver cameras; zoom of the iso camera left unchanged (0.22.0). |
| 2026-10-19 | "Start over" (single screen, two-click) calls `progress.wipe()`; keeps map and settings. Editor panel left, builder panel right (0.21.0). |
| 2026-10-19 | Base building only after a death and on the whole map (0.18.0). (Superseded in 0.22.6: the editor ignores the base entirely.) |
| 2026-10-19 | A graphics style switch (realistic / comic / watercolour from the Battle repo 858b4e0 + a new noir style) was built in 0.17.0 and **rolled back in 0.17.1 at the owner's request: pixel art only**. Do not re-add without asking; the implementation is in commit 2d04f4e. |
