import { hourInWarsaw } from "@/domain/digest-day";
import { bearerTokenMatches } from "./bearer";
import { env } from "./env";

/** True when the request comes from Vercel Cron, which sends `CRON_SECRET` as a bearer token. */
export function isCronAuthorized(request: Request): boolean {
  return bearerTokenMatches(request, env.cronSecret);
}

/**
 * The response a cron route must return without doing anything, or null when the job should run.
 * Vercel Cron runs in UTC, so each job is scheduled at the two UTC hours that can be its Warsaw hour and
 * acts only when the Europe/Warsaw clock says `warsawHour`.
 */
export function cronGate(request: Request, warsawHour: number): Response | null {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (hourInWarsaw(new Date()) !== warsawHour) {
    return Response.json({ skipped: true });
  }
  return null;
}
