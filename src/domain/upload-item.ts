import { randomUUID } from "node:crypto";
import { digestDayFor } from "./digest-day";

/** What the Shortcut may upload. HEIC is converted to JPEG on the device first. */
export const UPLOAD_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"] as const;
export type UploadMimeType = (typeof UPLOAD_MIME_TYPES)[number];

export function isUploadMimeType(value: unknown): value is UploadMimeType {
  return (UPLOAD_MIME_TYPES as readonly unknown[]).includes(value);
}

export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

/** Where a new upload lands in the bucket: by month, with a random prefix so two files with one name never collide. */
export function uploadPathFor(filename: string, savedAt = new Date()): string {
  const safeName = filename.replace(/[^\w.-]+/g, "_").slice(-80) || "file";
  const month = savedAt.toISOString().slice(0, 7).replace("-", "/");
  return `${month}/${randomUUID()}-${safeName}`;
}

/** The row to insert for a file the Shortcut has just put into Storage. Uploads are never deduplicated. */
export function newUploadItem(storagePath: string, mimeType: UploadMimeType, savedAt = new Date()) {
  return {
    source: "upload" as const,
    storage_path: storagePath,
    mime_type: mimeType,
    saved_at: savedAt.toISOString(),
    digest_day: digestDayFor(savedAt),
  };
}
