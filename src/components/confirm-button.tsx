"use client";

import { useEffect, useState } from "react";

/** A remove button that needs a second tap within 4 seconds, so one slip on a phone can't delete anything. */
export function ConfirmButton({ label, confirmLabel, className }: { label: string; confirmLabel: string; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="submit"
      className={className}
      aria-live="polite"
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
