import { PasswordInput as PasswordInputRoot, PasswordInputControl, PasswordInputToggle } from "@ui-sdk/react/password-input";
import { Eye, EyeOff } from "lucide-react";
import { cn, type Styled } from "@/lib/utils";

type PasswordInputProps = Styled<typeof PasswordInputRoot> & Pick<Styled<typeof PasswordInputControl>, "placeholder" | "maxLength"> & {
  toggleLabel: string;
};

function PasswordInput({ className, placeholder, maxLength, toggleLabel, ...props }: PasswordInputProps) {
  return (
    <PasswordInputRoot className={cn("glass-control rounded-lg border border-glass-edge transition-colors focus-within:border-brand", className)} {...props}>
      <PasswordInputControl className="min-h-11 w-full rounded-lg bg-transparent p-3 pr-11 text-xs text-ink outline-offset-2 placeholder:text-quiet" placeholder={placeholder} maxLength={maxLength} />
      <PasswordInputToggle className="absolute right-2 top-2 grid size-7 place-items-center rounded-md text-quiet hover:bg-white/10 hover:text-ink" aria-label={toggleLabel}>
        {(state) => (state.visible ? <EyeOff size={17} /> : <Eye size={17} />)}
      </PasswordInputToggle>
    </PasswordInputRoot>
  );
}

export { PasswordInput };
