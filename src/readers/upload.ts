import { isVideoMimeType, uploadFilename } from "@/domain/upload-item";
import { signedUploadUrl, uploadsBucket } from "@/lib/uploads";
import type { Reader } from "./types";
import { MAX_INLINE_VIDEO_BYTES, videoTooLarge } from "./video";

/**
 * Reads a photo or video the Owner uploaded. A photo reaches the model by a short-lived signed URL;
 * a video is downloaded from Storage and sent inline (ADR 0005), unless it is too large to fit.
 */
export const readUpload: Reader = async (item) => {
  const path = item.storage_path!;
  const mimeType = item.mime_type!;
  const filename = uploadFilename(path);

  if (isVideoMimeType(mimeType)) {
    const { data: file, error: infoError } = await uploadsBucket().info(path);
    if (infoError) throw new Error(`Storage lookup failed: ${infoError.message}`);
    if ((file.size ?? 0) > MAX_INLINE_VIDEO_BYTES) throw videoTooLarge(file.size!);

    const { data, error } = await uploadsBucket().download(path);
    if (error) throw new Error(`Storage download failed: ${error.message}`);
    return [
      { type: "text", text: `Wideo z urządzenia (${filename})` },
      { type: "video", bytes: new Uint8Array(await data.arrayBuffer()), mimeType },
    ];
  }

  return [
    { type: "text", text: `Zdjęcie z urządzenia (${filename})` },
    { type: "image", url: await signedUploadUrl(path) },
  ];
};
