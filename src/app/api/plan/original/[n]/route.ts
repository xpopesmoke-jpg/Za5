import { getDb } from "@/db/client";
import { planStore } from "@/server/plan-store";
import { planOriginal } from "@/server/plans";
import { findCurrentUser } from "@/server/session";

/** A file of the Owner's Plan as uploaded, opened in the browser. */
export async function GET(_request: Request, ctx: RouteContext<"/api/plan/original/[n]">) {
  const me = await findCurrentUser();
  if (!me) return new Response(null, { status: 401 });
  try {
    const file = await planOriginal(getDb(), me.id, Number((await ctx.params).n), planStore());
    return new Response(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.mediaType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
