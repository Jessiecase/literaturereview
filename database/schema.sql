CREATE TABLE IF NOT EXISTS literature_reviews (
 id TEXT PRIMARY KEY NOT NULL,
 token TEXT NOT NULL UNIQUE,
 student_id TEXT NOT NULL,
 student_name TEXT NOT NULL,
 data_json TEXT NOT NULL DEFAULT '{}',
 step INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted')),
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL,
 last_seen_at INTEGER NOT NULL,
 submitted_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_literature_reviews_updated ON literature_reviews(updated_at);
