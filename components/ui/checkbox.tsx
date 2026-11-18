import { Checkbox as CheckboxPrimitive, CheckboxIndicator } from "@ui-sdk/react/checkbox";
import { Check } from "lucide-react";
import { cn, type Styled } from "@/lib/utils";

export function Checkbox({ className, ...props }: Styled<typeof CheckboxPrimitive>) {
  return (
    <CheckboxPrimitive className={cn("glass-control inline-flex size-5 shrink-0 items-center justify-center rounded border border-control text-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand", className)} {...props}>
      <CheckboxIndicator><Check className="size-4" aria-hidden="true" /></CheckboxIndicator>
    </CheckboxPrimitive>
  );
}
