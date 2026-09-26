import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as registerUpload } from "@/app/api/ingest/upload/route";
import { POST as requestUploadUrl } from "@/app/api/ingest/upload-url/route";
import { MAX_INLINE_VIDEO_BYTES } from "@/readers/video";
import { supabaseAdmin } from "@/lib/supabase";
import { allItems, clearItems, getItem, waitUntilSummarized } from "./items";
import { network, openrouterAnswers, openrouterCaptures, userContent, type OpenRouterRequest } from "./network";

const TOKEN = process.env.INGEST_TOKEN!;
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);
const MP4 = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);

function call(handler: (req: Request) => Promise<Response>, body: unknown, token: string | null = TOKEN) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  return handler(new Request("http://localhost/api/ingest/upload", { method: "POST", headers, body: JSON.stringify(body) }));
}

/** What the Shortcut does: ask for a signed URL, PUT the file there, register the path. */
async function share(filename: string, mimeType: string, bytes: Uint8Array<ArrayBuffer>) {
  const { uploadUrl, path } = await (await call(requestUploadUrl, { filename, mimeType })).json();
  const put = await fetch(uploadUrl, { method: "PUT", body: new Blob([bytes], { type: mimeType }) });
  expect(put.status).toBe(200);
  const res = await call(registerUpload, { path });
  return { res, path };
}

describe("file upload through signed URLs", () => {
  beforeEach(async () => {
    await clearItems();
    network.use(openrouterAnswers());
  });
  afterEach(() => waitUntilSummarized());

  it("refuses both calls without the token", async () => {
    expect((await call(requestUploadUrl, { filename: "a.jpg", mimeType: "image/jpeg" }, null)).status).toBe(401);
    expect((await call(registerUpload, { path: "x" }, "wrong")).status).toBe(401);
  });

  it("rejects an unsupported file type and a missing filename", async () => {
    expect((await call(requestUploadUrl, { filename: "a.heic", mimeType: "image/heic" })).status).toBe(400);
    expect((await call(requestUploadUrl, { mimeType: "image/jpeg" })).status).toBe(400);
  });

  it("hands out a signed upload URL into the uploads bucket with a path under the current month", async () => {
    const res = await call(requestUploadUrl, { filename: "IMG 0001.jpg", mimeType: "image/jpeg" });

    expect(res.status).toBe(200);
    const { uploadUrl, path } = await res.json();
    expect(path).toMatch(/^\d{4}\/\d{2}\/[0-9a-f-]{36}-IMG_0001\.jpg$/);
    expect(uploadUrl).toContain("/storage/v1/object/upload/sign/uploads/");
    expect(uploadUrl).toContain("token=");
  });

  it("refuses to register a path nothing was uploaded to", async () => {
    const res = await call(registerUpload, { path: "2026/09/nothing-here.jpg" });
    expect(res.status).toBe(400);
    expect(await allItems()).toHaveLength(0);
  });

  it("lets the bucket refuse a file type the Shortcut should have converted", async () => {
    const { uploadUrl } = await (await call(requestUploadUrl, { filename: "a.jpg", mimeType: "image/jpeg" })).json();

    const put = await fetch(uploadUrl, { method: "PUT", body: new Blob([JPEG], { type: "image/heic" }) });

    expect(put.status).not.toBe(200);
  });

  it("takes the file type from Storage, not from the caller", async () => {
    const { uploadUrl, path } = await (await call(requestUploadUrl, { filename: "clip.mp4", mimeType: "video/mp4" })).json();
    await fetch(uploadUrl, { method: "PUT", body: new Blob([MP4], { type: "video/mp4" }) });

    const res = await call(registerUpload, { path, mimeType: "image/jpeg" });

    const { id } = await res.json();
    expect((await getItem(id)).mime_type).toBe("video/mp4");
  });

  it("turns an uploaded JPEG into a done Item, the model seeing it through a signed URL", async () => {
    const requests: OpenRouterRequest[] = [];
    network.use(openrouterCaptures(requests));

    const { res, path } = await share("kubek.jpg", "image/jpeg", JPEG);

    expect(res.status).toBe(201);
    const { status, id } = await res.json();
    expect(status).toBe("created");
    expect(await getItem(id)).toMatchObject({ source: "upload", storage_path: path, mime_type: "image/jpeg", url: null });

    await waitUntilSummarized();
    expect((await getItem(id)).status).toBe("done");
    const content = userContent(requests[0]);
    expect(content.map((part) => part.type)).toEqual(["text", "image_url"]);
    const imageUrl = (content[1].image_url as { url: string }).url;
    expect(imageUrl).toContain(`/storage/v1/object/sign/uploads/${path}`);
    expect(imageUrl).toContain("token=");
    expect((await fetch(imageUrl)).status).toBe(200);
  });

  it("turns an uploaded MP4 into a done Item, the model receiving the video inline", async () => {
    const requests: OpenRouterRequest[] = [];
    network.use(openrouterCaptures(requests));

    const { res } = await share("clip.mp4", "video/mp4", MP4);
    const { id } = await res.json();

    await waitUntilSummarized();
    expect((await getItem(id)).status).toBe("done");
    const content = userContent(requests[0]);
    expect(content.map((part) => part.type)).toEqual(["text", "video_url"]);
    expect((content[1].video_url as { url: string }).url).toBe(`data:video/mp4;base64,${Buffer.from(MP4).toString("base64")}`);
    expect(requests[0].provider).toEqual({ only: ["google-ai-studio"] });
  });

  it("marks a video above the inline limit Failed with a clear error", async () => {
    const big = new Uint8Array(MAX_INLINE_VIDEO_BYTES + 1);
    const { res } = await share("long.mp4", "video/mp4", big);
    const { id } = await res.json();

    await waitUntilSummarized();
    const item = await getItem(id);
    expect(item.status).toBe("failed");
    expect(item.error).toContain("too large");
  });

  it("registers the same path twice as two Items", async () => {
    const { path } = await share("twice.jpg", "image/jpeg", JPEG);

    const again = await call(registerUpload, { path });

    expect(again.status).toBe(201);
    expect(await allItems()).toHaveLength(2);
  });

  it("keeps the bucket private", async () => {
    const { path } = await share("secret.jpg", "image/jpeg", JPEG);

    const { data: bucket } = await supabaseAdmin.storage.getBucket("uploads");
    expect(bucket?.public).toBe(false);
    const res = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/public/uploads/${path}`);
    expect(res.status).not.toBe(200);
  });
});
