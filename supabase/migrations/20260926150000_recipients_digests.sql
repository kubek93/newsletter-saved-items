-- Who receives the Digest. Recipients never log in; managed from the Panel (later) or by SQL for now.
create table recipients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- One row per Digest Day; sent_at is set once every Recipient has received it.
create table digests (
  digest_day date primary key,
  sent_at timestamptz,
  item_count integer not null default 0,
  recipient_count integer not null default 0
);

-- One row per email actually handed to Resend, claimed before sending, so no Recipient ever gets a
-- Digest Day twice: not from a doubled cron invocation, not from a retry after a partial failure.
create table digest_sends (
  digest_day date not null references digests (digest_day) on delete cascade,
  email text not null,
  sent_at timestamptz not null default now(),
  primary key (digest_day, email)
);

alter table recipients enable row level security;
alter table digests enable row level security;
alter table digest_sends enable row level security;
grant select, insert, update, delete on recipients to service_role;
grant select, insert, update, delete on digests to service_role;
grant select, insert, update, delete on digest_sends to service_role;
