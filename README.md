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

The response is `{"status":"created","id":"..."}` the first time and `{"status":"duplicate","id":"..."}` afterwards.

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

Accepted types: JPEG, PNG, WebP, MP4, QuickTime; the Shortcut converts HEIC to JPEG first. Uploads are never deduplicated. A video above about 15 MB cannot be analysed (ADR 0005) and ends Failed. A created Item is analysed in the background: its Source is read (X posts through FxTwitter, Instagram posts and Reels through an Apify actor, web pages as Markdown through Firecrawl, YouTube links straight to the model as video; other videos are downloaded and sent inline, see ADR 0005), the content goes to the model configured in `OPENROUTER_MODEL`, and the row ends up `done` with a Polish title, description, recap and Category, or `failed` with the error text and one more attempt counted.

## Public page

`/` is open to everyone: every Item that has a Summary, as tiles (title, the one-sentence recap, Source and Category with their icons, reading time) in sections per Digest Day, newest first, with Category and Source filters that show counts (`/?category=Ceramika&source=web`; folded behind a "Filtry" label on phones). A tile opens `/p/<id>`: the sentence, the summary, the source embedded (X and Instagram widgets, YouTube player, the file itself for an Upload, a link card otherwise) and a large "Otwórz" button. Items still Pending or Failed never appear there.

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

The Item list is filtered by Category and by Digest Day range (the day an Item belongs to in the Digest, 03:00 to 03:00) through the query string (`/?category=Ceramika&from=2026-09-01&to=2026-09-30`).

## Cron jobs

Declared in `vercel.json`, invoked by Vercel Cron with `CRON_SECRET` as a bearer token. Vercel schedules run in UTC, so each job is scheduled at the two UTC hours that can be its Warsaw hour and the route only acts when the Europe/Warsaw clock matches:

- `/api/cron/retry`, 06:00 Europe/Warsaw: re-runs the Summary for every Failed Item with fewer than three attempts and every Item stuck Pending for over an hour.
- `/api/cron/digest`, 07:00 Europe/Warsaw: sends the Digest for the Digest Day that ended at 03:00 to every Recipient through Resend (`RESEND_API_KEY`, sender in `DIGEST_FROM`, links to Uploads built from `PANEL_URL`). Every email is recorded in `digest_sends` before it is handed to Resend and the day is marked sent in `digests` once all Recipients have theirs, so neither a doubled invocation nor a retry after a partial failure sends anyone a Digest Day twice. Recipients are managed on the Panel's `/recipients` page (add, remove); the Digest goes to whoever is on the list at send time.

Run one locally: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/retry` (outside the Warsaw hour it answers `{"skipped":true}`).

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
