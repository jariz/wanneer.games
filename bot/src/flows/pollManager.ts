import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Message,
  MessageType,
  PollLayoutType,
  type SendableChannels,
} from "discord.js";
import { formatSlot } from "./slotPicker.ts";
import { bookSlot } from "./booking.ts";
import { buildQuestion, parseQuestion, parseSlot } from "./pollFormat.ts";

const POLL_DURATION_HOURS = 24;

const fetchPollMessage = async (
  channel: SendableChannels,
  pollMessageId: string,
): Promise<Message | undefined> => {
  const message = await channel.messages
    .fetch({ message: pollMessageId, force: true })
    .catch(() => undefined);
  if (message?.poll && message.author.id === channel.client.user.id) {
    return message;
  }
};

export const createPoll = async (
  interaction: ChatInputCommandInteraction,
  channel: SendableChannels,
  group: string,
  game: string | undefined,
  selectedSlots: Date[],
): Promise<void> => {
  const pollMessage = await channel.send({
    poll: {
      question: { text: buildQuestion(group, game) },
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

  await interaction.editReply({
    content: "📊 Poll is gestart!",
    components: [row],
  });
};

// Ending the poll makes Discord post a result message, which
// handlePollResult turns into a booking
export const finishPoll = async (
  channel: SendableChannels,
  pollMessageId: string,
): Promise<"ended" | "noVotes" | "closed"> => {
  const pollMessage = await fetchPollMessage(channel, pollMessageId);
  if (!pollMessage?.poll || pollMessage.poll.resultsFinalized) return "closed";

  const totalVotes = pollMessage.poll.answers.reduce(
    (sum, answer) => sum + (answer.voteCount ?? 0),
    0,
  );
  if (totalVotes <= 0) return "noVotes";

  await pollMessage.poll.end();
  return "ended";
};

// Deleting instead of ending, so Discord doesn't post a result to book
export const cancelPoll = async (
  channel: SendableChannels,
  pollMessageId: string,
): Promise<boolean> => {
  const pollMessage = await fetchPollMessage(channel, pollMessageId);
  if (!pollMessage?.poll || pollMessage.poll.resultsFinalized) return false;

  await pollMessage.delete();
  await channel.send(
    "❌ Poll geannuleerd. Gebruik /wanneer om een nieuwe poll te starten.",
  );
  return true;
};

export const handlePollResult = async (message: Message): Promise<void> => {
  if (message.type !== MessageType.PollResult) return;
  const { channel } = message;
  const pollMessageId = message.reference?.messageId;
  if (!pollMessageId || !channel.isSendable()) return;

  const pollMessage = await fetchPollMessage(channel, pollMessageId);
  const parsed = parseQuestion(pollMessage?.poll?.question.text);
  if (!pollMessage?.poll || !parsed) return;

  // Most votes wins; ties go to the earliest slot, which comes first
  let winner: { text: string | null; voteCount: number } | undefined;
  for (const answer of pollMessage.poll.answers.values()) {
    if (answer.voteCount > (winner?.voteCount ?? 0)) winner = answer;
  }

  if (!winner?.text) {
    await channel.send(
      "❌ Poll verlopen zonder stemmen. Gebruik /wanneer om een nieuwe poll te starten.",
    );
    return;
  }

  const slot = parseSlot(winner.text, pollMessage.createdTimestamp);
  if (!slot) {
    console.error(`Could not read a slot from poll answer "${winner.text}"`);
    await channel.send(`❌ Kon de gekozen tijd niet lezen: ${winner.text}`);
    return;
  }
  if (slot.getTime() <= Date.now()) {
    console.log(`Skipping poll ${pollMessageId}: ${slot.toISOString()} has passed`);
    return;
  }

  try {
    await bookSlot(channel, parsed.group, slot, parsed.game);
  } catch (err) {
    console.error("Failed to create booking:", err);
    await channel.send(`❌ Kon sessie niet inplannen: ${String(err)}`);
  }
};
