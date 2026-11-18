import { clans, isClan } from "../../../shared/clans.ts";
import { formatSlot } from "./slotPicker.ts";

export const buildSlotLine = (slots: Date[]) =>
  `-# ${slots.map((slot) => `<t:${Math.floor(slot.getTime() / 1000)}:t>`).join(" · ")}`;

export function readSlotLine(content: string, index: number) {
  const line = content.split("\n").find((part) => part.startsWith("-# <t:"));
  const seconds = line && [...line.matchAll(/<t:(\d+):t>/g)][index]?.[1];
  return seconds ? new Date(Number(seconds) * 1000) : undefined;
}

// Older polls only stored localized labels.
const SLOT_STEP_MS = 5 * 60 * 1000;
const SLOT_SEARCH_MS = 14 * 24 * 60 * 60 * 1000;

export const buildQuestion = (group: string, game: string | undefined) =>
  `${isClan(group) ? clans[group].emoji : group} Wanneer games?${game ? ` - ${game}` : ""}`;

export const parseQuestion = (
  text: string | null | undefined,
): { group: string; game: string | undefined } | undefined => {
  const match = text?.match(/^(\S+) Wanneer games\?(?: - (.+))?$/u);
  if (!match) return;
  const group = Object.keys(clans).find(
    (key) => isClan(key) && clans[key].emoji === match[1],
  );
  return group ? { group, game: match[2] } : undefined;
};

// Polls can't hold hidden data, so the IGDB game travels as a link above the
// poll. The angle brackets keep Discord from adding a preview.
export const buildGameLink = (name: string, slug: string) =>
  `🎮 [${name.replace(/[[\]]/g, "")}](<https://www.igdb.com/games/${slug}>)`;

export const parseGameSlug = (content: string): string | undefined =>
  content.match(/igdb\.com\/games\/([a-z0-9-]+)/)?.[1];

export const parseSlot = (text: string, createdAt: number): Date | undefined => {
  const first = Math.ceil(createdAt / SLOT_STEP_MS) * SLOT_STEP_MS;
  for (let t = first; t < createdAt + SLOT_SEARCH_MS; t += SLOT_STEP_MS) {
    const candidate = new Date(t);
    if (formatSlot(candidate) === text) return candidate;
  }
};
