import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Eyebrow({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("font-mono text-[10px] font-medium tracking-[.13em] text-quiet", className)} {...props} />;
}

function FinePrint({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("mt-4 text-[10px] leading-relaxed text-quiet", className)} {...props} />;
}

function IconTile({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("glass-control mb-6 grid size-[53px] place-items-center rounded-2xl border border-glass-edge text-brand", className)} {...props} />;
}

function Counter({ className, compact = false, ...props }: ComponentProps<"span"> & { compact?: boolean }) {
  return <span className={cn("glass-control inline-grid shrink-0 place-items-center border border-glass-edge font-mono text-brand", compact ? "rounded px-1.5 py-0.5 text-[9px]" : "size-8 rounded-lg text-[11px]", className)} {...props} />;
}

function PageHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mb-7 flex items-end justify-between gap-5", className)} {...props} />;
}

function PageTitle({ className, ...props }: ComponentProps<"h1">) {
  return <h1 className={cn("text-[35px] font-bold leading-[1.1] tracking-[-1.6px] phone:text-[clamp(30px,3.1vw,47px)] phone:tracking-[-2px]", className)} {...props} />;
}

export { Counter, Eyebrow, FinePrint, IconTile, PageHeader, PageTitle };
