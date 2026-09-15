-- Dynamic Fediverse instance apps cover every provider that publishes
-- through the Mastodon client API (Mastodon itself and compatible software
-- such as Pixelfed). The provider column records the detected software so a
-- Mastodon row and a Pixelfed row for the same host can never be confused.
ALTER TABLE mastodon_instances ADD COLUMN provider TEXT NOT NULL DEFAULT 'mastodon';
