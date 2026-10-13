# Wskazówki dla asystenta (Claude Code) pracującego w tym repo

Projekt: gra przeglądarkowa „Warsaw Zero Zone / Warszawa — Strefa Zero” (three.js, filtr pixel-art). Pełny kontekst: `docs/ARCHITEKTURA.md`; plan: `TODO.md`, `docs/MULTIPLAYER.md`.

## Zasady stałe (od właściciela)
- **Każda wysyłka = nowa wersja**: podbij `js/version.js`, dopisz wpis na górze `CHANGELOG.md`, uruchom `node tools/check-version.mjs`, potem push na `main`; w odpowiedzi podaj numer wersji.
- **Nie wypychaj tagów** (blokowane; tagi zakłada właściciel w Releases). Nie obchodź blokady.
- **API/AI na samym końcu.** Statystyki wejścia tylko akcji i tylko lokalnie; do modelu wyłącznie zaokrąglone cechy; najpierw modele lokalne.
- Bez zewnętrznych skryptów/CDN; CSP `script-src 'self'`. three.js tylko lokalnie z `vendor/`.
- Zmieniaj tylko to, o co poproszono („poza tym nie zmieniaj nic”).
- Odpowiadaj po polsku, zwięźle; piszesz, co było i czego nie było sprawdzone.
- Zdjęcia z plików Google (Street View/Earth) nie wchodzą do repo (licencja). Pałac: atrybucja CC BY 4.0 (kon.kp wg metadanych) musi zostać.

## Praktyka
- Zdalne `main` może wyprzedzać (zmiany workflow): `git pull --rebase origin main`.
- Hook „unpushed commit” bywa fałszywy, gdy lokalny `origin/main` jest nieodświeżony: `git fetch origin +refs/heads/main:refs/remotes/origin/main` i porównaj `git rev-parse HEAD origin/main`.
- Testy headless: patrz „Testowanie” w `docs/ARCHITEKTURA.md` (Playwright + SwiftShader).
