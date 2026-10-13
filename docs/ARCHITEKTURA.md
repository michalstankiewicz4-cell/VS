# Architektura i kontekst projektu

Gra przeglądarkowa **Warsaw Quarantine**: postapokaliptyczna Warszawa, człowiek z karabinem kontra zombie, widok z góry (rzut izometryczny), 3D renderowane w niskiej rozdzielczości z filtrem pixel-art. Zero zależności poza three.js (wgrany lokalnie), zero zapytań sieciowych.

Publikacja: repo <https://github.com/michalstankiewicz4-cell/VS>, strona <https://michalstankiewicz4-cell.github.io/VS/> (GitHub Pages, workflow `.github/workflows/static.yml`).

## Szybki start dla kogoś, kto wraca do projektu
1. Przeczytaj ten plik, potem [`../TODO.md`](../TODO.md) i (gdy robisz sieć) [`MULTIPLAYER.md`](MULTIPLAYER.md).
2. Uruchom lokalnie: `python -m http.server 8000` w katalogu repo, otwórz `http://localhost:8000` (moduły ES nie działają z `file://`).
3. Zasady pracy (stałe): patrz sekcja „Zasady” niżej.

## Mapa plików
| Plik | Rola |
|---|---|
| `index.html` | Szkielet, CSP, meta SEO + JSON-LD, menu `#ui`, panel budowy `#build`, panel edytora `#ed`, HUD `#hud` (statystyki wejścia, ustawienia renderu) |
| `css/style.css` | Style paneli |
| `js/main.js` | Pętla gry, tryby (`menu`/`play`/`build`/`edit`/`dead`), kamera (obrót, zoom), zapis, edytor map, HUD |
| `js/world.js` | Świat: teren, miasto (budynki/krzyże/Pałac), gracz, wrogowie, pociski, struktury bazy, światła i cykl dnia/nocy, kolizje |
| `js/palace.js` | Dane Pałacu Kultury (bryły) — uproszczony model z pliku SketchUp, CC BY 4.0 |
| `js/render.js` | `PixelPipeline`: render do małego bufora + shader końcowy (paleta, dither, obrys z głębi, winieta) |
| `js/input.js` | Wejście i statystyki akcji (prywatność: patrz niżej) |
| `js/version.js` | `VERSION` (semver) |
| `tools/check-version.mjs` | Kontrola wersji przed pushem |
| `vendor/` | three.js r0.186.1 + `SHA256.txt` + licencja |
| `assets/` | `og-image.png` (miniatura 1200×630), `icon.png` |
| `robots.txt`, `sitemap.xml` | SEO |
| `CHANGELOG.md` | Historia wersji |

## Renderowanie (`js/render.js`)
- Scena three.js → `WebGLRenderTarget` o wysokości `pixelH` (domyślnie 200 px) z `DepthTexture` → pełnoekranowy shader: mnożnik jasności `bright`, kwantyzacja do `levels` poziomów z ditheringiem Bayera 4×4 (`dither`), obrys z różnic głębi (`edge`), winieta. Parametry w `pipe.params`, suwaki w `#hud`.
- Kamera ortograficzna (offset `(0,14,10)` od celu), płaszczyzny near/far −30/90. Obrót wokół osi Y (`yaw`, domyślnie 10°), zoom użytkownika kółkiem 0,5–2,2×. Ruch gracza obracany o `yaw`: `x = mx·cos + mz·sin`, `z = −mx·sin + mz·cos`.
- Obracanie kamery: Q/E albo PPM + przeciągnięcie.

## Świat (`js/world.js`)
- Teren `GROUND = 200`, granica ruchu ±76 (`EDGE`). Strefa bazy: środek, `BASE_ZONE = 30` (wolna od budynków miasta).
- **Instancje**: wrogowie (`ENEMIES = 110`, wspólna geometria z `mergeBoxes`), pociski (`PN = 96`), gruz (`GRAVES = 260`), miasto (`bm`, pojemność 3000). Jedna `InstancedMesh` na budynki; atrybut instancji `aK` = (rodzaj fasady, wysokość góry).
- **Kolizje**: AABB + okręgi; `blkLists = [blockers, cityBlk]`, funkcja `push` wypycha gracza/wrogów, `hitsB` — pociski.
- **Miasto = edytowalna mapa** (`world.map`): obiekty `{t:'b',x,z,w,d,h,s}` (budynek), `{t:'c',x,z,r,s}` (auto/krzyż), `{t:'p',x:0,z:-46,s}` (Pałac Kultury, stały). Limity: 380 obiektów, w/d 3–16, h 1,5–9, bez nachodzenia na strefę bazy. Walidacja w `clean()`/`set()` — nic spoza schematu nie przechodzi (import JSON jest bezpieczny).
- **Przezroczystość budynków**: shader `bmat.onBeforeCompile` — dither-discard fragmentów leżących między kamerą a graczem w promieniu `uR = 2.8`. Uniformy `world.fade.*` ustawia `main.js` co klatkę.
- **Fasada Pałacu**: ten sam materiał, rodzaje 1–5 w shaderze (okna, arkady, szczeliny, tarcze zegara); okna świecą nocą (`uNight`).
- **Struktury bazy** (`COST`): `tower` Stanowisko CKM 25, `wall` barykada 8, `crypt` schron 40 (+25 maks. HP, max 3). Siatka budowy co 2 j., zasięg ±14 komórek; usunięcie zwraca połowę kosztu.
- **Wrogowie**: liczba aktywnych rośnie z czasem (`18 + S.time`, do 110), HP z czasem (`hpFor`: 2/3/4), prędkość rośnie do +80% (`S.time/240`). Zabójstwo = 1 pkt.
- **Cykl dnia i nocy**: okres 600 s (≈5 min dnia + 5 min nocy), przejścia ≈40 s, `nightAt(czas)`, bieg startuje za dnia; menu/budowa/edytor zawsze dzień. `applySky(n)` interpoluje niebo, mgłę, światła i latarkę.
- Punkt startu gracza: `START_Z = -36.5` w `main.js` (dziedziniec przed Pałacem).

## Tryby i przepływ (`js/main.js`)
`menu` → Zagraj (`play`) / Buduj bazę (`build`) / Edytor map (`edit`). Śmierć (`dead`): `bank += pkt + bonus za czas (czas/10)`; za bank buduje się bazę. **Esc** z `play`/`build`/`edit` wraca do menu (z panelem ustawień). Panel `#hud` jest widoczny tylko w menu.

## Zapis (localStorage)
- `gra:save:v1` — `{ bank, best, s: struktury bazy }`
- `gra:map:v1` — lista obiektów mapy (edytor)
Błędy zapisu są połykane (tryb prywatny itp.).

## Edytor map
Menu → „Edytor map”: narzędzia Budynek/Auto/Usuń, obrót (R), suwaki rozmiaru, eksport/import JSON, „Domyślna mapa”. Kamera edytora: WASD (przesuw, ±70), start poza bazą (0, 44). Budynki mogą się nakładać; strefa bazy jest zablokowana, przyczynę odmowy pokazuje `#eInfo`. Bez kosztu punktów.

## Prywatność i bezpieczeństwo
- CSP w `index.html`: `script-src 'self'`, brak zewnętrznych skryptów/CDN, brak `eval`/`innerHTML`, brak kluczy API w repo.
- Statystyki wejścia (`js/input.js`): liczone są **tylko akcje gry** (ruch/unik/interakcja/budowa/kliknięcia) — nie kody klawiszy, nie pozycja myszy (pozycja tylko w pamięci do celowania); pola formularzy i panele (`#hud,#ui,#build,#ed,#top`) są pomijane; wszystko lokalnie. `Input.features()` zwraca tylko zaokrąglone cechy zbiorcze. **Do żadnego modelu nic nie jest wysyłane** (AI/API — na samym końcu, najpierw modele lokalne).

## Wersjonowanie (zasada stała)
Każda wysyłka na `main` = nowa wersja semver: podbij `js/version.js`, dodaj wpis na górze `CHANGELOG.md`, uruchom `node tools/check-version.mjs`, dopiero push. Tagi `vX.Y.Z` zakłada właściciel w GitHub Releases (push tagów z tego środowiska jest blokowany — nie obchodzić).
Gdy zdalne `main` wyprzedza lokalne (np. zmiana workflow): `git pull --rebase origin main`.

## Testowanie (headless)
Playwright (Python) z Chromium i argumentami `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` daje działające WebGL2 bez GPU. Wzorzec: serwer `python -m http.server`, kopia strony z dopisanym na końcu `main.js` hookiem `window.__g = { world, getMode: () => mode, ... }`, skrypt klika menu, ustawia stan i robi zrzuty. Nasłuchuj `pageerror` i `console` (error/warning).

## Atrybucje
Pałac Kultury i Nauki: uproszczony model oparty na pliku SketchUp użytkownika, autor wg metadanych pliku **kon.kp**, licencja [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Wierzchołki odczytano z `model.dat` (format zamknięty — heurystyka: tripletki `float64` w calach co 50 bajtów), obrysy kondygnacji → bryły, skala 0,17 j./m. Zdjęcia z pliku (Street View/Earth) celowo **nie** są używane.
