import { env } from "@/lib/env";
import type { Reader } from "./types";

const JINA_READER = "https://r.jina.ai/";

type JinaResponse = {
  code: number;
  message?: string;
  data: {
    title?: string;
    content?: string;
    /** Status of the target page as Jina saw it; Jina itself answers 200 even for a 404 page. */
    httpStatus?: number;
    warning?: string;
  } | null;
};

/** Reads a web page as text through Jina Reader. Paywalls and login walls simply yield no usable text. */
export const readPage: Reader = async (item) => {
  const res = await fetch(JINA_READER + item.url, {
    headers: { accept: "application/json", authorization: `Bearer ${env.jinaApiKey}` },
  });
  const body = (await res.json().catch(() => null)) as JinaResponse | null;
  if (!res.ok || !body?.data) {
    throw new Error(`Jina Reader ${res.status} ${body?.message ?? ""}`.trim());
  }

  const { title, content, httpStatus, warning } = body.data;
  if (httpStatus !== undefined && httpStatus >= 400) {
    throw new Error(`Page returned ${httpStatus}: ${warning ?? ""}`.trim());
  }
  if (!content?.trim()) throw new Error("Page has no readable text");

  return [{ type: "text", text: `${title ?? ""}\n${item.url}\n\n${content}`.trim() }];
};
