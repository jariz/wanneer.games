"use client";

import Link from "next/link";
import { Gamepad2, RefreshCw } from "lucide-react";
import LockedPage from "@/components/locked-page";
import { Button, buttonVariants } from "@/components/ui/button";

export default function CalendarError({ reset }: { reset: () => void }) {
  return (
    <LockedPage
      icon={<Gamepad2 size={28} />}
      eyebrow="GEEN VERBINDING"
      title={<>Agenda<br /><em>niet beschikbaar.</em></>}
      description="We kunnen je sessies momenteel niet ophalen."
    >
      <Button onClick={reset}><RefreshCw size={16} />Probeer opnieuw</Button>
      <Link href="/" className={buttonVariants({ variant: "link", size: "none" })}>Terug</Link>
    </LockedPage>
  );
}
