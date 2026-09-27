import { afterResponse } from "@/lib/after-response";
import { isAuthorized } from "@/lib/ingest-auth";
import { openBatchItem } from "@/lib/item-files";
import { readJson } from "@/lib/read-json";
import { summarizeItem } from "@/summarize";

/** The Summary is written after the response, in the same invocation; several videos take a while. */
export const maxDuration = 300;

/**
 * Last call of a share of several files: every file of the batch is registered, so the collection's
 * Summary can be written now. Without this call the daily retry picks the Item up as stuck Pending.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await readJson<{ batch?: unknown }>(request);
  if (typeof body?.batch !== "string" || !body.batch.trim()) {
    return Response.json({ error: "missing batch" }, { status: 400 });
  }

  const id = await openBatchItem(body.batch.trim());
  if (!id) {
    return Response.json({ error: "unknown batch" }, { status: 404 });
  }
  afterResponse(() => summarizeItem(id));
  return Response.json({ status: "queued", id }, { status: 202 });
}
