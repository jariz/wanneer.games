import { Menu, MenuTrigger, MenuContent as MenuContentPrimitive, MenuItem as MenuItemPrimitive, MenuSeparator as MenuSeparatorPrimitive } from "@ui-sdk/react/menu";
import { cn, type Styled } from "@/lib/utils";
import type { ReactNode } from "react";

function MenuContent({ className, children, ...props }: Omit<Styled<typeof MenuContentPrimitive>, "children"> & { children: ReactNode }) {
  return (
    <MenuContentPrimitive sideOffset={6} className={cn("glass z-50 flex max-h-[var(--available-height)] min-w-48 flex-col overflow-clip rounded-xl border border-white/15 bg-canvas/90 p-0 text-ink shadow-xl", className)} {...props}>
      <div data-slot="menu-scroll" className="min-h-0 overflow-y-auto overscroll-contain p-1.5">{children}</div>
    </MenuContentPrimitive>
  );
}

function MenuItem({ className, ...props }: Styled<typeof MenuItemPrimitive>) {
  return <MenuItemPrimitive className={cn("flex cursor-pointer items-center rounded-md px-3 py-2.5 text-xs data-[highlighted]:bg-white/10 data-[disabled]:opacity-40", className)} {...props} />;
}

function MenuSeparator({ className, ...props }: Styled<typeof MenuSeparatorPrimitive>) {
  return <MenuSeparatorPrimitive className={cn("my-1 border-t border-glass-edge", className)} {...props} />;
}

export { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator };
