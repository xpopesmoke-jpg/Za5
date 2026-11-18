"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "@/app/[lang]/join/actions";
import { useT } from "@/i18n/client";
import { Button, FormMessage } from "./ui";

/** The Owner's "Invite your partner": makes a one-time link to copy or share. */
export function InvitePanel({ homeName }: { homeName: string }) {
  const t = useT().invite;
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const make = () =>
    start(async () => {
      const result = await createInviteAction();
      if (result?.token) setLink(`${window.location.origin}/join/${result.token}`);
      setError(result?.error);
    });
  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  };
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  return (
    <section aria-labelledby="invite" className="flex flex-col gap-3 rounded-card border-2 border-edge bg-raised p-4">
      <h2 id="invite" className="text-[20px]">{t.inviteTitle}</h2>
      <p className="text-[14px] text-ink-2">{t.inviteBody}</p>
      {link ? (
        <div className="flex flex-col gap-2">
          <input readOnly value={link} aria-label={t.inviteTitle} onFocus={(e) => e.target.select()} className="min-h-11 rounded-2xl border-2 border-line bg-surface px-3 text-[14px]" />
          <div className="flex gap-2">
            <button type="button" onClick={copy} className="min-h-11 flex-1 rounded-full border-2 border-edge bg-za5 px-4 text-[14px] font-extrabold text-za5-ink">
              {copied ? t.copied : t.copy}
            </button>
            {canShare && (
              <button
                type="button"
                onClick={() => navigator.share({ title: "Za5", text: t.shareText(homeName), url: link }).catch(() => {})}
                className="min-h-11 flex-1 rounded-full border-2 border-edge bg-surface px-4 text-[14px] font-extrabold"
              >
                {t.share}
              </button>
            )}
          </div>
        </div>
      ) : (
        <Button type="button" onClick={make} disabled={pending}>{t.makeLink}</Button>
      )}
      <FormMessage error={error} />
    </section>
  );
}
