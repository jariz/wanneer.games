import { REST, Routes } from "discord.js";
import { env } from "./env.js";
import { data as wanneer } from "./commands/wanneer.js";

const rest = new REST().setToken(env.DISCORD_TOKEN);

(async () => {
  console.log("Registering slash commands...");
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
    body: [wanneer.toJSON()],
  });
  console.log("Done.");
})();
