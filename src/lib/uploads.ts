import { supabaseAdmin } from "./supabase";

/** The private bucket holding every photo and video shared from the device (ADR 0004). */
export const UPLOADS_BUCKET = "uploads";

const SIGNED_URL_SECONDS = 60 * 60;

export const uploadsBucket = () => supabaseAdmin.storage.from(UPLOADS_BUCKET);

/** A one-hour URL to read one uploaded file: for the model, or for a preview in the Panel. */
export async function signedUploadUrl(path: string): Promise<string> {
  const { data, error } = await uploadsBucket().createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw new Error(`Storage signed URL failed: ${error.message}`);
  return data.signedUrl;
}
