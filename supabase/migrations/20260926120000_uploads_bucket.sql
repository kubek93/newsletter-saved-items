-- Private bucket for photos and videos shared from the device (ADR 0004).
-- Files are written through signed upload URLs and read through signed URLs only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  false,
  104857600, -- 100 MiB
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;
