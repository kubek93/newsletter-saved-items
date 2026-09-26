-- Who receives the Digest. Recipients never log in; managed from the Panel (later) or by SQL for now.
create table recipients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- One row per Digest Day that has been taken for sending, so a doubled cron invocation never sends twice.
-- sent_at is null while the send is in flight; a failed send removes the row so the next run can retry.
create table digests (
  digest_day date primary key,
  sent_at timestamptz,
  item_count integer not null default 0,
  recipient_count integer not null default 0
);

alter table recipients enable row level security;
alter table digests enable row level security;
grant select, insert, update, delete on recipients to service_role;
grant select, insert, update, delete on digests to service_role;
