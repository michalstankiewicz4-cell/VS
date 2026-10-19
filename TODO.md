# TODO

Legend: **P1** next, **P2** later, **P3** ideas. State as of v0.22.3. Context: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Multiplayer (plan in [`docs/MULTIPLAYER.md`](docs/MULTIPLAYER.md))
- [ ] P2 Decision: co-op/PvP, player count, shared bank, P2P or server (menu entries "PvE co-op" and "PvP" exist as "Soon")
- [ ] P2 Refactor: pure state + `step()` without three.js, deterministic RNG
- [ ] P2 Two local players (data model without a network)
- [ ] P2 Transport layer + WebRTC (opt-in, CSP change, README note)
- [ ] P2 Lobby (room code), snapshots, interpolation, two-client tests

## Gameplay
- [ ] P1 Zombies at night: more/faster after dusk (the day/night cycle is visual only today)
- [ ] P2 Base: zombies path around structures (the editor's BASE_ZONE was removed in 0.22.6)
- [ ] P1 Balance: structure costs, zombie HP, points pace, time bonus
- [ ] P2 Base structures in the map editor (sentry/barricade/bunker as free tools) — to be confirmed
- [ ] P2 More enemy types and weapons; upgrades for points
- [ ] P2 Sound (shots, steps, dusk) — no external files, or small local ones
- [ ] P3 Weather, random events, more Warsaw landmarks (Stadium, Złote Tarasy…)
- [ ] P2 Cars: damage/fuel, headlights at night, engine sound, car–car collisions, dashboard gauges

## Look
- [ ] P2 Palace: close-up details (clock, arcades), proportion fixes against the model
- [ ] P2 Destruction/ruins of buildings, fire, smoke
- [ ] P2 Cockpit view: proper car interior (hide the bonnet box, dashboard gauges)
- [ ] P3 Palette/filter themes in Options > Graphics

## Menus and settings
- [ ] P2 Gamepad support and bindings
- [ ] P2 Separate volume/sound options once sound exists
- [ ] P3 More languages (add a dictionary in `js/i18n/` and an entry in `LANGS`)

## Map editor
- [ ] P2 Underlay: save it between sessions (IndexedDB); verify real OSM/Esri tile loading and Esri CORS (only tested with mocked tiles)
- [ ] P2 Copy/duplicate objects, multi-select, undo/redo
- [ ] P2 Per-object scale (cars, people) instead of global size sliders (the global sizes already scale speeds, reach and collision radii since 0.22.0)
- [ ] P2 Editor: place base structures and enemy spawn points; roads that connect/auto-join
- [ ] P3 Several map slots, sharing by link/file

## Technical
- [ ] P2 Keep `docs/HANDOFF.md` current (State and Decision log) with every notable change
- [ ] P1 E2E test script in the repo (Playwright) instead of ad-hoc scripts in /tmp (editor flows: select/move/rotate/delete, Palace re-place, overlap, export/import, play after editor)
- [ ] P2 Performance: profile on weaker GPUs; optional automatic lowering of `pixelH`
- [ ] P3 Save format versioning (`gra:save:v1` → migrations)

## At the very end (owner's decision)
- [ ] AI/API: only after everything else; local models first; only rounded, aggregated features from `Input.features()` go to a model; statistics of actions only and only locally

## Operational
- [ ] Create `vX.Y.Z` tags in GitHub Releases (owner)
- [ ] Add the site to Google Search Console and submit `sitemap.xml`
- [ ] Verify the Palace model author (kon.kp per file metadata) and fix the attribution if needed

## Done (summary)
Pixel-art render, Warsaw city and Palace of Culture from a SketchUp model, shooting and points, base (sentry/barricade/bunker), camera (rotate, zoom), building transparency, map editor, day/night cycle, start under the Palace, SEO and thumbnail, drivable cars, start screen with menus, pause on Esc, options (graphics, key bindings, mouse, language, privacy), driver views, English UI with Polish option, code split into modules, map editor with Select/Move/Rotate bar, movable Palace, roads, overlap check, top view, size sliders, underlay (file / OSM / Esri), remembered settings, dev reset. Details: `CHANGELOG.md`.
