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
