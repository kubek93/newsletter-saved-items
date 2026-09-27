import { CATEGORIES, toCategory, type Category } from "@/domain/category";
import { formatDigestDay } from "@/domain/digest-day";
import type { Item } from "@/domain/item";

const UNREADABLE_NOTE = "nie udało się odczytać";

export type RenderedDigest = { subject: string; html: string };

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function paragraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escape(paragraph.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Where a Recipient lands when clicking an Item: the original for a link, its public page for an Upload. */
export function linkFor(item: Item, panelUrl: string): string {
  return item.url ?? `${panelUrl}/p/${item.id}`;
}

function renderDone(item: Item, panelUrl: string): string {
  return `<article>
<h3><a href="${escape(linkFor(item, panelUrl))}">${escape(item.title ?? "")}</a></h3>
${paragraphs(item.description ?? "")}
<p><em>${escape(item.recap ?? "")}</em></p>
</article>`;
}

function renderUnreadable(item: Item, panelUrl: string): string {
  const label = item.url ?? "Plik z urządzenia";
  return `<li><a href="${escape(linkFor(item, panelUrl))}">${escape(label)}</a> (${UNREADABLE_NOTE})</li>`;
}

/**
 * The Digest email for one Digest Day: a heading per Category in the canonical order, then every Item
 * that could not be read, then nothing else. Plain HTML, no images. Pure: same Items, same email.
 */
export function renderDigest(digestDay: string, items: Item[], panelUrl: string): RenderedDigest {
  const readable = items.filter((item) => item.status === "done");
  const unreadable = items.filter((item) => item.status !== "done");
  const dateLabel = formatDigestDay(digestDay);

  const sections = CATEGORIES.flatMap((category: Category) => {
    const inCategory = readable.filter((item) => toCategory(item.category) === category);
    if (!inCategory.length) return [];
    return [`<section><h2>${escape(category)}</h2>\n${inCategory.map((item) => renderDone(item, panelUrl)).join("\n")}</section>`];
  });

  const body = items.length
    ? [
        ...sections,
        unreadable.length
          ? `<section><h2>Nie udało się odczytać</h2>\n<ul>\n${unreadable.map((item) => renderUnreadable(item, panelUrl)).join("\n")}\n</ul></section>`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    : `<p>Tego dnia nic nie zostało zapisane.</p>`;

  const count = items.length === 1 ? "1 rzecz" : `${items.length} rzeczy`;
  const html = `<!doctype html>
<html lang="pl">
<head><meta charset="utf-8"><title>Zapisane, ${escape(dateLabel)}</title></head>
<body style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 16px; line-height: 1.5;">
<h1>Zapisane: ${escape(dateLabel)}</h1>
<p>${items.length ? `Zapisane tego dnia: ${count}.` : "Pusty Digest."}</p>
${body}
<p style="color: #777; font-size: 12px;">Codzienny Digest z rzeczy zapisanych przez właściciela. <a href="${escape(panelUrl)}">Wszystkie zapisane rzeczy</a></p>
</body>
</html>`;

  return { subject: `Zapisane: ${dateLabel}`, html };
}
