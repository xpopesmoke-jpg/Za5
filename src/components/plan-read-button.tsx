"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useT } from "@/i18n/client";

/** The "Read my plan" button; while Claude reads, it walks through what's happening so it never looks frozen. */
export function PlanReadButton({ label, disabled, quiet = false }: { label: string; disabled?: boolean; /** a plain button, when "Looks right" is the main choice */ quiet?: boolean }) {
  const t = useT().plan;
  const { pending } = useFormStatus();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => setStep((s) => Math.min(s + 1, t.readingSteps.length - 1)), 7000);
    return () => {
      clearInterval(id);
      setStep(0);
    };
  }, [pending, t.readingSteps.length]);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending || disabled}
        className={`flex items-center justify-center gap-3 rounded-full border-2 border-edge px-5 text-[16px] font-extrabold disabled:opacity-60 ${quiet ? "min-h-12 bg-surface text-ink" : "min-h-14 bg-za5 text-za5-ink"}`}
      >
        {pending && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" />}
        <span>{pending ? t.readingSteps[step] : label}</span>
      </button>
      <p role="status" className="sr-only">
        {pending ? t.readingSteps[step] : ""}
      </p>
      {pending && <p className="text-center text-[14px] text-ink-2">{t.readingNote}</p>}
    </div>
  );
}
