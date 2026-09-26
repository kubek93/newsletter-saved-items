import { bearerTokenMatches } from "./bearer";
import { env } from "./env";

/** True when the request comes from Vercel Cron, which sends `CRON_SECRET` as a bearer token. */
export function isCronAuthorized(request: Request): boolean {
  return bearerTokenMatches(request, env.cronSecret);
}
