# Historia zmian

Wersjonowanie: `MAJOR.MINOR.PATCH`. Każda wysyłka do repozytorium to nowa wersja (numer w `js/version.js` + wpis tutaj).
Tagi `vX.Y.Z` zakłada właściciel na GitHubie (Releases) na commitach z tej historii; push tagów z sesji Claude jest blokowany.
Poprawka błędu = PATCH, nowa funkcja = MINOR, duża zmiana rozgrywki lub zapisu = MAJOR.

## [0.9.1] - 2026-10-13
### Zmieniono
- Nazwa gry: **Capital Quarantine** (zamiast „Warsaw Quarantine”) — menu, tytuł karty, SEO, README, dokumentacja. W słowach kluczowych zostaje „Warsaw”.

## [0.9.0] - 2026-10-13
### Zmieniono
- Nazwa gry: **Warsaw Quarantine** (dawniej „Warszawa — Strefa Zero” / „Warsaw Zero Zone”) w menu, tytule karty, SEO (meta, Open Graph, JSON-LD, noscript), README i dokumentacji. Klucze zapisu bez zmian.

## [0.8.3] - 2026-10-13
### Dodano
- Dokumentacja: `docs/ARCHITEKTURA.md` (kontekst, pliki, systemy, zasady), `docs/MULTIPLAYER.md` (plan), `TODO.md`, `CLAUDE.md` (zasady dla asystenta); odświeżony README. Bez zmian w grze.

## [0.8.2] - 2026-10-13
### Dodano
- SEO: tytuł, opis i słowa kluczowe po angielsku (i po polsku), canonical, hreflang, Open Graph, Twitter Card, dane strukturalne JSON-LD (VideoGame), blok noscript, robots.txt, sitemap.xml.
- Miniatura (assets/og-image.png, 1200×630): start gracza pod Pałacem Kultury; ikona strony.

## [0.8.1] - 2026-10-13
### Zmieniono
- Punkt startu gracza: dziedziniec przed Pałacem Kultury (0, -36,5). Nic więcej.

## [0.8.0] - 2026-10-13
### Dodano
- Pałac Kultury z proceduralnymi detalami (shader, bez zdjęć): siatka okien, arkady pod gzymsem głównej kondygnacji, smukłe szczeliny, tarcze zegara, piramidowy dach i szpic, gzymsy, pinakle i krenelaż baszt, kolor piaskowca.
- Nocą część okien Pałacu świeci.
### Zmieniono
- Pojemność instancji budynków zwiększona do 3000. Jaśniejsze, mniej prześwietlone światło dzienne.

## [0.7.0] - 2026-10-13
### Dodano
- Cykl dnia i nocy: ok. 5 min dnia i 5 min nocy (okres 10 min, płynne przejścia ok. 40 s). Bieg zaczyna się za dnia; zmieniają się niebo, mgła, światło i latarka postaci. W HUD widać „dzień/noc".

## [0.6.0] - 2026-10-13
### Zmieniono
- Pałac Kultury odtworzony z modelu SketchUp użytkownika: wieża ze schodkowymi kondygnacjami, narożne baszty i skrzydła (ok. 40 j. wysokości, kolizje przy skrzydłach).
- Domyślna mapa zostawia wolne miejsce na większy kompleks Pałacu.
### Atrybucja
- Model: kon.kp (wg metadanych pliku), CC BY 4.0; informacja w README, menu i kodzie.

## [0.5.2] - 2026-10-13
### Naprawiono
- Edytor map: nie dało się budować, bo widok startował w strefie bazy, a budynki nie mogły się nakładać. Widok startuje teraz poza bazą, nakładanie jest dozwolone, a przy czerwonym podglądzie edytor podaje przyczynę.

## [0.5.1] - 2026-10-13
### Zmieniono
- Esc w grze, budowaniu i edytorze wraca do menu startowego razem z panelem ustawień (statystyki, render).
- Panel ustawień jest ukryty poza menu, więc nie zasłania gry ani edytora.

## [0.5.0] - 2026-10-13
### Dodano
- Budynki stają się częściowo przezroczyste (rozrzucony wzór), gdy zasłaniają postać.
- Edytor map w grze (menu → „Edytor map"): budynki, kościoły/krzyże, usuwanie, obrót, rozmiar, eksport/import JSON, mapa domyślna; zapis lokalny. Strefa bazy pozostaje wolna.

## [0.4.3] - 2026-10-13
- Skrypt kontrolny wykrywa niepodbitą wersję także przy niezatwierdzonych zmianach.

## [0.4.2] - 2026-10-13
- Skrypt kontrolny sam pobiera `origin/main` przed porównaniem (wcześniej w płytkim klonie nie miał punktu odniesienia).

## [0.4.1] - 2026-10-13
- Kontrola wersji porównuje z ostatnio wysłanym `origin/main` (tagi nie są wymagane).

## [0.4.0] - 2026-10-13
- Dodano wersjonowanie: numer wersji w grze, ten plik, tagi gita i skrypt kontrolny `tools/check-version.mjs`.

## [0.3.0] - 2026-10-13
- Domyślny obrót kamery o 10°.

## [0.2.0] - 2026-10-13
- Zoom kółkiem myszy (0,5×–2,2×).

## [0.1.0] - 2026-10-13
- Pierwsza wersja: Warszawa po apokalipsie, człowiek z karabinem, zombie, strzelanie i punkty.
- Budowanie bazy po śmierci (stanowisko, barykada, schron), zapis w `localStorage`.
- Render 3D z filtrem pixel-art (three.js), obrót kamery (Q/E, PPM), statystyki wejścia tylko lokalnie.
