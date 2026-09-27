import { readFileSync } from "node:fs";
import path from "node:path";
import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";

/** Every outbound call leaves through here. Local Supabase is let through; anything else must have a handler. */
export const network = setupServer();

export function startNetwork() {
  network.listen({
    onUnhandledRequest(request, print) {
      const { hostname } = new URL(request.url);
      if (hostname === "127.0.0.1" || hostname === "localhost") return;
      print.error();
    },
  });
}

function fixture(relative: string): unknown {
  return JSON.parse(readFileSync(path.resolve(import.meta.dirname, "fixtures", relative), "utf8"));
}

/** FxTwitter answers every post lookup with the named recorded response. */
export function fxtwitterAnswers(name: "text-only" | "with-photo" | "with-video" | "not-found") {
  const body = fixture(`fxtwitter/${name}.json`) as { code: number };
  return http.get("https://api.fxtwitter.com/*", () => HttpResponse.json(body, { status: body.code }));
}

const FIRECRAWL_STATUS: Record<string, number> = { page: 200, "not-found": 200, blocked: 403, "no-credits": 402 };

/** Firecrawl answers every scrape with the named recorded response. */
export function firecrawlAnswers(name: "page" | "not-found" | "blocked" | "no-credits") {
  const body = fixture(`firecrawl/${name}.json`) as Record<string, unknown>;
  return http.post("https://api.firecrawl.dev/v2/scrape", () => HttpResponse.json(body, { status: FIRECRAWL_STATUS[name] }));
}

const APIFY_RUN = "https://api.apify.com/v2/acts/*/run-sync-get-dataset-items";

/** The Apify actor run answers with the named recorded dataset. */
export function apifyAnswers(name: "photo" | "reel" | "sidecar" | "empty" | "blocked") {
  return http.post(APIFY_RUN, () => HttpResponse.json(fixture(`apify/${name}.json`) as unknown[], { status: 201 }));
}

/** The Apify actor run fails with an API error. */
export function apifyFails(status: number, message: string) {
  return http.post(APIFY_RUN, () => HttpResponse.json({ error: { type: "error", message } }, { status }));
}

/** A video file on a CDN. `declaredLength` fakes a Content-Length larger than the body, to test the size guard. */
export function videoFileAnswers(url: string, bytes: Uint8Array, declaredLength?: number) {
  const { origin, pathname } = new URL(url);
  return http.get(origin + pathname, () =>
    HttpResponse.arrayBuffer(bytes.buffer as ArrayBuffer, {
      headers: { "content-type": "video/mp4", "content-length": String(declaredLength ?? bytes.byteLength) },
    }),
  );
}

export type OpenRouterOptions = {
  /** What the model "answers"; serialised into the assistant message. Non-object values are sent as-is. */
  reply?: unknown;
  status?: number;
  delayMs?: number;
  /** Receives each request body so a test can assert on what the model was asked. */
  onRequest?: (body: OpenRouterRequest) => void;
};

export type OpenRouterRequest = {
  model: string;
  messages: { role: string; content: string | { type: string; [key: string]: unknown }[] }[];
  response_format?: unknown;
  provider?: unknown;
};

/** OpenRouter answers normally and every request body lands in `requests`, for asserting on what the model was asked. */
export function openrouterCaptures(requests: OpenRouterRequest[]) {
  return openrouterAnswers({ onRequest: (body) => requests.push(body) });
}

/** The user message's content parts of a captured request. */
export function userContent(request: OpenRouterRequest) {
  return request.messages.find((m) => m.role === "user")!.content as { type: string; [key: string]: unknown }[];
}

export const SAMPLE_REPLY = {
  title: "Pierwszy tweet w historii",
  description: "Jack Dorsey ogłasza uruchomienie swojego konta na Twitterze krótkim wpisem „just setting up my twttr”.",
  recap: "Historyczny, pierwszy wpis na Twitterze.",
  category: "AI/IT",
};

/** OpenRouter answers chat completions with the given reply, in the OpenAI-compatible shape. */
export function openrouterAnswers(options: OpenRouterOptions = {}) {
  const { reply = SAMPLE_REPLY, status = 200, delayMs = 0, onRequest } = options;
  return http.post("https://openrouter.ai/api/v1/chat/completions", async ({ request }) => {
    onRequest?.((await request.json()) as OpenRouterRequest);
    if (delayMs) await delay(delayMs);
    if (status !== 200) return HttpResponse.json({ error: { message: "upstream error" } }, { status });
    const completion = fixture("openrouter/completion.json") as {
      choices: { message: { content: string } }[];
    };
    completion.choices[0].message.content = typeof reply === "string" ? reply : JSON.stringify(reply);
    return HttpResponse.json(completion);
  });
}
