"use client";

import type { ReactNode } from "react";
import { CalendarDays, ChevronRight, Check, Clock3, Copy, Gamepad2 } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import { dateLabel, formatDate, type Session } from "@/lib/session-display";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { IconTile } from "./ui/typography";

function DetailLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <div className="flex items-center gap-3 border-t border-edge py-4 text-[13px]"><span className="text-quiet">{icon}</span><span>{children}</span></div>;
}

export default function SessionRow({ session }: { session: Session }) {
  const { copy, copied, failed } = useClipboard();
  const fullDate = formatDate(session.start, { dateStyle: "full" });
  const time = dateLabel(session.start, "HH:mm");

  return (
    <Dialog>
      <DialogTrigger className="flex w-full items-center gap-4 border-b px-3 py-4 text-left transition-colors hover:bg-raised/30" aria-label={`Bekijk sessie ${fullDate} om ${time}`}>
        <span className="grid h-[53px] w-[45px] shrink-0 place-items-center rounded-md border border-control bg-surface/40">
          <strong className="pt-1 text-[21px] font-semibold leading-none">{dateLabel(session.start, "dd")}</strong>
          <span className="pb-1 text-[9px] uppercase text-quiet">{formatDate(session.start, { month: "short" })}</span>
        </span>
        <span className="min-w-0">
          <strong className="block max-w-[230px] truncate text-xs font-medium phone:max-w-[300px] phone:text-[13px]">{session.game || formatDate(session.start, { weekday: "long", day: "numeric", month: "long" })}</strong>
          <span className="mt-1.5 flex items-center gap-2 text-[10px] text-quiet">
            {session.game && <>{formatDate(session.start, { weekday: "short" })} <i className="size-0.5 rounded-full bg-quiet" /> </>}{time}
          </span>
        </span>
        <span className="ml-auto text-quiet"><ChevronRight size={18} /></span>
      </DialogTrigger>
      <DialogContent closeLabel="Sluit sessiedetails">
        <IconTile><Gamepad2 size={28} /></IconTile>
        <DialogTitle>{session.game || "Sessie"}</DialogTitle>
        <DialogDescription>Geplande sessie</DialogDescription>
        <DetailLine icon={<CalendarDays size={19} />}>{fullDate}</DetailLine>
        <DetailLine icon={<Clock3 size={19} />}>{time}</DetailLine>
        <Button className="mt-5 w-full" onClick={() => copy(`${session.game ? `${session.game} — ` : ""}${fullDate}, ${time}\nhttps://wanneer.games`)}>
          {copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Gekopieerd!" : "Kopieer beschrijving"}
        </Button>
        <p role="status" className="min-h-2.5 text-[10px] text-quiet">
          {failed ? "Kopiëren lukt niet. Deel de link wanneer.games handmatig." : copied && <span className="sr-only">Beschrijving gekopieerd.</span>}
        </p>
      </DialogContent>
    </Dialog>
  );
}
