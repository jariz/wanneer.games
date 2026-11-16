import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function StepHeading({ step, id, title, description, className }: {
  step: string; id: string; title: string; description?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-control bg-raised font-mono text-[11px] text-brand">{step}</span>
      <div>
        <h2 className="text-base font-semibold tracking-tight" id={id}>{title}</h2>
        {description && <p className="mt-1 text-[10px] text-quiet">{description}</p>}
      </div>
    </div>
  );
}
