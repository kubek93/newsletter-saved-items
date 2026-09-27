import Link from "next/link";
import { CATEGORY_ICONS, SOURCE_ICONS } from "@/domain/icons";
import { SOURCE_LABELS } from "@/panel/labels";
import type { PublicItem } from "./browse";
import { readingMinutes } from "./browse";
import type { Embed } from "./embed";
import { Paragraphs, SourceEmbed } from "./SourceEmbed";

/** The public page of one Item: what it is in a sentence, the summary, the source itself, and a way to open it. */
export function PublicItemView({ item, embed, openUrl }: { item: PublicItem; embed: Embed | null; openUrl: string | null }) {
  const category = item.category ?? "Inne";
  return (
    <article className="public-item">
      <p className="back">
        <Link href="/">← Wszystkie</Link>
      </p>
      <header>
        <p className="badges">
          <span className="badge">
            {SOURCE_ICONS[item.source]} {SOURCE_LABELS[item.source]}
          </span>
          <span className="badge">
            {CATEGORY_ICONS[category]} {category}
          </span>
          <span className="badge muted">{readingMinutes(item)} min czytania</span>
        </p>
        <h1>{item.title}</h1>
      </header>

      {item.recap && (
        <section className="block">
          <h2>W jednym zdaniu</h2>
          <p className="lead">{item.recap}</p>
        </section>
      )}

      {item.description && (
        <section className="block">
          <h2>Streszczenie</h2>
          <Paragraphs text={item.description} />
        </section>
      )}

      {embed && (
        <section className="block">
          <h2>Źródło</h2>
          <SourceEmbed embed={embed} />
        </section>
      )}

      {openUrl && (
        <p className="open">
          <a className="button-large" href={openUrl} rel="noreferrer" target="_blank">
            Otwórz {item.source === "upload" ? "plik" : "źródło"}
          </a>
        </p>
      )}
    </article>
  );
}
