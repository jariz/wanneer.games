"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { loadPlanningMonth, planSession } from "@/app/planning-actions";
import { clans, type Clan } from "@/shared/clans";
import type { Game } from "@/lib/game-types";
import { usePinnedBackdrop } from "./backdrop";
import BookingConfirmation from "./booking-confirmation";
import BookingSummary from "./booking-summary";
import { choiceGame, choiceName, type GameChoice } from "./game-picker";
import PageContainer from "./page-container";
import SlotPicker from "./slot-picker";
import { PageHeader, PageTitle } from "./ui/typography";

type BookingInput = { start: string; game: string; igdbGameId?: number };

async function fetchSlots(group: Clan, month: string) {
  const result = await loadPlanningMonth(group, month).catch(() => null);
  if (!result) throw new Error("Verbinding kwijt. Probeer opnieuw.");
  if (!result.ok) throw new Error(result.message);
  return result.slots;
}

async function bookSession(group: Clan, input: BookingInput) {
  const result = await planSession(group, input).catch(() => null);
  if (!result) throw new Error("Verbinding kwijt. Controleer de agenda voordat je opnieuw probeert.");
  if (!result.ok) throw new Error(result.message);
}

export default function Planner({ group, initialMonth, initialSlots, games, today, maxDate }: {
  group: Clan; initialMonth: string; initialSlots: string[] | undefined;
  games: Game[]; today: string; maxDate: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [game, setGame] = useState<GameChoice>(null);
  usePinnedBackdrop(choiceGame(game)?.id ?? null);

  const slots = useQuery({
    queryKey: ["slots", group, month],
    queryFn: () => fetchSlots(group, month),
    initialData: month === initialMonth ? initialSlots : undefined,
  });
  const booking = useMutation({
    mutationFn: (input: BookingInput) => bookSession(group, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots", group] });
      router.refresh();
    },
  });

  function clearSelection() {
    setDay(null);
    setTime(null);
    booking.reset();
  }

  const loading = slots.isFetching && !slots.data;

  if (booking.isSuccess && booking.variables) return (
    <PageContainer>
      <BookingConfirmation
        group={group}
        start={booking.variables.start}
        sessionName={booking.variables.game}
      />
    </PageContainer>
  );

  return (
    <PageContainer className="animate-page-in">
      <Link href={clans[group].home} className="mb-7 inline-flex items-center gap-2 text-[11px] text-quiet hover:text-brand"><ArrowLeft size={15} />Terug</Link>
      <PageHeader className="mb-[30px] flex-wrap">
        <PageTitle>Prik een <span className="font-normal text-quiet">sessie.</span></PageTitle>
      </PageHeader>
      <div className="grid grid-cols-1 gap-5 desktop:grid-cols-[minmax(0,1fr)_310px] wide:grid-cols-[minmax(0,1fr)_350px]">
        <SlotPicker
          month={month}
          onMonthChange={(next) => { setMonth(next); clearSelection(); }}
          day={day}
          onDayChange={(next) => { setDay(next); setTime(null); booking.reset(); }}
          time={time}
          onTimeChange={(next) => { setTime(next); booking.reset(); }}
          slots={slots.data ?? []}
          loading={loading}
          error={slots.isError && !slots.isFetching ? slots.error.message : null}
          onRetry={() => slots.refetch()}
          disabled={booking.isPending}
          today={today}
          maxDate={maxDate}
        />
        <BookingSummary
          group={group}
          games={games}
          game={game}
          onGameChange={setGame}
          day={day}
          start={time}
          canBook={!!time && !booking.isPending && !loading}
          saving={booking.isPending}
          error={booking.error?.message ?? null}
          onBook={() => time && booking.mutate({ start: time, game: choiceName(game), igdbGameId: choiceGame(game)?.id })}
          onRefresh={() => { clearSelection(); slots.refetch(); }}
        />
      </div>
    </PageContainer>
  );
}
