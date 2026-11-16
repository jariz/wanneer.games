import { CalendarDays, Plus } from "lucide-react";
import type { Session } from "@/lib/session-display";
import { PlanningButton } from "./planning-access";
import SessionRow from "./session-row";

function EmptyAgenda() {
  return (
    <div className="flex items-center gap-4 px-2 py-8 text-quiet">
      <CalendarDays size={24} strokeWidth={1.3} />
      <div>
        <strong className="text-xs font-medium text-ink">Geen sessies gepland.</strong>
        <p className="mt-1.5 text-[10px] leading-relaxed">Deze maand is de agenda leeg.</p>
      </div>
    </div>
  );
}

export default function Agenda({ sessions }: { sessions: Session[] }) {
  return (
    <section aria-labelledby="agenda-heading">
      <h2 className="mb-4 text-base font-semibold tracking-tight phone:text-[17px]" id="agenda-heading">
        De agenda <span className="ml-2 rounded border px-1 py-0.5 align-middle font-mono text-[9px] text-quiet">{sessions.length.toString().padStart(2, "0")}</span>
      </h2>
      <div className="border-t">
        {sessions.map((session) => <SessionRow key={session.id} session={session} />)}
        {sessions.length === 0 && <EmptyAgenda />}
      </div>
      <PlanningButton className="mt-4 flex w-full items-center justify-center gap-2 glass relative rounded-lg border border-white/[.08] p-3.5 text-[11px] font-medium transition-colors hover:bg-raised/50" label="Nog een sessie inplannen">
        <Plus size={16} className="text-quiet" />
        Sessie inplannen
      </PlanningButton>
    </section>
  );
}
