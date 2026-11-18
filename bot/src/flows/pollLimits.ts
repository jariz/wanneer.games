export const pollDurationHours = 24;
export const maxPollAnswers = 10;

export function isAfterPollClose(slot: Date, startsAt: number) {
  return slot.getTime() > startsAt + pollDurationHours * 60 * 60 * 1000;
}
