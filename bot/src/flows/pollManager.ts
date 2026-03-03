import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  PollLayoutType,
  TextChannel,
} from "discord.js";
import { db } from "../db/index.js";
import { polls } from "../db/schema.js";
import { formatSlot } from "./slotPicker.js";

const POLL_DURATION_HOURS = 24;

let botClient: Client;
export const setBotClient = (client: Client) => {
  botClient = client;
};

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
    content: "Poll loopt 24 uur. Eerder afsluiten?",
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
  // TODO: implemented in Task 10
};
