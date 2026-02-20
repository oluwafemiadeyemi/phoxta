-- ============================================================
-- Content Studio — Redesigned from Scratch
-- Phoxta CRM — Migration 004
-- ============================================================

-- ── Drop old tables (from previous content migrations) ──
DROP TABLE IF EXISTS content_approvals CASCADE;
DROP TABLE IF EXISTS content_cross_posts CASCADE;
DROP TABLE IF EXISTS content_social_automations CASCADE;
DROP TABLE IF EXISTS content_social_inbox CASCADE;
DROP TABLE IF EXISTS content_tasks CASCADE;
DROP TABLE IF EXISTS content_activity_log CASCADE;
DROP TABLE IF EXISTS content_comments CASCADE;
DROP TABLE IF EXISTS content_ideas CASCADE;
DROP TABLE IF EXISTS content_media CASCADE;
DROP TABLE IF EXISTS content_posts CASCADE;
DROP TABLE IF EXISTS content_categories CASCADE;
DROP TABLE IF EXISTS content_labels CASCADE;
DROP TABLE IF EXISTS content_channels CASCADE;

-- Drop old trigger functions if they exist
DROP FUNCTION IF EXISTS trg_content_posts_updated() CASCADE;
DROP FUNCTION IF EXISTS trg_content_ideas_updated() CASCADE;
DROP FUNCTION IF EXISTS trg_content_comments_updated() CASCADE;
DROP FUNCTION IF EXISTS trg_content_tasks_updated() CASCADE;
DROP FUNCTION IF EXISTS trg_content_social_automations_updated() CASCADE;

-- ── Social Channels (with OAuth / API token storage) ──
CREATE TABLE IF NOT EXISTS content_channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  platform      TEXT NOT NULL CHECK (platform IN (
    'facebook','instagram','linkedin','tiktok','x','twitter','pinterest','youtube',
    'blog','email','newsletter','other'
  )),
  color         TEXT DEFAULT '#6366f1',
  icon          TEXT,
  account_name  TEXT,
  account_id    TEXT,                 -- platform-specific user/page ID
  account_url   TEXT,                 -- profile URL
  avatar_url    TEXT,                 -- profile picture
  platform_username TEXT,             -- display username on the platform
  platform_user_id  TEXT,             -- platform's unique user ID
  is_active     BOOLEAN DEFAULT true,
  -- OAuth / API credentials (encrypted at rest by Supabase)
  auth_status   TEXT DEFAULT 'disconnected' CHECK (auth_status IN (
    'disconnected','connecting','connected','expired','error'
  )),
  access_token  TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  api_key       TEXT,                 -- for platforms using API keys
  webhook_url   TEXT,                 -- incoming webhook URL
  scopes        TEXT[] DEFAULT '{}',  -- granted OAuth scopes (legacy)
  auth_scopes   TEXT[] DEFAULT '{}',  -- granted OAuth scopes
  -- Capabilities
  can_post      BOOLEAN DEFAULT false,
  can_read_inbox BOOLEAN DEFAULT false,
  can_comment   BOOLEAN DEFAULT false,
  can_dm        BOOLEAN DEFAULT false,
  can_analytics BOOLEAN DEFAULT false,
  -- Settings
  auto_reply_enabled BOOLEAN DEFAULT false,
  default_hashtags TEXT[] DEFAULT '{}',
  posting_timezone TEXT DEFAULT 'UTC',
  config        JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Categories / Labels ──
CREATE TABLE IF NOT EXISTS content_labels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#8b5cf6',
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Posts (the core content item) ──
CREATE TABLE IF NOT EXISTS content_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Core fields
  title           TEXT NOT NULL DEFAULT '',
  slug            TEXT DEFAULT '',
  body            TEXT DEFAULT '',
  excerpt         TEXT DEFAULT '',
  content_type    TEXT DEFAULT 'social_post' CHECK (content_type IN (
    'social_post','article','email_campaign','newsletter','video_script',
    'story','reel','carousel','thread','pin','other'
  )),
  -- Publishing
  status          TEXT DEFAULT 'draft' CHECK (status IN (
    'idea','draft','review','scheduled','publishing','published','failed','archived'
  )),
  channel_id      UUID REFERENCES content_channels(id) ON DELETE SET NULL,
  label_id        UUID REFERENCES content_labels(id) ON DELETE SET NULL,
  tags            TEXT[] DEFAULT '{}',
  cover_image     TEXT,
  -- Scheduling
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  auto_publish    BOOLEAN DEFAULT false,
  -- Approval
  approval        TEXT DEFAULT 'none' CHECK (approval IN ('none','pending','approved','rejected','changes_requested')),
  approval_note   TEXT,
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  -- SEO
  seo_title       TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  seo_keywords    TEXT[] DEFAULT '{}',
  -- Metrics
  views           INT DEFAULT 0,
  clicks          INT DEFAULT 0,
  likes           INT DEFAULT 0,
  shares          INT DEFAULT 0,
  comments_count  INT DEFAULT 0,
  engagement_rate NUMERIC(5,2) DEFAULT 0,
  -- AI
  ai_generated    BOOLEAN DEFAULT false,
  ai_prompt       TEXT,
  -- Meta
  author_name     TEXT DEFAULT '',
  word_count      INT DEFAULT 0,
  reading_time    INT DEFAULT 0,
  platform_data   JSONB DEFAULT '{}',
  duplicated_from UUID REFERENCES content_posts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Media Library ──
CREATE TABLE IF NOT EXISTS content_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id     UUID REFERENCES content_posts(id) ON DELETE SET NULL,
  url         TEXT NOT NULL,
  file_name   TEXT NOT NULL DEFAULT '',
  file_type   TEXT DEFAULT '',
  file_size   INT DEFAULT 0,
  width       INT,
  height      INT,
  alt_text    TEXT DEFAULT '',
  caption     TEXT DEFAULT '',
  folder      TEXT DEFAULT 'general',
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Ideas Board ──
CREATE TABLE IF NOT EXISTS content_ideas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  notes         TEXT,
  color         TEXT DEFAULT '#8b5cf6',
  tags          TEXT[] DEFAULT '{}',
  priority      TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status        TEXT DEFAULT 'new' CHECK (status IN ('new','exploring','ready','used','archived')),
  label_id      UUID REFERENCES content_labels(id) ON DELETE SET NULL,
  channel_id    UUID REFERENCES content_channels(id) ON DELETE SET NULL,
  converted_post_id UUID REFERENCES content_posts(id) ON DELETE SET NULL,
  reference_url   TEXT,
  reference_image TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Team Comments ──
CREATE TABLE IF NOT EXISTS content_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id     UUID REFERENCES content_posts(id) ON DELETE CASCADE,
  idea_id     UUID REFERENCES content_ideas(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES content_comments(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  author_name TEXT,
  is_internal BOOLEAN DEFAULT true,
  attachments JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Activity Log ──
CREATE TABLE IF NOT EXISTS content_activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id     UUID REFERENCES content_posts(id) ON DELETE CASCADE,
  idea_id     UUID REFERENCES content_ideas(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  details     JSONB DEFAULT '{}',
  actor_name  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Tasks ──
CREATE TABLE IF NOT EXISTS content_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id       UUID REFERENCES content_posts(id) ON DELETE CASCADE,
  idea_id       UUID REFERENCES content_ideas(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  assignee_name TEXT,
  assignee_email TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  priority      TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date      TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Social Inbox (incoming messages, comments, mentions across all connected platforms) ──
CREATE TABLE IF NOT EXISTS content_social_inbox (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL DEFAULT 'blog',
  external_id     TEXT,
  channel_id      UUID REFERENCES content_channels(id) ON DELETE CASCADE,
  post_id         UUID REFERENCES content_posts(id) ON DELETE SET NULL,
  message_type    TEXT NOT NULL DEFAULT 'comment' CHECK (message_type IN (
    'comment','dm','mention','reply','review','reaction','follow','share','tag','other'
  )),
  direction       TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound')),
  author_name     TEXT DEFAULT '',
  author_username TEXT DEFAULT '',
  author_avatar   TEXT,
  body            TEXT NOT NULL DEFAULT '',
  status          TEXT DEFAULT 'new' CHECK (status IN ('new','read','replied','archived','spam')),
  is_flagged      BOOLEAN DEFAULT false,
  sentiment       TEXT CHECK (sentiment IN ('positive','neutral','negative','question','urgent',NULL)),
  ai_suggested_reply TEXT,
  replied_at      TIMESTAMPTZ,
  parent_external_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Social Automations (auto-replies, auto-DMs, scheduled responses) ──
CREATE TABLE IF NOT EXISTS content_social_automations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  "trigger"     TEXT NOT NULL CHECK ("trigger" IN (
    'new_follower','new_comment','new_dm','keyword_mention',
    'new_review','post_published','schedule','manual'
  )),
  trigger_config JSONB DEFAULT '{}',
  "action"      TEXT NOT NULL CHECK ("action" IN (
    'auto_reply','send_dm','add_label','notify_team','create_task',
    'forward_email','ai_reply','cross_post','archive'
  )),
  action_config  JSONB DEFAULT '{}',
  ai_enabled     BOOLEAN DEFAULT false,
  ai_tone        TEXT CHECK (ai_tone IN (
    'professional','friendly','casual','formal','witty','empathetic', NULL
  )),
  channel_id     UUID REFERENCES content_channels(id) ON DELETE SET NULL,
  is_active      BOOLEAN DEFAULT true,
  runs_count     INT DEFAULT 0,
  last_run_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── Cross-Posts (track publishing a single post to multiple channels) ──
CREATE TABLE IF NOT EXISTS content_cross_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES content_posts(id) ON DELETE CASCADE,
  channel_id      UUID NOT NULL REFERENCES content_channels(id) ON DELETE CASCADE,
  platform_post_id TEXT,
  platform_url     TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN (
    'pending','posting','posted','failed','cancelled'
  )),
  posted_at       TIMESTAMPTZ,
  error_message   TEXT,
  engagement      JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_cp_user       ON content_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_cp_status     ON content_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cp_channel    ON content_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_cp_label      ON content_posts(label_id);
CREATE INDEX IF NOT EXISTS idx_cp_scheduled  ON content_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_ci_user       ON content_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_ci_status     ON content_ideas(user_id, status);
CREATE INDEX IF NOT EXISTS idx_cm_user       ON content_media(user_id);
CREATE INDEX IF NOT EXISTS idx_cm_post       ON content_media(post_id);
CREATE INDEX IF NOT EXISTS idx_cm_folder     ON content_media(user_id, folder);
CREATE INDEX IF NOT EXISTS idx_cc_post       ON content_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_cc_idea       ON content_comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_cal_post      ON content_activity_log(post_id);
CREATE INDEX IF NOT EXISTS idx_cal_user      ON content_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ct_post       ON content_tasks(post_id);
CREATE INDEX IF NOT EXISTS idx_ct_assignee   ON content_tasks(assignee_email);
CREATE INDEX IF NOT EXISTS idx_cl_user       ON content_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_cch_user      ON content_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_cch_auth      ON content_channels(user_id, auth_status);
CREATE INDEX IF NOT EXISTS idx_csi_user      ON content_social_inbox(user_id);
CREATE INDEX IF NOT EXISTS idx_csi_channel   ON content_social_inbox(channel_id);
CREATE INDEX IF NOT EXISTS idx_csi_status    ON content_social_inbox(user_id, status);
CREATE INDEX IF NOT EXISTS idx_csi_type      ON content_social_inbox(user_id, message_type);
CREATE INDEX IF NOT EXISTS idx_csi_post      ON content_social_inbox(post_id);
CREATE INDEX IF NOT EXISTS idx_csa_user      ON content_social_automations(user_id);
CREATE INDEX IF NOT EXISTS idx_csa_active    ON content_social_automations(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cxp_post      ON content_cross_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_cxp_channel   ON content_cross_posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_cxp_status    ON content_cross_posts(status);

-- ── RLS ──
ALTER TABLE content_channels     ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_labels       ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_posts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_media        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_social_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_social_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_cross_posts  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_content_channels" ON content_channels FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_content_labels" ON content_labels FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_content_posts" ON content_posts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_content_media" ON content_media FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_content_ideas" ON content_ideas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_content_comments" ON content_comments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_content_activity_log" ON content_activity_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_content_tasks" ON content_tasks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_content_social_inbox" ON content_social_inbox FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_content_social_automations" ON content_social_automations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_content_cross_posts" ON content_cross_posts FOR ALL
  USING (EXISTS (SELECT 1 FROM content_posts WHERE content_posts.id = content_cross_posts.post_id AND content_posts.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM content_posts WHERE content_posts.id = content_cross_posts.post_id AND content_posts.user_id = auth.uid()));

CREATE POLICY "svc_content_channels"     ON content_channels     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_content_labels"       ON content_labels       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_content_posts"        ON content_posts        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_content_media"        ON content_media        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_content_ideas"        ON content_ideas        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_content_comments"     ON content_comments     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_content_activity_log" ON content_activity_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_content_tasks"        ON content_tasks        FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_content_social_inbox" ON content_social_inbox FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_content_social_automations" ON content_social_automations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_content_cross_posts"  ON content_cross_posts  FOR ALL USING (auth.role() = 'service_role');

-- ── Triggers ──
CREATE OR REPLACE FUNCTION trg_content_posts_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER content_posts_updated BEFORE UPDATE ON content_posts FOR EACH ROW EXECUTE FUNCTION trg_content_posts_updated();

CREATE OR REPLACE FUNCTION trg_content_ideas_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER content_ideas_updated BEFORE UPDATE ON content_ideas FOR EACH ROW EXECUTE FUNCTION trg_content_ideas_updated();

CREATE OR REPLACE FUNCTION trg_content_comments_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER content_comments_updated BEFORE UPDATE ON content_comments FOR EACH ROW EXECUTE FUNCTION trg_content_comments_updated();

CREATE OR REPLACE FUNCTION trg_content_tasks_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER content_tasks_updated BEFORE UPDATE ON content_tasks FOR EACH ROW EXECUTE FUNCTION trg_content_tasks_updated();

CREATE OR REPLACE FUNCTION trg_content_channels_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER content_channels_updated BEFORE UPDATE ON content_channels FOR EACH ROW EXECUTE FUNCTION trg_content_channels_updated();

CREATE OR REPLACE FUNCTION trg_content_social_inbox_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER content_social_inbox_updated BEFORE UPDATE ON content_social_inbox FOR EACH ROW EXECUTE FUNCTION trg_content_social_inbox_updated();

CREATE OR REPLACE FUNCTION trg_content_social_automations_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER content_social_automations_updated BEFORE UPDATE ON content_social_automations FOR EACH ROW EXECUTE FUNCTION trg_content_social_automations_updated();

CREATE OR REPLACE FUNCTION trg_content_cross_posts_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER content_cross_posts_updated BEFORE UPDATE ON content_cross_posts FOR EACH ROW EXECUTE FUNCTION trg_content_cross_posts_updated();
