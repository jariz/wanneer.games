import {
  Dialog,
  DialogClose,
  DialogContent as DialogContentPrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  DialogTitle as DialogTitlePrimitive,
  DialogTrigger,
} from "@ui-sdk/react/dialog";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn, type Styled } from "@/lib/utils";
import { buttonVariants } from "./button";

function DialogContent({ className, closeLabel, children, ...props }: Omit<Styled<typeof DialogContentPrimitive>, "children"> & { closeLabel: string; children: ReactNode }) {
  return (
    <DialogContentPrimitive
      className={cn(
        "fixed inset-0 m-auto h-fit max-h-[calc(100dvh-40px)] w-[min(460px,calc(100vw-32px))] overflow-auto glass rounded-2xl border border-white/[.08] p-6 text-ink shadow-2xl transition-[opacity,scale] duration-200 phone:p-8 backdrop:bg-canvas/60 backdrop:backdrop-blur-md data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
        className,
      )}
      {...props}
    >
      <DialogClose className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "absolute right-4 top-4")} aria-label={closeLabel}>
        <X size={18} />
      </DialogClose>
      {children}
    </DialogContentPrimitive>
  );
}

function DialogTitle({ className, ...props }: Styled<typeof DialogTitlePrimitive>) {
  return <DialogTitlePrimitive className={cn("my-2 text-[27px] font-semibold leading-tight tracking-[-.9px]", className)} {...props} />;
}

function DialogDescription({ className, ...props }: Styled<typeof DialogDescriptionPrimitive>) {
  return <DialogDescriptionPrimitive className={cn("mb-6 text-xs leading-relaxed text-quiet", className)} {...props} />;
}

export { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger };
