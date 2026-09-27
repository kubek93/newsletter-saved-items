# Newsletter Saved Items: v1 specification

Settled on 2026-09-26 in a design interview. Vocabulary: see `CONTEXT.md`. Reasoning behind the non-obvious choices: see `docs/adr/`.

## Purpose

The Owner saves things during the day (X posts, Instagram posts, web pages, YouTube videos, photos, videos). Each becomes an Item, gets an AI-written Summary in Polish and a Category, and every morning a Digest email lists yesterday's Items for all Recipients. A Panel lets the Owner browse everything and manage Recipients.

## Ingest

- **Single path**: an Apple Shortcut on the Share Sheet (iOS and macOS, same shortcut). One tap for the Owner; the shortcut may make several HTTP calls internally. (ADR 0002)
- **Auth**: one static secret token in a request header, stored in the shortcut and in the app's environment. No token management UI.
- **Links** (X, Instagram, web, YouTube): the shortcut sends only the URL. The endpoint stores the Item as Pending and returns immediately.
- **Files** (photo, video): the shortcut converts HEIC to JPEG, asks the endpoint for a signed upload URL, PUTs the file straight into Supabase Storage, then registers the Item by storage path. Files never pass through Vercel. (ADR 0004)
- **Limits**: 100 MB and about 3 minutes per video. Files are kept forever. Supabase Pro.
- **Deduplication**: a link whose normalised URL (tracking parameters stripped) already exists creates no new Item; the shortcut is told it is already saved. Uploads are never deduplicated.
- **Known risk**: the Instagram app's Share Sheet sometimes hands the shortcut something other than a clean URL. Must be tested on current app versions; fallback is "Copy link" plus running the shortcut on the clipboard.

## Reading each Source

| Source | How content is obtained |
|---|---|
| X | FxTwitter public API (`api.fxtwitter.com`) by post URL: text, media, author. No auth. |
| Instagram | Apify `instagram-scraper` actor by post URL: caption, author, image URLs, video URL for Reels. Paid per result. (ADR 0003) |
| Web page | Firecrawl (`api.firecrawl.dev`, free tier) returns the page's main content as Markdown. |
| YouTube | A video URL is passed directly to Gemini as video input via OpenRouter, provider pinned to Google AI Studio (public videos only); a channel or playlist is read as a page. |
| Facebook, Allegro, Amazon | Their own Sources (by host) so they can be filtered, read as pages through Firecrawl. |
| Upload | A photo in Supabase Storage is passed to the model by signed URL; a video is downloaded and sent inline. (ADR 0005) |

Anything that cannot be read (paywall, login wall, blocked scraper) makes the Item Failed; there is no per-site special handling beyond the table above.

## Analysis

- Runs asynchronously right after the Item is saved. The Item is visible in the Panel as Pending meanwhile.
- One model for everything: a Gemini Flash-class model through OpenRouter (text, images, video, YouTube). Swapping models is a config change.
- Output per Item: a short title, a detailed description of the content, a one-paragraph recap, and one Category from the closed list. Always in Polish.
- Failure: the Item becomes Failed. It is retried once a day (06:00 Europe/Warsaw) until three attempts in total have been made, then stays Failed. An attempt counts from the moment it starts, so an attempt cut short by a timeout counts too, and an Item stuck Pending for over an hour is retried the same way.

## Categories

AI, IT, Pomysły na produkty, Produkty, Ceramika, Zdrowie, Siłownia, Jedzenie, Polityka, Finanse, Inne. The AI picks one; the Owner may change it in the Panel. "Inne" is the catch-all.

## Digest

- Sent at 07:00 Europe/Warsaw by a Vercel Cron job (Vercel Pro, minute precision).
- Covers the Digest Day that ended at 03:00 the same morning (03:00 to 03:00), by the time the Item was saved in the system.
- Plain HTML, no images: a heading per Category, then each Item's title, Summary and link. Link rule: an Item with a URL links to the original; an Upload links to its public page.
- Failed Items, and Items still Pending at send time, are listed with their link and a note that they could not be read.
- Sent even when the Digest Day had no Items, as an empty Digest.
- Identical content for every Recipient. Sent through Resend. Sender domain: the Owner's own domain, address to be provided.

## Panel

- Next.js app on Vercel. Supabase provides Postgres, Auth and Storage; no Supabase Edge Functions. (ADR 0001)
- Login: Google OAuth, allowlist containing only the Owner's email. Anyone else is refused. Recipients never log in.
- UI in Polish.
- Public page at the root, no login: every done Item as a tile (title, Source, reading time, recap) in sections per Digest Day, filterable by Category and Source with counts. Pending and Failed Items are never shown there.
- v1 features: list of Items filterable by Category, Source and date; Item detail with Summary and media preview; change Category; delete Item; write the Summary again on request (any state, ignoring the attempt limit); add and remove Recipients.
- Deliberately not in v1: editing a Summary, full-text search, Digest preview, thumbnails in the Digest, X bookmark polling, TikTok or LinkedIn special handling, more than one Owner.

## External services

Supabase Pro, Vercel Pro, Resend, OpenRouter, Apify, Firecrawl, FxTwitter (public, no account).

## Still open

- Sender address and domain for Resend (Owner will provide; DNS records needed).
- Videos above about 15 MB cannot be sent to the model inline (ADR 0005). An X video is fetched in the largest variant expected to fit; an X or Instagram video that still does not fit is skipped and the Summary, made from the text and the thumbnail, says so. Uploads allow 100 MB; how to analyse large uploaded videos is undecided (the Gemini Files API directly is the candidate).
- Whether YouTube URLs work reliably through OpenRouter with the AI Studio provider.
- Instagram Share Sheet behaviour on current iOS.
