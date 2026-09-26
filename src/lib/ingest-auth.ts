import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./env";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** True when the request carries the static ingest token as a bearer token. Constant-time compare. */
export function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  return timingSafeEqual(digest(presented), digest(env.ingestToken));
}
