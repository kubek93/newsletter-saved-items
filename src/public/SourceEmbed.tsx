import type { Embed } from "./embed";
import { PlatformEmbed } from "./PlatformEmbed";

/** The description's blocks, split on blank lines: a paragraph, or a bullet list when every line starts with "- ". */
export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, index) => {
          const lines = block.split("\n");
          if (lines.every((line) => /^[-•] /.test(line))) {
            return (
              <ul key={index}>
                {lines.map((line, item) => (
                  <li key={item}>{line.slice(2)}</li>
                ))}
              </ul>
            );
          }
          return <p key={index}>{lines.join(" ")}</p>;
        })}
    </>
  );
}

/** The source itself: the platform's widget, a YouTube player, the file, or a link card. */
export function SourceEmbed({ embed }: { embed: Embed }) {
  switch (embed.kind) {
    case "youtube":
      return (
        <div className="embed video">
          <iframe
            src={`https://www.youtube.com/embed/${embed.videoId}`}
            title="YouTube"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    case "x":
    case "instagram":
      return <PlatformEmbed kind={embed.kind} url={embed.url} />;
    case "files":
      return (
        <div className={embed.files.length > 1 ? "gallery" : undefined}>
          {embed.files.map((file, index) =>
            file.video ? (
              <video key={index} className="preview" src={file.url} controls preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- a signed Storage URL, not an optimisable asset
              <img key={index} className="preview" src={file.url} alt="" />
            ),
          )}
        </div>
      );
    case "link":
      return (
        <a className="link-card" href={embed.url} rel="noreferrer" target="_blank">
          <span className="host">{embed.host}</span>
          <span className="url">{embed.url}</span>
        </a>
      );
  }
}
