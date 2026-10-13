# TODO

Legenda: **P1** następne, **P2** później, **P3** pomysły. Stan na v0.8.2. Kontekst: [`docs/ARCHITEKTURA.md`](docs/ARCHITEKTURA.md).

## Multiplayer (plan w [`docs/MULTIPLAYER.md`](docs/MULTIPLAYER.md))
- [ ] P2 Decyzja: co-op/PvP, liczba graczy, wspólny bank, P2P czy serwer
- [ ] P2 Refaktor: czysty stan + `step()` bez three.js, deterministyczny RNG
- [ ] P2 Dwóch graczy lokalnie (model danych bez sieci)
- [ ] P2 Warstwa transportu + WebRTC (opt-in, zmiana CSP, opis w README)
- [ ] P2 Lobby (kod pokoju), snapshoty, interpolacja, testy dwóch klientów

## Rozgrywka
- [ ] P1 Zombie nocą: więcej/szybsze po zmroku (dziś cykl dnia i nocy tylko wizualny)
- [ ] P1 Balans: koszty struktur, HP zombie, tempo punktów, bonus za czas
- [ ] P2 Struktury bazy w edytorze map (CKM/barykada/schron jako darmowe narzędzia) — do potwierdzenia, czy potrzebne
- [ ] P2 Więcej typów wrogów i broni; ulepszenia za punkty
- [ ] P2 Dźwięk (strzały, kroki, zmierzch) — bez zewnętrznych plików albo lokalne, mała waga
- [ ] P3 Pogoda, losowe wydarzenia, więcej landmarków Warszawy (Stadion, Złote Tarasy…)

## Wygląd
- [ ] P2 Pałac: podglądy z bliska (zegar, arkady), poprawki proporcji względem modelu
- [ ] P2 Zniszczenia/ruiny budynków, ogień, dym
- [ ] P3 Przełącznik motywów palety/filtra pixel-art w menu

## Edytor map
- [ ] P2 Wskazywanie i zaznaczanie istniejących obiektów, przesuwanie, kopiowanie
- [ ] P2 Pałac Kultury: pozwolić przesuwać/ukrywać? (dziś stały w (0,−46); sprawdzić, czy narzędzie „Usuń” może go skasować — niepotwierdzone testem)
- [ ] P3 Wiele zapisów map, udostępnianie przez link/plik

## Techniczne
- [ ] P1 Skrypt/test E2E w repo (Playwright) zamiast ręcznych skryptów w /tmp
- [ ] P2 Wydajność: profil na słabszych GPU; opcjonalne obniżanie `pixelH`
- [ ] P2 Wersja angielska interfejsu (przełącznik języka); dziś UI po polsku, SEO po angielsku
- [ ] P3 Zapisy: wersjonowanie formatu (`gra:save:v1` → migracje)

## Na samym końcu (decyzja właściciela)
- [ ] AI/API: tylko po wszystkim innym; najpierw modele lokalne; do modelu wyłącznie zaokrąglone, zagregowane cechy z `Input.features()`; statystyki tylko akcji i tylko lokalnie

## Operacyjne
- [ ] Zakładać tagi `vX.Y.Z` w GitHub Releases (właściciel)
- [ ] Dodać stronę w Google Search Console i wysłać `sitemap.xml`
- [ ] Zweryfikować autora modelu Pałacu (kon.kp wg metadanych pliku) i ewentualnie poprawić atrybucję

## Zrobione (skrót)
Render pixel-art, miasto Warszawy i Pałac Kultury z modelu SketchUp, strzelanie i punkty, baza (CKM/barykada/schron), kamera (obrót, zoom), przezroczystość budynków, edytor map, Esc → menu, cykl dnia i nocy, start pod Pałacem, SEO i miniatura. Szczegóły: `CHANGELOG.md`.
