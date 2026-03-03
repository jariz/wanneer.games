import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { runSlotPicker } from "../flows/slotPicker.js";

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
  const group = interaction.options.getString("group") ?? "kiwis";
  const game = interaction.options.getString("game") ?? undefined;

  const selectedSlots = await runSlotPicker(interaction, group, game);
  if (!selectedSlots) return;

  // createPoll will be added in Task 9
  console.log("Selected slots:", selectedSlots);
}
