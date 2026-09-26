# newsletter-saved-items

Things saved from X, Instagram, the web and the camera roll become Items, get an AI Summary in Polish and go out as a daily Digest email. Vocabulary: `CONTEXT.md`. Decisions: `docs/adr/`. Parameters: `docs/spec.md`.

## Running locally

Requirements: Node 24, pnpm, Docker, the Supabase CLI.

```
pnpm install
supabase start          # local Postgres, Auth and REST on ports 553xx (see supabase/config.toml)
cp .env.example .env.local
```

Fill `.env.local` with `SUPABASE_SERVICE_ROLE_KEY` from `supabase status -o env`, pick any value for `INGEST_TOKEN`, and set `OPENROUTER_API_KEY` (the model id in `OPENROUTER_MODEL` can stay as in the example), `JINA_API_KEY` (free, from jina.ai) and `APIFY_TOKEN` (the actor in `APIFY_ACTOR` can stay as in the example). Then:

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

Save a photo or video (what the Shortcut does in three calls; the file never passes through the app, ADR 0004):

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

Accepted types: JPEG, PNG, WebP, MP4, QuickTime; the Shortcut converts HEIC to JPEG first. Uploads are never deduplicated. A video above about 15 MB cannot be analysed (ADR 0005) and ends Failed. A created Item is analysed in the background: its Source is read (X posts through FxTwitter, Instagram posts and Reels through an Apify actor, web pages as text through Jina Reader, YouTube links straight to the model as video; other videos are downloaded and sent inline, see ADR 0005), the content goes to the model configured in `OPENROUTER_MODEL`, and the row ends up `done` with a Polish title, description, recap and Category, or `failed` with the error text and one more attempt counted.

## Tests

Tests need the local Supabase running (`supabase start`, with Storage; the `uploads` bucket comes from a migration). They read `.env.test`, which points at the local instance with its demo keys.

```
pnpm test               # everything
pnpm exec vitest run src/domain    # only the pure-function tables
pnpm typecheck
pnpm lint
```

HTTP tests call the route handlers directly with a `Request` and assert on the response and on rows in the local database. Every outbound call (FxTwitter, Apify, Jina Reader, video CDNs, OpenRouter) is intercepted by `msw` with recorded fixtures under `tests/fixtures`; an unexpected external request is rejected instead of reaching the network. Pure functions (URL normalisation, Source detection, Digest Day, Category) have table-driven unit tests next to their source.

After changing a migration: `supabase db reset`.
