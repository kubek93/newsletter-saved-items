import { hourInWarsaw } from "@/domain/digest-day";
import { isCronAuthorized } from "@/lib/cron-auth";
import { retryStuckItems } from "@/retry";

/** Vercel Cron runs in UTC, so this route is scheduled at both 04:00 and 05:00 UTC and keeps only the 06:00 Warsaw one. */
const RUNS_AT_WARSAW_HOUR = 6;

/** Several Items may each need a reader call and a model call. */
export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (hourInWarsaw(new Date()) !== RUNS_AT_WARSAW_HOUR) {
    return Response.json({ skipped: true });
  }
  const { retried } = await retryStuckItems();
  return Response.json({ retried: retried.length });
}
