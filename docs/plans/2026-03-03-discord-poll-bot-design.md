# Discord Poll Bot Design

**Date:** 2026-03-03

## Overview

A Discord bot that lets users schedule gaming sessions via native Discord polls. Users pick available Cal.com slots, a poll runs for 24 hours, and the winning slot is automatically booked in Cal.com.

## Command

```
/wanneer [group: kiwis*|niglos] [game: string]
```

`*` = default. Both arguments are optional.

## Full Flow

```
/wanneer [group] [game]
→ Fetch Cal.com slots for the event type, from now → +10 days
→ If 0 slots: ephemeral reply "Geen beschikbare tijden gevonden"
→ Post ephemeral message with Discord select menu of available slots
    User picks up to 10 slots → clicks "Maak poll"
→ Post native Discord poll (24h duration, single-answer)
    Options formatted as: "vr 6 mrt – 21:00"
→ Post companion message with "Sluit poll" button (manual finish)
→ Store poll state in SQLite

--- on expiry (24h) OR manual "Sluit poll" ---
→ Read poll results via Discord API
→ Winning slot = most votes; tie → earliest slot wins
→ POST to Cal.com to create booking (with game name if provided)
→ POST /invalidate-bookings to bust Next.js frontend cache
→ Post new public message: "✅ Ingepland: vr 6 mrt 21:00 – Valheim"
→ Set poll status = completed in SQLite
```

On bot startup: query for all `active` polls whose `expiresAt` has passed and process them (handles restart-during-active-poll).

## Architecture

Standalone Node.js + TypeScript bot using discord.js, living in `bot/` within the existing repo. Dockerized for deployment on Coolify.

```
wanneer.games/
├── src/
│   ├── env.ts                    ← new, @t3-oss/env-nextjs
│   ├── lib/
│   │   ├── fetchBookings.ts      ← existing (bot imports directly)
│   │   └── createBooking.ts      ← new Cal.com booking creation
│   └── const/
│       └── eventTypeMap.ts       ← existing (bot imports directly)
├── bot/
│   ├── src/
│   │   ├── index.ts              ← entry, registers slash command, recovers polls on startup
│   │   ├── env.ts                ← @t3-oss/env-core
│   │   ├── db/
│   │   │   ├── schema.ts         ← Drizzle schema
│   │   │   └── index.ts          ← Drizzle SQLite client
│   │   ├── commands/
│   │   │   └── wanneer.ts        ← /wanneer command handler
│   │   └── flows/
│   │       ├── slotPicker.ts     ← ephemeral select menu interaction
│   │       └── pollManager.ts    ← create poll, handle expiry/finish, book slot
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json             ← path alias @ → ../src
```

The bot imports `src/lib/fetchBookings.ts`, `src/lib/createBooking.ts`, and `src/const/eventTypeMap.ts` directly. `"use server"` and Next.js fetch options are silently ignored by Node.js.

## Data Model (SQLite via Drizzle)

```ts
polls {
  id                    integer  primary key autoincrement
  pollMessageId         text     not null unique   // Discord poll message ID
  slotPickerMessageId   text                       // ephemeral picker message ID
  companionMessageId    text                       // "Sluit poll" button message ID
  channelId             text     not null
  group                 text     not null          // "kiwis" | "niglos"
  game                  text                       // optional
  slots                 text     not null          // JSON: ISO datetime strings (ordered, matches poll answer indices)
  status                text     not null          // "active" | "completed" | "cancelled"
  createdAt             integer  not null
  expiresAt             integer  not null
}
```

`slots` is stored as ordered JSON so poll answer index maps directly to a slot datetime when reading results.

## Environment Variables

| Variable | Used by |
|---|---|
| `NEXT_TWITCH_CLIENT_ID` | Next.js app |
| `NEXT_TWITCH_CLIENT_SECRET` | Next.js app |
| `NEXT_CAL_API_KEY` | Both |
| `DISCORD_TOKEN` | Bot |
| `DISCORD_CLIENT_ID` | Bot |
| `NEXT_INVALIDATE_URL` | Bot (URL of the Next.js `/invalidate-bookings` endpoint) |

## t3-env Setup

- `src/env.ts` — `@t3-oss/env-nextjs` with Zod schemas for all Next.js app vars
- `bot/src/env.ts` — `@t3-oss/env-core` with Zod schemas for bot + shared vars
- All `process.env` accesses in existing code replaced with the typed env object

## Key Decisions

- **Always show slot picker** — user always manually selects which slots go in the poll; no automatic path
- **10-day lookahead** — slots fetched from now to +10 days by default
- **Tie-breaking** — earliest slot wins
- **Persistent state** — SQLite with Docker volume; startup recovery handles missed expirations
- **Hosting** — bot on Coolify (Docker), Next.js stays on Vercel for now
- **"Sluit poll" button** — on a separate companion message (Discord native polls don't allow buttons on the same message)
- **Result** — posted as a new public message, not an edit
