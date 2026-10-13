# Capital Quarantine

Postapokaliptyczna Warszawa: człowiek z karabinem kontra zombie, widok z góry, 3D w niskiej rozdzielczości z filtrem pixel-art (three.js). Za punkty po śmierci budujesz bazę. Grasz: <https://michalstankiewicz4-cell.github.io/VS/>
Sterowanie: WASD ruch, LPM strzał, Q/E lub PPM+przeciągnięcie obrót kamery, kółko zoom, Esc menu.

**Dokumentacja:** [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md) (kontekst i pliki) · [`TODO.md`](TODO.md) · [`docs/MULTIPLAYER.md`](docs/MULTIPLAYER.md) · [`CLAUDE.md`](CLAUDE.md) (zasady pracy asystenta) · [`CHANGELOG.md`](CHANGELOG.md)

## Uruchomienie
Moduły ES wymagają serwera (nie działa z `file://`):
- VS Code: rozszerzenie *Live Server* → „Open with Live Server”,
- albo w katalogu projektu: `python -m http.server 8000` i otwórz `http://localhost:8000`.

## Struktura
- `js/render.js` – render do małego bufora + shader końcowy (kwantyzacja, dither, obrys z głębi),
- `js/world.js` – teren, miasto i Pałac, gracz, wrogowie (instancje), struktury bazy, światła i cykl dnia/nocy,
- `js/palace.js` – dane brył Pałacu Kultury,
- `js/input.js` – wejście i statystyki (patrz niżej),
- `js/main.js` – pętla, kamera, panel,
- `vendor/` – three.js 0.186.1 (MIT) wgrany lokalnie; sumy SHA-256 w `vendor/SHA256.txt`.

## Bezpieczeństwo i prywatność
- brak zewnętrznych skryptów, CDN-ów i zapytań sieciowych; CSP w `index.html` dopuszcza tylko zasoby z własnego originu,
- żadnych `eval`, `innerHTML` ani zapisu kluczy (API będzie dodane na końcu),
- statystyki wejścia: zliczane są akcje gry, nie klawisze ani pozycja myszy; pola formularzy są pomijane; wszystko zostaje w pamięci strony,
- pakiet dla AI (`Input.features()`) zawiera tylko zaokrąglone cechy.

## Wersjonowanie
Wersja jest w `js/version.js` (widać ją w grze), historia w `CHANGELOG.md`, a każda wysyłka to nowa wersja (tagi `vX.Y.Z` zakładasz w Releases na GitHubie).
Przed każdym pushem: podbij wersję, dopisz wpis w changelogu i uruchom `node tools/check-version.mjs`.

## Edytor map i przezroczystość
Esc wraca do menu (tam też ustawienia). Menu → „Edytor map": stawianie/usuwanie budynków i obiektów, rozmiar, obrót, eksport/import JSON (zapis lokalny w przeglądarce). Budynki zasłaniające postać robią się częściowo przezroczyste.

## Atrybucje
- Pałac Kultury i Nauki: uproszczony model oparty na modelu SketchUp (BezNazwy6.skp), autor wg metadanych pliku: **kon.kp**, licencja [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). W grze użyto tylko brył wyznaczonych z obrysów kondygnacji (zmieniono: uproszczenie, skala, obrót).

## Cykl dnia i nocy
Czas biegu: ~5 min dnia, ~5 min nocy, naprzemiennie (menu, budowa i edytor zawsze za dnia).

## SEO
Tagi w `index.html` (EN + PL), miniatura `assets/og-image.png`, `sitemap.xml`. Po wdrożeniu dodaj stronę w Google Search Console (typ „Prefiks adresu URL") i wyślij sitemapę.
