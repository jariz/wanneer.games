import { PasswordInput as PasswordInputRoot, PasswordInputControl, PasswordInputToggle } from "@ui-sdk/react/password-input";
import { Eye, EyeOff } from "lucide-react";
import { cn, type Styled } from "@/lib/utils";
import { inputClassName } from "./input";

type PasswordInputProps = Styled<typeof PasswordInputRoot> & Pick<Styled<typeof PasswordInputControl>, "placeholder" | "maxLength"> & {
  toggleLabel: string;
};

function PasswordInput({ className, placeholder, maxLength, toggleLabel, ...props }: PasswordInputProps) {
  return (
    <PasswordInputRoot className={cn("relative", className)} {...props}>
      <PasswordInputControl className={cn(inputClassName, "pr-10")} placeholder={placeholder} maxLength={maxLength} />
      <PasswordInputToggle className="absolute right-3 top-3.5 text-quiet" aria-label={toggleLabel}>
        {(state) => (state.visible ? <EyeOff size={17} /> : <Eye size={17} />)}
      </PasswordInputToggle>
    </PasswordInputRoot>
  );
}

export { PasswordInput };
