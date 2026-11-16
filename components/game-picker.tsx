"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Combobox, ComboboxClear, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxLabel, ComboboxList, ComboboxStatus, ComboboxTrigger } from "@ui-sdk/react/combobox";
import { ChevronDown, Gamepad2, X } from "lucide-react";
import { findPlanningGames } from "@/app/planning-actions";
import type { Clan } from "@/shared/clans";
import type { Game } from "@/lib/game-types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const minQueryLength = 2;

export type GameChoice = Game | string | null;

const isGame = (choice: GameChoice): choice is Game => typeof choice === "object" && choice !== null;
export const choiceGame = (choice: GameChoice) => (isGame(choice) ? choice : null);
export const choiceName = (choice: GameChoice) => (isGame(choice) ? choice.name : choice ?? "");

function Cover({ game, className }: { game: Game | null; className: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded bg-raised bg-cover bg-center text-quiet ${className}`} style={game?.cover ? { backgroundImage: `url("${game.cover}")` } : undefined}>
      {!game?.cover && <Gamepad2 size={16} />}
    </span>
  );
}

// A game from the list (with artwork and an IGDB link) or any name typed in.
export default function GamePicker({ group, games, value, onValueChange }: {
  group: Clan; games: Game[]; value: GameChoice; onValueChange: (value: GameChoice) => void;
}) {
  const [field, setField] = useState<HTMLDivElement | null>(null);
  const [term, setTerm] = useState("");
  const debouncedTerm = useDebouncedValue(term.slice(0, 80), 350);
  const searching = term.length >= minQueryLength;
  const search = useQuery({
    queryKey: ["games", group, debouncedTerm],
    queryFn: () => findPlanningGames(group, debouncedTerm),
    enabled: debouncedTerm.length >= minQueryLength,
    staleTime: 5 * 60_000,
  });
  const loading = searching && (debouncedTerm !== term || search.isPending);
  const items = searching ? search.data ?? [] : games.filter((game) => game.name.toLowerCase().includes(term.toLowerCase()));

  return (
    <Combobox
      value={value}
      onValueChange={(next) => onValueChange(next === "" ? null : next)}
      allowCustomValue
      // Only typing searches; choosing, clearing or Escape put the text back to a game name or nothing.
      onQueryChange={(query, details) => setTerm(details.reason === "input-change" ? query.trim() : "")}
      itemToValue={(choice) => (isGame(choice) ? String(choice.id) : choice ?? "")}
      itemToLabel={choiceName}
      isItemEqualToValue={(item, current) => (isGame(item) && isGame(current) ? item.id === current.id : item === current)}
      filter={false}
      status={loading ? "loading" : "idle"}
    >
      <ComboboxLabel className="mb-2 block text-[11px] font-medium text-ink">Game</ComboboxLabel>
      <div ref={setField} className="flex items-center gap-2.5 rounded-lg border border-control bg-raised/50 pl-2 pr-1 transition-colors focus-within:border-brand">
        <Cover game={choiceGame(value)} className="h-9 w-7" />
        <ComboboxInput className="min-h-11 min-w-0 flex-1 bg-transparent text-xs text-ink placeholder:text-quiet focus-visible:outline-none" placeholder="Kies of typ een game…" maxLength={120} />
        <span className="flex items-center">
          <ComboboxClear className="grid size-7 place-items-center rounded-md text-quiet hover:bg-raised hover:text-ink" aria-label="Wis game"><X size={15} /></ComboboxClear>
          <ComboboxTrigger className="grid size-7 place-items-center rounded-md text-quiet hover:bg-raised hover:text-ink data-[open]:rotate-180" aria-label="Toon games"><ChevronDown size={16} /></ComboboxTrigger>
        </span>
      </div>
      <ComboboxContent
        anchor={field}
        sideOffset={6}
        className="z-50 w-[var(--anchor-width)] [&:not(:has([data-slot=combobox-item],[data-slot=combobox-status]:not(:empty)))]:hidden overflow-y-auto overscroll-contain rounded-xl border border-white/[.08] bg-surface p-1 shadow-2xl [max-height:min(360px,var(--available-height))] [scrollbar-color:rgb(var(--control))_transparent] [scrollbar-width:thin]"
      >
        <ComboboxStatus className="px-3 py-2.5 text-[11px] text-quiet empty:hidden">
          {(state) => (state.loading ? "Games zoeken…" : null)}
        </ComboboxStatus>
        <ComboboxList>
          {items.map((game) => (
            <ComboboxItem
              key={game.id}
              value={game}
              label={game.name}
              className="flex cursor-pointer items-center gap-3 rounded-lg p-1.5 text-xs text-ink data-[highlighted]:bg-raised/70 data-[selected]:bg-brand/15 data-[selected]:text-brand"
            >
              <Cover game={game} className="h-10 w-[30px]" />
              <span className="truncate">{game.name}</span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
