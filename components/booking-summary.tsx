"use client";

import { ArrowRight, LoaderCircle, RefreshCw } from "lucide-react";
import type { Clan } from "@/shared/clans";
import type { Game } from "@/lib/game-types";
import { dateLabel, formatDate } from "@/lib/session-display";
import GamePicker, { type GameChoice } from "./game-picker";
import StepHeading from "./step-heading";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Eyebrow } from "./ui/typography";

export default function BookingSummary({ group, games, game, onGameChange, day, start, canBook, saving, error, onBook, onRefresh }: {
  group: Clan; games: Game[];
  game: GameChoice; onGameChange: (game: GameChoice) => void;
  day: string | null; start: string | null;
  canBook: boolean; saving: boolean; error: string | null;
  onBook: () => void; onRefresh: () => void;
}) {
  return (
    <Card render={<aside />} className="flex flex-col" aria-labelledby="booking-summary-heading">
      <StepHeading className="border-b border-white/[.08] p-5 phone:p-6" step="02" id="booking-summary-heading" title="Game en sessie" description="Kies wat jullie gaan spelen." />
      <div className="flex flex-1 flex-col p-5 phone:p-6">
        <GamePicker group={group} games={games} value={game} onValueChange={onGameChange} />
        <div className="mt-auto pt-6">
          <div className="grid gap-2 border-t border-white/[.08] pt-[18px]">
            <Eyebrow className="text-[7px]">GEKOZEN TIJD</Eyebrow>
            <strong className="text-[13px] font-semibold">{day ? formatDate(`${day}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long" }) : "Nog geen dag gekozen"}</strong>
            <span className="text-[11px] text-quiet">{start ? dateLabel(start, "HH:mm") : "Kies links een beschikbare tijd"}</span>
          </div>
          <Button
            className="relative mt-[22px] w-full"
            disabled={!canBook}
            focusableWhenDisabled
            onClick={onBook}
            data-agent-confirm="Maakt een echte Cal.com-afspraak aan voor de clan"
            pendingAnnouncement="De sessie wordt ingepland"
          >
            Inplannen
            <span className="absolute right-[18px] flex">{saving ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}</span>
          </Button>
          {saving && <p className="mt-2.5 text-center text-[8px] text-quiet">Sessie opslaan…</p>}
          {error && (
            <Alert variant="destructive" className="mt-3.5">
              <p>{error}</p>
              <Button variant="link" size="none" onClick={onRefresh}><RefreshCw size={14} />Ververs beschikbare tijden</Button>
            </Alert>
          )}
        </div>
      </div>
    </Card>
  );
}
