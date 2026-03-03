# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (runs with TZ=UTC — required for correct date handling)
npm run build    # Production build
npm run lint     # ESLint via next lint
```

No test suite exists in this project.

## Architecture

**wanneer.games** is a Next.js 14 (App Router) site that answers "when is the next gaming session?" for two Dutch gaming groups.

### Groups & routing

Groups are defined in `shared/eventTypeMap.ts` — a map from group slug (e.g. `kiwis`, `niglos`) to a Cal.com event type ID. Adding a new group requires adding an entry here and updating `components/groups-tab.tsx`.

The root paths `/`, `/inplannen`, and `/ical.ics` are rewritten to the `kiwis` group via `next.config.mjs`. All actual pages live under `app/[group]/`.

| Route | Purpose |
|---|---|
| `[group]/` | Main page — shows next/upcoming sessions |
| `[group]/inplannen` | Cal.com embed for booking a session |
| `[group]/ical.ics` | Generates and downloads an `.ics` calendar file |
| `POST /invalidate-bookings` | Revalidates the `bookings` Next.js cache tag |

### Data flow

- **Bookings**: Fetched from Cal.com API v2 (`fetchBookings` in `lib/fetchBookings.ts`) using `NEXT_CAL_API_KEY`. Cached with tag `bookings` (10-minute revalidation). Cache is invalidated on successful booking (via the `invalidate` server action in `app/actions.ts`) and can also be triggered externally via `POST /invalidate-bookings`.
- **Background images**: Fetched server-side in `components/Background.tsx` from IGDB using Twitch OAuth (`NEXT_TWITCH_CLIENT_ID`, `NEXT_TWITCH_CLIENT_SECRET`). A fixed list of game IDs is used (not dynamic).
- **Shared code**: `shared/` contains code used by both Next.js and the bot (`fetchSlots.ts`, `createBooking.ts`, `eventTypeMap.ts`).

### Environment variables

See `.env.dist`:
- `NEXT_TWITCH_CLIENT_ID` / `NEXT_TWITCH_CLIENT_SECRET` — IGDB artwork via Twitch OAuth
- `NEXT_CAL_API_KEY` — Cal.com API key (used as raw `Authorization` header value)

### UI stack

shadcn/ui components (button, tabs, toast/toaster) with Radix UI primitives and Tailwind CSS. Geist fonts loaded locally. All dates are handled in `Europe/Amsterdam` timezone; the dev server forces `TZ=UTC` to avoid host-timezone interference.

## Bot

```bash
cd bot && npm run dev          # Run bot in development
cd bot && npm run deploy-commands  # Register slash commands with Discord (run once per change)
```

Docker build (run from **repo root**):
```bash
docker build -f bot/Dockerfile -t wanneer-games-bot .
```

Mount a volume for SQLite persistence: `-v wanneer-bot-data:/data`
