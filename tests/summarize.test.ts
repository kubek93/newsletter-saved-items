import { beforeEach, describe, expect, it } from "vitest";
import { summarizeItem } from "@/summarize";
import { clearItems, getItem, insertPendingLink } from "./items";
import {
  fxtwitterAnswers,
  network,
  openrouterAnswers,
  openrouterCaptures,
  SAMPLE_REPLY,
  userContent,
  videoFileAnswers,
  type OpenRouterRequest,
} from "./network";

const X_POST = "https://x.com/jack/status/20";

describe("summarizeItem", () => {
  beforeEach(clearItems);

  it("gives an X post a Polish Summary and a Category", async () => {
    const requests: OpenRouterRequest[] = [];
    network.use(fxtwitterAnswers("text-only"), openrouterAnswers({ onRequest: (body) => requests.push(body) }));
    const id = await insertPendingLink(X_POST);

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({
      status: "done",
      attempts: 1,
      title: SAMPLE_REPLY.title,
      description: SAMPLE_REPLY.description,
      recap: SAMPLE_REPLY.recap,
      category: "IT",
      error: null,
    });

    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request.model).toBe(process.env.OPENROUTER_MODEL);
    const userContent = request.messages.find((m) => m.role === "user")!.content;
    expect(JSON.stringify(userContent)).toContain("just setting up my twttr");
    expect(JSON.stringify(userContent)).toContain("@jack");
    expect(JSON.stringify(request.response_format)).toContain("Pomysły na produkty");
  });

  it("sends the post's photos to the model", async () => {
    const requests: OpenRouterRequest[] = [];
    network.use(fxtwitterAnswers("with-photo"), openrouterAnswers({ onRequest: (body) => requests.push(body) }));
    const id = await insertPendingLink("https://x.com/BarackObama/status/896523232098078720");

    await summarizeItem(id);

    expect((await getItem(id)).status).toBe("done");
    const userContent = requests[0].messages.find((m) => m.role === "user")!.content as { type: string }[];
    expect(userContent.map((part) => part.type)).toEqual(["text", "image_url"]);
    expect(JSON.stringify(userContent)).toContain("https://pbs.twimg.com/media/DHEXH7RV0AAUwKj.jpg");
  });

  it("marks the Item Failed when FxTwitter cannot return the post", async () => {
    network.use(fxtwitterAnswers("not-found"), openrouterAnswers());
    const id = await insertPendingLink("https://x.com/NASA/status/1832470848312496435");

    await summarizeItem(id);

    const item = await getItem(id);
    expect(item.status).toBe("failed");
    expect(item.attempts).toBe(1);
    expect(item.error).toContain("404");
    expect(item.title).toBeNull();
  });

  it("marks the Item Failed when the model call fails", async () => {
    network.use(fxtwitterAnswers("text-only"), openrouterAnswers({ status: 500 }));
    const id = await insertPendingLink(X_POST);

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "failed", attempts: 1 });
    expect((await getItem(id)).error).toContain("500");
  });

  it("stores Inne when the model answers with a Category outside the list", async () => {
    network.use(fxtwitterAnswers("text-only"), openrouterAnswers({ reply: { ...SAMPLE_REPLY, category: "Historia" } }));
    const id = await insertPendingLink(X_POST);

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "done", category: "Inne" });
  });

  it("marks the Item Failed when the model answer is not the expected shape", async () => {
    network.use(fxtwitterAnswers("text-only"), openrouterAnswers({ reply: "to nie jest JSON" }));
    const id = await insertPendingLink(X_POST);

    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "failed", attempts: 1 });
  });

  it("counts every failed attempt", async () => {
    network.use(fxtwitterAnswers("not-found"));
    const id = await insertPendingLink(X_POST);

    await summarizeItem(id);
    await summarizeItem(id);

    expect(await getItem(id)).toMatchObject({ status: "failed", attempts: 2 });
  });

  it("downloads a post's video and sends it to the model inline", async () => {
    const requests: OpenRouterRequest[] = [];
    const videoUrl = "https://video.twimg.com/amplify_video/1900000000000000000/vid/avc1/1280x720/AbCdEfGh.mp4?tag=16";
    const bytes = new Uint8Array([1, 2, 3, 4]);
    network.use(fxtwitterAnswers("with-video"), videoFileAnswers(videoUrl, bytes), openrouterCaptures(requests));
    const id = await insertPendingLink("https://x.com/NASA/status/1900000000000000001");

    await summarizeItem(id);

    expect((await getItem(id)).status).toBe("done");
    const content = userContent(requests[0]);
    expect(content.map((part) => part.type)).toEqual(["text", "video_url"]);
    expect((content[1].video_url as { url: string }).url).toBe(`data:video/mp4;base64,${Buffer.from(bytes).toString("base64")}`);
    expect(requests[0].provider).toEqual({ only: ["google-ai-studio"] });
  });

});
