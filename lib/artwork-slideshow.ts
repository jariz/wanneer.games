import type { Game } from "./game-types";

export type ArtworkPosition = { history: number[]; cursor: number; previous?: number; remaining?: number[] };

function shuffleArtwork(slides: Game[], indices: number[], recent: number[], random: () => number) {
  const remaining = new Set(indices);
  const deck: number[] = [];
  while (remaining.size) {
    const alternatives = [...remaining].filter((index) => slides[index].artwork !== slides[recent[0]]?.artwork);
    const candidates = alternatives.length ? alternatives : [...remaining];
    const counts = new Map<number, number>();
    for (const index of candidates) counts.set(slides[index].id, (counts.get(slides[index].id) ?? 0) + 1);
    const weighted = candidates.map((index) => {
      const age = recent.findIndex((previous) => slides[previous]?.id === slides[index].id);
      const gamePenalty = [0.05, 0.2, 0.45, 0.7][age] ?? 1;
      // Normalize image counts while favouring games that have not appeared recently.
      return { index, weight: gamePenalty / counts.get(slides[index].id)! };
    });
    let roll = random() * weighted.reduce((sum, item) => sum + item.weight, 0);
    const chosen = weighted.find((item) => (roll -= item.weight) < 0)?.index ?? weighted.at(-1)!.index;
    deck.push(chosen);
    remaining.delete(chosen);
    recent = [chosen, ...recent].slice(0, 6);
  }
  return deck;
}

export function advanceArtwork(slides: Game[], position: ArtworkPosition, direction: number, random = Math.random): ArtworkPosition {
  if (slides.length < 2 || !direction) return position;
  const current = position.history[position.cursor];
  const cursor = position.cursor + Math.sign(direction);
  if (cursor < 0) return position;
  if (cursor < position.history.length) return { ...position, cursor, previous: current };

  const recent = position.history.slice(-6).reverse();
  const indices = slides.map((_, index) => index);
  const remaining = position.remaining?.length
    ? position.remaining
    : shuffleArtwork(slides, position.remaining === undefined ? indices.filter((index) => index !== current) : indices, recent, random);
  const [chosen, ...rest] = remaining;
  const history = [...position.history, chosen].slice(-100);
  return { history, cursor: history.length - 1, previous: current, remaining: rest };
}
