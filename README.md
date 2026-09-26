# newsletter-saved-items

Things saved from X, Instagram, the web and the camera roll become Items, get an AI Summary in Polish and go out as a daily Digest email. Vocabulary: `CONTEXT.md`. Decisions: `docs/adr/`. Parameters: `docs/spec.md`.

## Running locally

Requirements: Node 24, pnpm, Docker, the Supabase CLI.

```
pnpm install
supabase start          # local Postgres, Auth and REST on ports 553xx (see supabase/config.toml)
cp .env.example .env.local
```

Fill `.env.local` with `SUPABASE_SERVICE_ROLE_KEY` from `supabase status -o env` and pick any value for `INGEST_TOKEN`. Then:

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

## Tests

Tests need the local Supabase running (`supabase start`). They read `.env.test`, which points at the local instance with its demo keys.

```
pnpm test               # everything
pnpm exec vitest run src/domain    # only the pure-function tables
pnpm typecheck
pnpm lint
```

HTTP tests call the route handlers directly with a `Request` and assert on the response and on rows in the local database. Pure functions (URL normalisation, Source detection, Digest Day) have table-driven unit tests next to their source.

After changing a migration: `supabase db reset`.
