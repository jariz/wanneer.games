import { Button as ButtonPrimitive } from "@ui-sdk/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn, type Styled } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 transition disabled:cursor-not-allowed disabled:opacity-40 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40",
  {
    variants: {
      variant: {
        primary: "glass-primary relative rounded-lg border border-brand bg-brand text-canvas hover:-translate-y-px hover:bg-brand/90 disabled:translate-y-0 data-[disabled]:translate-y-0",
        secondary: "glass-control rounded-lg border border-glass-edge text-ink hover:-translate-y-px hover:bg-white/10 disabled:translate-y-0 data-[disabled]:translate-y-0",
        ghost: "glass-control rounded-md border border-glass-edge text-quiet hover:border-white/40 hover:bg-white/10 hover:text-ink",
        overlay: "glass relative rounded-md border border-glass-edge text-ink hover:border-white/40 hover:bg-white/10 hover:text-brand active:scale-95",
        link: "gap-2 py-2 text-[10px] text-quiet hover:text-brand hover:underline",
      },
      size: {
        default: "min-h-11 px-[18px] py-3 text-xs font-semibold",
        sm: "min-h-[34px] px-3 py-2 text-[10px] font-semibold phone:min-h-[37px] phone:px-4 phone:text-xs",
        icon: "size-8",
        "icon-sm": "size-6 phone:size-7",
        none: "",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type ButtonProps = Styled<typeof ButtonPrimitive> & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return <ButtonPrimitive className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
