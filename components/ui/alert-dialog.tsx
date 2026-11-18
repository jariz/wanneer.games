import {
  AlertDialog, AlertDialogClose, AlertDialogContent as Content,
  AlertDialogTitle as Title, AlertDialogDescription as Description,
} from "@ui-sdk/react/alert-dialog";
import { cn, type Styled } from "@/lib/utils";
import type { ReactNode } from "react";

function AlertDialogContent({ className, children, ...props }: Omit<Styled<typeof Content>, "children"> & { children: ReactNode }) {
  return (
    <Content className={cn("glass fixed inset-0 m-auto flex h-fit max-h-[calc(100dvh-40px)] w-[min(460px,calc(100vw-32px))] flex-col overflow-clip rounded-2xl border border-white/25 p-0 text-ink shadow-2xl backdrop:bg-black/40", className)} {...props}>
      <div data-slot="dialog-scroll" className="min-h-0 overflow-y-auto overscroll-contain p-6 phone:p-8">{children}</div>
    </Content>
  );
}

function AlertDialogTitle({ className, ...props }: Styled<typeof Title>) {
  return <Title className={cn("mb-3 text-2xl font-semibold tracking-tight", className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }: Styled<typeof Description>) {
  return <Description className={cn("mb-6 text-xs leading-relaxed text-quiet", className)} {...props} />;
}

export { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogTitle, AlertDialogDescription };
