import type { ContentPart } from "./types";

/** Gemini takes about 20 MB inline per request; leave room for the rest of the prompt (ADR 0005). */
export const MAX_INLINE_VIDEO_BYTES = 15 * 1024 * 1024;

/** Downloads a video so it can be sent to the model inline. Fails fast on files too large to send. */
export async function downloadVideo(url: string): Promise<ContentPart> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Video download failed with ${res.status}`);

  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_INLINE_VIDEO_BYTES) throw videoTooLarge(declared);

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_INLINE_VIDEO_BYTES) throw videoTooLarge(bytes.byteLength);

  const mimeType = res.headers.get("content-type")?.split(";")[0] || "video/mp4";
  return { type: "video", bytes, mimeType };
}

/** The limit is per request, so several videos in one Item (a carousel) must fit together. */
export function assertVideosFitInline(parts: ContentPart[]): void {
  const total = parts.reduce((sum, part) => sum + (part.type === "video" ? part.bytes.byteLength : 0), 0);
  if (total > MAX_INLINE_VIDEO_BYTES) throw videoTooLarge(total);
}

/** The error stored on an Item whose video cannot be sent; the same wording wherever the limit bites. */
export class VideoTooLargeError extends Error {
  constructor(readonly bytes: number) {
    super(`Video too large to send to the model inline: ${megabytes(bytes)} MB`);
  }
}

export function videoTooLarge(bytes: number): VideoTooLargeError {
  return new VideoTooLargeError(bytes);
}

function megabytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

/**
 * The video inline or, when it will not fit, a note telling the model the video was skipped, with its thumbnail
 * when there is one. The Item is then summarised from what remains (post text, caption, cover) and the
 * Summary says the video was not watched, instead of the Item ending Failed.
 */
export async function videoOrNote(url: string, thumbnailUrl?: string): Promise<ContentPart[]> {
  try {
    return [await downloadVideo(url)];
  } catch (cause) {
    if (!(cause instanceof VideoTooLargeError)) throw cause;
    const note: ContentPart = {
      type: "text",
      text: `Wideo z tego materiału (${megabytes(cause.bytes)} MB) jest za duże, by je obejrzeć, i zostało pominięte. Opisz materiał na podstawie pozostałej treści i zaznacz w streszczeniu, że wideo nie zostało przeanalizowane.`,
    };
    return thumbnailUrl ? [note, { type: "image", url: thumbnailUrl }] : [note];
  }
}
