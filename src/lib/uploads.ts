import { supabaseAdmin } from "./supabase";

/** The private bucket holding every photo and video shared from the device (ADR 0004). */
export const UPLOADS_BUCKET = "uploads";

export const uploadsBucket = () => supabaseAdmin.storage.from(UPLOADS_BUCKET);
