# newsletter-saved-items

Things saved from X, Instagram, the web and the camera roll become Items, get an AI Summary in Polish and go out as a daily Digest email. Vocabulary: `CONTEXT.md`. Decisions: `docs/adr/`. Parameters: `docs/spec.md`.

## Running locally

Requirements: Node 24, pnpm, Docker, the Supabase CLI.

```
pnpm install
supabase start          # local Postgres, Auth and REST on ports 553xx (see supabase/config.toml)
cp .env.example .env.local
```

Fill `.env.local` with `SUPABASE_SERVICE_ROLE_KEY` from `supabase status -o env`, pick any value for `INGEST_TOKEN`, and set `OPENROUTER_API_KEY` (the model id in `OPENROUTER_MODEL` can stay as in the example), `FIRECRAWL_API_KEY` (free tier at firecrawl.dev) and `APIFY_TOKEN` (the actor in `APIFY_ACTOR` can stay as in the example). Then:

```
pnpm dev
```

Save a link:

```
curl -X POST http://localhost:3000/api/ingest/link \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://x.com/someone/status/123"}'
```

The response is `{"status":"created","id":"..."}` the first time and `{"status":"duplicate","id":"..."}` afterwards. `url` may also be a list of links or a text containing one (that is what the Shortcut's "Get URLs from Input" produces); the first link wins.

Save a photo or video (what the Shortcut does in three calls; the file never passes through Vercel, ADR 0004):

```
# 1. ask for a signed upload URL
curl -X POST http://localhost:3000/api/ingest/upload-url -H "Authorization: Bearer $INGEST_TOKEN" \
  -H "Content-Type: application/json" -d '{"filename":"IMG_0001.jpg","mimeType":"image/jpeg"}'
# → {"uploadUrl":"...","path":"2026/09/<uuid>-IMG_0001.jpg"}
# 2. PUT the file there
curl -X PUT "$uploadUrl" -H "Content-Type: image/jpeg" --data-binary @IMG_0001.jpg
# 3. register the Item
curl -X POST http://localhost:3000/api/ingest/upload -H "Authorization: Bearer $INGEST_TOKEN" \
  -H "Content-Type: application/json" -d '{"path":"2026/09/<uuid>-IMG_0001.jpg","mimeType":"image/jpeg"}'
```

Several files shared at once form one Item, a collection: the Shortcut registers each file with the same `batch` key (`{"path":…,"batch":"20260927131500123"}`; the first answer is `created`, the next ones `added`), then calls `POST /api/ingest/upload/done` with `{"batch":…}` so the Summary is written once every file is in. A batch stays open for 15 minutes after its first file. The photos and videos are analysed together and shown together as a gallery. The Shortcut also shrinks photos on the phone to 1600 px on the long side before uploading.

Accepted types: JPEG, PNG, WebP, MP4, QuickTime; the Shortcut converts HEIC to JPEG first. Uploads are never deduplicated. An uploaded video above about 15 MB cannot be analysed (ADR 0005) and ends Failed; an X or Instagram video that large is skipped instead (X first tries a smaller variant of the same video), and the Item is summarised from the text and the thumbnail with a note that the video was not watched. A created Item is analysed in the background: its Source is read (X posts through FxTwitter, Instagram posts and Reels through an Apify actor, web pages as Markdown through Firecrawl, YouTube links straight to the model as video; other videos are downloaded and sent inline, see ADR 0005), the content goes to the model configured in `OPENROUTER_MODEL`, and the row ends up `done` with a Polish title, description, recap and Category, or `failed` with the error text and one more attempt counted.

## Public page

`/` is open to everyone: every Item that has a Summary, as tiles (title, the one-sentence recap, Source and Category with their icons) in sections per Digest Day, newest first, with Category and Source filters that show counts (`/?category=Kuchnia&source=web`; folded behind a "Filtry" label on phones). A tile opens `/p/<id>`: the sentence, the summary, the source embedded (X and Instagram widgets, YouTube player, the file itself for an Upload, a link card otherwise) and a large "Otwórz" button. Items still Pending or Failed never appear there.

## Panel

Server-rendered pages at `/panel`, behind Supabase Auth. Sign-in is email and password (`POST /auth/login`); only the account in `OWNER_EMAIL` gets in, any other account is signed out again with a message. `src/proxy.ts` refreshes the session cookies on every request and sends anonymous visitors to `/login`; each page then checks the allowlist with `requireOwner()`. Data is read with the service role after that check, so no RLS policies are needed for the Panel.

The Owner's account is created once through the Auth admin API (no public sign-up; turn "Allow new users to sign up" off in the Supabase dashboard). Locally:

```
node -e '
const { createClient } = require("@supabase/supabase-js");
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.auth.admin.createUser({ email: process.env.OWNER_EMAIL, password: process.argv[1], email_confirm: true }).then(console.log);
' 'a-strong-password'
```

Google sign-in is prepared (`POST /auth/google` and `/auth/callback`) but not linked from the page until the provider is enabled: in the Supabase dashboard, Authentication → Providers → Google, with a Google Cloud OAuth client whose authorised redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`, and `PANEL_URL/auth/callback` in the allowed redirect URLs. `SUPABASE_ANON_KEY` comes from `supabase status -o env` locally.

The Item list is filtered by Category and by Digest Day range (the day an Item belongs to in the Digest, 03:00 to 03:00) through the query string (`/?category=Kuchnia&from=2026-09-01&to=2026-09-30`).

## Cron jobs

Declared in `vercel.json`, invoked by Vercel Cron with `CRON_SECRET` as a bearer token. Vercel schedules run in UTC, so each job is scheduled at the two UTC hours that can be its Warsaw hour and the route only acts when the Europe/Warsaw clock matches:

- `/api/cron/retry`, 06:00 Europe/Warsaw: re-runs the Summary for every Failed Item with fewer than three attempts and every Item stuck Pending for over an hour.
- `/api/cron/digest`, 07:00 Europe/Warsaw: sends the Digest for the Digest Day that ended at 03:00 to every Recipient through Resend (`RESEND_API_KEY`, sender in `DIGEST_FROM`, links to Uploads built from `PANEL_URL`). Every email is recorded in `digest_sends` before it is handed to Resend and the day is marked sent in `digests` once all Recipients have theirs, so neither a doubled invocation nor a retry after a partial failure sends anyone a Digest Day twice. Recipients are managed on the Panel's `/recipients` page (add, remove); the Digest goes to whoever is on the list at send time.

Run one locally: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/retry` (outside the Warsaw hour it answers `{"skipped":true}`).

## External services

| Service | Used for | Plan | What one Item costs |
|---|---|---|---|
| [Vercel](https://vercel.com) | hosting, the two cron jobs | Pro team, $20 a month per seat (shared with other projects) | nothing extra |
| [Supabase](https://supabase.com) | Postgres, Auth, Storage for Uploads | Pro, $25 a month (shared) | nothing extra below the included storage |
| [OpenRouter](https://openrouter.ai) → Gemini 2.5 Flash | the Summary (text, images, video, YouTube by URL, pinned to Google AI Studio) | pay per token: $0.30 per million input, $2.50 per million output | see below |
| [FxTwitter](https://github.com/FxEmbed/FxEmbed) | X posts: text, photos, video variants | free public API | nothing |
| [Apify](https://apify.com) `apify/instagram-scraper` | Instagram posts and Reels | pay per result: $2.30 per 1 000 ($2.70 on the Free plan) | about $0.0025 |
| [Firecrawl](https://firecrawl.dev) | web pages as Markdown (also Facebook, Allegro, Amazon) | Free: 1 000 credits a month; Hobby $19 for 5 000 | 1 credit a page: nothing on Free, about $0.004 on Hobby |
| [Resend](https://resend.com) | the Digest email | Free: 3 000 emails a month | nothing |
| Apple Shortcuts | sharing from the phone | free | nothing |

Prices as listed by the providers on 2026-09-27; check them before relying on the numbers.

**The cost of one Item** is almost entirely the model: the instructions are about 400 tokens, the answer about 400 tokens ($0.001), and the content adds what the table says. Gemini counts about 258 tokens per image, about 263 tokens per second of video and 32 per second of audio.

| Kind of Item | Tokens in | Estimate |
|---|---|---|
| X post, text or photo | under 1 000 | $0.001 |
| Web page (6 000 tokens of Markdown) | 6 000 | $0.003, plus $0.004 on Firecrawl Hobby |
| Instagram photo | under 1 000 | $0.001, plus $0.0025 on Apify |
| Instagram Reel, 30 s | 9 000 | $0.004, plus $0.0025 on Apify |
| X video, 3 min (the variant that fits) | 50 000 | $0.016 |
| Uploaded photo | under 1 000 | $0.001 |
| Uploaded video, 1 min | 18 000 | $0.006 |
| YouTube video, 10 min | 180 000 | $0.055 |

So a typical Item costs a fraction of a cent to about two cents, and a ten-minute YouTube video about five cents. Twenty Items a day come to a few dollars a month on top of the fixed plans.

## Tests

Tests need the local Supabase running (`supabase start`, with Storage; the `uploads` bucket comes from a migration). They read `.env.test`, which points at the local instance with its demo keys.

```
pnpm test               # everything
pnpm exec vitest run src/domain    # only the pure-function tables
pnpm typecheck
pnpm lint
```

HTTP tests call the route handlers directly with a `Request` and assert on the response and on rows in the local database. Every outbound call (FxTwitter, Apify, Firecrawl, video CDNs, OpenRouter) is intercepted by `msw` with recorded fixtures under `tests/fixtures`; an unexpected external request is rejected instead of reaching the network. Pure functions (URL normalisation, Source detection, Digest Day, Category) have table-driven unit tests next to their source.

After changing a migration: `supabase db reset`.
