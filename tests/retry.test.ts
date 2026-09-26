import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as retryCron } from "@/app/api/cron/retry/route";
import { retryStuckItems } from "@/retry";
import { clearItems, getItem, insertLinkItem } from "./items";
import { fxtwitterAnswers, network, openrouterAnswers } from "./network";

const NOW = new Date("2026-07-10T10:00:00Z");
const TWO_HOURS_AGO = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString();
const TEN_MINUTES_AGO = new Date(NOW.getTime() - 10 * 60 * 1000).toISOString();
const X_POST = "https://x.com/jack/status/20";

describe("retryStuckItems", () => {
  beforeEach(async () => {
    await clearItems();
    network.use(fxtwitterAnswers("text-only"), openrouterAnswers());
  });

  it("retries a Failed Item with attempts left, which becomes done", async () => {
    const id = await insertLinkItem(X_POST, { status: "failed", attempts: 1, error: "FxTwitter 503" });

    const { retried } = await retryStuckItems(NOW);

    expect(retried).toEqual([id]);
    expect(await getItem(id)).toMatchObject({ status: "done", attempts: 1, error: null });
  });

  it("leaves a Failed Item with three attempts alone", async () => {
    const id = await insertLinkItem(X_POST, { status: "failed", attempts: 3, error: "FxTwitter 404" });

    const { retried } = await retryStuckItems(NOW);

    expect(retried).toEqual([]);
    expect(await getItem(id)).toMatchObject({ status: "failed", attempts: 3, error: "FxTwitter 404" });
  });

  it("counts a retry that fails again, until the third attempt", async () => {
    network.use(fxtwitterAnswers("not-found"));
    const id = await insertLinkItem(X_POST, { status: "failed", attempts: 2 });

    await retryStuckItems(NOW);
    const { retried } = await retryStuckItems(NOW);

    expect(retried).toEqual([]);
    expect(await getItem(id)).toMatchObject({ status: "failed", attempts: 3 });
  });

  it("re-runs an Item stuck Pending for over an hour, not a fresh one", async () => {
    const stuck = await insertLinkItem("https://x.com/jack/status/20", { saved_at: TWO_HOURS_AGO });
    const fresh = await insertLinkItem("https://x.com/jack/status/21", { saved_at: TEN_MINUTES_AGO });

    const { retried } = await retryStuckItems(NOW);

    expect(retried).toEqual([stuck]);
    expect((await getItem(stuck)).status).toBe("done");
    expect((await getItem(fresh)).status).toBe("pending");
  });

  it("leaves done Items alone", async () => {
    const id = await insertLinkItem(X_POST, { status: "done", title: "Gotowe", saved_at: TWO_HOURS_AGO });

    const { retried } = await retryStuckItems(NOW);

    expect(retried).toEqual([]);
    expect((await getItem(id)).title).toBe("Gotowe");
  });
});

describe("GET /api/cron/retry", () => {
  beforeEach(async () => {
    await clearItems();
    network.use(fxtwitterAnswers("text-only"), openrouterAnswers());
  });
  afterEach(() => vi.useRealTimers());

  function call(token: string | null) {
    const headers: Record<string, string> = {};
    if (token !== null) headers.authorization = `Bearer ${token}`;
    return retryCron(new Request("http://localhost/api/cron/retry", { headers }));
  }

  it("refuses a request without the cron secret", async () => {
    expect((await call(null)).status).toBe(401);
    expect((await call("wrong")).status).toBe(401);
    expect((await call(process.env.INGEST_TOKEN!)).status).toBe(401);
  });

  it("runs the retry at 06:00 Europe/Warsaw, in summer time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-10T04:00:30Z"));
    const id = await insertLinkItem(X_POST, { status: "failed", attempts: 1 });

    const res = await call(process.env.CRON_SECRET!);

    expect(await res.json()).toEqual({ retried: 1 });
    expect((await getItem(id)).status).toBe("done");
  });

  it("runs the retry at 06:00 Europe/Warsaw, in winter time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-10T05:00:30Z"));
    await insertLinkItem(X_POST, { status: "failed", attempts: 1 });

    expect(await (await call(process.env.CRON_SECRET!)).json()).toEqual({ retried: 1 });
  });

  it("skips the other UTC slot so the retry happens once a day", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-10T05:00:30Z"));
    const id = await insertLinkItem(X_POST, { status: "failed", attempts: 1 });

    const res = await call(process.env.CRON_SECRET!);

    expect(await res.json()).toEqual({ skipped: true });
    expect((await getItem(id)).status).toBe("failed");
  });
});
