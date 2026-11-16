import { Input as InputPrimitive } from "@ui-sdk/react/input";
import { cn, type Styled } from "@/lib/utils";

const inputClassName = "min-h-11 w-full rounded-md border border-control bg-canvas/40 p-3 text-xs text-ink outline-offset-2 placeholder:text-quiet";

function Input({ className, ...props }: Styled<typeof InputPrimitive>) {
  return <InputPrimitive className={cn(inputClassName, className)} {...props} />;
}

export { Input, inputClassName };
