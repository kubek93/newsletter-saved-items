import { cronGate } from "@/lib/cron-auth";
import { retryStuckItems } from "@/retry";

/** Scheduled at 04:00 and 05:00 UTC in vercel.json; one of them is 06:00 Europe/Warsaw. */
const RUNS_AT_WARSAW_HOUR = 6;

/** Several Items may each need a reader call and a model call. */
export const maxDuration = 300;

export async function GET(request: Request) {
  const gate = cronGate(request, RUNS_AT_WARSAW_HOUR);
  if (gate) return gate;
  const { retried } = await retryStuckItems();
  return Response.json({ retried: retried.length });
}
