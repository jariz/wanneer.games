import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { runSlotPicker } from "../flows/slotPicker.ts";
import { createPoll } from "../flows/pollManager.ts";
import { addSessionOptions, getSessionOptions } from "./options.ts";
import { resolveGame } from "../games.ts";

export const data = addSessionOptions(
  new SlashCommandBuilder()
    .setName("wanneer")
    .setDescription("Plan een game sessie in via een poll")
);

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const { group, game: gameOption } = getSessionOptions(interaction);
  const channel = interaction.channel;
  if (!channel?.isSendable()) return;

  const selectedSlots = await runSlotPicker(interaction, group, "poll");
  if (!selectedSlots) return;

  const game = await resolveGame(gameOption);
  if (game === undefined) {
    await interaction.editReply({ content: "❌ Kon de gekozen game niet ophalen. Probeer opnieuw." });
    return;
  }

  await createPoll(interaction, channel, group, game, selectedSlots);
}
