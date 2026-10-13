# Multiplayer — plan i decyzje

Status: **pomysł / nie rozpoczęte**. Gra jest dziś jednoosobowa, w całości po stronie klienta (statyczny hosting na GitHub Pages, bez backendu).

## Ograniczenia wyjściowe
- Hosting statyczny → serwera gry brak; sieć wymaga albo P2P (WebRTC), albo zewnętrznego relaya/serwera.
- Zasada prywatności: **żadnych zapytań sieciowych bez wyraźnej zgody**, CSP dziś ma `connect-src 'self'`. Każda funkcja sieciowa musi być opt-in, zmienić CSP świadomie i opisać to w README.
- Gra jest deterministyczna tylko częściowo (`Math.random` w spawnie wrogów) — trzeba to uporządkować przed synchronizacją.

## Warianty (od najprostszego)
| Wariant | Opis | Plusy | Minusy |
|---|---|---|---|
| A. Co-op P2P (WebRTC, host autorytatywny) | Jeden gracz = host, reszta łączy się przez DataChannel; sygnalizacja ręczna (kopiuj/wklej SDP) lub mały relay | Bez serwera gry, mało kosztów | NAT/TURN bywa potrzebny, host = punkt awarii, cheaty |
| B. Co-op z lekkim serwerem (WebSocket relay/Cloudflare Durable Object) | Serwer przekazuje wiadomości lub trzyma stan pokoju | Stabilne połączenia, kody pokoi | Wymaga backendu, koszty, CSP `connect-src` |
| C. Autorytatywny serwer (Node, symulacja po stronie serwera) | Serwer liczy zombie/pociski, klienci tylko renderują | Odporność na cheaty | Największy koszt i praca; potrzebny wspólny kod symulacji |
| D. Asynchroniczny (tablica wyników / duchy) | Bez gry na żywo: wyniki, wspólny licznik, udostępnianie map | Najtaniej | To nie jest multiplayer na żywo |

**Rekomendacja startowa:** wariant A (co-op 2–4 graczy, host autorytatywny) jako prototyp; wariant B, gdy P2P okaże się zawodny.

## Co trzeba przygotować w kodzie (niezależnie od wariantu)
1. **Oddzielić symulację od renderu**: `world.update(dt, …)` dziś miesza logikę i aktualizację instancji. Wydzielić czysty stan (pozycje, HP, pociski, wrogowie) i funkcję `step(state, inputs, dt)`.
2. **Deterministyczny RNG** (np. istniejące `mulberry32`) z ziarnem pokoju dla spawnu wrogów i mapy.
3. **Wejście jako komendy**: `{tick, move, aim, fire}` zamiast bezpośrednich odczytów w `main.js`.
4. **Wielu graczy**: `world.player` → tablica graczy (model/rig, HP, punkty, kolor); wrogowie wybierają najbliższego gracza; kamera śledzi gracza lokalnego.
5. **Wspólna baza i mapa**: struktury (`tower/wall/crypt`) i mapa miasta synchronizowane jako lista zdarzeń; bank punktów — wspólny albo per gracz (do decyzji).
6. **Protokół wiadomości** (JSON, wersjonowany): `hello`, `snapshot` (20 Hz: pozycje graczy, wrogów w zasięgu, pociski), `input`, `event` (zabójstwo, śmierć, budowa), `ping`. Walidacja każdej wiadomości jak przy imporcie mapy (`clean()`).
7. **Predykcja i interpolacja**: gracz lokalny przewidywany, zdalni interpolowani (bufor ~100 ms); wrogowie interpolowani ze snapshotów.
8. **Limity**: instancje wrogów (110) i pocisków (96) są stałe — przy kilku graczach zwiększyć lub dzielić pulę.

## Otwarte pytania (do decyzji właściciela)
- Co-op czy PvP (lub oba)? Ilu graczy?
- Wspólny bank punktów i wspólna baza czy osobne?
- Czy akceptujemy zewnętrzny serwer/relay (i jaki — darmowy plan Cloudflare/Fly/itp.), czy tylko P2P?
- Czy wyniki/mapy mają być udostępniane online (wariant D)?
- Czy ping/lista pokoi ma być publiczna, czy tylko kody zaproszeń?

## Kroki (proponowana kolejność)
1. Refaktor: czysty stan i `step()` bez three.js (bez zmiany zachowania; test porównawczy).
2. Deterministyczny RNG + tryb „powtórka z ziarnem” jako test regresji.
3. Wielu graczy lokalnie (dwa rigi, drugie sterowanie) — sprawdza model danych bez sieci.
4. Warstwa transportu (interfejs `send/onmessage`) z atrapą w pamięci → potem WebRTC.
5. Lobby: kod pokoju, połączenie, start gry; opt-in i informacja o sieci w menu.
6. Synchronizacja: input → host, snapshoty → klienci; interpolacja.
7. Testy: dwa headless klienty (Playwright) w jednym teście, porównanie stanu.
