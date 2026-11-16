import { clans, isClan } from "../../../shared/clans.ts";
import { formatSlot } from "./slotPicker.ts";

// Everything needed to finish a poll lives in the poll message itself: the
// question holds the group and game, the answers hold the slots. Nothing is
// stored, so a restart can't replay old polls.

// Answers only show weekday, day, month and time, so the slot is recovered by
// formatting every candidate after the poll was created until one matches
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

export const parseSlot = (text: string, createdAt: number): Date | undefined => {
  const first = Math.ceil(createdAt / SLOT_STEP_MS) * SLOT_STEP_MS;
  for (let t = first; t < createdAt + SLOT_SEARCH_MS; t += SLOT_STEP_MS) {
    const candidate = new Date(t);
    if (formatSlot(candidate) === text) return candidate;
  }
};
