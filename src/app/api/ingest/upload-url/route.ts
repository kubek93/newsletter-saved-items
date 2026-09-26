import { isUploadMimeType, uploadPathFor } from "@/domain/upload-item";
import { isAuthorized } from "@/lib/ingest-auth";
import { readJson } from "@/lib/read-json";
import { uploadsBucket } from "@/lib/uploads";

/**
 * First call of a file share: hands the Shortcut a signed URL to PUT the file straight into Storage,
 * so the bytes never pass through Vercel (ADR 0004). The Item is registered in a second call.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await readJson<{ filename?: unknown; mimeType?: unknown }>(request);
  if (typeof body?.filename !== "string" || !body.filename.trim()) {
    return Response.json({ error: "missing filename" }, { status: 400 });
  }
  if (!isUploadMimeType(body.mimeType)) {
    return Response.json({ error: "unsupported mimeType" }, { status: 400 });
  }

  const { data, error } = await uploadsBucket().createSignedUploadUrl(uploadPathFor(body.filename));
  if (error) throw error;
  return Response.json({ uploadUrl: data.signedUrl, path: data.path });
}
