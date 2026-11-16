import Link from "next/link";
import { ArrowLeft, CheckCheck } from "lucide-react";
import { clans, type Clan } from "@/shared/clans";
import { dateLabel, formatDate } from "@/lib/session-display";
import CalendarSubscribe from "./calendar-subscribe";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Eyebrow, IconTile } from "./ui/typography";

export default function BookingConfirmation({ group, start, sessionName }: { group: Clan; start: string; sessionName: string }) {
  const clan = clans[group];
  return (
    <Card className="min-h-[600px] animate-page-in phone:min-h-[680px]">
      <div className="p-6 phone:p-[60px]">
        <IconTile className="mb-8 size-16 rounded-full"><CheckCheck size={36} /></IconTile>
        <Eyebrow>SESSIE INGEPLAND</Eyebrow>
        <h1 className="my-5 text-5xl font-semibold leading-none tracking-[-3px] phone:text-[76px]"><em className="not-italic text-brand">Ingepland.</em></h1>
        {sessionName && <p className="text-[17px] text-quiet">{sessionName}</p>}
        <div className="glass-control my-8 grid w-fit min-w-[250px] gap-3 rounded-lg border border-glass-edge p-5 text-[11px] text-quiet">
          <span>{formatDate(start, { weekday: "long", day: "numeric", month: "long" })}</span>
          <strong className="flex items-center gap-3.5 text-[25px] font-medium text-ink">{dateLabel(start, "HH:mm")}</strong>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button render={<Link href={clan.home} />}><ArrowLeft size={17} />Terug</Button>
          <CalendarSubscribe group={group} compact />
        </div>
      </div>
    </Card>
  );
}
