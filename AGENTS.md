# wanneer.games

Use pnpm 10.34.9 (Volta; `VOLTA_FEATURE_PNPM=1`). Install from the root
with `pnpm install`. The root app and `bot` share `pnpm-lock.yaml`.

Before using UI SDK, follow the installed `ui-sdk` skill and read
`node_modules/@ui-sdk/react/docs/llms.txt`. For a new primitive, search
`node_modules/@ui-sdk/react/docs/core.md` by heading and read `rendering.md`
beside it.

Keep Cal credentials and clan passwords server-side. Never create real bookings
as a smoke test. The homepage queries one month; ICS exports all bookings.

## Commands

- `pnpm dev`: Next.js development server with `TZ=UTC`.
- `pnpm build`: production build.
- `pnpm lint`: ESLint.
- `pnpm exec tsc --noEmit`: TypeScript checks.
- `node --test lib/fetchBookings.test.mjs`: booking-fetch regression tests.
- `pnpm --filter wanneer-games-bot dev`: Discord bot.
- `pnpm --filter wanneer-games-bot test`: bot tests.

## Architecture

Next.js App Router with React 19, Tailwind and UI SDK. Pages live under
`app/(clans)/[group]`; `/`, `/inplannen`, and `/ical.ics` rewrite to the `kiwis` clan.
The `(clans)` layout renders the app shell once, above the `[group]` segment, so
it stays mounted across clan switches; it picks the clan with `useParams`.
Clan event type IDs live in `shared/eventTypeMap.ts`; display names in
`lib/clans.ts`.

Styled building blocks live in `components/ui/` as shadcn-style wrappers
around UI SDK parts (`cn` + `cva`, e.g. `Button`/`buttonVariants`). Don't
export loose class-name strings; extract a component instead. Client-side
fetching and mutations go through TanStack Query (`components/providers.tsx`).

Cal.com API calls run server-side. Booking queries use the `bookings` cache
tag with ten-minute revalidation. Successful planning invalidates that tag.
`POST /invalidate-bookings` also supports external invalidation.

Dates and booking windows use `Europe/Amsterdam`. `shared/` contains Cal
helpers used by both the website and Discord bot. `lib/games.ts` resolves
game artwork dynamically through IGDB with Twitch OAuth.

Environment keys are documented in `.env.dist`. Clan planning passwords need
at least four characters and aren't case-sensitive; the rate-limited unlock form
is the only way to test them. Access cookies are HTTP-only and signed with
`PLANNING_COOKIE_SECRET` (32+ characters) over the password's hash, so changing
a password logs that clan out.
Local credentials belong in gitignored `.env.local`.

## Bot deployment

Build from the repository root:
`docker build -f bot/Dockerfile -t wanneer-games-bot .`

Mount `/data` for SQLite persistence, e.g. `-v wanneer-bot-data:/data`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
