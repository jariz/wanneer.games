# Discord Poll Bot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Discord bot that lets users schedule gaming sessions via native Discord polls, automatically booking the winning Cal.com slot.

**Architecture:** Standalone Node.js + TypeScript bot in `bot/` using discord.js v14. Imports shared Cal.com utilities directly from `src/lib/` and `src/const/`. Poll state persisted in SQLite via Drizzle ORM. Deployed as Docker container on Coolify. Next.js app and bot both get t3-env for startup validation.

**Tech Stack:** discord.js v14, drizzle-orm + better-sqlite3, @t3-oss/env-nextjs (app) + @t3-oss/env-core (bot), zod, vitest, tsx, date-fns

---

## Task 1: Add t3-env to Next.js app

**Files:**
- Create: `src/env.ts`
- Modify: `src/components/Background.tsx`
- Modify: `src/lib/fetchBookings.ts`
- Modify: `package.json`

**Step 1: Install dependencies**

```bash
cd /path/to/repo
npm install @t3-oss/env-nextjs zod
```

Expected: packages added to `node_modules`, `package-lock.json` updated.

**Step 2: Create `src/env.ts`**

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NEXT_TWITCH_CLIENT_ID: z.string().min(1),
    NEXT_TWITCH_CLIENT_SECRET: z.string().min(1),
    NEXT_CAL_API_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {},
});
```

**Step 3: Update `src/components/Background.tsx`**

Replace all `process.env.NEXT_TWITCH_CLIENT_ID` and `process.env.NEXT_TWITCH_CLIENT_SECRET` with `env.NEXT_TWITCH_CLIENT_ID` etc. Add import at top:

```ts
import { env } from "@/env";
```

Replace occurrences in `fetchBackgrounds` (URL string) and `getArtworkUrls` headers:
- `process.env.NEXT_TWITCH_CLIENT_ID` → `env.NEXT_TWITCH_CLIENT_ID`
- `process.env.NEXT_TWITCH_CLIENT_SECRET` → `env.NEXT_TWITCH_CLIENT_SECRET`

**Step 4: Update `src/lib/fetchBookings.ts`**

Add import and replace:

```ts
import { env } from "@/env";
```

Replace `process.env.NEXT_CAL_API_KEY as string` → `env.NEXT_CAL_API_KEY`

**Step 5: Verify app still builds**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

**Step 6: Commit**

```bash
git add src/env.ts src/components/Background.tsx src/lib/fetchBookings.ts package.json package-lock.json
git commit -m "feat: add t3-env to Next.js app"
```

---

## Task 2: Add `fetchSlots` Cal.com utility

Fetches available time slots for a group from now to +10 days. Used by the Discord bot.

**Files:**
- Create: `src/lib/fetchSlots.ts`

**Step 1: Create `src/lib/fetchSlots.ts`**

```ts
import eventTypeMap from "@/const/eventTypeMap";
import { addDays } from "date-fns";

interface SlotsResponse {
  status: string;
  data: {
    slots: Record<string, Array<{ time: string }>>;
  };
}

const fetchSlots = async (group: string): Promise<Date[]> => {
  const eventTypeId = eventTypeMap[group];
  const start = new Date();
  const end = addDays(start, 10);

  const url = `https://api.cal.com/v2/slots/available?eventTypeId=${eventTypeId}&startTime=${start.toISOString()}&endTime=${end.toISOString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: process.env.NEXT_CAL_API_KEY as string,
      "Cal-Api-Version": "2024-08-13",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch slots: ${response.statusText}`);
  }

  const body: SlotsResponse = await response.json();

  return Object.values(body.data.slots)
    .flat()
    .map((slot) => new Date(slot.time))
    .sort((a, b) => a.getTime() - b.getTime());
};

export default fetchSlots;
```

**Step 2: Commit**

```bash
git add src/lib/fetchSlots.ts
git commit -m "feat: add fetchSlots Cal.com utility"
```

---

## Task 3: Add `createBooking` Cal.com utility

Creates a booking in Cal.com for a given group, start time, and optional game name.

**Files:**
- Create: `src/lib/createBooking.ts`

**Step 1: Create `src/lib/createBooking.ts`**

```ts
import eventTypeMap from "@/const/eventTypeMap";

interface CreateBookingParams {
  group: string;
  start: Date;
  game?: string;
}

const createBooking = async ({
  group,
  start,
  game,
}: CreateBookingParams): Promise<void> => {
  const eventTypeId = eventTypeMap[group];

  const response = await fetch("https://api.cal.com/v2/bookings", {
    method: "POST",
    headers: {
      Authorization: process.env.NEXT_CAL_API_KEY as string,
      "Cal-Api-Version": "2024-08-13",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      eventTypeId,
      start: start.toISOString(),
      attendee: {
        name: "Gaming Bot",
        email: "games@wanneer.games",
        timeZone: "Europe/Amsterdam",
        language: "nl",
      },
      ...(game && { bookingFieldsResponses: { game } }),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to create booking: ${response.statusText} — ${body}`);
  }
};

export default createBooking;
```

**Step 2: Commit**

```bash
git add src/lib/createBooking.ts
git commit -m "feat: add createBooking Cal.com utility"
```

---

## Task 4: Scaffold bot package

Sets up the `bot/` directory with its own `package.json`, `tsconfig.json`, and entry point.

**Files:**
- Create: `bot/package.json`
- Create: `bot/tsconfig.json`
- Create: `bot/src/index.ts`

**Step 1: Create `bot/package.json`**

```json
{
  "name": "wanneer-games-bot",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx src/index.ts",
    "start": "tsx src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@t3-oss/env-core": "^0.10.1",
    "better-sqlite3": "^11.0.0",
    "date-fns": "^4.1.0",
    "date-fns-tz": "^3.2.0",
    "discord.js": "^14.16.0",
    "drizzle-orm": "^0.38.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^20",
    "drizzle-kit": "^0.29.0",
    "tsx": "^4.19.0",
    "typescript": "^5",
    "vitest": "^2.0.0"
  }
}
```

**Step 2: Create `bot/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "baseUrl": "..",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "../src/**/*"]
}
```

Note: `baseUrl: ".."` (repo root) + `include: ["../src/**/*"]` lets the bot resolve both its own `src/` and the shared `src/` at the repo root. The `@/*` alias maps to `src/*` (repo root `src/`).

**Step 3: Install bot dependencies**

```bash
cd bot
npm install
```

**Step 4: Create `bot/src/index.ts`**

```ts
import { Client, GatewayIntentBits } from "discord.js";
import "./env"; // validate env vars at startup

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
```

**Step 5: Verify TypeScript compiles**

```bash
cd bot
npx tsc --noEmit
```

Expected: no errors.

**Step 6: Commit**

```bash
git add bot/
git commit -m "feat: scaffold bot package"
```

---

## Task 5: Bot t3-env

Validates all required environment variables at bot startup.

**Files:**
- Create: `bot/src/env.ts`
- Update: `.env.dist`

**Step 1: Create `bot/src/env.ts`**

```ts
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DISCORD_TOKEN: z.string().min(1),
    DISCORD_CLIENT_ID: z.string().min(1),
    NEXT_CAL_API_KEY: z.string().min(1),
    NEXT_INVALIDATE_URL: z.string().url(),
    DATABASE_URL: z.string().min(1).default("./data/bot.db"),
  },
  runtimeEnv: process.env,
});
```

**Step 2: Update `bot/src/index.ts` import**

The existing `import "./env"` already imports it. Update it to use the named export so TypeScript is satisfied:

```ts
import { env } from "./env";
// ...
client.login(env.DISCORD_TOKEN);
```

**Step 3: Update `.env.dist`**

Add the new bot variables:

```
NEXT_TWITCH_CLIENT_ID=
NEXT_TWITCH_CLIENT_SECRET=
NEXT_CAL_API_KEY=
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
NEXT_INVALIDATE_URL=http://localhost:3000/invalidate-bookings
DATABASE_URL=./data/bot.db
```

**Step 4: Commit**

```bash
git add bot/src/env.ts .env.dist
git commit -m "feat: add t3-env to bot"
```

---

## Task 6: Bot Drizzle + SQLite schema

Persists poll state so it survives bot restarts.

**Files:**
- Create: `bot/src/db/schema.ts`
- Create: `bot/src/db/index.ts`
- Create: `bot/drizzle.config.ts`

**Step 1: Create `bot/src/db/schema.ts`**

```ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const polls = sqliteTable("polls", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pollMessageId: text("poll_message_id").notNull().unique(),
  companionMessageId: text("companion_message_id"),
  channelId: text("channel_id").notNull(),
  group: text("group").notNull(),
  game: text("game"),
  // JSON array of ISO datetime strings, ordered to match Discord poll answer indices
  slots: text("slots").notNull(),
  status: text("status", { enum: ["active", "completed", "cancelled"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export type Poll = typeof polls.$inferSelect;
export type NewPoll = typeof polls.$inferInsert;
```

**Step 2: Create `bot/src/db/index.ts`**

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "path";
import { env } from "../env";
import * as schema from "./schema";

const sqlite = new Database(env.DATABASE_URL);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

export const runMigrations = () => {
  migrate(db, {
    migrationsFolder: path.join(__dirname, "../../drizzle"),
  });
};
```

**Step 3: Create `bot/drizzle.config.ts`**

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./data/bot.db",
  },
} satisfies Config;
```

**Step 4: Generate migration**

```bash
cd bot
npx drizzle-kit generate
```

Expected: `bot/drizzle/0000_initial.sql` created.

**Step 5: Call `runMigrations()` in `bot/src/index.ts`**

```ts
import { runMigrations } from "./db";

// before client.login:
runMigrations();
```

**Step 6: Verify TypeScript**

```bash
cd bot && npx tsc --noEmit
```

Expected: no errors.

**Step 7: Commit**

```bash
git add bot/src/db/ bot/drizzle/ bot/drizzle.config.ts bot/src/index.ts
git commit -m "feat: add Drizzle SQLite schema and migrations"
```

---

## Task 7: Register `/wanneer` slash command

Creates the Discord slash command definition and a one-time deploy script.

**Files:**
- Create: `bot/src/commands/wanneer.ts`
- Create: `bot/src/deploy-commands.ts`
- Modify: `bot/src/index.ts`

**Step 1: Create `bot/src/commands/wanneer.ts`**

```ts
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("wanneer")
  .setDescription("Plan een game sessie in via een poll")
  .addStringOption((option) =>
    option
      .setName("game")
      .setDescription("Welk spel gaan we spelen?")
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName("group")
      .setDescription("Welke groep? (standaard: kiwis)")
      .setRequired(false)
      .addChoices(
        { name: "🥝 Kiwi's", value: "kiwis" },
        { name: "🦔 Niglo's", value: "niglos" }
      )
  );

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  // implemented in Task 8
  await interaction.reply({ content: "Bezig...", ephemeral: true });
}
```

**Step 2: Create `bot/src/deploy-commands.ts`**

Run this once (or on every deploy) to register the command with Discord.

```ts
import { REST, Routes } from "discord.js";
import { env } from "./env";
import { data as wanneer } from "./commands/wanneer";

const rest = new REST().setToken(env.DISCORD_TOKEN);

(async () => {
  console.log("Registering slash commands...");
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
    body: [wanneer.toJSON()],
  });
  console.log("Done.");
})();
```

Add to `bot/package.json` scripts:

```json
"deploy-commands": "tsx src/deploy-commands.ts"
```

**Step 3: Wire command handler in `bot/src/index.ts`**

```ts
import { Events } from "discord.js";
import { execute } from "./commands/wanneer";

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "wanneer") {
    await execute(interaction).catch(console.error);
  }
});
```

**Step 4: Run deploy script (requires DISCORD_TOKEN + DISCORD_CLIENT_ID in env)**

```bash
cd bot
npm run deploy-commands
```

Expected: "Done." — command appears in Discord server.

**Step 5: Commit**

```bash
git add bot/src/commands/ bot/src/deploy-commands.ts bot/src/index.ts bot/package.json
git commit -m "feat: register /wanneer slash command"
```

---

## Task 8: Slot picker ephemeral flow

Fetches available Cal.com slots and shows an ephemeral select menu so the user can pick which slots to include in the poll (max 10).

**Files:**
- Create: `bot/src/flows/slotPicker.ts`
- Modify: `bot/src/commands/wanneer.ts`
- Modify: `bot/src/index.ts`

**Step 1: Create `bot/src/flows/slotPicker.ts`**

```ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
} from "discord.js";
import { toZonedTime } from "date-fns-tz";
import fetchSlots from "@/lib/fetchSlots";

const TIMEZONE = "Europe/Amsterdam";

export const formatSlot = (date: Date): string => {
  const zoned = toZonedTime(date, TIMEZONE);
  return zoned.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  });
};

export const runSlotPicker = async (
  interaction: ChatInputCommandInteraction,
  group: string,
  game: string | undefined
): Promise<Date[] | null> => {
  const slots = await fetchSlots(group);

  if (slots.length === 0) {
    await interaction.reply({
      content: "❌ Geen beschikbare tijden gevonden in de komende 10 dagen.",
      ephemeral: true,
    });
    return null;
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("slot_select")
    .setPlaceholder("Selecteer tijden voor de poll...")
    .setMinValues(1)
    .setMaxValues(Math.min(10, slots.length))
    .addOptions(
      slots.slice(0, 25).map((slot, i) => ({
        label: formatSlot(slot),
        value: String(i),
      }))
    );

  const confirmButton = new ButtonBuilder()
    .setCustomId("slot_confirm")
    .setLabel("Maak poll")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true);

  const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton);

  const reply = await interaction.reply({
    content: "Selecteer de tijden die je in de poll wilt zetten:",
    components: [row1, row2],
    ephemeral: true,
  });

  let selectedIndices: number[] = [];

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 5 * 60 * 1000, // 5 minute timeout
  });

  collector.on("collect", async (selectInteraction: StringSelectMenuInteraction) => {
    selectedIndices = selectInteraction.values.map(Number);

    const updatedButton = ButtonBuilder.from(confirmButton).setDisabled(false);
    const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(updatedButton);

    await selectInteraction.update({ components: [row1, updatedRow] });
  });

  // Wait for the confirm button
  try {
    const buttonInteraction = await reply.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.customId === "slot_confirm",
      time: 5 * 60 * 1000,
    });

    collector.stop();

    await buttonInteraction.update({
      content: "✅ Poll wordt aangemaakt...",
      components: [],
    });

    return selectedIndices.map((i) => slots[i]);
  } catch {
    // Timeout
    await interaction.editReply({
      content: "⏱️ Timeout — probeer opnieuw met /wanneer.",
      components: [],
    });
    return null;
  }
};
```

**Step 2: Update `bot/src/commands/wanneer.ts` execute function**

```ts
import { runSlotPicker } from "../flows/slotPicker";
import { createPoll } from "../flows/pollManager";

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const group = interaction.options.getString("group") ?? "kiwis";
  const game = interaction.options.getString("game") ?? undefined;

  const selectedSlots = await runSlotPicker(interaction, group, game);
  if (!selectedSlots) return;

  await createPoll(interaction, group, game, selectedSlots);
}
```

**Step 3: Commit**

```bash
git add bot/src/flows/slotPicker.ts bot/src/commands/wanneer.ts
git commit -m "feat: add ephemeral slot picker flow"
```

---

## Task 9: Poll creation

Posts a native Discord poll with the selected slots, a companion message with action buttons, and saves state to SQLite.

**Files:**
- Create: `bot/src/flows/pollManager.ts`

**Step 1: Create `bot/src/flows/pollManager.ts`** (createPoll only)

```ts
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  PollLayoutType,
  TextChannel,
} from "discord.js";
import { addHours } from "date-fns";
import { db } from "../db";
import { polls } from "../db/schema";
import { formatSlot } from "./slotPicker";

const POLL_DURATION_HOURS = 24;

export const createPoll = async (
  interaction: ChatInputCommandInteraction,
  group: string,
  game: string | undefined,
  selectedSlots: Date[]
): Promise<void> => {
  const channel = interaction.channel as TextChannel;

  const groupEmoji = group === "kiwis" ? "🥝" : "🦔";
  const gameLabel = game ? ` — ${game}` : "";

  const pollMessage = await channel.send({
    poll: {
      question: { text: `${groupEmoji} Wanneer games?${gameLabel}` },
      answers: selectedSlots.map((slot) => ({
        text: formatSlot(slot),
      })),
      duration: POLL_DURATION_HOURS,
      allowMultiselect: false,
      layoutType: PollLayoutType.Default,
    },
  });

  const finishButton = new ButtonBuilder()
    .setCustomId(`poll_finish:${pollMessage.id}`)
    .setLabel("✅ Poll afronden")
    .setStyle(ButtonStyle.Success);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`poll_cancel:${pollMessage.id}`)
    .setLabel("❌ Annuleer")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    finishButton,
    cancelButton
  );

  const companionMessage = await channel.send({
    content: `Poll loopt 24 uur. Eerder afsluiten?`,
    components: [row],
  });

  const now = Date.now();
  const expiresAt = now + POLL_DURATION_HOURS * 60 * 60 * 1000;

  await db.insert(polls).values({
    pollMessageId: pollMessage.id,
    companionMessageId: companionMessage.id,
    channelId: channel.id,
    group,
    game: game ?? null,
    slots: JSON.stringify(selectedSlots.map((s) => s.toISOString())),
    status: "active",
    createdAt: now,
    expiresAt,
  });

  // Schedule auto-finalization
  schedulePollFinalization(pollMessage.id, expiresAt);
};

// Populated in Task 10
export const schedulePollFinalization = (
  pollMessageId: string,
  expiresAt: number
): void => {
  const delay = expiresAt - Date.now();
  if (delay <= 0) return; // handled by startup recovery
  setTimeout(() => finalizePoll(pollMessageId, "expired"), delay);
};

// Stub — implemented in Task 10
export const finalizePoll = async (
  _pollMessageId: string,
  _reason: "expired" | "manual"
): Promise<void> => {
  // TODO
};
```

**Step 2: Commit**

```bash
git add bot/src/flows/pollManager.ts
git commit -m "feat: create Discord poll and save state to DB"
```

---

## Task 10: Poll finalization

Reads poll results, determines the winner, creates the Cal.com booking, invalidates the Next.js cache, and posts the result.

**Files:**
- Modify: `bot/src/flows/pollManager.ts`
- Modify: `bot/src/index.ts`

**Step 1: Implement `finalizePoll` in `bot/src/flows/pollManager.ts`**

Add imports at the top:

```ts
import { eq } from "drizzle-orm";
import { Client } from "discord.js";
import createBooking from "@/lib/createBooking";
import { env } from "../env";
```

Add a module-level client reference (set from index.ts):

```ts
let botClient: Client;
export const setBotClient = (client: Client) => {
  botClient = client;
};
```

Replace the `finalizePoll` stub:

```ts
export const finalizePoll = async (
  pollMessageId: string,
  reason: "expired" | "manual"
): Promise<void> => {
  const poll = await db.query.polls.findFirst({
    where: eq(polls.pollMessageId, pollMessageId),
  });

  if (!poll || poll.status !== "active") return;

  const channel = botClient.channels.cache.get(poll.channelId) as TextChannel;
  const pollMessage = await channel.messages.fetch(poll.pollMessageId);

  // End poll early if triggered manually (expire() is a no-op if already ended)
  if (reason === "manual") {
    await pollMessage.poll?.expire();
    // Refetch to get final vote counts
    const refreshed = await channel.messages.fetch(poll.pollMessageId);
    return _processResults(poll, channel, refreshed);
  }

  return _processResults(poll, channel, pollMessage);
};

const _processResults = async (
  poll: typeof polls.$inferSelect,
  channel: TextChannel,
  pollMessage: Awaited<ReturnType<typeof channel.messages.fetch>>
): Promise<void> => {
  const slotIsos: string[] = JSON.parse(poll.slots);
  const answers = [...(pollMessage.poll?.answers.values() ?? [])];

  // Find winning slot: most votes, tie → earliest (lowest index = earliest)
  let winnerIndex = 0;
  let maxVotes = -1;
  for (let i = 0; i < answers.length; i++) {
    if ((answers[i].voteCount ?? 0) > maxVotes) {
      maxVotes = answers[i].voteCount ?? 0;
      winnerIndex = i;
    }
  }

  const winningSlot = new Date(slotIsos[winnerIndex]);

  try {
    await createBooking({
      group: poll.group,
      start: winningSlot,
      game: poll.game ?? undefined,
    });

    await fetch(env.NEXT_INVALIDATE_URL, { method: "POST" });
  } catch (err) {
    console.error("Failed to create booking:", err);
    await channel.send(`❌ Kon sessie niet inplannen: ${String(err)}`);
    return;
  }

  const formattedDate = toZonedTime(winningSlot, "Europe/Amsterdam").toLocaleDateString(
    "nl-NL",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Amsterdam",
    }
  );

  await channel.send(
    `✅ Ingepland! **${formattedDate}**${poll.game ? ` — ${poll.game}` : ""}`
  );

  // Disable companion message buttons
  if (poll.companionMessageId) {
    const companion = await channel.messages.fetch(poll.companionMessageId);
    await companion.edit({ components: [] });
  }

  await db
    .update(polls)
    .set({ status: "completed" })
    .where(eq(polls.pollMessageId, poll.pollMessageId));
};
```

Add `toZonedTime` import at the top:

```ts
import { toZonedTime } from "date-fns-tz";
```

**Step 2: Handle "Sluit poll" and "Annuleer" buttons in `bot/src/index.ts`**

```ts
import { finalizePoll } from "./flows/pollManager";
import { polls } from "./db/schema";
import { eq } from "drizzle-orm";

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "wanneer") {
      await execute(interaction).catch(console.error);
    }
    return;
  }

  if (interaction.isButton()) {
    const [action, pollMessageId] = interaction.customId.split(":");
    if (!pollMessageId) return;

    if (action === "poll_finish") {
      await interaction.deferUpdate();
      await finalizePoll(pollMessageId, "manual");
    }

    if (action === "poll_cancel") {
      await interaction.deferUpdate();
      const poll = await db.query.polls.findFirst({
        where: eq(polls.pollMessageId, pollMessageId),
      });
      if (!poll || poll.status !== "active") return;

      const channel = interaction.channel as TextChannel;
      const pollMessage = await channel.messages.fetch(pollMessageId);
      await pollMessage.poll?.expire();

      await db
        .update(polls)
        .set({ status: "cancelled" })
        .where(eq(polls.pollMessageId, pollMessageId));

      if (poll.companionMessageId) {
        const companion = await channel.messages.fetch(poll.companionMessageId);
        await companion.edit({ content: "❌ Poll geannuleerd.", components: [] });
      }

      await channel.send("❌ Poll geannuleerd. Gebruik /wanneer om een nieuwe poll te starten.");
    }
  }
});
```

**Step 3: Call `setBotClient` in `bot/src/index.ts`**

```ts
import { setBotClient } from "./flows/pollManager";

client.once("ready", (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  setBotClient(c);
  // startup recovery called here in Task 11
});
```

**Step 4: Verify TypeScript**

```bash
cd bot && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Commit**

```bash
git add bot/src/flows/pollManager.ts bot/src/index.ts
git commit -m "feat: implement poll finalization, booking creation, and cancel flow"
```

---

## Task 11: Startup recovery

On startup, processes any polls whose `expiresAt` has passed (bot was down when they expired) and re-schedules those still pending.

**Files:**
- Modify: `bot/src/index.ts`

**Step 1: Create recovery function in `bot/src/index.ts`**

```ts
import { and, eq, lt } from "drizzle-orm";
import { schedulePollFinalization, finalizePoll } from "./flows/pollManager";

const recoverPolls = async () => {
  const activePolls = await db.query.polls.findMany({
    where: eq(polls.status, "active"),
  });

  const now = Date.now();

  for (const poll of activePolls) {
    if (poll.expiresAt <= now) {
      console.log(`Recovering expired poll ${poll.pollMessageId}`);
      await finalizePoll(poll.pollMessageId, "expired").catch(console.error);
    } else {
      console.log(`Rescheduling poll ${poll.pollMessageId}`);
      schedulePollFinalization(poll.pollMessageId, poll.expiresAt);
    }
  }
};
```

**Step 2: Call `recoverPolls` in the `ready` handler**

```ts
client.once("ready", async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  setBotClient(c);
  await recoverPolls();
});
```

**Step 3: Commit**

```bash
git add bot/src/index.ts
git commit -m "feat: recover active polls on bot startup"
```

---

## Task 12: Dockerfile and deploy config

Containerizes the bot for deployment on Coolify.

**Files:**
- Create: `bot/Dockerfile`
- Create: `bot/.dockerignore`

**Step 1: Create `bot/Dockerfile`**

Build context must be the **repo root** (so shared `src/` is available).

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy bot dependencies
COPY bot/package*.json ./bot/
RUN cd bot && npm ci --omit=dev

# Copy shared source and bot source
COPY src/ ./src/
COPY bot/src/ ./bot/src/
COPY bot/drizzle/ ./bot/drizzle/
COPY bot/tsconfig.json ./bot/

# Ensure data directory exists for SQLite
RUN mkdir -p /data

ENV DATABASE_URL=/data/bot.db
ENV NODE_ENV=production

CMD ["./bot/node_modules/.bin/tsx", "bot/src/index.ts"]
```

**Step 2: Create `bot/.dockerignore`**

```
node_modules
dist
data
*.db
```

**Step 3: Build and verify locally**

```bash
# From repo root:
docker build -f bot/Dockerfile -t wanneer-games-bot .
```

Expected: image builds successfully.

**Step 4: Add deploy notes to CLAUDE.md**

In the `bot/` section of CLAUDE.md, add:

```markdown
## Bot

### Development
```bash
cd bot && npm run dev
```

### Deploy commands to Discord (run once per command change)
```bash
cd bot && npm run deploy-commands
```

### Docker build (run from repo root)
```bash
docker build -f bot/Dockerfile -t wanneer-games-bot .
```

Mount a volume for SQLite persistence: `-v wanneer-bot-data:/data`
```

**Step 5: Commit**

```bash
git add bot/Dockerfile bot/.dockerignore CLAUDE.md
git commit -m "feat: add Dockerfile for bot deployment"
```

---

## Implementation complete

All tasks done. The bot:
- Responds to `/wanneer [group] [game]` with an ephemeral slot picker
- Creates a native 24h Discord poll with selected slots
- Posts a companion message with "Sluit poll" and "Annuleer" buttons
- On expiry or manual finish: books the winning Cal.com slot, invalidates the Next.js cache, posts result
- Recovers active polls on restart via SQLite
