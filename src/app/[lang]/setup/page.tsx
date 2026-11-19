import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { getCurrentHome } from "@/server/session";
import { getSetupSteps } from "@/server/walkthrough";

/** The walkthrough starts at the first Room (or the Whole home, when there are no Rooms yet). */
export default async function SetupStart() {
  const { me, household } = await getCurrentHome();
  if (household.role !== "owner") redirect("/");
  const [first] = await getSetupSteps(getDb(), me.id);
  redirect(`/setup/${first.kind === "whole" ? "whole" : first.roomId}`);
}
