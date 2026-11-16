"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui-sdk/react/tooltip";
import { Plus } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { clans, isClan, type Clan } from "@/lib/clans";
import type { Game } from "@/lib/game-types";
import { Backdrop, BackdropProvider } from "./backdrop";
import { PlanningAccess, PlanningButton } from "./planning-access";
import AgentBridge from "./agent-bridge";
import { Container } from "./page-container";
import { buttonVariants } from "./ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "./ui/tabs";

type ClanAccess = Record<Clan, { authorized: boolean; configured: boolean }>;

function ClanTabs() {
  return (
    <TabsList aria-label="Kies je clan">
      {Object.entries(clans).map(([slug, clan]) => (
        <TabsTab key={slug} value={slug} render={<Link href={clan.home} />}>
          <span className="text-[15px] phone:text-[17px]" aria-hidden="true">{clan.emoji}</span>
          {clan.name}
        </TabsTab>
      ))}
    </TabsList>
  );
}

export default function AppShell({ access, featured, backgrounds, children }: {
  access: ClanAccess; featured: Record<Clan, Game | null>; backgrounds: Game[]; children: React.ReactNode;
}) {
  const params = useParams<{ group: string }>();
  if (!isClan(params.group)) return children;
  const group = params.group;

  return (
    <PlanningAccess group={group} {...access[group]}>
      <BackdropProvider backgrounds={backgrounds} featured={featured[group]}>
        <div className="relative isolate flex min-h-dvh flex-col" data-clan={group}>
          <Backdrop />
          <AgentBridge />
          <a href="#inhoud" className="fixed -top-20 left-5 z-[999] rounded-md bg-brand p-4 text-canvas focus:top-3">Naar inhoud</a>
          <Tabs value={group} className="flex flex-1 flex-col">
            <header className="glass relative border-b border-white/[.08] shadow-none before:hidden" data-lens="bar">
              <Container className="grid h-[64px] grid-cols-[1fr_auto_1fr] items-center gap-3 phone:h-[76px]">
                <Tooltip delay={300}>
                  <TooltipTrigger render={<Link href={clans[group].home} />} className="justify-self-start whitespace-nowrap text-[15px] font-bold tracking-[-.5px] phone:text-xl">
                    Wanneer <span className="font-normal text-quiet">games?</span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="flex items-center rounded-md border border-white/[.08] bg-surface px-2.5 py-1.5 text-[11px] text-ink shadow-xl transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0">
                    Now powered by Liquid&nbsp;<span className="sr-only">Gl</span><SiYoutube size={15} className="text-[#FF0000]" aria-hidden="true" />ass
                  </TooltipContent>
                </Tooltip>
                <ClanTabs />
                <div className="flex justify-end">
                  <PlanningButton className={buttonVariants({ size: "sm" })} label="Inplannen"><Plus size={16} /><span className="hidden phone:inline">Inplannen</span></PlanningButton>
                </div>
              </Container>
            </header>
            <main id="inhoud" className="min-w-0 flex-1">
              <TabsPanel value={group}>{children}</TabsPanel>
            </main>
          </Tabs>
        </div>
      </BackdropProvider>
    </PlanningAccess>
  );
}
