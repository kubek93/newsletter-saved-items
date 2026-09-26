import { sendDigest } from "@/digest/send";
import { cronGate } from "@/lib/cron-auth";

/** Scheduled at 05:00 and 06:00 UTC in vercel.json; one of them is 07:00 Europe/Warsaw. */
const RUNS_AT_WARSAW_HOUR = 7;

/** A handful of Resend calls; well within the limit even on a busy day. */
export const maxDuration = 120;

export async function GET(request: Request) {
  return cronGate(request, RUNS_AT_WARSAW_HOUR) ?? Response.json(await sendDigest());
}
