

CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  s3_key TEXT NOT NULL,
  s3_url TEXT NOT NULL,
  caption TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reactions (
  id SERIAL PRIMARY KEY,
  photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('❤️', '🌟', '😊')),
  reactor_name TEXT NOT NULL,
  reacted_at TIMESTAMP DEFAULT NOW()
);