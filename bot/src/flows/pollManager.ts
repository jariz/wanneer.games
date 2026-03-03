import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  Message,
  PollLayoutType,
  TextChannel,
} from "discord.js";
import { eq } from "drizzle-orm";
import { toZonedTime } from "date-fns-tz";
import { db } from "../db/index.ts";
import { polls } from "../db/schema.ts";
import { formatSlot } from "./slotPicker.ts";
import createBooking from "../../../shared/createBooking.ts";
import { env } from "../env.ts";

const POLL_DURATION_HOURS = 24;

let botClient: Client;
export const setBotClient = (client: Client) => {
  botClient = client;
};

export const createPoll = async (
  interaction: ChatInputCommandInteraction,
  group: string,
  game: string | undefined,
  selectedSlots: Date[],
): Promise<void> => {
  const channel = interaction.channel as TextChannel;

  const groupEmoji = group === "kiwis" ? "🥝" : "🦔";
  const gameLabel = game ? ` - ${game}` : "";

  const pollMessage = await channel.send({
    poll: {
      question: { text: `${groupEmoji} Wanneer games?${gameLabel}` },
      answers: selectedSlots.map((slot) => ({
        text: formatSlot(slot),
      })),
      duration: POLL_DURATION_HOURS,
      allowMultiselect: true,
      layoutType: PollLayoutType.Default,
    },
  });

  const finishButton = new ButtonBuilder()
    .setCustomId(`poll_finish:${pollMessage.id}`)
    .setLabel("Poll afronden")
    .setStyle(ButtonStyle.Success);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`poll_cancel:${pollMessage.id}`)
    .setLabel("Annuleren")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    finishButton,
    cancelButton,
  );

  const companionMessage = await channel.send({
    content: "\u200b",
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

  schedulePollFinalization(pollMessage.id, expiresAt);
};

export const schedulePollFinalization = (
  pollMessageId: string,
  expiresAt: number,
): void => {
  const delay = expiresAt - Date.now();
  if (delay <= 0) return; // handled by startup recovery
  setTimeout(() => finalizePoll(pollMessageId, "expired"), delay);
};

export const finalizePoll = async (
  pollMessageId: string,
  reason: "expired" | "manual",
): Promise<void> => {
  if (!botClient) {
    console.error("finalizePoll called before bot client was initialized");
    return;
  }

  const poll = await db.query.polls.findFirst({
    where: eq(polls.pollMessageId, pollMessageId),
  });

  if (!poll || poll.status !== "active") return;

  const channel = botClient.channels.cache.get(poll.channelId);
  if (!(channel instanceof TextChannel)) {
    console.error(
      `Channel ${poll.channelId} is not a TextChannel or not found`,
    );
    return;
  }
  const pollMessage = (await channel.messages.fetch(
    poll.pollMessageId,
  )) as Message<true>;

  if (reason === "manual") {
    await pollMessage.poll?.end();
    // Refetch to get final vote counts after ending
    const refreshed = (await channel.messages.fetch(
      poll.pollMessageId,
    )) as Message<true>;
    return _processResults(poll, channel, refreshed);
  }

  return _processResults(poll, channel, pollMessage);
};

const _processResults = async (
  poll: typeof polls.$inferSelect,
  channel: TextChannel,
  pollMessage: Message<true>,
): Promise<void> => {
  const slotIsos: string[] = JSON.parse(poll.slots);
  const answers = [...(pollMessage.poll?.answers.values() ?? [])];

  // Find winning slot: most votes; tie → earliest (lowest index = earliest since slots are sorted)
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

  const zonedDate = toZonedTime(winningSlot, "Europe/Amsterdam");
  const formattedDate = zonedDate.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });

  await channel.send(
    `✅ Ingepland! **${formattedDate}**${poll.game ? ` - ${poll.game}` : ""}`,
  );

  if (poll.companionMessageId) {
    const companion = await channel.messages.fetch(poll.companionMessageId);
    await companion.delete();
  }

  await db
    .update(polls)
    .set({ status: "completed" })
    .where(eq(polls.pollMessageId, poll.pollMessageId));
};
