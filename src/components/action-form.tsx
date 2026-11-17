"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { ActionResult } from "@/app/[lang]/action-result";
import { FormMessage } from "./ui";

/**
 * A form for a server action that shows the action's error under its fields. With resetOnSuccess, the fields
 * clear after it worked (for "add" forms, so the next entry starts empty).
 */
export function ActionForm(props: {
  action: (prev: ActionResult, form: FormData) => Promise<ActionResult>;
  className?: string;
  resetOnSuccess?: boolean;
  children: ReactNode;
}) {
  const [state, run] = useActionState(props.action, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (props.resetOnSuccess && state?.ok) form.current?.reset();
  }, [state, props.resetOnSuccess]);
  return (
    <form ref={form} action={run} className={props.className}>
      {props.children}
      <FormMessage error={state?.error} />
    </form>
  );
}
