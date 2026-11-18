import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { runSlotPicker } from "../flows/slotPicker.ts";
import { bookSlot } from "../flows/booking.ts";
import { addSessionOptions, getSessionOptions } from "./options.ts";
import { resolveGame } from "../games.ts";

export const data = addSessionOptions(
  new SlashCommandBuilder()
    .setName("inplannen")
    .setDescription("Plan direct een game sessie in, zonder poll")
);

export async function execute(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const { group, game: gameOption } = getSessionOptions(interaction);
  const channel = interaction.channel;
  if (!channel?.isSendable()) return;

  const selectedSlots = await runSlotPicker(interaction, group, "book");
  if (!selectedSlots) return;

  const game = await resolveGame(gameOption);
  if (game === undefined) {
    await interaction.editReply({ content: "❌ Kon de gekozen game niet ophalen. Probeer opnieuw." });
    return;
  }

  try {
    const announced = await bookSlot(channel, group, selectedSlots[0], game);
    if (!announced) {
      await interaction.editReply({ content: "✅ Sessie ingepland. De aankondiging kon niet worden geplaatst." }).catch(console.error);
      return;
    }
  } catch (err) {
    console.error("Failed to create booking:", err);
    await interaction.editReply({ content: "❌ Inplannen is niet bevestigd. Controleer de agenda voordat je opnieuw probeert." });
    return;
  }
  // The public announcement says it all
  await interaction.deleteReply();
}
