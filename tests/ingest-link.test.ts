import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/ingest/link/route";
import { allItems, clearItems, getItem, waitUntilSummarized } from "./items";
import { apifyAnswers, firecrawlAnswers, fxtwitterAnswers, network, openrouterAnswers } from "./network";

const TOKEN = process.env.INGEST_TOKEN!;

function post(body: unknown, token: string | null = TOKEN): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  return POST(
    new Request("http://localhost/api/ingest/link", {
      method: "POST",
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/ingest/link", () => {
  beforeEach(async () => {
    await clearItems();
    // Every created Item gets its Summary written in the background; give those calls somewhere to go.
    network.use(fxtwitterAnswers("text-only"), firecrawlAnswers("page"), apifyAnswers("photo"), openrouterAnswers());
  });
  afterEach(() => waitUntilSummarized());

  it("refuses a request without a token", async () => {
    const res = await post({ url: "https://example.com/a" }, null);
    expect(res.status).toBe(401);
    expect(await allItems()).toHaveLength(0);
  });

  it("refuses a request with a wrong token", async () => {
    const res = await post({ url: "https://example.com/a" }, "wrong");
    expect(res.status).toBe(401);
    expect(await allItems()).toHaveLength(0);
  });

  it("creates a Pending Item for a new link", async () => {
    const res = await post({ url: "https://twitter.com/someone/status/123?s=20" });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("created");
    expect(typeof body.id).toBe("string");

    const items = await allItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: body.id,
      source: "x",
      url: "https://twitter.com/someone/status/123?s=20",
      normalized_url: "https://x.com/someone/status/123",
    });
    expect(items[0].digest_day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("detects the Source of Instagram and web links", async () => {
    await post({ url: "https://www.instagram.com/p/abc/" });
    await post({ url: "https://www.youtube.com/watch?v=abc" });
    await post({ url: "https://example.com/article" });

    expect((await allItems()).map((i) => i.source)).toEqual(["instagram", "youtube", "web"]);
  });

  it("answers duplicate for an already-saved link, including a tracking-parameter variant", async () => {
    const first = await (await post({ url: "https://x.com/someone/status/123" })).json();

    const res = await post({ url: "https://twitter.com/someone/status/123/?s=20&t=xyz" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "duplicate", id: first.id });
    expect(await allItems()).toHaveLength(1);
  });

  it("rejects a body without a valid http(s) url", async () => {
    expect((await post({ url: "not a url" })).status).toBe(400);
    expect((await post({ url: "ftp://example.com/x" })).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post("this is not json")).status).toBe(400);
    expect(await allItems()).toHaveLength(0);
  });

  it("answers before the analysis finishes, and the Item ends up done", async () => {
    network.use(openrouterAnswers({ delayMs: 1500 }));
    const startedAt = Date.now();

    const res = await post({ url: "https://x.com/jack/status/20" });

    expect(res.status).toBe(201);
    expect(Date.now() - startedAt).toBeLessThan(1000);
    const { id } = await res.json();
    expect((await getItem(id)).status).toBe("pending");

    await waitUntilSummarized();
    expect((await getItem(id)).status).toBe("done");
  });
});
