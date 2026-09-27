import { isUploadMimeType, newUploadItem } from "@/domain/upload-item";
import { afterResponse } from "@/lib/after-response";
import { isAuthorized } from "@/lib/ingest-auth";
import { addItemFile, openBatchItem } from "@/lib/item-files";
import { readJson } from "@/lib/read-json";
import { supabaseAdmin } from "@/lib/supabase";
import { uploadsBucket } from "@/lib/uploads";
import { summarizeItem } from "@/summarize";

/** The Summary is written after the response, in the same invocation; a video takes a while to analyse. */
export const maxDuration = 300;

/**
 * Second call of a file share: the file is in Storage, register it as a Pending Item. Never deduplicated.
 * The file's type comes from what Storage actually holds, not from the caller. With a `batch` key the
 * file joins the Item the same share started, or starts one whose Summary waits for the `done` call.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await readJson<{ path?: unknown; batch?: unknown }>(request);
  if (typeof body?.path !== "string" || !body.path) {
    return Response.json({ error: "missing path" }, { status: 400 });
  }
  const batch = typeof body.batch === "string" && body.batch.trim() ? body.batch.trim() : null;

  // Storage answers a missing object with an error; either way the file is not there.
  const { data: file, error } = await uploadsBucket().info(body.path);
  if (error) {
    return Response.json({ error: "file not found in storage" }, { status: 400 });
  }
  if (!isUploadMimeType(file.contentType)) {
    return Response.json({ error: `unsupported file type ${file.contentType}` }, { status: 400 });
  }

  const itemFile = { path: body.path, mime_type: file.contentType };
  const open = batch ? await openBatchItem(batch) : null;
  if (open) {
    await addItemFile(open, itemFile);
    return Response.json({ status: "added", id: open }, { status: 200 });
  }

  const inserted = await supabaseAdmin
    .from("items")
    .insert(newUploadItem(body.path, file.contentType, new Date(), batch))
    .select("id")
    .single();
  if (inserted.error) throw inserted.error;

  const id: string = inserted.data.id;
  await addItemFile(id, itemFile);
  if (!batch) afterResponse(() => summarizeItem(id));
  return Response.json({ status: "created", id }, { status: 201 });
}
