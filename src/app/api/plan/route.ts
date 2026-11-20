import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { requestLang } from "@/i18n/server";
import { toActionError } from "@/app/[lang]/action-result";
import { localizeError } from "@/i18n/errors";
import { planStore } from "@/server/plan-store";
import { uploadPlan } from "@/server/plans";
import { findCurrentUser } from "@/server/session";

/**
 * Upload a Plan: the original files ("file", one or more) and the pages the browser made of them ("page", JPEG,
 * in order). Answers { ok } or { error } in the person's language.
 */
const BODY_MAX = 40 * 1024 * 1024; // the same as proxyClientMaxBodySize in next.config.ts

export async function POST(request: Request) {
  const lang = await requestLang();
  const me = await findCurrentUser();
  if (!me) return NextResponse.json({ error: localizeError(lang, "Sign in first.") }, { status: 401 });
  // refuse an oversized upload before reading it into memory
  if (Number(request.headers.get("content-length") ?? 0) > BODY_MAX) {
    return NextResponse.json({ error: localizeError(lang, "That plan is too big. Up to 20 MB, please.") }, { status: 413 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: localizeError(lang, "That upload didn't arrive whole. Try again.") }, { status: 400 });
  }
  const blobs = (key: string) => form.getAll(key).filter((v): v is File => typeof v !== "string");
  try {
    await uploadPlan(
      getDb(),
      me.id,
      {
        files: await Promise.all(blobs("file").map(async (f) => ({ name: f.name || "plan", mediaType: f.type, data: Buffer.from(await f.arrayBuffer()) }))),
        pages: await Promise.all(blobs("page").map(async (p) => Buffer.from(await p.arrayBuffer()))),
      },
      new Date(),
      planStore(),
    );
  } catch (err) {
    const result = toActionError(err, lang);
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
