import type { Category } from "./category";

export type Source = "x" | "instagram" | "web" | "upload";
export type Status = "pending" | "done" | "failed";

/** A row of `items`. */
export type Item = {
  id: string;
  source: Source;
  url: string | null;
  normalized_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  status: Status;
  attempts: number;
  title: string | null;
  description: string | null;
  recap: string | null;
  category: Category | null;
  saved_at: string;
  digest_day: string;
  error: string | null;
};
