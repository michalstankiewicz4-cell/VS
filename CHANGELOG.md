# Changelog

Versioning: `MAJOR.MINOR.PATCH`. Every push to the repository is a new version (number in `js/version.js` + an entry here).
The owner creates `vX.Y.Z` tags in GitHub Releases on commits from this history; pushing tags from a Claude session is blocked.
Bug fix = PATCH, new feature = MINOR, big change to gameplay or the save format = MAJOR.

## [0.12.0] - 2026-10-14
### Added
- **Space folds the city** (Inception effect): everything ahead of the player bends along an arc that rises and curls over the sky; press again to unfold. Visual only (movement, aiming and shooting still use the flat map). Rebindable (Options > Controls: "Fold the city"); the camera zooms out slightly while folded and shadows are switched off during the fold.
- Skyscrapers (14–30 units tall) with a window grid that glows at night, in the outer ring of the default map; the map editor height slider now goes up to 30.
- Two asphalt avenues with lane markings (x = 7 and z = 7).
### Changed
- Bigger map: movement/placement limit 76 → 110, object limit 380 → 560, larger default city and more parked cars. A map you saved earlier in the editor is kept as is; use "Default map" in the editor to get the new layout.
- Buildings and roads are tessellated so they can bend smoothly.

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
