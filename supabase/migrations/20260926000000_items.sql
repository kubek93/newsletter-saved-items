create type item_source as enum ('x', 'instagram', 'web', 'upload');
create type item_status as enum ('pending', 'done', 'failed');

create table items (
  id uuid primary key default gen_random_uuid(),
  source item_source not null,
  url text,
  normalized_url text unique,
  storage_path text,
  mime_type text,
  status item_status not null default 'pending',
  attempts integer not null default 0,
  title text,
  description text,
  recap text,
  category text,
  saved_at timestamptz not null default now(),
  digest_day date not null,
  error text,
  constraint items_link_or_upload check (
    (source = 'upload' and storage_path is not null and url is null)
    or (source <> 'upload' and url is not null and normalized_url is not null)
  )
);

create index items_digest_day_idx on items (digest_day);
create index items_status_idx on items (status);

-- Only the server-side service role touches items; no anon or authenticated access.
alter table items enable row level security;
grant select, insert, update, delete on items to service_role;
