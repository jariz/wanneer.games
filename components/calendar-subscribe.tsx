"use client";

import type { ReactNode } from "react";
import { Button as ButtonPrimitive } from "@ui-sdk/react/button";
import type { RenderProp } from "@ui-sdk/react/primitive";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, CalendarPlus, Check, Copy, Link2 } from "lucide-react";
import { PiMicrosoftOutlookLogoFill } from "react-icons/pi";
import { SiApple, SiGooglecalendar } from "react-icons/si";
import { clans, type Clan } from "@/shared/clans";
import { useClipboard } from "@/hooks/use-clipboard";
import { Button, buttonVariants } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { FinePrint, IconTile } from "./ui/typography";

function CalendarOption({ icon, title, description, trailing, render, onClick }: {
  icon: ReactNode; title: string; description: string; trailing: ReactNode;
  render?: RenderProp; onClick?: () => void;
}) {
  return (
    <ButtonPrimitive className="glass-control flex items-center gap-3 rounded-lg border border-glass-edge p-3 text-left hover:bg-white/5" render={render} onClick={onClick}>
      <IconTile className="mb-0 size-9 shrink-0 rounded-lg">{icon}</IconTile>
      <span className="text-xs">{title}<small className="mt-1 block text-[9px] text-quiet">{description}</small></span>
      <span className="ml-auto text-quiet">{trailing}</span>
    </ButtonPrimitive>
  );
}

function LobbyCard() {
  return (
    <>
      <span className="mb-5 text-quiet"><CalendarPlus size={23} strokeWidth={1.5} /></span>
      <strong className="text-[25px] font-semibold leading-tight tracking-tight">Altijd in je agenda.</strong>
      <span className="mb-[18px] mt-3 text-[10px] leading-relaxed text-quiet">Alle sessies, automatisch bijgewerkt.</span>
      <span className="mt-auto flex items-center gap-4 text-[11px] font-medium text-brand">Koppel je agenda <ArrowRight size={17} /></span>
      <span className="absolute -bottom-3 -right-4 grid h-[90px] w-[95px] rotate-[16deg] grid-cols-3 gap-[7px] rounded-lg border border-control/40 px-2.5 pb-2.5 pt-5 [&>i]:rounded-sm [&>i]:bg-brand/15 [&>i:nth-child(4)]:bg-brand/40" aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </span>
    </>
  );
}

export default function CalendarSubscribe({ group, compact = false }: { group: Clan; compact?: boolean }) {
  const { copy, copied, failed } = useClipboard();
  const url = `https://wanneer.games/${group}/ical.ics`;
  const webcal = url.replace("https:", "webcal:");
  return (
    <Dialog>
      <DialogTrigger
        className={compact
          ? buttonVariants({ variant: "secondary" })
          : "glass relative flex min-h-[240px] flex-col items-start overflow-hidden rounded-xl border border-glass-edge p-6 text-left transition duration-300 hover:-translate-y-[3px] hover:bg-white/5 phone:min-h-[278px]"}
        aria-label={compact ? "Agenda koppelen" : "Koppel je agenda"}
        data-lens={compact ? undefined : ""}
      >
        {compact ? <><CalendarPlus size={16} />Agenda koppelen</> : <LobbyCard />}
      </DialogTrigger>
      <DialogContent closeLabel="Sluit agenda koppelen">
        <IconTile><CalendarPlus size={26} /></IconTile>
        <DialogTitle>Agenda koppelen</DialogTitle>
        <DialogDescription>Alle sessies van {clans[group].label.toLowerCase()}, inclusief de geschiedenis. Nieuwe sessies verschijnen vanzelf.</DialogDescription>
        <div className="grid gap-2">
          <CalendarOption
            icon={<SiGooglecalendar size={20} className="text-ink" />}
            title="Google Agenda"
            description="Abonneer je op de clanagenda"
            trailing={<ArrowUpRight size={18} />}
            render={<a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer" />}
          />
          <CalendarOption
            icon={<SiApple size={20} className="text-ink" />}
            title="Apple Agenda"
            description="Open in de Agenda-app"
            trailing={<ArrowUpRight size={18} />}
            render={<a href={webcal} />}
          />
          <CalendarOption
            icon={<PiMicrosoftOutlookLogoFill size={24} className="text-ink" />}
            title="Outlook"
            description="Open in Outlook"
            trailing={<ArrowUpRight size={18} />}
            render={<a href={webcal} />}
          />
          <CalendarOption
            icon={copied ? <Check size={20} className="text-ink" /> : <Copy size={20} className="text-ink" />}
            title={copied ? "Link gekopieerd" : "Kopieer abonnementslink"}
            description="Voor elke app die ICS ondersteunt"
            trailing={<Link2 size={17} />}
            onClick={() => copy(url)}
          />
        </div>
        <FinePrint>Je agenda-app bepaalt zelf hoe vaak hij ververst, dus nieuwe sessies kunnen er pas na een paar uur in staan.</FinePrint>
        <p className="min-h-2.5 text-[10px] text-quiet" role="status">
          {failed ? "Kopiëren lukt niet. Selecteer de link hieronder." : copied ? "Abonnementslink gekopieerd." : ""}
        </p>
        {failed && <code className="break-all text-[10px]">{url}</code>}
        <Button variant="link" size="none" render={<a href={`/${group}/ical.ics`} download />}>
          <ArrowDownToLine size={15} />Liever eenmalig downloaden
        </Button>
      </DialogContent>
    </Dialog>
  );
}
