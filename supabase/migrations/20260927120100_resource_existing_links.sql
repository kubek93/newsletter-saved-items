-- Items saved before the new Sources existed get re-sorted by host. Separate file: a new enum value
-- cannot be used in the transaction that added it.
update items set source = 'youtube' where source = 'web' and normalized_url ~* '^https?://([a-z0-9-]+\.)*(youtube\.com|youtu\.be)/';
update items set source = 'facebook' where source = 'web' and normalized_url ~* '^https?://([a-z0-9-]+\.)*(facebook\.com|fb\.com|fb\.watch)/';
update items set source = 'allegro' where source = 'web' and normalized_url ~* '^https?://([a-z0-9-]+\.)*allegro\.(pl|com)/';
update items set source = 'amazon' where source = 'web' and normalized_url ~* '^https?://([a-z0-9-]+\.)*(amazon\.[a-z.]+|amzn\.(to|eu))/';
