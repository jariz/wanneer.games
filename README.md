# wanneer.games

**Wanneer is de volgende game-sessie?** Deze site beantwoordt die vraag voor twee vriendengroepen (Kiwis & Niglos).

## Wat doet het?

- Toont de eerstvolgende en aankomende sessies
- Eigen planner met clanwachtwoord, live beschikbaarheid en Cal.com als backend
- Doorzoekbare gamebibliotheek en dynamische artwork via IGDB
- Biedt een `.ics` feed aan om te koppelen aan bv. Google Calendar
- Bevat een Discord-bot voor polls en het plannen van nieuwe sessies

## Ontwikkelen

```bash
cp .env.dist .env.local     # vul de benodigde variabelen in
pnpm install
pnpm dev                   # http://localhost:3000
```

### Artwork selecteren

Open `/artworks`. De publieke curator begint met de huidige rotatie
en selectie, toont alle IGDB-artwork en screenshots en kan games toevoegen
via de gamekiezer uit de planner. Klik een thumbnail voor een preview met
dezelfde renderer als de homepage; de checkbox bepaalt onafhankelijk of je
de afbeelding bewaart. Voortgang wordt in deze browser opgeslagen. **Export**
downloadt `artwork-curation.json`: `{ version: 1, games: [{ id, name, artworkIds }] }`.
Een lege `artworkIds`-lijst betekent dat geen afbeelding van die game is gekozen.
Naast Export staat in development een **Save & apply**-knop. Deze schrijft
`lib/artwork-selection.json`; de homepage gebruikt daarna precies die games en
afbeeldingen. Commit dit bestand om de selectie mee te deployen. De standaardlijst
in de planner staat los van deze selectie. Het save-endpoint is buiten development uitgeschakeld.

### Bot

Beperk wie `/wanneer` en `/inplannen` mag gebruiken via Discord → Serverinstellingen
→ Integraties. De bot draait zonder database. Eindigt een poll terwijl de bot
offline is, controleer dan eerst de agenda en gebruik `/inplannen` voor de winnaar
als er nog geen sessie staat.

```bash
pnpm --filter wanneer-games-bot dev
```

## Tech-stack

Next.js · React 19 · UI SDK · Tailwind CSS · Cal.com API · IGDB · Discord.js

Gebruik Node 24 en pnpm 10.34.9. Met Volta: `volta install node@24`,
`VOLTA_FEATURE_PNPM=1 volta install pnpm@10.34.9`.

`KIWIS_PLANNING_PASSWORD` en `NIGLOS_PLANNING_PASSWORD` ontgrendelen ieder
alleen hun eigen clan (minimaal vier tekens, niet hoofdlettergevoelig).
`PLANNING_COOKIE_SECRET` (minimaal 32 willekeurige tekens, bijvoorbeeld
`openssl rand -hex 32`) ondertekent de toegangscookies; stel hem ook in de
productieomgeving in. De planner weigert toegang als een van deze ontbreekt.

De homepage toont de komende maand. ICS-links blijven alle historische en
toekomstige sessies ophalen, gepagineerd.

## Checks

```bash
pnpm lint
pnpm exec tsc --noEmit
node --test lib/fetchBookings.test.mjs
pnpm exec playwright test
pnpm build
```

Browserchecks gebruiken lokale Cal/IGDB-credentials en het Kiwi-clanwachtwoord
uit `.env.local`. Ze maken geen echte afspraken aan.
