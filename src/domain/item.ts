import type { LinkSource } from "./source";
import type { Summary } from "./summary";

export type Source = LinkSource | "upload";
export type Status = "pending" | "done" | "failed";

/** A row of `items`. The Summary columns are null until the Item is done. */
export type Item = {
  id: string;
  source: Source;
  url: string | null;
  normalized_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  status: Status;
  attempts: number;
  saved_at: string;
  digest_day: string;
  error: string | null;
} & { [K in keyof Summary]: Summary[K] | null };
