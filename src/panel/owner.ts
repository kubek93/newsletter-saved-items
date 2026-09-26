/**
 * True when `email` is the allowlisted Owner address. Case and surrounding whitespace do not matter.
 * Kept free of `@/lib/env` so the proxy, deployed on its own, can share it.
 */
export function isOwnerEmail(email: string | null | undefined, ownerEmail: string): boolean {
  return !!email && email.trim().toLowerCase() === ownerEmail.trim().toLowerCase();
}

export type Access = { access: "anonymous" } | { access: "refused" } | { access: "owner"; email: string };

/** What a Google account (or nobody) may do in the Panel. */
export function accessFor(account: { email?: string } | null, ownerEmail: string): Access {
  if (!account) return { access: "anonymous" };
  return isOwnerEmail(account.email, ownerEmail) ? { access: "owner", email: account.email! } : { access: "refused" };
}

/** The sign-in page, with the reason the visitor landed there. */
export function loginPath(reason?: "refused" | "error"): string {
  return reason ? `/login?${reason}=1` : "/login";
}
