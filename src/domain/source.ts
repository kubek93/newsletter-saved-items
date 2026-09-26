/** Where a link came from. Upload is the fourth Source but never arrives as a URL. */
export type LinkSource = "x" | "instagram" | "web";

const X_HOSTS = new Set(["x.com", "twitter.com"]);
const INSTAGRAM_HOSTS = new Set(["instagram.com"]);

function baseDomain(hostname: string): string {
  const parts = hostname.toLowerCase().split(".");
  return parts.slice(-2).join(".");
}

/** Source of a link by hostname. YouTube is Web: it only differs in how it is read, not where it came from. */
export function detectSource(url: string): LinkSource {
  const domain = baseDomain(new URL(url).hostname);
  if (X_HOSTS.has(domain)) return "x";
  if (INSTAGRAM_HOSTS.has(domain)) return "instagram";
  return "web";
}
