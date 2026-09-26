import { bearerTokenMatches } from "./bearer";
import { env } from "./env";

/** True when the request carries the static ingest token the Shortcut holds. */
export function isAuthorized(request: Request): boolean {
  return bearerTokenMatches(request, env.ingestToken);
}
