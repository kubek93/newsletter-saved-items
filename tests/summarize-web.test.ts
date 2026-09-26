import { beforeEach, describe, expect, it } from "vitest";
import { summarizeItem } from "@/summarize";
import { clearItems, getItem, insertPendingLink } from "./items";
import { jinaAnswers, network, openrouterAnswers, type OpenRouterRequest } from "./network";

function capture(requests: OpenRouterRequest[]) {
  return openrouterAnswers({ onRequest: (body) => requests.push(body) });
}

function userContent(request: OpenRouterRequest) {
  return request.messages.find((m) => m.role === "user")!.content as { type: string; [key: string]: unknown }[];
}

describe("summarizeItem for web pages", () => {
  beforeEach(clearItems);

  it("gives a web page a Summary based on the page text from Jina Reader", async () => {
    const requests: OpenRouterRequest[] = [];
    network.use(jinaAnswers("page"), capture(requests));
    const id = await insertPendingLink("https://en.wikipedia.org/wiki/Ceramic_glaze");

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "done", attempts: 0 });
    const content = userContent(requests[0]);
    expect(content.map((part) => part.type)).toEqual(["text"]);
    const text = JSON.stringify(content);
    expect(text).toContain("Ceramic glaze");
    expect(text).toContain("rice-straw");
    expect(requests[0].provider).toBeUndefined();
  });

  it("marks the Item Failed when the page does not exist", async () => {
    network.use(jinaAnswers("not-found"), openrouterAnswers());
    const id = await insertPendingLink("https://example.com/this-page-does-not-exist-404");

    await summarizeItem(id);

    const item = await getItem(id);
    expect(item).toMatchObject({ status: "failed", attempts: 1 });
    expect(item.error).toContain("404");
  });

  it("marks the Item Failed when Jina Reader cannot fetch the page at all", async () => {
    network.use(jinaAnswers("unresolvable"), openrouterAnswers());
    const id = await insertPendingLink("https://no-such-host-zzz.invalid/x");

    await summarizeItem(id);

    const item = await getItem(id);
    expect(item).toMatchObject({ status: "failed", attempts: 1 });
    expect(item.error).toContain("could not be resolved");
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
    network.use(capture(requests));
    const id = await insertPendingLink(url);

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "done", attempts: 0 });
    const content = userContent(requests[0]);
    expect(content.map((part) => part.type)).toEqual(["text", "video_url"]);
    expect(content[1]).toEqual({ type: "video_url", video_url: { url } });
    expect(requests[0].provider).toEqual({ only: ["google-ai-studio"] });
  });

  it("never asks Jina Reader about a YouTube link", async () => {
    network.use(openrouterAnswers());
    const id = await insertPendingLink("https://www.youtube.com/watch?v=abc");

    await summarizeItem(id);

    expect((await getItem(id)).status).toBe("done");
  });

  it("marks the Item Failed when the model rejects the video", async () => {
    network.use(openrouterAnswers({ status: 400 }));
    const id = await insertPendingLink("https://youtu.be/private");

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "failed", attempts: 1 });
  });
});
