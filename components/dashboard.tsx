"use client";

import type { Clan } from "@/shared/clans";
import { useNow } from "@/hooks/use-now";
import type { Session } from "@/lib/session-display";
import Agenda from "./agenda";
import CalendarSubscribe from "./calendar-subscribe";
import PageContainer from "./page-container";
import SessionHero from "./session-hero";

export default function Dashboard({ group, sessions, initialNow }: { group: Clan; sessions: Session[]; initialNow: number }) {
  const now = useNow(initialNow);
  const upcoming = sessions.filter((session) => new Date(session.end).getTime() > now);

  return (
    <div className="animate-page-in">
      <h1 className="sr-only">Wanneer games?</h1>
      <SessionHero next={upcoming[0]} now={now} />
      <PageContainer className="grid grid-cols-1 gap-6 pt-4 phone:grid-cols-[minmax(0,1fr)_230px] phone:gap-5 desktop:grid-cols-[minmax(0,1fr)_265px] desktop:gap-[30px]">
        <Agenda sessions={upcoming} />
        <CalendarSubscribe group={group} />
      </PageContainer>
    </div>
  );
}
