# Guidance for the assistant (Claude Code) working in this repo

Project: browser game "Capital Quarantine" (three.js, pixel-art filter). **Start with `docs/HANDOFF.md`** (resume checklist, state, test recipe, traps, decisions). Full context: `docs/ARCHITECTURE.md`; plan: `TODO.md`, `docs/MULTIPLAYER.md`.

## Standing rules (from the owner)
- **Every push = a new version**: bump `js/version.js`, add an entry at the top of `CHANGELOG.md`, run `node tools/check-version.mjs`, then push to `main`; state the version number in your reply.
- **Do not push tags** (blocked; the owner creates tags in Releases). Do not work around the block.
- **API/AI at the very end.** Input statistics only of actions and only locally; only rounded features go to a model; local models first.
- No external scripts/CDNs; CSP `script-src 'self'`. three.js only locally from `vendor/`.
- Change only what was asked ("don't change anything else").
- Reply to the owner in Polish, concisely; say what was and was not verified. Everything in the repo (UI, code comments, docs) is in English; Polish exists only as the optional interface language in `js/i18n/pl.js`.
- Photos from Google files (Street View/Earth) do not go into the repo (licence). Palace: CC BY 4.0 attribution (kon.kp per file metadata) must stay.
- Keep the module/folder structure (see the file map in `docs/ARCHITECTURE.md`); put new UI strings in both `js/i18n/en.js` and `pl.js`.

## Practice
- The remote `main` may be ahead (workflow changes): `git pull --rebase origin main`.
- The "unpushed commit" hook can be a false positive when the local `origin/main` is stale: `git fetch origin +refs/heads/main:refs/remotes/origin/main` and compare `git rev-parse HEAD origin/main`.
- Keep `docs/HANDOFF.md` (State + Decision log), `CHANGELOG.md`, `TODO.md` and the README/ARCHITECTURE sections in step with the code whenever a feature changes.
- Security-sensitive changes (CSP, network access, storage of data) need the owner's explicit approval; if a change is blocked, stop and ask — do not work around it.
- Headless tests: see "Testing" in `docs/ARCHITECTURE.md` (Playwright + SwiftShader).
