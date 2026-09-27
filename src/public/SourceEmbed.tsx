import type { Embed } from "./embed";

/** The summary's paragraphs, split on blank lines. */
export function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
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
      return (
        <div className="embed">
          <blockquote className="twitter-tweet">
            <a href={embed.url}>{embed.url}</a>
          </blockquote>
          <script async src="https://platform.twitter.com/widgets.js" charSet="utf-8" />
        </div>
      );
    case "instagram":
      return (
        <div className="embed">
          <blockquote className="instagram-media" data-instgrm-permalink={embed.url} data-instgrm-version="14">
            <a href={embed.url}>{embed.url}</a>
          </blockquote>
          <script async src="https://www.instagram.com/embed.js" />
        </div>
      );
    case "image":
      // eslint-disable-next-line @next/next/no-img-element -- a signed Storage URL, not an optimisable asset
      return <img className="preview" src={embed.url} alt="" />;
    case "video":
      return <video className="preview" src={embed.url} controls preload="metadata" />;
    case "link":
      return (
        <a className="link-card" href={embed.url} rel="noreferrer" target="_blank">
          <span className="host">{embed.host}</span>
          <span className="url">{embed.url}</span>
        </a>
      );
  }
}
