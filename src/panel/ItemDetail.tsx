import Link from "next/link";
import { CATEGORIES_ALPHABETICAL } from "@/domain/category";
import type { Item } from "@/domain/item";
import { uploadFilename } from "@/domain/upload-item";
import { embedFor } from "@/public/embed";
import { Paragraphs, SourceEmbed } from "@/public/SourceEmbed";
import type { Media } from "./items";
import { itemLabel, SOURCE_LABELS, STATUS_LABELS } from "./labels";

const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** The Owner's page of one Item: the facts to manage it, then the same sections as the public page. */
export function ItemDetail({ item, media }: { item: Item; media: Media | null }) {
  const heading = itemLabel(item);
  const embed = embedFor(item, media ? { url: media.url, video: media.kind === "video" } : undefined);
  return (
    <article className="item">
      <p>
        <Link href="/panel">← Lista</Link>
      </p>
      <h2>{heading}</h2>
      <dl className="meta">
        <dt>Źródło</dt>
        <dd>
          {item.url ? (
            <a href={item.url} rel="noreferrer">
              {SOURCE_LABELS[item.source]}: {item.url}
            </a>
          ) : (
            `${SOURCE_LABELS[item.source]}: ${item.storage_path ? uploadFilename(item.storage_path) : ""}`
          )}
        </dd>
        <dt>Stan</dt>
        <dd className={item.status}>{STATUS_LABELS[item.status]}</dd>
        <dt>Zapisano</dt>
        <dd>
          <time dateTime={item.saved_at}>{dateFormat.format(new Date(item.saved_at))}</time>
        </dd>
        <dt>Kategoria</dt>
        <dd>
          <form method="post" action={`/items/${item.id}/category`} className="inline">
            <select name="category" defaultValue={item.category ?? ""}>
              {item.category === null && <option value="">–</option>}
              {CATEGORIES_ALPHABETICAL.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button type="submit">Zmień</button>
          </form>
        </dd>
      </dl>

      {item.status === "done" && item.recap && (
        <section className="block">
          <h3>W jednym zdaniu</h3>
          <p className="lead">{item.recap}</p>
        </section>
      )}
      {item.status === "done" && item.description && (
        <section className="block">
          <h3>Streszczenie</h3>
          <Paragraphs text={item.description} />
        </section>
      )}
      {embed && (
        <section className="block">
          <h3>Źródło</h3>
          <SourceEmbed embed={embed} />
        </section>
      )}
      {item.status === "failed" && (
        <p className="failed">
          Nie udało się odczytać: <code>{item.error}</code>
        </p>
      )}
      {item.status === "pending" && <p className="notice">Podsumowanie jeszcze powstaje.</p>}

      <div className="actions">
        <form method="post" action={`/items/${item.id}/retry`} className="inline">
          <button type="submit" disabled={item.status === "pending"}>
            Podsumuj ponownie
          </button>
        </form>
        <form method="post" action={`/items/${item.id}/delete`} className="inline danger">
          <button type="submit">Usuń</button>
        </form>
      </div>
    </article>
  );
}
