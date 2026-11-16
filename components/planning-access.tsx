"use client";

import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Button as ButtonPrimitive } from "@ui-sdk/react/button";
import { createDialogController } from "@ui-sdk/react/dialog";
import { KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";
import { unlockPlanning } from "@/app/planning-actions";
import { clans, type Clan } from "@/lib/clans";
import { Alert } from "./ui/alert";
import { Button, buttonVariants } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { PasswordInput } from "./ui/password-input";
import { FinePrint, IconTile } from "./ui/typography";

type Access = {
  group: Clan;
  authorized: boolean;
  controller: ReturnType<typeof createDialogController<unknown, string>>;
};
const AccessContext = createContext<Access | null>(null);

function UnlockForm({ group, onUnlocked }: { group: Clan; onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const unlock = useMutation({
    mutationFn: async (value: string) => {
      const result = await unlockPlanning(group, value).catch(() => ({ ok: false, message: "Verbinding kwijt. Probeer het nog eens." }));
      if (!result.ok) throw new Error(result.message);
    },
    onSuccess: onUnlocked,
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!unlock.isPending) unlock.mutate(password);
  }

  return (
    <form onSubmit={submit}>
      <Field invalid={unlock.isError || undefined}>
        <FieldLabel>Clanwachtwoord</FieldLabel>
        <PasswordInput
          value={password}
          onValueChange={(value) => { setPassword(value); unlock.reset(); }}
          required
          placeholder="Clanwachtwoord"
          maxLength={256}
          toggleLabel="Toon of verberg wachtwoord"
        />
        <FieldDescription className="text-[11px]">Hint: {clans[group].passwordHint}</FieldDescription>
        <FieldError>{unlock.error?.message}</FieldError>
      </Field>
      <Button type="submit" className="mt-5 w-full" disabled={unlock.isPending} focusableWhenDisabled>
        {unlock.isPending ? <LoaderCircle className="animate-spin" size={17} /> : <LockKeyhole size={16} />}
        Ontgrendel de planner
      </Button>
      <FinePrint className="text-center">We onthouden je toegang 30 dagen op dit apparaat.</FinePrint>
    </form>
  );
}

export function PlanningAccess({ group, authorized, configured, children }: {
  group: Clan; authorized: boolean; configured: boolean; children: ReactNode;
}) {
  const [controller] = useState(() => createDialogController());
  const [formKey, setFormKey] = useState(0);
  const router = useRouter();

  return (
    <AccessContext value={{ group, authorized, controller }}>
      {children}
      <Dialog controller={controller} onOpenChangeComplete={(open) => { if (!open) setFormKey((key) => key + 1); }}>
        <DialogContent keepMounted closeLabel="Sluit clantoegang">
          <IconTile><KeyRound size={26} /></IconTile>
          <DialogTitle>Ken je het wachtwoord?</DialogTitle>
          <DialogDescription>De agenda is voor iedereen. Inplannen is voor {clans[group].label.toLowerCase()}.</DialogDescription>
          {configured ? (
            <UnlockForm
              key={formKey}
              group={group}
              onUnlocked={() => {
                controller.close();
                router.push(`/${group}/inplannen`);
                router.refresh();
              }}
            />
          ) : <Alert>De clanbeheerder moet eerst een wachtwoord instellen.</Alert>}
        </DialogContent>
      </Dialog>
    </AccessContext>
  );
}

export function PlanningButton({ children, className = buttonVariants(), label }: {
  children?: ReactNode; className?: string; label?: string;
}) {
  const access = useContext(AccessContext);
  if (!access) throw new Error("PlanningButton requires PlanningAccess");
  const content = children ?? <><span>Inplannen</span><LockKeyhole size={14} /></>;
  return access.authorized
    ? <ButtonPrimitive className={className} aria-label={label} render={<Link href={`/${access.group}/inplannen`} />}>{content}</ButtonPrimitive>
    : <DialogTrigger controller={access.controller} className={className} aria-label={label}>{content}</DialogTrigger>;
}
