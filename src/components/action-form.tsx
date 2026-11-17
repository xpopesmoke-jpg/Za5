"use client";

import { useActionState, type ReactNode } from "react";
import { FormMessage } from "./ui";

type Result = { error?: string; ok?: boolean } | null;

/** A form for a server action that shows the action's error message under its fields. */
export function ActionForm({ action, className, children }: { action: (prev: Result, form: FormData) => Promise<Result>; className?: string; children: ReactNode }) {
  const [state, run] = useActionState(action, null);
  return (
    <form action={run} className={className}>
      {children}
      <FormMessage error={state?.error} />
    </form>
  );
}
