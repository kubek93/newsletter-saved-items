import { isVideoMimeType } from "@/domain/upload-item";
import { uploads } from "@/lib/uploads";
import type { ContentPart, Reader } from "./types";
import { MAX_INLINE_VIDEO_BYTES } from "./video";

const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Reads a photo or video the Owner uploaded. A photo reaches the model by a short-lived signed URL;
 * a video is downloaded from Storage and sent inline (ADR 0005), within the inline size limit.
 */
export const readUpload: Reader = async (item) => {
  const path = item.storage_path!;
  const mimeType = item.mime_type ?? "application/octet-stream";
  const filename = path.slice(path.lastIndexOf("-") + 1);

  if (isVideoMimeType(mimeType)) {
    const { data, error } = await uploads().download(path);
    if (error) throw new Error(`Storage download failed: ${error.message}`);
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (bytes.byteLength > MAX_INLINE_VIDEO_BYTES) {
      const mb = (bytes.byteLength / 1024 / 1024).toFixed(1);
      throw new Error(`Video too large to send to the model inline: ${mb} MB`);
    }
    const parts: ContentPart[] = [{ type: "text", text: `Wideo z urządzenia (${filename})` }, { type: "video", bytes, mimeType }];
    return parts;
  }

  const { data, error } = await uploads().createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw new Error(`Storage signed URL failed: ${error.message}`);
  return [
    { type: "text", text: `Zdjęcie z urządzenia (${filename})` },
    { type: "image", url: data.signedUrl },
  ];
};
