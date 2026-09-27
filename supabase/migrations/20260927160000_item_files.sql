-- A file share may carry several photos or videos at once: they form one Item (a collection), are analysed
-- together and shown together. items.storage_path stays the first file; item_files lists them all in order.
create table item_files (
  item_id uuid not null references items (id) on delete cascade,
  position integer not null,
  path text not null,
  mime_type text not null,
  primary key (item_id, position)
);

alter table item_files enable row level security;
grant select, insert, update, delete on item_files to service_role;

insert into item_files (item_id, position, path, mime_type)
  select id, 0, storage_path, mime_type from items where source = 'upload' and storage_path is not null;

-- The Shortcut tags every file of one share with the same batch key, so later files find their Item.
alter table items add column batch text;
create index items_batch_idx on items (batch) where batch is not null;
