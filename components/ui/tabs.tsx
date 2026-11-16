"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Tabs, TabsIndicator, TabsList as TabsListPrimitive, TabsPanel, TabsTab as TabsTabPrimitive } from "@ui-sdk/react/tabs";
import { cn, type Styled } from "@/lib/utils";

const subscribeNothing = () => () => {};

// Until hydration the indicator can't be measured, so the selected tab draws its own border;
// after hydration the sliding indicator takes over.
function TabsList({ className, children, ...props }: Omit<Styled<typeof TabsListPrimitive>, "children"> & { children: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return (
    <TabsListPrimitive className={cn("group/tabs relative inline-flex rounded-lg bg-raised/50 p-[3px]", className)} data-hydrated={hydrated || undefined} {...props}>
      {children}
      <TabsIndicator className="pointer-events-none absolute left-[var(--active-tab-left)] top-[var(--active-tab-top)] hidden h-[var(--active-tab-height)] w-[var(--active-tab-width)] rounded-md border border-control transition-[left,top,width,height] duration-200 group-data-[hydrated]/tabs:block data-[activation-direction=none]:transition-none" />
    </TabsListPrimitive>
  );
}

function TabsTab({ className, ...props }: Styled<typeof TabsTabPrimitive>) {
  return (
    <TabsTabPrimitive
      className={cn(
        "flex items-center gap-2 rounded-md border border-transparent px-2.5 py-1.5 text-[11px] font-semibold text-quiet transition-colors hover:text-ink data-[selected]:border-control data-[selected]:text-ink group-data-[hydrated]/tabs:border-transparent phone:px-4 phone:text-xs",
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsPanel, TabsTab };
