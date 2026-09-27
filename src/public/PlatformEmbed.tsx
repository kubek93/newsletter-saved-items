"use client";

import { useEffect, useRef } from "react";

const SCRIPTS = {
  x: "https://platform.twitter.com/widgets.js",
  instagram: "https://www.instagram.com/embed.js",
} as const;

declare global {
  interface Window {
    twttr?: { widgets: { load(element?: Element | null): void } };
    instgrm?: { Embeds: { process(): void } };
  }
}

/** Loads a platform's widget script once; resolves when it is on the page. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    document.head.appendChild(script);
  });
}

/**
 * An X post or an Instagram post as the platform's own widget. The blockquote is the fallback the
 * platforms prescribe; after mount the widget script is loaded (once) and asked to build the embed here,
 * which a plain `<script>` in the markup does not do after a client-side navigation.
 */
export function PlatformEmbed({ kind, url }: { kind: "x" | "instagram"; url: string }) {
  const container = useRef<HTMLDivElement>(null);
  // widgets.js knows twitter.com links; an x.com link may be left alone.
  const link = kind === "x" ? url.replace(/^https:\/\/(www\.|mobile\.)?x\.com\//, "https://twitter.com/") : url;

  useEffect(() => {
    let cancelled = false;
    loadScript(SCRIPTS[kind]).then(() => {
      if (cancelled) return;
      if (kind === "x") window.twttr?.widgets.load(container.current);
      else window.instgrm?.Embeds.process();
    });
    return () => {
      cancelled = true;
    };
  }, [kind, url]);

  return (
    <div className="embed" ref={container}>
      {kind === "x" ? (
        <blockquote className="twitter-tweet" data-dnt="true" data-lang="pl">
          <a href={link}>{link}</a>
        </blockquote>
      ) : (
        <blockquote className="instagram-media" data-instgrm-permalink={url} data-instgrm-version="14">
          <a href={url}>{url}</a>
        </blockquote>
      )}
    </div>
  );
}
