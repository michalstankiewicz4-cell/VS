# Capital Quarantine

Post-apocalyptic Warsaw: a man with a rifle against zombies, top-down view, low-resolution 3D with a pixel-art filter (three.js). Points earned after you die pay for your base. Play: <https://michalstankiewicz4-cell.github.io/VS/>

Default controls (all rebindable in Options): WASD move, left mouse fire, F enter/exit a car, C change camera view in a car (isometric / chase / cockpit), Q/E or right-mouse drag rotate the camera, wheel zoom, Esc pause.

**Documentation:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (context and files) · [`TODO.md`](TODO.md) · [`docs/MULTIPLAYER.md`](docs/MULTIPLAYER.md) · [`CLAUDE.md`](CLAUDE.md) (assistant rules) · [`CHANGELOG.md`](CHANGELOG.md)

## Running locally
ES modules need a web server (they do not work from `file://`):
- VS Code: the *Live Server* extension → "Open with Live Server",
- or in the project folder: `python -m http.server 8000` and open `http://localhost:8000`.

## Menus and options
Start screen: Single Player (Start run, Build base), Multiplayer (PvE co-op and PvP, coming soon), Map Editor, Options. Esc pauses a run (it never ends it); in menus Esc goes back. Options: Graphics, Controls (key bindings), Mouse, Language (English / Polski), Privacy & data.

## Structure
- `js/main.js` – entry point; `js/core/` – app shell and mode state machine, camera rig, settings, storage,
- `js/world/` – terrain, sky and day/night, city map and Palace, player, vehicles, enemies, bullets, base structures,
- `js/render/` – pixel-art pipeline (low-res target + final shader),
- `js/input/` – key bindings and input with local statistics (see below),
- `js/i18n/` – English and Polish strings,
- `js/ui/`, `js/modes/` – menus, options, HUD, base builder and map editor,
- `vendor/` – three.js 0.186.1 (MIT) vendored locally; SHA-256 sums in `vendor/SHA256.txt`.

## Security and privacy
- no external scripts, CDNs or network requests; the CSP in `index.html` only allows resources from the same origin,
- no `eval`, no `innerHTML`, no stored keys (an API will be added at the very end),
- input statistics: only game actions are counted, never keys or mouse position; form fields are ignored; everything stays local,
- the bundle meant for an AI (`Input.features()`) contains only rounded features.

## Versioning
The version lives in `js/version.js` (shown in the game and the FPS counter), history in `CHANGELOG.md`; every push is a new version (the owner creates `vX.Y.Z` tags in GitHub Releases).
Before every push: bump the version, add a changelog entry and run `node tools/check-version.mjs`.

## Map editor and transparency
Main menu > Map Editor: place/remove buildings and cars, size, rotation, JSON export/import (saved locally in the browser). Buildings that hide the character become partly transparent in the isometric view.

## Attributions
- Palace of Culture and Science: simplified model based on a SketchUp model (BezNazwy6.skp), author per file metadata: **kon.kp**, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Only boxes derived from the storey outlines are used in the game (changed: simplification, scale, rotation).

## Day and night
A run has about 5 min of day and 5 min of night, alternating (menu, building and the editor are always daytime).

## SEO
Tags in `index.html`, thumbnail `assets/og-image.png`, `sitemap.xml`. After deployment add the site in Google Search Console ("URL prefix" type) and submit the sitemap.

## Cars
F enters/exits a nearby car; W/S throttle and brake, A/D steer; running over a zombie kills it. C cycles the camera: isometric, chase, cockpit (drag to look around).
