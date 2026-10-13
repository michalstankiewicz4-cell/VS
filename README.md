# Warszawa — Strefa Zero (prototyp, three.js + filtr pixel-art)

Pierwszy prototyp renderu: scena 3D w niskiej rozdzielczości, powiększona bez wygładzania, z paletą, ditheringiem i obrysem.
Ruch: WASD / strzałki. Panel po lewej: statystyki wejścia i ustawienia filtra.

## Uruchomienie
Moduły ES wymagają serwera (nie działa z `file://`):
- VS Code: rozszerzenie *Live Server* → „Open with Live Server”,
- albo w katalogu projektu: `python -m http.server 8000` i otwórz `http://localhost:8000`.

## Struktura
- `js/render.js` – render do małego bufora + shader końcowy (kwantyzacja, dither, obrys z głębi),
- `js/world.js` – teren, nagrobki, gracz, wrogowie (instancje), światła,
- `js/input.js` – wejście i statystyki (patrz niżej),
- `js/main.js` – pętla, kamera, panel,
- `vendor/` – three.js 0.186.1 (MIT) wgrany lokalnie; sumy SHA-256 w `vendor/SHA256.txt`.

## Bezpieczeństwo i prywatność
- brak zewnętrznych skryptów, CDN-ów i zapytań sieciowych; CSP w `index.html` dopuszcza tylko zasoby z własnego originu,
- żadnych `eval`, `innerHTML` ani zapisu kluczy (API będzie dodane na końcu),
- statystyki wejścia: zliczane są akcje gry, nie klawisze ani pozycja myszy; pola formularzy są pomijane; wszystko zostaje w pamięci strony,
- pakiet dla AI (`Input.features()`) zawiera tylko zaokrąglone cechy.

## Wersjonowanie
Wersja jest w `js/version.js` (widać ją w grze), historia w `CHANGELOG.md`, a każda wysyłka ma tag `vX.Y.Z`.
Przed każdym pushem: podbij wersję, dopisz wpis w changelogu i uruchom `node tools/check-version.mjs`.
