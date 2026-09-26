import { CATEGORIES, toCategory } from "@/domain/category";
import type { Summary } from "@/domain/summary";
import { env } from "@/lib/env";
import type { ContentPart } from "@/readers/types";
import { assertVideosFitInline } from "@/readers/video";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

const INSTRUCTIONS = `Dostajesz treść zapisanego materiału: post z X, post z Instagrama, stronę www, wideo lub zdjęcie. Treść może być w dowolnym języku.

Odpowiadasz wyłącznie po polsku, w formacie JSON z polami:
- "title": krótki tytuł (do 80 znaków) mówiący, czego dotyczy materiał.
- "description": szczegółowy opis treści: co jest napisane, pokazane lub powiedziane, z konkretami (nazwy, liczby, wnioski). Kilka akapitów, jeśli materiał na to zasługuje.
- "recap": jeden akapit streszczenia dla kogoś, kto ma dwie minuty.
- "category": dokładnie jedna z: ${CATEGORIES.map((c) => `"${c}"`).join(", ")}. "Inne" tylko, gdy nic innego nie pasuje.

Nie dopisuj niczego poza JSON-em.`;

const RESPONSE_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "summary",
    strict: true,
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        recap: { type: "string" },
        category: { type: "string", enum: [...CATEGORIES] },
      },
      required: ["title", "description", "recap", "category"],
      additionalProperties: false,
    },
  },
};

function toMessagePart(part: ContentPart) {
  switch (part.type) {
    case "text":
      return { type: "text", text: part.text };
    case "image":
      return { type: "image_url", image_url: { url: part.url } };
    case "youtube":
      return { type: "video_url", video_url: { url: part.url } };
    case "video":
      return {
        type: "video_url",
        video_url: { url: `data:${part.mimeType};base64,${Buffer.from(part.bytes).toString("base64")}` },
      };
  }
}

function asSummary(raw: string): Summary {
  const parsed: unknown = JSON.parse(raw);
  const { title, description, recap, category } = (parsed ?? {}) as Record<string, unknown>;
  if (typeof title !== "string" || typeof description !== "string" || typeof recap !== "string") {
    throw new Error("Model answer is missing title, description or recap");
  }
  return { title, description, recap, category: toCategory(category) };
}

/** Only Google AI Studio takes a video by URL (and only a YouTube one), so any video pins the provider. */
const VIDEO_PROVIDER = { only: ["google-ai-studio"] };

/** Asks the configured model, through OpenRouter, for a Polish Summary and a Category of the content parts. */
export async function analyze(parts: ContentPart[]): Promise<Summary> {
  assertVideosFitInline(parts);
  const hasVideo = parts.some((part) => part.type === "video" || part.type === "youtube");
  const res = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.openrouterApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.openrouterModel,
      messages: [
        { role: "system", content: INSTRUCTIONS },
        { role: "user", content: parts.map(toMessagePart) },
      ],
      response_format: RESPONSE_SCHEMA,
      ...(hasVideo ? { provider: VIDEO_PROVIDER } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 500)}`);

  const completion = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
  const content = completion.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenRouter answer has no message content");
  return asSummary(content);
}
