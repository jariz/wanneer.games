import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("glass relative rounded-md border text-[11px] leading-relaxed", {
  variants: {
    variant: {
      default: "border-glass-edge p-3.5 text-quiet",
      destructive: "border-orange-400/50 bg-orange-950/40 p-3 text-orange-200",
    },
  },
  defaultVariants: { variant: "default" },
});

function Alert({ className, variant, ...props }: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role={variant === "destructive" ? "alert" : undefined} className={cn(alertVariants({ variant }), className)} {...props} />;
}

export { Alert };
