# Changelog

Versioning: `MAJOR.MINOR.PATCH`. Every push to the repository is a new version (number in `js/version.js` + an entry here).
The owner creates `vX.Y.Z` tags in GitHub Releases on commits from this history; pushing tags from a Claude session is blocked.
Bug fix = PATCH, new feature = MINOR, big change to gameplay or the save format = MAJOR.

## [0.29.0] - 2026-10-19
### Added
- Car lab (`labs/car.html`): sliders for body style (sedan/hatch/pickup/van), cabin, wheels, bumpers, grille, roof rack, spoiler, stripe, antenna, exhaust; paint preview and night headlights; presets, random, export/import JSON.
- `js/carkit/` (CarKit) and `js/labs/labcore.js` / `js/core/params.js`: shared by the car and turret labs.
### Changed
- Cars in the game are built by CarKit (more detail) and have round wheels (instanced cylinders); the roof is hidden in the cockpit view so the dashboard and wheel stay visible.

## [0.28.1] - 2026-10-19
### Added
- Main menu: a separate "Model Labs" button under "Map Editor" opens the model labs (`labs.html`).

## [0.28.0] - 2026-10-19
### Added
- Model labs: a start screen `labs.html` (a tile per lab, planned labs dimmed) and the first lab, `labs/turret.html`: the sentry gun on sliders (platform, sandbags, pedestal, head, shield, ammo box, sensor lamp, antenna, 1-4 barrels, jacket, muzzle brake, 4 palettes), presets, random, export / import JSON, the game's pixel filter and lighting (day / night), orbit camera, aim sweep / mouse / manual, fire test with recoil and muzzle flash, a player at the game's scale. Settings are remembered in `cq:lab:turret:v1`. The labs are not linked from the game; open `labs.html`.
- `js/turretkit/turretkit.js` (TurretKit): the turret as a function of its parameters, shared by the lab and the game.
### Changed
- The base's sentry gun in the game is now built by TurretKit (new look: two-tier platform with sandbags, pedestal, shielded head, barrel jacket, blinking lamp; recoil and muzzle flash when it fires). Placement size and gameplay are unchanged.

## [0.27.1] - 2026-10-19
### Changed
- Docs only: `docs/HANDOFF.md` no longer repeats the version history (the changelog has it); `CLAUDE.md` says small fixes need only the version bump and a changelog entry.

## [0.27.0] - 2026-10-19
### Added
- Moving sun and moon: the shadow-casting light travels along an arc through the day (rises in the east, high at noon, sets in the west; the moon takes over at night), so shadows turn and shorten/lengthen with the time of day. The light is warmer and dimmer near the horizon.
### Changed
- Nights are darker (less ambient and moon light, closer fog); the torch matters more. Menu, builder and editor keep a fixed late-morning sun.
 - 2026-10-19
### Changed
- The run line names the part of the day instead of day/night: dawn, morning, noon, afternoon, evening, night.

## [0.26.0] - 2026-10-19
### Added
- Ammo and reload (`js/world/weapons.js`): the rifle has a 30-round magazine and 90 spare rounds per run; R (rebindable) reloads in 1.4 s, and firing with an empty magazine reloads by itself. Ammo is shown in the run line and as the Ammo cell of the backpack (click = reload).
- Katana: X (rebindable) or a click on its cell switches rifle / katana. Hold the fire button to slash a cone in front (about 2 units at the default size, +-75 degrees, 0.45 s between swings); it deals 3 damage and knocks zombies back. The model switches (rifle hidden, katana swings).
### Changed
- Key bindings know in which modes an action works, so one key can serve two actions that never share a mode: R is reload in a run and rotate in the map editor. The key list per mode is derived from the bindings.

## [0.25.3] - 2026-10-19
### Fixed
- The see-through hole opens earlier when the player walks behind a building (a margin of about 0.6 units around it, scaled with size), while standing in front of or touching a wall still leaves it solid.

## [0.25.2] - 2026-10-19
### Changed
- Day and night are now 3 minutes each (was 5); the run still starts in daylight at the same point of the day.

## [0.25.1] - 2026-10-19
### Added
- The flashlight can be switched on and off: key L (rebindable) or a click on its cell in the equipment panel (dimmed when off). It starts on every run.

## [0.25.0] - 2026-10-19
### Added
- Grenades: 3 per run, in the backpack. Key 4 (rebindable) or a click on the cell throws one in an arc towards the cursor (up to 14 units); after 0.7 s it explodes, damaging and pushing back every zombie in the radius (about 3.2 units at the default size; it follows the player's size) and killing all of them (counted as kills/points), followed by a short fireball. On foot only; no damage to the player.
### Removed
- Tab no longer pauses the game (added in 0.23.1 by mistake of scope; Esc is the only pause key again).

## [0.24.0] - 2026-10-19
### Added
- Survival basics (`js/world/survival.js`): hunger and thirst fall over time (empty after about 8 and 6 minutes; an empty need drains 1.5 HP/s). A run starts with 3 food, 3 water and 2 bandages in the backpack, shown as item cells in the equipment panel. Click an item or press 1 (food, +35 hunger), 2 (bandage, +30 HP) or 3 (water, +35 thirst); keys are rebindable. Hunger and thirst are shown in the run line. An item is not used when its need is already full. There are no pickups in the world yet.

## [0.23.1] - 2026-10-19
### Fixed
- The see-through hole no longer opens when the player stands right against a wall: the occluder test no longer inflates buildings, so touching a wall from the camera side leaves it solid; the test boxes are now slightly shrunk, so a building that only grazes the line near its edge or corner does not open a hole either.
### Added
- Equipment panel is now a grid of cells (rifle, flashlight, helmet, basic jacket and trousers, 8 empty backpack cells).
- Tab pauses and resumes a run (like Esc).

## [0.23.0] - 2026-10-19
### Added
- Equipment panel during a run (key I, rebindable in Options, closes on pause/death): hands (rifle in the right hand, left hand supports it), clothing (helmet, jacket, trousers) and an empty backpack with slots. It is read-only: the game has no items yet, so it shows what the soldier really has. HUD hint mentions the key.

## [0.22.12] - 2026-10-19
### Fixed
- Standing right next to a wall no longer lights it with a blinding orange hotspot: the player's torch falloff is now capped at close range.

## [0.22.11] - 2026-10-19
### Fixed
- The see-through hole around the player no longer opens where nothing hides him: standing in front of or beside a building (for the current camera angle) leaves its wall and roof solid. Each frame the game checks which buildings the line from the player towards the camera really passes through and only those are faded. The hole also follows the size of the person (or of the car while driving) instead of being sized for a full-size character.

## [0.22.10] - 2026-10-19
### Fixed
- Audit of key handling: game keys were still captured (blocked from the browser and counted in the local input statistics) on the pause menu, in Options opened from it and on the death screen, where they do nothing. They are now handled only while a run, the base builder or the map editor is live and not paused, and then only the keys that mean something in that mode: Rotate (R) and Top view (T) belong to the map editor only, F and C to a run only; movement and camera keys work in all three. Keys without a meaning in the current mode are no longer blocked or counted. Everything else (Esc, browser shortcuts, typing, rebinding keys in Options) is unchanged.

## [0.22.9] - 2026-10-19
### Changed
- A run now starts slightly more zoomed in (×1.27, about two mouse-wheel steps); the wheel still zooms from there (the death screen keeps the same zoom so the view does not jump).

## [0.22.8] - 2026-10-19
### Changed
- Keyboard shortcuts of the game (movement, F, C, R, T, camera keys) are **off in the main menu** (and its sub-screens): they no longer react, are no longer blocked from normal browser use and are not counted in the local input statistics. Esc still goes back; they work again as soon as a run, the builder or the editor starts, and in the pause menu.
### Fixed
- Browser shortcuts such as **Ctrl+R / Ctrl+Shift+R** (reload) did nothing, because the game's R key (rotate) swallowed them. A key pressed together with Ctrl, Alt or Meta is now ignored by the game and left to the browser, in every mode.

## [0.22.7] - 2026-10-19
### Changed
- Default map editor settings are now the owner's tuned setup: top view on, underlay opacity 1, underlay width 223, underlay rotation −110°; sizes of people / vehicles / enemies 0.5, building 8×8×4, road 4×20, city opacity 1, Building tool. Saved settings still win; "Reset settings" restores these.

## [0.22.6] - 2026-10-19
### Changed
- The map editor **ignores the player's base completely**, as if it did not exist: the central base zone is gone (objects, also in imported JSON, can be placed anywhere inside the map edge) and objects are no longer refused over structures or the starting-bunker spawn / car spots. The player will not use the editor, so the base is built later on the finished map (structures still avoid city objects when the player builds).

## [0.22.5] - 2026-10-19
### Changed
- Default pixel height is now 310 (was 250); the other graphics defaults are unchanged. Saved settings are kept; "Reset graphics" restores the new default.

## [0.22.4] - 2026-10-19
### Changed
- Default graphics settings are now the owner's tuned values: pixel height 250, colour levels 7, dithering 0.55, outline 0.75, brightness 1.4, driving field of view 70°, FPS counter off. Settings already saved in a browser are kept; "Reset graphics" restores the new defaults.

## [0.22.3] - 2026-10-19
### Changed
- Code cleanup, no behaviour change: removed unused imports (`START` in two files, `tx`/`t`/`onLang` in the options and builder modules), the dead `grace` and `barOver` state in the editor, the unused `getLang()`, four unused texts (`common.on`, `common.off`, `hud.bank`, `ed.json`) and unneeded `catch (e)` bindings. An ESLint pass (`no-undef`, `no-unused-vars`) is clean. File and folder layout checked and unchanged.

## [0.22.2] - 2026-10-19
### Changed
- Map editor settings (remembered between sessions and in "Export settings" / "Import settings") now also include the **underlay width and rotation**, so after setting them up they stay until you change or remove them. The underlay image itself is still never saved (load it again). The width slider now moves in steps of 1.

## [0.22.1] - 2026-10-19
### Fixed
- Roofs: coplanar surfaces that z-fought (the Palace cornice tops vs. the roofs they sit on, the small cap on the clock tower, the collapsed-roof boxes vs. building tops) are separated by a hair, and the shadow light got a `normalBias` against shadow-map acne on flat tops.

## [0.22.0] - 2026-10-19
### Changed
- **People, vehicles and zombies are now half size by default** (`SIZE_DEFAULT = 0.5` in `js/world/constants.js`; the editor sliders start at 0.5, and sizes saved by older versions are ignored once).
- The sizes now drive gameplay, not just looks (1.0 = the old behaviour): walking speed, car top speed / acceleration / braking / steering saturation, zombie speed, contact and separation distances, collision radii, how close you must be to enter a car, the exit spot, the run-over speed threshold, bullet hit radius, bullet size and muzzle position.
- Driver cameras follow the car size: chase distance and height, the cockpit seat position and the dashboard/wheel overlay. The HUD km/h is shown in original-size units, so it does not change with the size setting.

## [0.21.2] - 2026-10-19
### Changed
- Map editor menu split in two panels. **Right** (`#edr`): everything placed on the map — tools (Select, Building, Car, Road, Palace, Remove, Rotate, Top view), object size sliders, map Export / Import / Default map. **Left** (`#ed`): the rest — Size of things, Map underlay (reference image), Play, Reset settings, settings Export / Import.

## [0.21.1] - 2026-10-19
### Changed
- The game version is now shown next to the title on the main menu (it is still in the footer too).

## [0.21.0] - 2026-10-19
### Added
- **Start over**: new button on the single-player screen (two clicks to confirm) that erases the banked points, best score, base structures, the starting bunker and the saved death position. The map and settings are kept.
### Changed
- Layout: the map editor panel is now on the **left**, the base builder panel is on the **right** (a vertical list instead of the bottom bar).

## [0.20.0] - 2026-10-19
### Added
- Map editor: **editor settings are exported/imported separately from the map contents**. "Export map" / "Import map" handle only objects (buildings, cars, roads, Palace); new "Export settings" / "Import settings" handle only the editor settings (tool, rotation, top view, size and opacity sliders). Neither touches the other, so you no longer paste everything at once.

## [0.19.1] - 2026-10-19
### Changed
- **Default map** is now the owner's hand-tuned layout exported from the map editor (66 buildings, 30 cars, the Palace at its usual spot) instead of the generated one. Data lives in `js/world/data/default-layout.js`; `default-map.js` just returns a copy. Saved maps in the browser are not affected (use dev reset or the editor's reset to get the new default).

## [0.19.0] - 2026-10-19
### Added
- **Starting bunker** (`hq`, "Spawn bunker", free, only one): a new tool in the base builder. Once built, runs start in front of it (the start car stands next to it, the start-screen showcase camera follows) and, after a death, the build camera returns to it. Placing it again moves it; Remove deletes it (the spawn goes back to the Palace courtyard). Its spawn and car spots are kept free of city objects and editor objects. Building range is still the whole map.
### Changed
- After a death the build camera now starts **where you died** (saved as `dp` in the save) instead of flying to the spawn — unless a starting bunker exists, then it goes there.

## [0.18.0] - 2026-10-19
### Changed
- **Base building opens after a death**: "Build base" is available on the death screen (and from Single Player until the next run starts); it is disabled otherwise. The unlock is saved (`pb` in the save) and cleared when a run starts.
- **The whole map is buildable** (was ±14 cells around the centre): the builder camera now pans with the movement keys (zoomed out like the editor). Structures cannot be placed on city objects (buildings, cars, the Palace; roads are fine), within 4 units of the player start or the start car, or outside the map edge.
- The map editor refuses objects that overlap base structures ("a base structure is there"). Loading a save keeps structures even if the map changed since.

## [0.17.1] - 2026-10-19
### Removed
- The graphics style switch from 0.17.0 (realistic / comic / watercolour / noir) was rolled back at the owner's request: the game keeps only the pixel-art look. Code, options and docs are back to the 0.16.5 state (the 0.17.0 entry below stays as history; the Battle styles remain available in that repo and in commit 2d04f4e here).

## [0.17.0] - 2026-10-19
### Added
- Graphics style switch in Options > Graphics (applies instantly, saved): **Pixel art** (default, the original look), **Realistic** (full resolution, bloom, ACES tone mapping, vignette, grain), **Comic (cel)** (ink outlines, posterised colours), **Watercolour** (Kuwahara filter, paper grain, ink edges) and **Noir (VHS)** (a new style: high-contrast monochrome, red kept, scanlines, grain). Real / comic / watercolour are ported from the Battle repo (commit 858b4e0) and adapted to work with the driving (perspective) cameras.
- `?style=pixel|real|toon|paint|noir` in the URL overrides the saved style for previews (not saved).
### Changed
- Pixel-art sliders (height, levels, dithering) show only for the pixel style; the outline slider is hidden for Realistic.
- Rendering goes through `js/render/pipeline.js` (picks the pixel or the full-resolution pipeline). Only the post-process changes — materials and geometry are the same in every style.

## [0.16.5] - 2026-10-18
### Added
- `docs/HANDOFF.md`: a resume guide for when the context is lost (checklist, project state, editor summary, headless test recipe, workflow traps, decision log); linked from README, CLAUDE.md and ARCHITECTURE.
### Changed
- All Markdown files reviewed and updated (CLAUDE.md rules, MULTIPLAYER notes, TODO). No code changes.

## [0.16.4] - 2026-10-14
### Changed
- Documentation brought up to date (README, ARCHITECTURE, TODO): map editor tools, object types, overlap rules, size multipliers, underlay, persistence, dev reset, privacy/CSP note. No code changes.

## [0.16.3] - 2026-10-14
### Fixed
- Map editor: the person/zombie size preview no longer follows the cursor while placing buildings. It appears only while the "Size of things" section is open, at the centre of the view (the section is now closed by default).

## [0.16.2] - 2026-10-14
### Changed
- Map editor Select tool: an object is selected (highlighted, options bar shown) by clicking it, not by hovering; clicking empty ground deselects.

## [0.16.1] - 2026-10-14
### Added
- Small "dev reset" button at the top centre (tooltip explains it): two clicks wipe all data stored in the browser (settings, map, editor settings, save) and reload. The in-game HUD moved 12 px down to make room.

## [0.16.0] - 2026-10-14
### Added
- Map editor: **Select** tool — hover an object to get a floating options bar next to it: Move, Rotate, Taller/Lower/Bigger/Smaller (buildings), Longer/Shorter (roads), Delete. Move picks the object up and puts it down at the cursor (R rotates it, "Cancel move" restores it).
- Map editor: **Palace** tool — the Palace of Culture is now a normal object: it can be moved, deleted and placed again (one at a time, anywhere that is free).
### Fixed
- Objects can no longer be placed over other objects (overlap check for buildings, cars, roads and the Palace; roads may cross roads and lie under cars). Maps that already contain overlaps still load.
### Changed
- The default map no longer parks cars inside the Palace footprint (saved maps are untouched).
- Reason code `palace` now means "only one Palace allowed"; new `overlap`.

## [0.15.2] - 2026-10-14
### Fixed
- Map editor: buildings, cars and roads can no longer be placed on top of the Palace of Culture (footprint check; the ghost turns red with the reason). Maps already containing such objects still load unchanged.

## [0.15.1] - 2026-10-14
### Fixed
- The player was invisible after starting a run: leaving the map editor hid the player model (the 0.15.0 size preview). The preview now restores the player's position and visibility.

## [0.15.0] - 2026-10-14
### Added
- Map editor: "Size of things" sliders (0.5–2.0) for people, vehicles and enemies, with a live preview (a person and a zombie follow the cursor). Vehicle scale also scales parked-car blockers, driving collision and run-over hit area; people/enemy collision radii are unchanged. Saved with the other editor settings; applies in play too.
### Changed
- Map editor panel moved to the right side with the tools as a vertical column.

## [0.14.2] - 2026-10-14
### Added
- Map editor: "Reset settings" button restores tool, rotation, top view and all sliders to defaults (the map itself is untouched; "Default map" resets the map).

## [0.14.1] - 2026-10-14
### Added
- Map editor remembers its settings between sessions (tool, rotation, top view, building/road sliders, map and underlay opacity) in `localStorage` key `cq:editor:v1`. The underlay image is still not saved.

## [0.14.0] - 2026-10-14
### Added
- Map editor: optional online underlay (opt-in, editor only) — OpenStreetMap or Esri World Imagery tiles (7x7 at zoom 17) centred on the Palace spire, with attribution. Google imagery is not used. Not saved; "Remove" drops it.
- Map editor: "Our map opacity" slider (restored to 1 on leaving the editor).
- Map editor: Road tool (flat asphalt with a centre line, width/length sliders, no collision; new object type `r`).
- Map editor: 90° top view (key T, rebindable; button in the panel).
### Changed
- CSP `img-src` now also allows `https://tile.openstreetmap.org` and `https://server.arcgisonline.com` (tiles are requested only after clicking a tile button). To remove the feature: drop the two hosts and `loadTiles` in `js/modes/underlay.js`; built map data stays.

## [0.13.0] - 2026-10-14
### Added
- Map editor underlay: load a map screenshot (any image up to 8 MB, north up) from a file; it lies flat on the ground, centred on the Palace spire, with width (scale), opacity and rotation sliders, "Center on spire" and "Remove". The image is read locally (no network requests, CSP unchanged), downscaled to 2048 px, shown only in the editor and not saved.

## [0.12.1] - 2026-10-14
### Reverted
- Version 0.12.0 (bigger map, skyscrapers, avenues, Space fold effect) was rolled back; the game is exactly as in 0.11.0.

## [0.11.0] - 2026-10-13
### Added
- Start screen: a live 3D showcase of the character next to a car under the Palace of Culture and Science, with the main menu: Single Player (Start run, Build base), Multiplayer (PvE co-op and PvP, both "Soon"), Map Editor and Options.
- Esc now pauses instead of ending the game and opens a pause menu (Resume, Options, Quit to main menu). In the menus Esc goes back one screen. Works in play, base building and the map editor.
- Options: Graphics (the pixel-art filter sliders moved here, driving field of view, FPS counter), Controls (rebindable keys, two slots per action), Mouse (rotation and zoom speed, inversion, fire and drag buttons), Language (English / Polski) and Privacy & data (input statistics, reset progress). Settings are saved locally (`cq:settings:v1`).
- Driver views: **C** cycles isometric, chase (behind the car) and cockpit (driver's seat with a steering wheel). Drag with the camera button to look around; the view re-centres on release.
- A start car parked next to the spawn point.
### Changed
- The whole interface, code comments, documentation and SEO text are now in English (default); Polish remains available as an interface language. Polish documentation removed.
- Code split into folders: `js/core`, `js/world`, `js/render`, `js/input`, `js/i18n`, `js/ui`, `js/modes`; styles split into `css/base.css`, `css/menu.css`, `css/hud.css`.
- The pixel-art filter supports perspective cameras (linearised depth, distance-relative outlines).
- The statistics HUD panel is now part of Options > Privacy & data. Statistics categories: move, interact, camera, clicks.
- Getting out of a car now happens on the driver's (left) side.

## [0.10.0] - 2026-10-13
### Added
- Cars: during a run the cars from the map are vehicles. **F** enters (near a car) / exits. Driving: W/S throttle and brake (reverse), A/D steering; top speed about 54 km/h. Cars collide with walls and other cars; running over a zombie (above about 11 km/h) kills it (+1 pt). Zombies only hurt the car at low speed (half damage). You cannot shoot while driving; sentry guns still work. Parked cars still block movement and bullets. In the editor and menu cars stay static, as before.

## [0.9.1] - 2026-10-13
### Changed
- Game name: **Capital Quarantine** (instead of "Warsaw Quarantine") in the menu, tab title, SEO, README and documentation. "Warsaw" stays in the keywords.

## [0.9.0] - 2026-10-13
### Changed
- Game name: **Warsaw Quarantine** (formerly "Warszawa — Strefa Zero" / "Warsaw Zero Zone") in the menu, tab title, SEO (meta, Open Graph, JSON-LD, noscript), README and documentation. Save keys unchanged.

## [0.8.3] - 2026-10-13
### Added
- Documentation: `docs/ARCHITECTURE.md` (context, files, systems, rules), `docs/MULTIPLAYER.md` (plan), `TODO.md`, `CLAUDE.md` (rules for the assistant); refreshed README. No game changes.

## [0.8.2] - 2026-10-13
### Added
- SEO: English title, description and keywords, canonical, hreflang, Open Graph, Twitter Card, JSON-LD structured data (VideoGame), noscript block, robots.txt, sitemap.xml.
- Thumbnail (assets/og-image.png, 1200×630): the player's start under the Palace of Culture; site icon.

## [0.8.1] - 2026-10-13
### Changed
- Player start point: the courtyard in front of the Palace of Culture (0, -36.5). Nothing else.

## [0.8.0] - 2026-10-13
### Added
- Palace of Culture with procedural details (shader, no photos): window grid, arcades under the main cornice, slim slits, clock faces, pyramid roof and spire, cornices, pinnacles and tower battlements, sandstone colour.
- Some Palace windows glow at night.
### Changed
- Building instance capacity raised to 3000. Brighter, less blown-out daylight.

## [0.7.0] - 2026-10-13
### Added
- Day and night cycle: about 5 min of day and 5 min of night (10 min period, smooth transitions of about 40 s). A run starts in daylight; sky, fog, light and the character's torch change. The HUD shows day/night.

## [0.6.0] - 2026-10-13
### Changed
- Palace of Culture rebuilt from the owner's SketchUp model: stepped tower storeys, corner towers and wings (about 40 units tall, collisions at the wings).
- The default map leaves room for the larger Palace complex.
### Attribution
- Model: kon.kp (per file metadata), CC BY 4.0; credited in the README, menu and code.

## [0.5.2] - 2026-10-13
### Fixed
- Map editor: building was impossible because the view started inside the base zone and buildings could not overlap. The view now starts outside the base, overlapping is allowed, and the editor shows the reason when the preview is red.

## [0.5.1] - 2026-10-13
### Changed
- Esc in play, building and the editor returns to the start menu together with the settings panel (statistics, render).
- The settings panel is hidden outside the menu so it does not cover the game or the editor.

## [0.5.0] - 2026-10-13
### Added
- Buildings become partly transparent (scattered pattern) when they hide the character.
- In-game map editor (menu > Map Editor): buildings, churches/crosses, removal, rotation, size, JSON export/import, default map; saved locally. The base zone stays free.

## [0.4.3] - 2026-10-13
- The check script detects an un-bumped version even with uncommitted changes.

## [0.4.2] - 2026-10-13
- The check script fetches `origin/main` itself before comparing (a shallow clone had no reference point before).

## [0.4.1] - 2026-10-13
- Version check compares against the last pushed `origin/main` (tags are not required).

## [0.4.0] - 2026-10-13
- Versioning added: version number in the game, this file, git tags and the check script `tools/check-version.mjs`.

## [0.3.0] - 2026-10-13
- Default camera rotation of 10°.

## [0.2.0] - 2026-10-13
- Mouse-wheel zoom (0.5×–2.2×).

## [0.1.0] - 2026-10-13
- First version: post-apocalyptic Warsaw, a man with a rifle, zombies, shooting and points.
- Base building after death (sentry gun, barricade, bunker), saved in `localStorage`.
- 3D render with a pixel-art filter (three.js), camera rotation (Q/E, RMB), input statistics kept local only.
