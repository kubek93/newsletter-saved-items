import Link from "next/link";
import { CATEGORIES } from "@/domain/category";
import type { Item, Source, Status } from "@/domain/item";
import { uploadFilename } from "@/domain/upload-item";
import type { Media } from "./item-actions";

const SOURCE_LABELS: Record<Source, string> = { x: "X", instagram: "Instagram", web: "Web", upload: "Plik" };
const STATUS_LABELS: Record<Status, string> = { pending: "Czeka na opis", done: "Gotowe", failed: "Nie odczytano" };

const dateFormat = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </>
  );
}

export function ItemDetail({ item, media }: { item: Item; media: Media | null }) {
  const heading = item.title ?? item.url ?? (item.storage_path ? uploadFilename(item.storage_path) : item.id);
  return (
    <article className="item">
      <p>
        <Link href="/">← Lista</Link>
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
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button type="submit">Zmień</button>
          </form>
        </dd>
      </dl>

      {media &&
        (media.kind === "video" ? (
          <video className="preview" src={media.url} controls preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- a signed Storage URL, not an optimisable asset
          <img className="preview" src={media.url} alt={heading} />
        ))}

      {item.status === "done" && (
        <section className="summary">
          {item.description && <Paragraphs text={item.description} />}
          {item.recap && (
            <p className="recap">
              <em>{item.recap}</em>
            </p>
          )}
        </section>
      )}
      {item.status === "failed" && (
        <p className="error">
          Nie udało się odczytać: <code>{item.error}</code>
        </p>
      )}
      {item.status === "pending" && <p className="notice">Opis jeszcze powstaje.</p>}

      <form method="post" action={`/items/${item.id}/delete`} className="danger">
        <button type="submit">Usuń</button>
      </form>
    </article>
  );
}
