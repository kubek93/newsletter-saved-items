import type { ContentPart } from "./types";

/** Gemini takes about 20 MB inline per request; leave room for the rest of the prompt (ADR 0005). */
export const MAX_INLINE_VIDEO_BYTES = 15 * 1024 * 1024;

/** Downloads a video so it can be sent to the model inline. Fails fast on files too large to send. */
export async function downloadVideo(url: string): Promise<ContentPart> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Video download failed with ${res.status}`);

  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_INLINE_VIDEO_BYTES) throw tooLarge(declared);

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_INLINE_VIDEO_BYTES) throw tooLarge(bytes.byteLength);

  const mimeType = res.headers.get("content-type")?.split(";")[0] || "video/mp4";
  return { type: "video", bytes, mimeType };
}

/** The limit is per request, so several videos in one Item (a carousel) must fit together. */
export function assertVideosFitInline(parts: ContentPart[]): void {
  const total = parts.reduce((sum, part) => sum + (part.type === "video" ? part.bytes.byteLength : 0), 0);
  if (total > MAX_INLINE_VIDEO_BYTES) throw tooLarge(total);
}

function tooLarge(bytes: number): Error {
  const mb = (bytes / 1024 / 1024).toFixed(1);
  return new Error(`Video too large to send to the model inline: ${mb} MB`);
}
