import { isVideoMimeType, uploadFilename } from "@/domain/upload-item";
import { listItemFiles, type ItemFile } from "@/lib/item-files";
import { signedUploadUrl, uploadsBucket } from "@/lib/uploads";
import type { ContentPart, Reader } from "./types";
import { MAX_INLINE_VIDEO_BYTES, videoTooLarge } from "./video";

async function videoPart(file: ItemFile): Promise<ContentPart> {
  const { data: object, error: infoError } = await uploadsBucket().info(file.path);
  if (infoError) throw new Error(`Storage lookup failed: ${infoError.message}`);
  if ((object.size ?? 0) > MAX_INLINE_VIDEO_BYTES) throw videoTooLarge(object.size!);

  const { data, error } = await uploadsBucket().download(file.path);
  if (error) throw new Error(`Storage download failed: ${error.message}`);
  return { type: "video", bytes: new Uint8Array(await data.arrayBuffer()), mimeType: file.mime_type };
}

function intro(files: ItemFile[]): string {
  const names = files.map((file) => uploadFilename(file.path));
  if (files.length === 1) return `${isVideoMimeType(files[0].mime_type) ? "Wideo" : "Zdjęcie"} z urządzenia (${names[0]})`;
  return `Kolekcja ${files.length} plików z urządzenia, udostępnionych razem i do opisania jako całość: ${names.join(", ")}`;
}

/**
 * Reads the photos and videos the Owner uploaded in one share. A photo reaches the model by a short-lived
 * signed URL; a video is downloaded from Storage and sent inline (ADR 0005), unless it is too large to fit.
 */
export const readUpload: Reader = async (item) => {
  const files = await listItemFiles(item);
  const parts: ContentPart[] = [{ type: "text", text: intro(files) }];
  for (const file of files) {
    parts.push(isVideoMimeType(file.mime_type) ? await videoPart(file) : { type: "image", url: await signedUploadUrl(file.path) });
  }
  return parts;
};
