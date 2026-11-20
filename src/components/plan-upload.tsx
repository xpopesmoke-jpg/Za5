"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { PLAN_PAGES_MAX } from "@/domain/plan";
import { FormMessage } from "./ui";

const LONG_SIDE = 2200; // px: sharp enough to read the dimensions, small enough to send

/** A canvas as a JPEG file. */
const jpeg = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("no jpeg"))), "image/jpeg", 0.88));

function canvasOf(w: number, h: number) {
  const scale = Math.min(1, LONG_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d")!;
  // plans are drawn on white; transparent PNGs would turn black as JPEG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, ctx, scale };
}

/** Each page of a PDF as a JPEG, rendered in the browser so the server only ever handles pictures. */
async function pdfPages(file: File, onPage: (done: number, all: number) => void) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const doc = await task.promise;
    // one page over the limit is enough for the server to say "up to 6 pages"
    const count = Math.min(doc.numPages, PLAN_PAGES_MAX + 1);
    const pages: Blob[] = [];
    for (let i = 1; i <= count; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: LONG_SIDE / Math.max(base.width, base.height) });
      const { canvas } = canvasOf(viewport.width, viewport.height);
      await page.render({ canvas, viewport, background: "#ffffff" }).promise;
      pages.push(await jpeg(canvas));
      onPage(i, count);
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

async function imagePage(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { canvas, ctx, scale } = canvasOf(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, 0, 0, bitmap.width * scale, bitmap.height * scale);
  bitmap.close();
  return jpeg(canvas);
}

/** Choose a PDF or pictures; the browser turns them into one JPEG per Floor and uploads them with the original. */
export function PlanUpload({ again = false }: { again?: boolean }) {
  const t = useT().plan;
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  async function send(files: File[]) {
    setError(undefined);
    if (!files.length) return;
    try {
      const pages: Blob[] = [];
      for (const f of files.slice(0, PLAN_PAGES_MAX + 1)) {
        if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) pages.push(...(await pdfPages(f, (d, a) => setBusy(t.preparing(d, a)))));
        else {
          setBusy(t.preparing(pages.length + 1, files.length));
          pages.push(await imagePage(f));
        }
      }
      const form = new FormData();
      files.forEach((f) => form.append("file", f, f.name));
      pages.forEach((p, i) => form.append("page", p, `page-${i + 1}.jpg`));
      setBusy(t.uploading);
      const res = await fetch("/api/plan", { method: "POST", body: form });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw Object.assign(new Error(body.error ?? "upload"), { shown: !!body.error });
      router.refresh();
    } catch (err) {
      setError((err as { shown?: boolean }).shown ? (err as Error).message : t.cantOpen);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        className={`flex min-h-14 cursor-pointer items-center justify-center rounded-full border-2 border-edge px-5 text-center text-[16px] font-extrabold has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${again ? "bg-surface text-ink" : "bg-za5 text-za5-ink"} ${busy ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          type="file"
          accept="application/pdf,image/*"
          multiple
          className="sr-only"
          disabled={!!busy}
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            void send(files);
          }}
        />
        <span>{busy ?? (again ? t.newPlan : t.choose)}</span>
      </label>
      <p role="status" className="sr-only">
        {busy ?? ""}
      </p>
      {!again && <p className="text-[14px] text-ink-2">{t.chooseHint}</p>}
      <FormMessage error={error} />
    </div>
  );
}
