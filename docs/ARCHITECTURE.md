# Architecture and project context

Browser game **Capital Quarantine**: post-apocalyptic Warsaw, a man with a rifle against zombies, top-down view (isometric projection), 3D rendered at low resolution with a pixel-art filter. No dependencies except three.js (vendored locally), no network requests.

Published at: repo <https://github.com/michalstankiewicz4-cell/VS>, site <https://michalstankiewicz4-cell.github.io/VS/> (GitHub Pages, workflow `.github/workflows/static.yml`).

## Quick start for someone returning to the project
1. Read this file, then [`../TODO.md`](../TODO.md) and (for networking) [`MULTIPLAYER.md`](MULTIPLAYER.md).
2. Run locally: `python -m http.server 8000` in the repo folder, open `http://localhost:8000` (ES modules do not work from `file://`).
3. Standing rules: see "Rules" below.

## File map
| Path | Role |
|---|---|
| `index.html` | Skeleton, CSP, SEO meta + JSON-LD; empty `#app` (canvas) and `#ui` (all UI is built from JS) |
| `css/base.css`, `css/menu.css`, `css/hud.css` | Base styles; menu/options overlay; HUD, builder and editor panels |
| `js/main.js` | Entry point: `createApp()` |
| `js/version.js` | `VERSION` (semver) — must stay at this path (the check script reads it) |
| `js/core/app.js` | App shell: renderer, systems, mode state machine (`menu`/`play`/`build`/`edit`/`dead`), pause, frame loop, HUD text |
| `js/core/cameras.js` | Camera rig: isometric ortho, chase, cockpit, start-screen showcase |
| `js/core/settings.js`, `storage.js`, `util.js` | Sanitised settings store, localStorage wrappers, small helpers |
| `js/world/index.js` | World facade (`createWorld`) composing the modules below |
| `js/world/{terrain,sky,city,city-material,default-map,player,vehicles,enemies,projectiles,structures,collision,constants}.js` | World systems (see below) |
| `js/world/data/palace.js` | Palace of Culture boxes — simplified model from a SketchUp file, CC BY 4.0 |
| `js/render/pixel-pipeline.js` | `PixelPipeline`: low-res target + final shader (palette, dither, depth outline, vignette) |
| `js/input/bindings.js`, `input.js` | Rebindable actions and key labels; input + local action statistics |
| `js/i18n/{index,en,pl}.js` | `t()`, `bind()`, `setLang()`; English (default/fallback) and Polish dictionaries |
| `js/ui/{dom,hud,menu}.js`, `js/ui/options/*` | DOM builder `h()`, HUD, menu screens, options tabs |
| `js/modes/{builder,editor,underlay}.js` | Base builder, city map editor, and the editor's reference-image underlay (local file → canvas texture on a ground plane at the spire `SPIRE`; data: URLs only, CSP-safe) |
| `tools/check-version.mjs` | Version check before pushing |
| `vendor/` | three.js r0.186.1 + `SHA256.txt` + licence |
| `assets/` | `og-image.png` (1200×630 thumbnail), `icon.png` |
| `robots.txt`, `sitemap.xml` | SEO |
| `CHANGELOG.md` | Version history |

## Modes and flow (`js/core/app.js`)
`menu` (start screen with the 3D showcase) → Single Player → Start run (`play`) / Build base (`build`); Map Editor (`edit`). Death (`dead`): `bank += points + time bonus (time/10)`; the bank pays for base structures.
**Esc** never ends a run: in `play`/`build`/`edit` it pauses (`paused = true`, the world and camera get `dt = 0`) and opens the pause menu (Resume / Options / Quit to main menu); inside Options it goes back to the pause menu; on the pause menu it resumes. In `menu` mode Esc goes back one screen. No effect on the death screen.
World modes (`world.reset(mode)`): `menu` (live cars + start car, character idle), `play`, `idle` (build/edit, player hidden), `dead` (frozen). `reset()` rebuilds the city so cars return to their parking spots and places the player at `START`.

## UI and i18n
All UI is built with `h(tag, props, ...kids)` (`js/ui/dom.js`) — no `innerHTML`. Static text uses `bind(el, key)` / `tx(key)` and follows the language automatically; dynamic text (HUD, editor info) is recomputed with `t(key, params)`. Add a language: new dictionary in `js/i18n/`, register in `index.js` (`dicts`, `LANGS`) and in the settings sanitiser. Missing keys fall back to English, then to the key itself.
Screens (`js/ui/menu.js`): `main`, `single`, `multi`, `pause`, `dead`, `options`, with a small history stack (`go`/`back`). Options tabs (`js/ui/options/`): Graphics, Controls, Mouse, Language, Privacy & data.

## Settings (`js/core/settings.js`)
Stored in `localStorage` key `cq:settings:v1`: `lang`, `gfx` (pixelH, levels, dither, edge, bright, fov, showFps), `mouse` (rotSens, zoomSens, invertRotate, invertZoom, fireButton, dragButton — the two buttons must differ), `privacy.stats`, `keys` (action → two `KeyboardEvent.code` slots). Everything passes through `sanitize()` (clamps, whitelists, a key code can be used by one slot only; `Escape` is reserved). Change settings only via `settings.update(draft => …)`; listeners via `settings.onChange`.
Key actions (`js/input/bindings.js`): moveUp/Down/Left/Right, camLeft/camRight, interact, cameraView, editRotate. Each has a statistics category (move / interact / camera) or none.

## Rendering (`js/render/pixel-pipeline.js`)
- three.js scene → `WebGLRenderTarget` of height `pixelH` (default 200 px) with a `DepthTexture` → full-screen shader: brightness `bright`, quantisation to `levels` with 4×4 Bayer dithering (`dither`), outline from depth differences (`edge`), vignette. Parameters via `pipe.setParams()` (driven by settings).
- Works with orthographic and perspective cameras: for perspective the shader linearises depth (`persp`, `near`, `far` uniforms) and thresholds the edge as a relative difference.

## Cameras (`js/core/cameras.js`)
- **Iso** (on foot, building, editing): orthographic, offset `(0,14,10)` from the target, near/far −30/90, yaw (default 10°), user zoom 0.5–2.2× (wheel). Movement is rotated by `yaw`: `x = mx·cos + mz·sin`, `z = −mx·sin + mz·cos`. Rotate: camLeft/camRight keys or drag with the drag button.
- **Chase / cockpit** (driving; **C** cycles iso → chase → cockpit): perspective, FOV from settings. Chase: 7.5 behind, 3.6 up, smoothed heading, drag orbits. Cockpit: eye at the driver seat (`SEAT` in `vehicles.js`: 0.42 left, 1.4 up, 0.15 forward), a dashboard box and steering wheel attached to the camera (wheel follows `car.steer`), drag looks around, re-centres on release.
- **Showcase** (menu mode): low perspective camera in front of the character with a slow sway.
- The building see-through fade (`world.fade`) is only enabled in the iso view during a run.

## World (`js/world/`)
- Ground `GROUND = 200`, movement limit ±76 (`EDGE`). Base zone: centre, `BASE_ZONE = 30` (kept free of city objects). Constants in `constants.js`. Start: `START = (0, −36.5)` (courtyard in front of the Palace) and `START_CAR = (3, −36.5)`.
- **Instances**: enemies (`ENEMIES = 110`, shared geometry via `mergeBoxes`), bullets (`PN = 96`), rubble (`GRAVES = 260`), city (one `InstancedMesh`, capacity 3000, per-instance attribute `aK` = (facade kind, top height)).
- **Collisions** (`collision.js`): AABBs and circles in `blockers` (base structures) and `cityBlk` (city + parked cars); `push()` moves actors out, `hitsAny()` stops bullets.
- **City = editable map** (`world.map`, `city.js`): objects `{t:'b',x,z,w,d,h,s}` (building), `{t:'c',x,z,r,s}` (car), `{t:'p',x:0,z:-46,s}` (Palace, fixed). Limits: 380 objects, w/d 3–16, h 1.5–9, nothing inside the base zone. Validation in `clean()`/`set()` — nothing outside the schema passes (JSON import is safe). `map.why()` returns reason codes (`invalid`, `palace`, `limit`, `edge`, `base`) that the editor translates (`ed.why.*`).
- **Building transparency**: shader in `city-material.js` — dither-discard of fragments between camera and player within `uR = 2.8`.
- **Palace facade**: same material, kinds 1–5 in the shader (windows, arcades, slits, clock faces); windows glow at night (`uNight`).
- **Base structures** (`structures.js`, `COST`): `tower` sentry gun 25, `wall` barricade 8, `crypt` bunker 40 (+25 max HP, max 3). Build grid 2 units, range ±14 cells; removing refunds half.
- **Enemies** (`enemies.js`): the active count grows with time (`18 + S.time`, up to 110), HP grows (`hpFor`: 2/3/4), speed up to +80%. A kill = 1 point.
- **Vehicles** (`vehicles.js`): in live modes (`play`, `menu`) map cars become vehicles (separate `InstancedMesh`, 8 boxes per car, max 64) plus the start car. `toggle()` (interact key) enters/exits; `step()` simple physics (accel 14, brake 28, max 15 u/s, speed-dependent steering), two-circle collision via `push()`, `runsOver()` for zombies. A parked car is an axis-aligned AABB (angle snapped to 90° on exit); you get out on the driver's (left) side. Input: `Input.axes()`.
- **Day/night** (`sky.js`): period 600 s (about 5 min day + 5 min night), transitions about 40 s, `nightAt(time)`; a run starts in daylight; menu/build/editor are always day.

## Persistence (localStorage)
- `gra:save:v1` — `{ bank, best, s: base structures }`
- `gra:map:v1` — list of map objects (editor)
- `cq:settings:v1` — settings
Storage errors are swallowed (private mode etc.).

## Map editor (`js/modes/editor.js`)
Tools Building/Car/Remove, rotate (editRotate key), size sliders, JSON export/import, "Default map". Editor camera: move keys pan (±70), start outside the base at (0, 44). Buildings may overlap; the base zone is blocked and the reason is shown. No point cost.

## Privacy and security
- CSP in `index.html`: `script-src 'self'`, no external scripts/CDNs, no `eval`/`innerHTML`, no API keys in the repo.
- Input statistics (`js/input/input.js`): only **game actions** are counted (move / interact / camera / clicks) — not key codes, not mouse position (position stays in memory for aiming); form fields are ignored; everything is local. `Input.features()` returns rounded aggregates only. **Nothing is sent to any model** (AI/API comes at the very end, local models first). Shown in Options > Privacy & data.

## Versioning (standing rule)
Every push to `main` is a new semver version: bump `js/version.js`, add an entry at the top of `CHANGELOG.md`, run `node tools/check-version.mjs`, then push. The owner creates `vX.Y.Z` tags in GitHub Releases (pushing tags from this environment is blocked — do not work around it).
When the remote `main` is ahead (e.g. a workflow change): `git pull --rebase origin main`.

## Testing (headless)
Playwright (Python) with Chromium and `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` gives working WebGL2 without a GPU. Pattern: `python -m http.server` on a copy of the site whose `js/main.js` gets `window.__app = app;` appended (the app object exposes `world`, `settings`, `input`, `rig`, `menu`, `progress`, `mode`, `paused`, `startRun()`…); the script clicks through the menu, sets state and takes screenshots. Listen to `pageerror` and `console` errors. Scope button selectors to `.screen:not([hidden])` (hidden screens contain duplicates).

## Attributions
Palace of Culture and Science: simplified model based on the owner's SketchUp file, author per file metadata **kon.kp**, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Vertices were read from `model.dat` (closed format — heuristic: `float64` triplets in inches every 50 bytes), storey outlines → boxes, scale 0.17 u/m. Photos from the file (Street View/Earth) are deliberately **not** used.
