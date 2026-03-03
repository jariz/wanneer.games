import { Client, Events, GatewayIntentBits, Message, TextChannel } from "discord.js";
import { eq } from "drizzle-orm";
import { env } from "./env.js";
import { runMigrations, db } from "./db/index.js";
import { polls } from "./db/schema.js";
import { execute } from "./commands/wanneer.js";
import { finalizePoll, setBotClient, schedulePollFinalization } from "./flows/pollManager.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

runMigrations();

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "wanneer") {
      await execute(interaction).catch(console.error);
    }
    return;
  }

  if (interaction.isButton()) {
    const [action, pollMessageId] = interaction.customId.split(":");
    if (!pollMessageId) return;

    if (action === "poll_finish") {
      await interaction.deferUpdate();
      await finalizePoll(pollMessageId, "manual").catch(console.error);
      return;
    }

    if (action === "poll_cancel") {
      await interaction.deferUpdate();
      const poll = await db.query.polls.findFirst({
        where: eq(polls.pollMessageId, pollMessageId),
      });
      if (!poll || poll.status !== "active") return;

      const channel = interaction.channel;
      if (!(channel instanceof TextChannel)) return;
      const pollMessage = await channel.messages.fetch(pollMessageId) as Message<true>;
      await pollMessage.poll?.end();

      await db
        .update(polls)
        .set({ status: "cancelled" })
        .where(eq(polls.pollMessageId, pollMessageId));

      if (poll.companionMessageId) {
        const companion = await channel.messages.fetch(poll.companionMessageId);
        await companion.edit({ content: "❌ Poll geannuleerd.", components: [] });
      }

      await channel.send(
        "❌ Poll geannuleerd. Gebruik /wanneer om een nieuwe poll te starten."
      );
    }
  }
});

const recoverPolls = async () => {
  const activePolls = await db.query.polls.findMany({
    where: eq(polls.status, "active"),
  });

  const now = Date.now();

  for (const poll of activePolls) {
    if (poll.expiresAt <= now) {
      console.log(`Recovering expired poll ${poll.pollMessageId}`);
      await finalizePoll(poll.pollMessageId, "expired").catch(console.error);
    } else {
      console.log(`Rescheduling poll ${poll.pollMessageId}`);
      schedulePollFinalization(poll.pollMessageId, poll.expiresAt);
    }
  }
};

client.once("ready", async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
  setBotClient(c);
  await recoverPolls();
});

client.login(env.DISCORD_TOKEN);
