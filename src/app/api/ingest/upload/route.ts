import { isUploadMimeType, newUploadItem } from "@/domain/upload-item";
import { afterResponse } from "@/lib/after-response";
import { isAuthorized } from "@/lib/ingest-auth";
import { readJson } from "@/lib/read-json";
import { supabaseAdmin } from "@/lib/supabase";
import { uploads } from "@/lib/uploads";
import { summarizeItem } from "@/summarize";

/** The Summary is written after the response, in the same invocation; a video takes a while to analyse. */
export const maxDuration = 300;

/** Second call of a file share: the file is in Storage, register it as a Pending Item. Never deduplicated. */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await readJson<{ path?: unknown; mimeType?: unknown }>(request);
  if (typeof body?.path !== "string" || !body.path) {
    return Response.json({ error: "missing path" }, { status: 400 });
  }
  if (!isUploadMimeType(body.mimeType)) {
    return Response.json({ error: "unsupported mimeType" }, { status: 400 });
  }

  // Storage answers a missing object with an error rather than `false`; either way the file is not there.
  const { data: exists, error: existsError } = await uploads().exists(body.path);
  if (existsError || !exists) {
    return Response.json({ error: "file not found in storage" }, { status: 400 });
  }

  const inserted = await supabaseAdmin.from("items").insert(newUploadItem(body.path, body.mimeType)).select("id").single();
  if (inserted.error) throw inserted.error;

  const id: string = inserted.data.id;
  afterResponse(() => summarizeItem(id));
  return Response.json({ status: "created", id }, { status: 201 });
}
