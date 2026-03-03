import { Client, GatewayIntentBits } from "discord.js";
import { env } from "./env.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(env.DISCORD_TOKEN);
