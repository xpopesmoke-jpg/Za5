import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { ActionForm } from "@/components/action-form";
import { ConfirmButton } from "@/components/confirm-button";
import { PlanDraft } from "@/components/plan-draft";
import { PlanReadButton } from "@/components/plan-read-button";
import { PlanUpload } from "@/components/plan-upload";
import { DICT } from "@/i18n/dictionary";
import { langOf } from "@/i18n/server";
import { getHome } from "@/server/home";
import { unlimitedEmails } from "@/server/plan-config";
import { getPlan } from "@/server/plans";
import { getCurrentHome } from "@/server/session";
import { applyPlanAction, deletePlanAction, readPlanAction } from "./actions";

const secondary = "flex min-h-12 w-full items-center justify-center rounded-full border-2 border-edge bg-surface px-5 text-[16px] font-extrabold text-ink";

/** The Owner's Plan: upload it, have Claude read it, compare the Draft home with the Plan, then save or fix it. */
export default async function PlanPage({ params }: PageProps<"/[lang]/plan">) {
  const lang = langOf((await params).lang);
  const { me, household } = await getCurrentHome();
  if (household.role !== "owner") redirect("/");
  const db = getDb();
  const [plan, home] = await Promise.all([getPlan(db, me.id, new Date(), unlimitedEmails()), getHome(db, me.id)]);
  const t = DICT[lang].plan;
  const hasRooms = home.floors.some((f) => f.rooms.length > 0);
  const canRead = plan?.readsLeft !== 0;
  const files = plan ? plan.fileName.split(", ") : [];
  const originals = (
    <div className="flex flex-col gap-1">
      {files.map((name, i) => (
        <a key={i} href={`/api/plan/original/${i + 1}`} target="_blank" rel="noopener" className="self-start text-[15px] font-bold text-ink-2 underline">
          {t.openOriginal(i + 1, files.length)}
        </a>
      ))}
    </div>
  );
  const readsNote = plan && (plan.readsLeft === null ? null : plan.readsLeft === 0 ? t.noReadsLeft : t.readsLeft(plan.readsLeft));

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px]">{plan?.status === "read" ? t.draftTitle : t.title}</h1>
        <Link href="/" className="text-[15px] font-semibold text-accent">
          {DICT[lang].rooms.done}
        </Link>
      </header>

      {!plan && (
        <>
          <p className="text-[16px]">{t.intro}</p>
          <PlanUpload />
          <p className="rounded-2xl bg-raised p-3 text-[14px]">{t.privacy}</p>
          <Link href="/rooms" className="self-start text-[15px] font-bold text-ink-2 underline">
            {t.orList}
          </Link>
        </>
      )}

      {plan?.status === "read" && plan.draft && (
        <>
          <p className="text-[16px]">{t.draftIntro}</p>
          <PlanDraft draft={plan.draft} version={plan.id} />
          {hasRooms && <p className="rounded-2xl bg-raised p-3 text-[14px]">{t.replaces}</p>}
          <div className="flex flex-col gap-3">
            <ActionForm action={applyPlanAction.bind(null, "home")}>
              <button type="submit" className="flex min-h-14 w-full items-center justify-center rounded-full border-2 border-edge bg-za5 px-5 text-[17px] font-extrabold text-za5-ink">
                {t.looksRight}
              </button>
            </ActionForm>
            <ActionForm action={applyPlanAction.bind(null, "fix")}>
              <button type="submit" className={secondary}>
                {t.fixIt}
              </button>
            </ActionForm>
            <p className="text-[14px] text-ink-2">{t.fixItHint}</p>
          </div>
          <ActionForm action={readPlanAction} className="flex flex-col gap-2 border-t-2 border-line pt-5">
            <PlanReadButton label={t.readAgain} disabled={!canRead} quiet />
            {readsNote && <p className="text-center text-[14px] text-ink-2">{readsNote}</p>}
          </ActionForm>
        </>
      )}

      {plan && plan.status !== "read" && (
        <>
          <section className="flex flex-col gap-3 rounded-card border-2 border-edge bg-raised p-4">
            <h2 className="text-[20px]">{t.yourPlan}</h2>
            <p className="text-[14px] text-ink-2">
              {plan.fileName}: {t.pages(plan.pageCount)}
            </p>
            <div className="flex gap-2 overflow-x-auto">
              {Array.from({ length: plan.pageCount }, (_, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- a private, signed-in image from our own route
                <img key={i} src={`/api/plan/page/${i + 1}?v=${plan.id}`} alt={t.pageAlt(i + 1)} className="h-32 w-auto shrink-0 rounded-xl border-2 border-line bg-white" />
              ))}
            </div>
          </section>
          {plan.status === "failed" && (
            <p role="status" className="rounded-2xl border-2 border-accent bg-surface p-3 text-[15px]">
              {t.failed}
            </p>
          )}
          <ActionForm action={readPlanAction} className="flex flex-col gap-2">
            <PlanReadButton label={plan.status === "failed" ? t.readAgain : t.read} disabled={!canRead} />
            {readsNote && <p className="text-center text-[14px] text-ink-2">{readsNote}</p>}
          </ActionForm>
          <p className="rounded-2xl bg-raised p-3 text-[14px]">{t.privacy}</p>
          <Link href="/rooms" className="self-start text-[15px] font-bold text-ink-2 underline">
            {t.orList}
          </Link>
        </>
      )}

      {plan && (
        <section className="mt-2 flex flex-col gap-3 border-t-2 border-line pt-5">
          {originals}
          <PlanUpload again />
          <ActionForm action={deletePlanAction}>
            <ConfirmButton label={t.deletePlan} confirmLabel={t.deleteConfirm} className="min-h-11 text-[15px] font-bold text-danger underline" />
          </ActionForm>
        </section>
      )}
    </main>
  );
}
