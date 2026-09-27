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

const UUID_LENGTH = 36;

/** Where a new upload lands in the bucket: `YYYY/MM/<uuid>-<name>`, so two files with one name never collide. */
export function uploadPathFor(filename: string): string {
  const safeName = filename.replace(/[^\w.-]+/g, "_").slice(-80) || "file";
  const month = new Date().toISOString().slice(0, 7).replace("-", "/");
  return `${month}/${randomUUID()}-${safeName}`;
}

/** The original (sanitised) file name back out of a path made by `uploadPathFor`. */
export function uploadFilename(storagePath: string): string {
  return storagePath.slice(storagePath.lastIndexOf("/") + 1 + UUID_LENGTH + 1);
}

/**
 * The row to insert for the first file the Shortcut has just put into Storage. Uploads are never
 * deduplicated. `batch` is the share's key when more files of the same share may follow.
 */
export function newUploadItem(storagePath: string, mimeType: UploadMimeType, savedAt = new Date(), batch: string | null = null) {
  return {
    source: "upload" as const,
    storage_path: storagePath,
    mime_type: mimeType,
    batch,
    saved_at: savedAt.toISOString(),
    digest_day: digestDayFor(savedAt),
  };
}
