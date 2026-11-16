import {
  Field,
  FieldDescription as FieldDescriptionPrimitive,
  FieldError as FieldErrorPrimitive,
  FieldLabel as FieldLabelPrimitive,
} from "@ui-sdk/react/field";
import { cn, type Styled } from "@/lib/utils";

function FieldLabel({ className, ...props }: Styled<typeof FieldLabelPrimitive>) {
  return <FieldLabelPrimitive className={cn("mb-2 block text-[11px] font-medium text-ink", className)} {...props} />;
}

function FieldDescription({ className, ...props }: Styled<typeof FieldDescriptionPrimitive>) {
  return <FieldDescriptionPrimitive className={cn("mt-2 text-[9px] text-quiet", className)} {...props} />;
}

function FieldError({ className, ...props }: Styled<typeof FieldErrorPrimitive>) {
  return <FieldErrorPrimitive className={cn("mt-2 text-[11px] leading-relaxed text-orange-200", className)} {...props} />;
}

export { Field, FieldDescription, FieldError, FieldLabel };
