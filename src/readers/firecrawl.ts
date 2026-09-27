import { env } from "@/lib/env";
import type { Reader } from "./types";

const FIRECRAWL_SCRAPE = "https://api.firecrawl.dev/v2/scrape";

type FirecrawlResponse = {
  success: boolean;
  error?: string;
  code?: string;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      /** Status of the target page as Firecrawl saw it; Firecrawl itself answers 200 for a 404 page. */
      statusCode?: number;
    };
  };
};

/** Reads a web page as Markdown through Firecrawl. Paywalls and login walls simply yield no usable text. */
export const readPage: Reader = async (item) => {
  const res = await fetch(FIRECRAWL_SCRAPE, {
    method: "POST",
    headers: { authorization: `Bearer ${env.firecrawlApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ url: item.url, formats: ["markdown"], onlyMainContent: true }),
  });
  const body = (await res.json().catch(() => null)) as FirecrawlResponse | null;
  if (!res.ok || !body?.success || !body.data) {
    throw new Error(`Firecrawl ${res.status} ${body?.error ?? ""}`.trim());
  }

  const { markdown, metadata } = body.data;
  const status = metadata?.statusCode;
  if (status !== undefined && status >= 400) throw new Error(`Page returned ${status}`);
  if (!markdown?.trim()) throw new Error("Page has no readable text");

  return [{ type: "text", text: `${metadata?.title ?? ""}\n${item.url}\n\n${markdown}`.trim() }];
};
