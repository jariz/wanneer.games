"use client";

import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus } from "lucide-react";
import { dateLabel, formatDate, sessionTiming, type Session } from "@/lib/session-display";
import { useBackdrop } from "./backdrop";
import PageContainer from "./page-container";
import { PlanningButton } from "./planning-access";
import { Button } from "./ui/button";
import { Eyebrow } from "./ui/typography";

function Countdown({ session, now }: { session: Session | undefined; now: number }) {
  const timing = sessionTiming(session, now);
  if (!session) return <div className="my-6 text-5xl font-semibold tracking-tight text-quiet">Nog niets<br />ingepland.</div>;
  if (timing.live) return (
    <div className="mb-4 mt-3 text-[54px] phone:mb-7 font-semibold leading-none tracking-[-3px] phone:text-[73px]">
      Nu <em className="not-italic text-brand">bezig.</em>
    </div>
  );
  const units = Number(timing.days) > 0
    ? [{ value: timing.days, label: "DAGEN" }, { value: timing.hours, label: "UREN" }, { value: timing.minutes, label: "MINUTEN" }]
    : [{ value: timing.hours, label: "UREN" }, { value: timing.minutes, label: "MINUTEN" }, { value: timing.ticks, label: "SECONDEN" }];
  return (
    <div className="mb-4 flex w-fit items-start gap-[26px] phone:mb-7 phone:gap-[34px]" aria-label={`Nog ${Number(timing.days)} dagen, ${Number(timing.hours)} uur en ${Number(timing.minutes)} minuten`}>
      {units.map((unit, index) => (
        <div className="relative flex flex-col" key={unit.label}>
          {index > 0 && <span className="absolute -left-5 top-1 text-[40px] font-extralight text-quiet/70 phone:-left-[25px] phone:top-2 phone:text-[55px] wide:top-4" aria-hidden="true">:</span>}
          <span className="font-countdown text-[clamp(60px,17vw,85px)] font-medium leading-[1.1] tracking-[-0.05em] tabular-nums phone:text-[92px] tablet:text-[clamp(62px,6.7vw,99px)] wide:text-[112px]">{unit.value}</span>
          <span className="ml-0.5 mt-2 font-mono text-[7px] tracking-[.17em] text-quiet phone:ml-1 phone:text-[8px]">{unit.label}</span>
        </div>
      ))}
    </div>
  );
}

function SessionMeta({ session }: { session: Session }) {
  return (
    <div className="flex items-center gap-3 text-[10px] text-quiet desktop:gap-5 desktop:text-[11px]">
      <span className="flex items-center gap-2"><CalendarDays size={16} />{formatDate(session.start, { weekday: "short", day: "numeric", month: "short" })}</span>
      <span className="flex items-center gap-2"><Clock3 size={16} />{dateLabel(session.start, "HH:mm")}</span>
    </div>
  );
}

function ArtworkSwitcher() {
  const { artwork, active, step } = useBackdrop();
  if (!active || artwork.length < 2) return null;
  return (
    <div className="flex items-center gap-1">
      <span className="mr-2.5 grid max-w-[160px] gap-1 text-right text-[9px] text-quiet">
        <span className="hidden font-mono text-[6px] tracking-wider phone:block">ACHTERGROND</span>
        {active.name}
      </span>
      <Button variant="overlay" size="icon-sm" aria-label="Vorige game-achtergrond" data-lens="" onClick={() => step(-1)}><ChevronLeft size={17} /></Button>
      <Button variant="overlay" size="icon-sm" aria-label="Volgende game-achtergrond" data-lens="" onClick={() => step(1)}><ChevronRight size={17} /></Button>
    </div>
  );
}

export default function SessionHero({ next, now }: { next: Session | undefined; now: number }) {
  const live = sessionTiming(next, now).live;
  return (
    <section className="relative min-h-[56.25vw] phone:min-h-[max(460px,calc(100svh_-_226px))]" aria-label="Volgende sessie" data-testid="session-hero">
      <PageContainer className="relative flex min-h-[inherit] flex-col pt-[calc(56.25vw_-_32px)] phone:pt-8">
        <div className="mt-auto pb-4 pt-2 phone:pb-7 wide:pb-10 wide:pt-4">
          {!live && <p className="mb-2 text-xs text-quiet phone:text-[13px]">{next ? "Begint over" : "Nog geen sessie gepland"}</p>}
          <Countdown session={next} now={now} />
          {next?.game && (
            <>
              <Eyebrow className="text-[8px]">GAME</Eyebrow>
              <h2 className="mt-1.5 max-w-[600px] text-[22px] font-semibold tracking-tight phone:text-2xl wide:text-[28px]">{next.game}</h2>
            </>
          )}
        </div>
        <div className="flex min-h-12 items-center justify-between gap-3 border-t border-control/40 pt-4 phone:gap-5 phone:pt-5">
          {next
            ? <SessionMeta session={next} />
            : <PlanningButton label="Plan de eerste sessie"><Plus size={16} />Plan de eerste sessie<ArrowRight size={16} /></PlanningButton>}
          <ArtworkSwitcher />
        </div>
      </PageContainer>
    </section>
  );
}
