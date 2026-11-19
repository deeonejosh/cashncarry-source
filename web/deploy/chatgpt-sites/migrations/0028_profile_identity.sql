CREATE TABLE IF NOT EXISTS cnc_profile_identity (
  user_id TEXT PRIMARY KEY REFERENCES cnc_auth_users(id),
  username TEXT UNIQUE COLLATE NOCASE,
  photo BLOB,
  photo_type TEXT
);
