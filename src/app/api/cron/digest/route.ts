import { sendDigest } from "@/digest/send";
import { hourInWarsaw } from "@/domain/digest-day";
import { isCronAuthorized } from "@/lib/cron-auth";

/** Vercel Cron runs in UTC, so this route is scheduled at both 05:00 and 06:00 UTC and keeps only the 07:00 Warsaw one. */
const RUNS_AT_WARSAW_HOUR = 7;

export const maxDuration = 120;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (hourInWarsaw(new Date()) !== RUNS_AT_WARSAW_HOUR) {
    return Response.json({ skipped: true });
  }
  return Response.json(await sendDigest());
}
