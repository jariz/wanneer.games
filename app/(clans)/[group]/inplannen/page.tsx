import { notFound } from "next/navigation";
import { Gamepad2, LockKeyhole } from "lucide-react";
import { addMonths } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import LockedPage from "@/components/locked-page";
import Planner from "@/components/planner";
import { PlanningButton } from "@/components/planning-access";
import { clans, isClan } from "@/lib/clans";
import { getGameRotation } from "@/lib/games";
import { hasPlanningAccess } from "@/lib/planning-auth";
import { currentPlanningMonth, getAvailability } from "@/lib/planning";
import { amsterdam } from "@/lib/session-display";

export default async function PlanningPage({ params }: { params: Promise<{ group: string }> }) {
  const { group } = await params;
  if (!isClan(group)) notFound();
  const authorized = await hasPlanningAccess(group);

  if (!authorized) return (
    <LockedPage
      className="animate-page-in"
      decoration={<span className="absolute right-[3%] top-[30%] -rotate-[20deg] text-brand/10" aria-hidden="true"><Gamepad2 size={180} strokeWidth={0.6} /></span>}
      icon={<LockKeyhole size={26} />}
      eyebrow={`DE PLANNER / ${clans[group].name.toUpperCase()}`}
      title={<>Planner <em>vergrendeld.</em></>}
      description="Gebruik het clanwachtwoord om een sessie in te plannen."
    >
      <PlanningButton label="Ontgrendel planner">Ontgrendel de planner<LockKeyhole size={16} /></PlanningButton>
    </LockedPage>
  );

  const month = currentPlanningMonth();
  const [initialSlots, games] = await Promise.all([
    getAvailability(group, month).catch(() => undefined),
    getGameRotation(),
  ]);
  return (
    <Planner
      group={group}
      initialMonth={month}
      initialSlots={initialSlots}
      games={games}
      today={formatInTimeZone(new Date(), amsterdam, "yyyy-MM-dd")}
      maxDate={formatInTimeZone(addMonths(new Date(), 3), amsterdam, "yyyy-MM-dd")}
    />
  );
}
