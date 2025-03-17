-- 用户会话表创建脚本
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" SERIAL PRIMARY KEY,
  "session_id" VARCHAR(255) NOT NULL UNIQUE,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id"),
  "ip_address" VARCHAR(50),
  "user_agent" TEXT,
  "is_valid" BOOLEAN DEFAULT TRUE,
  "last_activity" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "data" JSON
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "user_sessions_session_id_idx" ON "user_sessions" ("session_id");
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions" ("user_id");