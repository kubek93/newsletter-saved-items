import { readFileSync } from "node:fs";
import path from "node:path";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { summarizeItem } from "@/summarize";
import { clearItems, getItem, insertPendingLink } from "./items";
import {
  firecrawlAnswers,
  network,
  openrouterAnswers,
  openrouterCaptures,
  userContent,
  type OpenRouterRequest,
} from "./network";

function fixtureBody(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.resolve(import.meta.dirname, "fixtures", "firecrawl", `${name}.json`), "utf8"));
}

describe("summarizeItem for web pages", () => {
  beforeEach(clearItems);

  it("gives a web page a Summary based on the page text from Firecrawl", async () => {
    const requests: OpenRouterRequest[] = [];
    network.use(firecrawlAnswers("page"), openrouterCaptures(requests));
    const id = await insertPendingLink("https://en.wikipedia.org/wiki/Ceramic_glaze");

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "done", attempts: 1 });
    const content = userContent(requests[0]);
    expect(content.map((part) => part.type)).toEqual(["text"]);
    const text = JSON.stringify(content);
    expect(text).toContain("Ceramic glaze");
    expect(text).toContain("rice-straw");
    expect(requests[0].provider).toBeUndefined();
  });

  it("marks the Item Failed when the page does not exist", async () => {
    network.use(firecrawlAnswers("not-found"), openrouterAnswers());
    const id = await insertPendingLink("https://example.com/this-page-does-not-exist-404");

    await summarizeItem(id);

    const item = await getItem(id);
    expect(item).toMatchObject({ status: "failed", attempts: 1 });
    expect(item.error).toContain("404");
  });

  it("marks the Item Failed when Firecrawl refuses the site", async () => {
    network.use(firecrawlAnswers("blocked"), openrouterAnswers());
    const id = await insertPendingLink("https://blocked.example/x");

    await summarizeItem(id);

    const item = await getItem(id);
    expect(item).toMatchObject({ status: "failed", attempts: 1 });
    expect(item.error).toContain("Firecrawl 403");
    expect(item.error).toContain("no longer supported");
  });

  it("marks the Item Failed when the Firecrawl account has no credits", async () => {
    network.use(firecrawlAnswers("no-credits"), openrouterAnswers());
    const id = await insertPendingLink("https://example.com/article");

    await summarizeItem(id);

    expect((await getItem(id)).error).toContain("Firecrawl 402");
  });

  it("asks Firecrawl for Markdown of the main content, with the key from configuration", async () => {
    let sent: { url: string; body: unknown; authorization: string | null } | null = null;
    network.use(
      http.post("https://api.firecrawl.dev/v2/scrape", async ({ request }) => {
        sent = { url: request.url, body: await request.json(), authorization: request.headers.get("authorization") };
        return HttpResponse.json(fixtureBody("page"));
      }),
      openrouterAnswers(),
    );
    const id = await insertPendingLink("https://example.com/article");

    await summarizeItem(id);

    expect(sent!.authorization).toBe(`Bearer ${process.env.FIRECRAWL_API_KEY}`);
    expect(sent!.body).toEqual({ url: "https://example.com/article", formats: ["markdown"], onlyMainContent: true });
  });
});

describe("summarizeItem for YouTube", () => {
  beforeEach(clearItems);

  it.each([
    ["youtube.com", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["youtu.be", "https://youtu.be/dQw4w9WgXcQ"],
    ["YouTube Shorts", "https://www.youtube.com/shorts/dQw4w9WgXcQ"],
  ])("sends a %s link to the model as video, pinned to Google AI Studio", async (_name, url) => {
    const requests: OpenRouterRequest[] = [];
    network.use(openrouterCaptures(requests));
    const id = await insertPendingLink(url);

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "done", attempts: 1 });
    const content = userContent(requests[0]);
    expect(content.map((part) => part.type)).toEqual(["text", "video_url"]);
    expect(content[1]).toEqual({ type: "video_url", video_url: { url } });
    expect(requests[0].provider).toEqual({ only: ["google-ai-studio"] });
  });

  it("never asks Firecrawl about a YouTube video", async () => {
    network.use(openrouterAnswers());
    const id = await insertPendingLink("https://www.youtube.com/watch?v=abc");

    await summarizeItem(id);

    expect((await getItem(id)).status).toBe("done");
  });

  it.each([
    ["a channel", "https://www.youtube.com/@veritasium"],
    ["a playlist", "https://www.youtube.com/playlist?list=PL123"],
    ["the home page", "https://www.youtube.com/"],
  ])("reads %s as an ordinary page through Firecrawl", async (_name, url) => {
    const requests: OpenRouterRequest[] = [];
    network.use(firecrawlAnswers("page"), openrouterCaptures(requests));
    const id = await insertPendingLink(url);

    await summarizeItem(id);

    expect((await getItem(id)).status).toBe("done");
    expect(userContent(requests[0]).map((part) => part.type)).toEqual(["text"]);
  });

  it("marks the Item Failed when the model rejects the video", async () => {
    network.use(openrouterAnswers({ status: 400 }));
    const id = await insertPendingLink("https://youtu.be/private");

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "failed", attempts: 1 });
  });
});
