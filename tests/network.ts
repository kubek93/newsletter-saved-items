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
export function fxtwitterAnswers(name: "text-only" | "with-photo" | "not-found") {
  const body = fixture(`fxtwitter/${name}.json`) as { code: number };
  return http.get("https://api.fxtwitter.com/*", () => HttpResponse.json(body, { status: body.code }));
}

/** Jina Reader answers every page fetch with the named recorded response. */
export function jinaAnswers(name: "page" | "not-found" | "unresolvable") {
  const body = fixture(`jina/${name}.json`) as { code: number };
  return http.get("https://r.jina.ai/*", () => HttpResponse.json(body, { status: body.code }));
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

export const SAMPLE_REPLY = {
  title: "Pierwszy tweet w historii",
  description: "Jack Dorsey ogłasza uruchomienie swojego konta na Twitterze krótkim wpisem „just setting up my twttr”.",
  recap: "Historyczny, pierwszy wpis na Twitterze.",
  category: "IT",
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
