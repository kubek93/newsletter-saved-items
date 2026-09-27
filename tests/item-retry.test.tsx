import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import { POST as postRetry } from "@/app/items/[id]/retry/route";
import { ItemDetail } from "@/panel/ItemDetail";
import { loadItem } from "@/panel/items";
import { clearItems, getItem, insertLinkItem, waitUntilSummarized } from "./items";
import { fxtwitterAnswers, network, openrouterAnswers, SAMPLE_REPLY } from "./network";
import { formRequest, sessionCookiesFor } from "./session";

const OWNER = process.env.OWNER_EMAIL!;
const X_POST = "https://x.com/jack/status/20";

async function retry(id: string, cookies = sessionCookiesFor(OWNER)) {
  return postRetry(formRequest(`/items/${id}/retry`, {}, await cookies), { params: Promise.resolve({ id }) });
}

describe("POST /items/[id]/retry", () => {
  beforeEach(async () => {
    await clearItems();
    network.use(fxtwitterAnswers("text-only"), openrouterAnswers());
  });

  it("writes the Summary again for a Failed Item that has used up its attempts", async () => {
    const id = await insertLinkItem(X_POST, { status: "failed", attempts: 3, error: "FxTwitter 503" });

    const res = await retry(id);

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${process.env.PANEL_URL}/items/${id}`);
    await waitUntilSummarized();
    expect(await getItem(id)).toMatchObject({ status: "done", attempts: 4, title: SAMPLE_REPLY.title, error: null });
  });

  it("writes the Summary again for a done Item", async () => {
    const id = await insertLinkItem(X_POST, { status: "done", attempts: 1, title: "Stary tytuł", category: "Inne" });

    await retry(id);

    await waitUntilSummarized();
    expect(await getItem(id)).toMatchObject({ status: "done", attempts: 2, title: SAMPLE_REPLY.title, category: "IT" });
  });

  it("leaves the Item Failed with the new error when the source still cannot be read", async () => {
    network.use(fxtwitterAnswers("not-found"));
    const id = await insertLinkItem(X_POST, { status: "failed", attempts: 3, error: "old error" });

    await retry(id);

    await waitUntilSummarized();
    const item = await getItem(id);
    expect(item.status).toBe("failed");
    expect(item.error).toContain("404");
  });

  it("refuses anyone but the Owner and unknown Items", async () => {
    const id = await insertLinkItem(X_POST, { status: "failed", attempts: 3 });

    expect((await retry(id, Promise.resolve([]))).status).toBe(401);
    expect((await retry("00000000-0000-0000-0000-00000000dead")).status).toBe(404);
    expect((await getItem(id)).status).toBe("failed");
  });
});

describe("ItemDetail retry button", () => {
  beforeEach(clearItems);

  it("offers the retry for a Failed Item and greys it out while Pending", async () => {
    const failed = await insertLinkItem(X_POST, { status: "failed", attempts: 3, error: "x" });
    const pending = await insertLinkItem("https://x.com/jack/status/21");

    const failedHtml = renderToStaticMarkup(<ItemDetail item={(await loadItem(failed))!} media={null} />);
    const pendingHtml = renderToStaticMarkup(<ItemDetail item={(await loadItem(pending))!} media={null} />);

    expect(failedHtml).toContain(`action="/items/${failed}/retry"`);
    expect(failedHtml).toMatch(/<button type="submit">Podsumuj ponownie<\/button>/);
    expect(pendingHtml).toMatch(/<button type="submit" disabled="">Podsumuj ponownie<\/button>/);
  });
});
