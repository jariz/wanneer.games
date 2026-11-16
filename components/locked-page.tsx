import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import PageContainer from "./page-container";
import { Eyebrow, IconTile } from "./ui/typography";

export default function LockedPage({ icon, eyebrow, title, description, decoration, className, children }: {
  icon: ReactNode; eyebrow: string; title: ReactNode; description: string;
  decoration?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <PageContainer className={cn("relative flex min-h-[500px] flex-col items-start justify-center overflow-hidden phone:min-h-[600px]", className)}>
      {decoration}
      <IconTile>{icon}</IconTile>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="my-5 text-[clamp(40px,5vw,75px)] font-semibold leading-[1.03] tracking-[-3px] [&_em]:not-italic [&_em]:text-brand">{title}</h1>
      <p className="mb-7 text-[13px] leading-relaxed text-quiet">{description}</p>
      {children}
    </PageContainer>
  );
}
