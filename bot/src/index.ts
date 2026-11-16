import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import { env } from "./env.ts";
import * as wanneer from "./commands/wanneer.ts";
import * as inplannen from "./commands/inplannen.ts";
import { cancelPoll, finishPoll, handlePollResult } from "./flows/pollManager.ts";
import { gameChoices } from "./games.ts";

const commands = [wanneer, inplannen];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessagePolls,
  ],
});

client.on(Events.MessageCreate, (message) => {
  handlePollResult(message).catch(console.error);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "game") return;
    await interaction
      .respond(await gameChoices(focused.value))
      .catch(console.error);
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = commands.find((c) => c.data.name === interaction.commandName);
    await command?.execute(interaction).catch(console.error);
    return;
  }

  if (interaction.isButton()) {
    const [action, pollMessageId] = interaction.customId.split(":");
    if (!pollMessageId) return;

    const channel = await client.channels
      .fetch(interaction.channelId)
      .catch(() => null);
    if (!channel?.isSendable()) return;

    if (action === "poll_finish") {
      await interaction.update({
        content: "⏳ Poll wordt afgerond...",
        components: [],
      });
      try {
        const result = await finishPoll(channel, pollMessageId);
        await interaction.editReply({
          content: {
            ended: "✅ Poll is afgerond.",
            noVotes: "❌ Kan poll niet afronden: er zijn nog geen stemmen uitgebracht.",
            closed: "Poll is al afgelopen.",
          }[result],
        });
      } catch (err) {
        console.error(err);
        await interaction.editReply({
          content: "❌ Poll kon niet worden afgerond.",
        });
      }
      return;
    }

    if (action === "poll_cancel") {
      await interaction.update({
        content: "⏳ Poll wordt geannuleerd...",
        components: [],
      });
      try {
        const cancelled = await cancelPoll(channel, pollMessageId);
        await interaction.editReply({
          content: cancelled ? "❌ Poll geannuleerd." : "Poll is al afgelopen.",
        });
      } catch (err) {
        console.error(err);
        await interaction.editReply({
          content: "❌ Poll kon niet worden geannuleerd.",
        });
      }
    }
  }
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);

  const rest = new REST().setToken(env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
    body: commands.map((c) => c.data.toJSON()),
  });
  console.log("Slash commands registered.");
});

client.login(env.DISCORD_TOKEN);
