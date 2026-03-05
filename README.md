# wanneer.games

**Wanneer is de volgende game-sessie?** Deze site beantwoordt die vraag voor twee Nederlandse gamegroepen (Kiwis & Niglos).

## Wat doet het?

- Toont de eerstvolgende en aankomende sessies
- Laat je nieuwe sessies inplannen via [Cal.com](https://cal.com)
- Biedt een `.ics` kalenderbestand om sessies te exporteren
- Bevat een Discord-bot voor sessie-notificaties

## Ontwikkelen

```bash
cp .env.dist .env          # vul de benodigde variabelen in
npm install
npm run dev                # start de dev-server op http://localhost:3000
```

### Bot

```bash
cd bot && npm install
cd bot && npm run dev
```

## Tech-stack

Next.js · Cal.com API · shadcn/ui · Tailwind CSS · Discord.js
