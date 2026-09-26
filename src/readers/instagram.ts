import { env } from "@/lib/env";
import type { ContentPart, Reader } from "./types";
import { downloadVideo } from "./video";

const APIFY_API = "https://api.apify.com/v2";

type ApifyPost = {
  type: "Image" | "Video" | "Sidecar";
  caption?: string;
  ownerUsername?: string;
  ownerFullName?: string;
  displayUrl?: string;
  videoUrl?: string;
  childPosts?: { type: "Image" | "Video"; displayUrl?: string; videoUrl?: string }[];
};

async function mediaParts(post: ApifyPost): Promise<ContentPart[]> {
  const slides = post.type === "Sidecar" && post.childPosts?.length ? post.childPosts : [post];
  const parts: ContentPart[] = [];
  for (const slide of slides) {
    if (slide.videoUrl) parts.push(await downloadVideo(slide.videoUrl));
    else if (slide.displayUrl) parts.push({ type: "image", url: slide.displayUrl });
  }
  return parts;
}

/**
 * Reads an Instagram post or Reel through an Apify scraper actor run synchronously (ADR 0003).
 * A Reel's video is downloaded so the model watches it, not just its caption (ADR 0005).
 */
export const readInstagram: Reader = async (item) => {
  const res = await fetch(`${APIFY_API}/acts/${env.apifyActor}/run-sync-get-dataset-items?token=${env.apifyToken}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ directUrls: [item.url], resultsType: "posts", resultsLimit: 1 }),
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body as { error?: { message?: string } } | null)?.error?.message ?? "";
    throw new Error(`Apify ${res.status} ${message}`.trim());
  }

  const post = Array.isArray(body) ? (body[0] as ApifyPost | undefined) : undefined;
  if (!post) throw new Error("Instagram post not found or not public");

  const author = `@${post.ownerUsername ?? "?"}${post.ownerFullName ? ` (${post.ownerFullName})` : ""}`;
  const kind = post.type === "Video" ? "Reel" : post.type === "Sidecar" ? "karuzela" : "post";
  const text = `Instagram, ${kind} od ${author}:\n${post.caption ?? "(bez opisu)"}`;
  return [{ type: "text", text }, ...(await mediaParts(post))];
};
