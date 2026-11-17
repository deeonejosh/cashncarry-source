-- Cash N Carry Unified Mobile + Web Additive Migration 0017
-- Safe & idempotent: uses CREATE TABLE IF NOT EXISTS and avoids modifying existing triggers or tables.

CREATE TABLE IF NOT EXISTS cnc_user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES cnc_auth_users(id),
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar_url TEXT NOT NULL DEFAULT '',
  selected_state TEXT NOT NULL DEFAULT 'Lagos',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS cnc_wishlist (
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  product_id TEXT NOT NULL,
  created INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS cnc_seller_follows (
  follower_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  seller_id TEXT NOT NULL,
  created INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (follower_id, seller_id)
);

CREATE TABLE IF NOT EXISTS cnc_short_videos (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  seller_name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cnc_short_videos_seller ON cnc_short_videos(seller_id, created DESC);

CREATE TABLE IF NOT EXISTS cnc_video_likes (
  video_id TEXT NOT NULL REFERENCES cnc_short_videos(id),
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  created INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (video_id, user_id)
);

CREATE TABLE IF NOT EXISTS cnc_video_comments (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES cnc_short_videos(id),
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cnc_video_comments_video ON cnc_video_comments(video_id, created DESC);

CREATE TABLE IF NOT EXISTS cnc_live_room_state (
  room_id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  seller_name TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Fashion',
  status TEXT NOT NULL DEFAULT 'live' CHECK(status IN ('live', 'ended')),
  viewer_count INTEGER NOT NULL DEFAULT 1,
  hearts_count INTEGER NOT NULL DEFAULT 0,
  pinned_product_id TEXT NOT NULL DEFAULT '',
  stream_url TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL DEFAULT (unixepoch()),
  ended_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_cnc_live_room_status ON cnc_live_room_state(status, created DESC);

CREATE TABLE IF NOT EXISTS cnc_live_comments (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES cnc_live_room_state(room_id),
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  is_reaction INTEGER NOT NULL DEFAULT 0 CHECK(is_reaction IN (0, 1)),
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cnc_live_comments_room ON cnc_live_comments(room_id, created DESC);

CREATE TABLE IF NOT EXISTS cnc_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  receiver_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  order_id TEXT NOT NULL DEFAULT '',
  product_id TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  read_at INTEGER,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cnc_messages_participants ON cnc_messages(receiver_id, sender_id, created DESC);

CREATE TABLE IF NOT EXISTS cnc_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'system' CHECK(kind IN ('order', 'live', 'system', 'gift', 'auction')),
  read_at INTEGER,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cnc_notifications_user ON cnc_notifications(user_id, created DESC);

CREATE TABLE IF NOT EXISTS cnc_product_reviews_buyer (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cnc_product_reviews_prod ON cnc_product_reviews_buyer(product_id, created DESC);

CREATE TABLE IF NOT EXISTS cnc_order_fulfilments (
  order_id TEXT PRIMARY KEY REFERENCES cnc_orders(id),
  seller_id TEXT NOT NULL REFERENCES cnc_auth_users(id),
  status TEXT NOT NULL DEFAULT 'processing' CHECK(status IN ('processing', 'packed', 'shipped', 'delivered')),
  carrier TEXT NOT NULL DEFAULT 'GIG Logistics',
  tracking_number TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
