import type { SendableChannels } from "discord.js";
import createBooking from "../../../shared/createBooking.ts";
import { clans, isClan } from "../../../shared/clans.ts";
import { env } from "../env.ts";
import type { Game } from "../games.ts";

// Throws when the booking fails, so the caller decides who sees the error
export const bookSlot = async (
  channel: SendableChannels,
  group: string,
  start: Date,
  game: Game | null,
): Promise<boolean> => {
  await createBooking({ group, start, game: game?.name, igdbGameId: game?.igdbGameId });

  void fetch(env.NEXT_INVALIDATE_URL, { method: "POST", signal: AbortSignal.timeout(5_000) })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    })
    .catch((error) => console.error("Failed to invalidate bookings:", error));

  const formattedDate = start.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
  const clan = isClan(group) ? `${clans[group].emoji} ${clans[group].label}` : group;

  const announcement = `✅ Ingepland voor ${clan}! **${formattedDate}**${game ? ` - ${game.name}` : ""}`;
  try {
    await channel.send({ content: announcement, allowedMentions: { parse: [] } });
    return true;
  } catch (error) {
    console.error("Booking succeeded, but the Discord announcement failed:", error);
    return false;
  }
};
