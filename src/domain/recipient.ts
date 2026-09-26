/** A row of `recipients`: an address that receives the Digest. Never logs in. */
export type Recipient = { id: string; email: string; created_at: string };

/** The stored form of an address: trimmed and lower-cased, so one mailbox cannot be added twice in two spellings. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** Good enough to catch typos and empty fields; the mail provider has the final say. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}
