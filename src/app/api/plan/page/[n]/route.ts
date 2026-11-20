import { getDb } from "@/db/client";
import { planStore } from "@/server/plan-store";
import { planPage } from "@/server/plans";
import { findCurrentUser } from "@/server/session";

/** One page of the Owner's Plan as a JPEG, for showing beside the drawing. Private: never cached by others. */
export async function GET(_request: Request, ctx: RouteContext<"/api/plan/page/[n]">) {
  const me = await findCurrentUser();
  if (!me) return new Response(null, { status: 401 });
  try {
    const data = await planPage(getDb(), me.id, Number((await ctx.params).n), planStore());
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
