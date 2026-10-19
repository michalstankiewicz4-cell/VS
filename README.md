# Capital Quarantine

Post-apocalyptic Warsaw: a man with a rifle against zombies, top-down view, low-resolution 3D with a pixel-art filter (three.js). Points earned after you die pay for your base. Play: <https://michalstankiewicz4-cell.github.io/VS/>

Default controls (all rebindable in Options): WASD move, left mouse fire, F enter/exit a car, C change camera view in a car (isometric / chase / cockpit), I equipment panel (1 food, 2 bandage, 3 water, 4 grenade), Q/E or right-mouse drag rotate the camera, wheel zoom, Esc pause. Map editor extras: T top view, R rotate.

**Documentation:** [`docs/HANDOFF.md`](docs/HANDOFF.md) (resume after losing context) · [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (context and files) · [`TODO.md`](TODO.md) · [`docs/MULTIPLAYER.md`](docs/MULTIPLAYER.md) · [`CLAUDE.md`](CLAUDE.md) (assistant rules) · [`CHANGELOG.md`](CHANGELOG.md)

## Running locally
ES modules need a web server (they do not work from `file://`):
- VS Code: the *Live Server* extension → "Open with Live Server",
- or in the project folder: `python -m http.server 8000` and open `http://localhost:8000`.

## Menus and options
Start screen: Single Player (Start run; Build base opens after you die — the camera starts where you died, or at your starting bunker once you built one), Multiplayer (PvE co-op and PvP, coming soon), Map Editor, Options. Esc pauses a run (it never ends it); in menus Esc goes back. Options: Graphics, Controls (key bindings), Mouse, Language (English / Polski), Privacy & data.

## Structure
- `js/main.js` – entry point; `js/core/` – app shell and mode state machine, camera rig, settings, storage,
- `js/world/` – terrain, sky and day/night, city map and Palace, player, vehicles, enemies, bullets, base structures,
- `js/render/` – pixel-art pipeline (low-res target + final shader),
- `js/input/` – key bindings and input with local statistics (see below),
- `js/i18n/` – English and Polish strings,
- `js/ui/`, `js/modes/` – menus, options, HUD, base builder and map editor,
- `vendor/` – three.js 0.186.1 (MIT) vendored locally; SHA-256 sums in `vendor/SHA256.txt`.

## Security and privacy
- no external scripts or CDNs; the CSP in `index.html` allows only same-origin resources, plus map tile images from `tile.openstreetmap.org` (© OpenStreetMap contributors, ODbL) and `server.arcgisonline.com` (Imagery © Esri) — requested only when you click a tile button in the map editor; Google imagery is not used,
- no `eval`, no `innerHTML`, no stored keys (an API will be added at the very end),
- input statistics: only game actions are counted, never keys or mouse position; form fields are ignored; everything stays local,
- the bundle meant for an AI (`Input.features()`) contains only rounded features.

## Versioning
The version lives in `js/version.js` (shown in the game and the FPS counter), history in `CHANGELOG.md`; every push is a new version (the owner creates `vX.Y.Z` tags in GitHub Releases).
Before every push: bump the version, add a changelog entry and run `node tools/check-version.mjs`.

## Map editor and transparency
Main menu > Map Editor (placing things and the map export/import on the right; sizes, underlay and settings on the left). The editor ignores the player's base completely: the player builds on the finished map later. Everything on the map is an ordinary object, including the Palace of Culture.
- **Select** (default for changing things): click an object to select it; a small bar appears next to it with Move, Rotate, Taller/Lower/Bigger/Smaller (buildings), Longer/Shorter (roads) and Delete. Click empty ground to deselect. Move picks the object up (R rotates it, "Cancel move" puts it back).
- **Building / Car / Road / Palace** place new objects (sliders for size; R rotates), **Remove** deletes the clicked object. Objects cannot overlap (roads may cross roads and lie under cars) (nothing else restricts placement, the centre included); the ghost turns red and the reason is shown. Only one Palace can exist at a time.
- **Top view (T)**: camera straight above (90°) for easier building.
- **Size of things**: sliders for people, vehicles and enemies (0.5–2.0, default 0.5) with a preview at the centre of the view; they apply in play too and also scale speeds, reach, collision and hit radii and the driver cameras (1.0 = the original tuning).
- **Map underlay** (reference image, editor only, not saved): load a screenshot from a file, or opt in to online OpenStreetMap / Esri satellite tiles centred on the Palace spire; scale, rotate and fade it, and use "Our map opacity" to see it through the city. Remove it when done; the built map stays.
- Settings (tool, rotation, top view, sliders) are remembered; "Reset settings" restores defaults, "Default map" restores the default city, "Export/Import map" handle the map contents as JSON (import does not check overlaps), "Export/Import settings" handle only the editor settings.
- **Dev reset** (tiny button, top centre of every screen): two clicks wipe all data stored by the game in the browser and reload.
Buildings that hide the character become partly transparent in the isometric view during a run.

## Attributions
- Palace of Culture and Science: simplified model based on a SketchUp model (BezNazwy6.skp), author per file metadata: **kon.kp**, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Only boxes derived from the storey outlines are used in the game (changed: simplification, scale, rotation).

## Day and night
A run has about 5 min of day and 5 min of night, alternating (menu, building and the editor are always daytime).

## SEO
Tags in `index.html`, thumbnail `assets/og-image.png`, `sitemap.xml`. After deployment add the site in Google Search Console ("URL prefix" type) and submit the sitemap.

## Cars
F enters/exits a nearby car; W/S throttle and brake, A/D steer; running over a zombie kills it. C cycles the camera: isometric, chase, cockpit (drag to look around).
