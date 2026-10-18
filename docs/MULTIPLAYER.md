# Multiplayer — plan and decisions

Status: **idea / not started**. The game is single-player today, fully client-side (static hosting on GitHub Pages, no backend). The main menu already lists "PvE co-op" and "PvP" as "Soon" (disabled buttons in `js/ui/menu.js`).

## Starting constraints
- Static hosting → no game server; networking needs either P2P (WebRTC) or an external relay/server.
- Privacy rule: **no network requests without explicit consent**; the CSP has `connect-src 'self'` today. Every network feature must be opt-in, change the CSP deliberately and be described in the README.
- The game is only partly deterministic (`rnd` in enemy spawns, `Math.random` for the per-object seed `s` in the editor) — this must be cleaned up before synchronising.
- The CSP still has `connect-src 'self'`; since 0.14.0 only `img-src` additionally allows the OSM / Esri tile hosts (opt-in, editor underlay). A multiplayer transport needs its own deliberate CSP change and README note.
- Map editing now has move / rotate / resize / delete and a movable Palace (`map.replace`, `removeAt`, `restore`); a shared map would need these as events (add / replace / remove with indices, validated by `why()`), and the editor-only size multipliers (`world.setScales`) must be agreed between clients or kept local.

## Options (simplest first)
| Option | Description | Pros | Cons |
|---|---|---|---|
| A. P2P co-op (WebRTC, authoritative host) | One player is the host, the others connect over a DataChannel; manual signalling (copy/paste SDP) or a small relay | No game server, low cost | NAT/TURN may be needed, host = single point of failure, cheating |
| B. Co-op with a light server (WebSocket relay / Cloudflare Durable Object) | The server relays messages or holds room state | Stable connections, room codes | Needs a backend, costs, CSP `connect-src` |
| C. Authoritative server (Node, server-side simulation) | The server computes zombies/bullets, clients only render | Cheat resistant | Most cost and work; needs shared simulation code |
| D. Asynchronous (leaderboard / ghosts) | No live play: scores, shared counters, map sharing | Cheapest | Not live multiplayer |

**Starting recommendation:** option A (2–4 player co-op, authoritative host) as a prototype; option B if P2P proves unreliable. PvP would build on the same transport.

## What to prepare in code (whatever the option)
1. **Separate simulation from rendering**: `world.update(dt, …)` still mixes logic with instance updates (the modules in `js/world/` are a first step). Extract pure state (positions, HP, bullets, enemies) and a `step(state, inputs, dt)` function.
2. **Deterministic RNG** (the existing `mulberry32`) seeded per room for enemy spawns and the map.
3. **Input as commands**: `{tick, move, aim, fire}` instead of direct reads in `core/app.js`.
4. **Several players**: `world.player` → an array of players (rig, HP, points, colour); enemies pick the nearest player; the camera follows the local player.
5. **Shared base and map**: structures (`tower/wall/crypt`) and the city map synchronised as an event list; points bank shared or per player (to be decided).
6. **Message protocol** (versioned JSON): `hello`, `snapshot` (20 Hz: player positions, enemies in range, bullets), `input`, `event` (kill, death, build), `ping`. Validate every message like the map import (`clean()`).
7. **Prediction and interpolation**: local player predicted, remote ones interpolated (~100 ms buffer); enemies interpolated from snapshots.
8. **Limits**: enemy (110) and bullet (96) instance pools are fixed — enlarge or split them for several players.

## Open questions (for the owner)
- Co-op or PvP (or both)? How many players?
- Shared points bank and base, or separate?
- Do we accept an external server/relay (and which — a free Cloudflare/Fly plan, etc.) or P2P only?
- Should scores/maps be shared online (option D)?
- Should the ping/room list be public, or invite codes only?

## Steps (proposed order)
1. Refactor: pure state and `step()` without three.js (no behaviour change; comparison test).
2. Deterministic RNG + a "replay with seed" mode as a regression test.
3. Several local players (two rigs, a second control scheme) — checks the data model without a network.
4. Transport layer (`send/onmessage` interface) with an in-memory fake → then WebRTC.
5. Lobby: room code, connection, game start; opt-in and a network notice in the menu.
6. Synchronisation: input → host, snapshots → clients; interpolation.
7. Tests: two headless clients (Playwright) in one test, state comparison.
