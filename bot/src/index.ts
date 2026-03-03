import { Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "./env.js";
import { runMigrations } from "./db/index.js";
import { execute } from "./commands/wanneer.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

runMigrations();

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "wanneer") {
    await execute(interaction).catch(console.error);
  }
});

client.once("ready", (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(env.DISCORD_TOKEN);
