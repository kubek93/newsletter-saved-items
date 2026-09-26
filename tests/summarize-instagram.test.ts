import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_INLINE_VIDEO_BYTES } from "@/readers/video";
import { summarizeItem } from "@/summarize";
import { clearItems, getItem, insertPendingLink } from "./items";
import {
  apifyAnswers,
  apifyFails,
  network,
  openrouterAnswers,
  openrouterCaptures,
  userContent,
  videoFileAnswers,
  type OpenRouterRequest,
} from "./network";

const REEL_VIDEO_URL =
  "https://scontent-waw2-1.cdninstagram.com/o1/v/t16/f2/m86/AQNreel123.mp4?efg=eyJ2ZW5jb2RlX3RhZyI6InZ0c192b2RfdXJsZ2VuIn0";
const REEL_BYTES = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);

describe("summarizeItem for Instagram", () => {
  beforeEach(clearItems);

  it("gives a photo post a Summary from its caption and image", async () => {
    const requests: OpenRouterRequest[] = [];
    network.use(apifyAnswers("photo"), openrouterCaptures(requests));
    const id = await insertPendingLink("https://www.instagram.com/p/C1abcDEfGh/");

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "done", attempts: 1 });
    const content = userContent(requests[0]);
    expect(content.map((part) => part.type)).toEqual(["text", "image_url"]);
    const text = JSON.stringify(content[0]);
    expect(text).toContain("@janepotter");
    expect(text).toContain("glazurą popiołową");
    expect(content[1]).toEqual({
      type: "image_url",
      image_url: { url: "https://scontent-waw2-1.cdninstagram.com/v/t51.2885-15/456789012_1234567890_n.jpg" },
    });
    expect(requests[0].provider).toBeUndefined();
  });

  it("downloads a Reel and sends the video itself to the model, pinned to Google AI Studio", async () => {
    const requests: OpenRouterRequest[] = [];
    network.use(apifyAnswers("reel"), videoFileAnswers(REEL_VIDEO_URL, REEL_BYTES), openrouterCaptures(requests));
    const id = await insertPendingLink("https://www.instagram.com/reel/C2reelXYZ1/");

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "done", attempts: 1 });
    const content = userContent(requests[0]);
    expect(content.map((part) => part.type)).toEqual(["text", "video_url"]);
    expect(JSON.stringify(content[0])).toContain("Reel");
    const dataUrl = (content[1].video_url as { url: string }).url;
    expect(dataUrl.startsWith("data:video/mp4;base64,")).toBe(true);
    expect(new Uint8Array(Buffer.from(dataUrl.split(",")[1], "base64"))).toEqual(REEL_BYTES);
    expect(requests[0].provider).toEqual({ only: ["google-ai-studio"] });
  });

  it("sends every slide of a carousel", async () => {
    const requests: OpenRouterRequest[] = [];
    network.use(apifyAnswers("sidecar"), openrouterCaptures(requests));
    const id = await insertPendingLink("https://www.instagram.com/p/C3carouselA/");

    await summarizeItem(id);

    expect((await getItem(id)).status).toBe("done");
    expect(userContent(requests[0]).map((part) => part.type)).toEqual(["text", "image_url", "image_url", "image_url"]);
  });

  it("marks the Item Failed when the actor returns no post (private or removed)", async () => {
    network.use(apifyAnswers("empty"), openrouterAnswers());
    const id = await insertPendingLink("https://www.instagram.com/p/private1/");

    await summarizeItem(id);

    const item = await getItem(id);
    expect(item).toMatchObject({ status: "failed", attempts: 1 });
    expect(item.error).toMatch(/not found|not public/);
  });

  it("marks the Item Failed when Instagram will not show the post (private, removed, login wall)", async () => {
    network.use(apifyAnswers("blocked"), openrouterAnswers());
    const id = await insertPendingLink("https://www.instagram.com/p/privateXYZ/");

    await summarizeItem(id);

    const item = await getItem(id);
    expect(item).toMatchObject({ status: "failed", attempts: 1 });
    expect(item.error).toContain("restricted");
  });

  it("marks the Item Failed when the actor run fails", async () => {
    network.use(apifyFails(402, "Monthly usage hard limit exceeded"), openrouterAnswers());
    const id = await insertPendingLink("https://www.instagram.com/p/C1abcDEfGh/");

    await summarizeItem(id);

    const item = await getItem(id);
    expect(item).toMatchObject({ status: "failed", attempts: 1 });
    expect(item.error).toContain("402");
    expect(item.error).toContain("hard limit");
  });

  it("marks the Item Failed when the Reel is too large to send inline", async () => {
    network.use(
      apifyAnswers("reel"),
      videoFileAnswers(REEL_VIDEO_URL, REEL_BYTES, MAX_INLINE_VIDEO_BYTES + 1),
      openrouterAnswers(),
    );
    const id = await insertPendingLink("https://www.instagram.com/reel/C2reelXYZ1/");

    await summarizeItem(id);

    const item = await getItem(id);
    expect(item).toMatchObject({ status: "failed", attempts: 1 });
    expect(item.error).toContain("too large");
  });

  it("sends the actor id and token from configuration", async () => {
    let calledUrl = "";
    let authorization = "";
    network.use(
      http.post("https://api.apify.com/v2/acts/*/run-sync-get-dataset-items", ({ request }) => {
        calledUrl = request.url;
        authorization = request.headers.get("authorization") ?? "";
        return HttpResponse.json([], { status: 201 });
      }),
    );
    const id = await insertPendingLink("https://www.instagram.com/p/C1abcDEfGh/");

    await summarizeItem(id);

    expect(calledUrl).toContain(`/acts/${process.env.APIFY_ACTOR}/`);
    expect(calledUrl).not.toContain(process.env.APIFY_TOKEN!);
    expect(authorization).toBe(`Bearer ${process.env.APIFY_TOKEN}`);
  });
});
