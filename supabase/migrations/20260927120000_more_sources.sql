-- YouTube, Facebook, Allegro and Amazon become Sources of their own instead of "web".
alter type item_source add value if not exists 'youtube';
alter type item_source add value if not exists 'facebook';
alter type item_source add value if not exists 'allegro';
alter type item_source add value if not exists 'amazon';
