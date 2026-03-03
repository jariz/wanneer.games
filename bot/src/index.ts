import { Client, GatewayIntentBits } from "discord.js";
import { env } from "./env.js";
import { runMigrations } from "./db/index.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

runMigrations();

client.once("ready", (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(env.DISCORD_TOKEN);
