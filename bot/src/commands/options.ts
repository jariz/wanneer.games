import {
  ChatInputCommandInteraction,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";
import { clans } from "../../../shared/clans.ts";

export const addSessionOptions = (builder: SlashCommandBuilder) =>
  builder
    .setContexts(InteractionContextType.Guild)
    .addStringOption((option) =>
      option
        .setName("game")
        .setDescription("Welk spel gaan we spelen?")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("group")
        .setDescription("Welke groep? (standaard: kiwis)")
        .setRequired(false)
        .addChoices(
          ...Object.entries(clans).map(([value, clan]) => ({
            name: `${clan.emoji} ${clan.name}`,
            value,
          }))
        )
    );

export const getSessionOptions = (interaction: ChatInputCommandInteraction) => ({
  group: interaction.options.getString("group") ?? "kiwis",
  game: interaction.options.getString("game"),
});
