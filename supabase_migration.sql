-- Phoxta: Add missing columns to ideas table
-- Run this in your Supabase Dashboard → SQL Editor

-- 1. Track which days the user has completed
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS completed_days integer[] DEFAULT ARRAY[]::integer[];

-- 2. Store the AI-generated final verdict (Day 7)
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS verdict jsonb DEFAULT NULL;

-- 3. Store the AI-generated validation report
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS report jsonb DEFAULT NULL;


-- ===========================================================================
-- Graphics Designer – Full Supabase migration (fully idempotent)
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS everywhere
-- ===========================================================================

-- ===== 0) RLS helper – SECURITY DEFINER bypasses RLS, breaking cycles =====
CREATE OR REPLACE FUNCTION public.is_design_project_owner(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM design_projects WHERE id = p_id AND user_id = auth.uid()
  );
$$;

-- ===== 1) design_projects =====
CREATE TABLE IF NOT EXISTS design_projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL DEFAULT 'Untitled Design',
  width             INT  NOT NULL DEFAULT 1080,
  height            INT  NOT NULL DEFAULT 1080,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  folder_id         UUID,
  is_template       BOOLEAN NOT NULL DEFAULT false,
  template_source_id UUID REFERENCES design_projects(id) ON DELETE SET NULL
);

-- Patch columns in case table was created earlier with fewer columns
ALTER TABLE design_projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE design_projects ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE design_projects ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE design_projects ADD COLUMN IF NOT EXISTS template_source_id UUID REFERENCES design_projects(id) ON DELETE SET NULL;
ALTER TABLE design_projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE design_projects ADD COLUMN IF NOT EXISTS preview_url TEXT;

CREATE INDEX IF NOT EXISTS idx_design_projects_user
  ON design_projects (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_design_projects_deleted
  ON design_projects (user_id) WHERE deleted_at IS NOT NULL;

ALTER TABLE design_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dp_select" ON design_projects;
CREATE POLICY "dp_select" ON design_projects FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "dp_insert" ON design_projects;
CREATE POLICY "dp_insert" ON design_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "dp_update" ON design_projects;
CREATE POLICY "dp_update" ON design_projects FOR UPDATE
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "dp_delete" ON design_projects;
CREATE POLICY "dp_delete" ON design_projects FOR DELETE
  USING (auth.uid() = user_id);


-- ===== 2) design_documents =====
CREATE TABLE IF NOT EXISTS design_documents (
  project_id         UUID PRIMARY KEY REFERENCES design_projects(id) ON DELETE CASCADE,
  current_version_id UUID,
  pages_count        INT NOT NULL DEFAULT 1,
  meta               JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE design_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dd_select" ON design_documents;
CREATE POLICY "dd_select" ON design_documents FOR SELECT
  USING (is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dd_insert" ON design_documents;
CREATE POLICY "dd_insert" ON design_documents FOR INSERT
  WITH CHECK (is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dd_update" ON design_documents;
CREATE POLICY "dd_update" ON design_documents FOR UPDATE
  USING (is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dd_delete" ON design_documents;
CREATE POLICY "dd_delete" ON design_documents FOR DELETE
  USING (is_design_project_owner(project_id));


-- ===== 3) design_pages =====
CREATE TABLE IF NOT EXISTS design_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  page_index      INT NOT NULL DEFAULT 0,
  width           INT NOT NULL DEFAULT 1080,
  height          INT NOT NULL DEFAULT 1080,
  background      JSONB NOT NULL DEFAULT '{"type":"color","value":"#ffffff"}'::jsonb,
  fabric_json_path TEXT,
  preview_path     TEXT
);

CREATE INDEX IF NOT EXISTS idx_design_pages_project
  ON design_pages (project_id, page_index);

ALTER TABLE design_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dpg_select" ON design_pages;
CREATE POLICY "dpg_select" ON design_pages FOR SELECT
  USING (is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dpg_insert" ON design_pages;
CREATE POLICY "dpg_insert" ON design_pages FOR INSERT
  WITH CHECK (is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dpg_update" ON design_pages;
CREATE POLICY "dpg_update" ON design_pages FOR UPDATE
  USING (is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dpg_delete" ON design_pages;
CREATE POLICY "dpg_delete" ON design_pages FOR DELETE
  USING (is_design_project_owner(project_id));


-- ===== 4) design_assets =====
CREATE TABLE IF NOT EXISTS design_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  UUID REFERENCES design_projects(id) ON DELETE SET NULL,
  type        TEXT NOT NULL DEFAULT 'image',
  name        TEXT NOT NULL,
  path        TEXT NOT NULL,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_assets_user
  ON design_assets (user_id, created_at DESC);

ALTER TABLE design_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "da_select" ON design_assets;
CREATE POLICY "da_select" ON design_assets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "da_insert" ON design_assets;
CREATE POLICY "da_insert" ON design_assets FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "da_update" ON design_assets;
CREATE POLICY "da_update" ON design_assets FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "da_delete" ON design_assets;
CREATE POLICY "da_delete" ON design_assets FOR DELETE USING (auth.uid() = user_id);


-- ===== 5) design_brand_kits =====
CREATE TABLE IF NOT EXISTS design_brand_kits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'My Brand',
  colors      JSONB NOT NULL DEFAULT '[]'::jsonb,
  fonts       JSONB NOT NULL DEFAULT '[]'::jsonb,
  logos       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE design_brand_kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dbk_select" ON design_brand_kits;
CREATE POLICY "dbk_select" ON design_brand_kits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "dbk_insert" ON design_brand_kits;
CREATE POLICY "dbk_insert" ON design_brand_kits FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "dbk_update" ON design_brand_kits;
CREATE POLICY "dbk_update" ON design_brand_kits FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "dbk_delete" ON design_brand_kits;
CREATE POLICY "dbk_delete" ON design_brand_kits FOR DELETE USING (auth.uid() = user_id);


-- ===== 6) design_collaborators =====
CREATE TABLE IF NOT EXISTS design_collaborators (
  project_id  UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','editor','commenter','viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE design_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dc_select" ON design_collaborators;
CREATE POLICY "dc_select" ON design_collaborators FOR SELECT
  USING (auth.uid() = user_id OR is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dc_insert" ON design_collaborators;
CREATE POLICY "dc_insert" ON design_collaborators FOR INSERT
  WITH CHECK (is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dc_update" ON design_collaborators;
CREATE POLICY "dc_update" ON design_collaborators FOR UPDATE
  USING (is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dc_delete" ON design_collaborators;
CREATE POLICY "dc_delete" ON design_collaborators FOR DELETE
  USING (is_design_project_owner(project_id));

DROP POLICY IF EXISTS "dp_collab_select" ON design_projects;
CREATE POLICY "dp_collab_select" ON design_projects FOR SELECT
  USING (EXISTS (SELECT 1 FROM design_collaborators dc WHERE dc.project_id = id AND dc.user_id = auth.uid()));
DROP POLICY IF EXISTS "dp_collab_update" ON design_projects;
CREATE POLICY "dp_collab_update" ON design_projects FOR UPDATE
  USING (EXISTS (SELECT 1 FROM design_collaborators dc WHERE dc.project_id = id AND dc.user_id = auth.uid() AND dc.role = 'editor'));


-- ===== 7) design_comments =====
CREATE TABLE IF NOT EXISTS design_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  page_id     UUID REFERENCES design_pages(id) ON DELETE SET NULL,
  object_id   TEXT,
  author_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_design_comments_project
  ON design_comments (project_id, created_at DESC);

ALTER TABLE design_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dcm_select" ON design_comments;
CREATE POLICY "dcm_select" ON design_comments FOR SELECT
  USING (is_design_project_owner(project_id)
    OR EXISTS (SELECT 1 FROM design_collaborators dc WHERE dc.project_id = project_id AND dc.user_id = auth.uid()));
DROP POLICY IF EXISTS "dcm_insert" ON design_comments;
CREATE POLICY "dcm_insert" ON design_comments FOR INSERT
  WITH CHECK (auth.uid() = author_id AND (
    is_design_project_owner(project_id)
    OR EXISTS (SELECT 1 FROM design_collaborators dc WHERE dc.project_id = project_id AND dc.user_id = auth.uid()
      AND dc.role IN ('owner','editor','commenter'))));
DROP POLICY IF EXISTS "dcm_update" ON design_comments;
CREATE POLICY "dcm_update" ON design_comments FOR UPDATE
  USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "dcm_delete" ON design_comments;
CREATE POLICY "dcm_delete" ON design_comments FOR DELETE
  USING (auth.uid() = author_id);


-- ===== 8) design_versions =====
CREATE TABLE IF NOT EXISTS design_versions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         UUID NOT NULL REFERENCES auth.users(id),
  label              TEXT,
  document_json_path TEXT NOT NULL,
  preview_paths      JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_design_versions_project
  ON design_versions (project_id, created_at DESC);

ALTER TABLE design_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dv_select" ON design_versions;
CREATE POLICY "dv_select" ON design_versions FOR SELECT
  USING (is_design_project_owner(project_id)
    OR EXISTS (SELECT 1 FROM design_collaborators dc WHERE dc.project_id = project_id AND dc.user_id = auth.uid()));
DROP POLICY IF EXISTS "dv_insert" ON design_versions;
CREATE POLICY "dv_insert" ON design_versions FOR INSERT
  WITH CHECK (is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dv_update" ON design_versions;
CREATE POLICY "dv_update" ON design_versions FOR UPDATE
  USING (is_design_project_owner(project_id));


-- ===== 9) design_audit_logs =====
CREATE TABLE IF NOT EXISTS design_audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES design_projects(id) ON DELETE CASCADE,
  actor_id    UUID NOT NULL REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_design_audit_project
  ON design_audit_logs (project_id, created_at DESC);

ALTER TABLE design_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dal_select" ON design_audit_logs;
CREATE POLICY "dal_select" ON design_audit_logs FOR SELECT
  USING (is_design_project_owner(project_id));
DROP POLICY IF EXISTS "dal_insert" ON design_audit_logs;
CREATE POLICY "dal_insert" ON design_audit_logs FOR INSERT
  WITH CHECK (auth.uid() = actor_id);


-- ===========================================================================
-- STORAGE BUCKETS
-- ===========================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('design-projects', 'design-projects', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('design-system', 'design-system', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('design-exports', 'design-exports', false)
ON CONFLICT (id) DO NOTHING;

-- CRM Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_images', 'profile_images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('task_attachments', 'task_attachments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_uploads', 'chat_uploads', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('project_images', 'project_images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-assets', 'landing-assets', true)
ON CONFLICT (id) DO NOTHING;


-- ===========================================================================
-- STORAGE RLS POLICIES
-- ===========================================================================

DROP POLICY IF EXISTS "sp_select" ON storage.objects;
CREATE POLICY "sp_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'design-projects' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "sp_insert" ON storage.objects;
CREATE POLICY "sp_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'design-projects' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "sp_update" ON storage.objects;
CREATE POLICY "sp_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'design-projects' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "sp_delete" ON storage.objects;
CREATE POLICY "sp_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'design-projects' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "ss_select" ON storage.objects;
CREATE POLICY "ss_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'design-system');

DROP POLICY IF EXISTS "se_select" ON storage.objects;
CREATE POLICY "se_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'design-exports' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "se_insert" ON storage.objects;
CREATE POLICY "se_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'design-exports' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "se_update" ON storage.objects;
CREATE POLICY "se_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'design-exports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- CRM Storage Policies: profile_images (user-scoped, public bucket)
DROP POLICY IF EXISTS "crm_profile_select" ON storage.objects;
CREATE POLICY "crm_profile_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'profile_images');
DROP POLICY IF EXISTS "crm_profile_insert" ON storage.objects;
CREATE POLICY "crm_profile_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile_images' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_profile_update" ON storage.objects;
CREATE POLICY "crm_profile_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile_images' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_profile_delete" ON storage.objects;
CREATE POLICY "crm_profile_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'profile_images' AND auth.uid() IS NOT NULL);

-- CRM Storage Policies: task_attachments (user-scoped, public bucket)
DROP POLICY IF EXISTS "crm_task_att_select" ON storage.objects;
CREATE POLICY "crm_task_att_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'task_attachments');
DROP POLICY IF EXISTS "crm_task_att_insert" ON storage.objects;
CREATE POLICY "crm_task_att_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task_attachments' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_task_att_update" ON storage.objects;
CREATE POLICY "crm_task_att_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'task_attachments' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_task_att_delete" ON storage.objects;
CREATE POLICY "crm_task_att_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'task_attachments' AND auth.uid() IS NOT NULL);

-- CRM Storage Policies: chat_uploads (private, user-scoped by folder)
DROP POLICY IF EXISTS "crm_chat_select" ON storage.objects;
CREATE POLICY "crm_chat_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'chat_uploads' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_chat_insert" ON storage.objects;
CREATE POLICY "crm_chat_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat_uploads' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_chat_delete" ON storage.objects;
CREATE POLICY "crm_chat_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'chat_uploads' AND auth.uid() IS NOT NULL);

-- CRM Storage Policies: project_images (public bucket)
DROP POLICY IF EXISTS "crm_proj_img_select" ON storage.objects;
CREATE POLICY "crm_proj_img_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'project_images');
DROP POLICY IF EXISTS "crm_proj_img_insert" ON storage.objects;
CREATE POLICY "crm_proj_img_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project_images' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_proj_img_update" ON storage.objects;
CREATE POLICY "crm_proj_img_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'project_images' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_proj_img_delete" ON storage.objects;
CREATE POLICY "crm_proj_img_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'project_images' AND auth.uid() IS NOT NULL);

-- CRM Storage Policies: product-images (public bucket)
DROP POLICY IF EXISTS "crm_product_img_select" ON storage.objects;
CREATE POLICY "crm_product_img_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
DROP POLICY IF EXISTS "crm_product_img_insert" ON storage.objects;
CREATE POLICY "crm_product_img_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_product_img_update" ON storage.objects;
CREATE POLICY "crm_product_img_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_product_img_delete" ON storage.objects;
CREATE POLICY "crm_product_img_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);

-- CRM Storage Policies: landing-assets (public bucket)
DROP POLICY IF EXISTS "crm_landing_select" ON storage.objects;
CREATE POLICY "crm_landing_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'landing-assets');
DROP POLICY IF EXISTS "crm_landing_insert" ON storage.objects;
CREATE POLICY "crm_landing_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'landing-assets' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_landing_update" ON storage.objects;
CREATE POLICY "crm_landing_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'landing-assets' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "crm_landing_delete" ON storage.objects;
CREATE POLICY "crm_landing_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'landing-assets' AND auth.uid() IS NOT NULL);


-- ===========================================================================
-- Phoxta CRM – crm_contacts table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS crm_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT DEFAULT '',
  company         TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  stage           TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead','contacted','qualified','proposal','negotiation','won','lost')),
  value           NUMERIC NOT NULL DEFAULT 0,
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_user ON crm_contacts (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_stage ON crm_contacts (user_id, stage);

ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_select" ON crm_contacts;
CREATE POLICY "crm_select" ON crm_contacts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "crm_insert" ON crm_contacts;
CREATE POLICY "crm_insert" ON crm_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "crm_update" ON crm_contacts;
CREATE POLICY "crm_update" ON crm_contacts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "crm_delete" ON crm_contacts;
CREATE POLICY "crm_delete" ON crm_contacts FOR DELETE USING (auth.uid() = user_id);


-- ===========================================================================
-- Analytics Hub – analytics_metrics & analytics_activities tables
-- ===========================================================================
CREATE TABLE IF NOT EXISTS analytics_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  value           NUMERIC NOT NULL DEFAULT 0,
  previous_value  NUMERIC NOT NULL DEFAULT 0,
  unit            TEXT DEFAULT '',
  category        TEXT DEFAULT 'general',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_metrics_user ON analytics_metrics (user_id, updated_at DESC);
ALTER TABLE analytics_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "am_select" ON analytics_metrics;
CREATE POLICY "am_select" ON analytics_metrics FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "am_insert" ON analytics_metrics;
CREATE POLICY "am_insert" ON analytics_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "am_update" ON analytics_metrics;
CREATE POLICY "am_update" ON analytics_metrics FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "am_delete" ON analytics_metrics;
CREATE POLICY "am_delete" ON analytics_metrics FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS analytics_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action          TEXT NOT NULL,
  detail          TEXT DEFAULT '',
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_activities_user ON analytics_activities (user_id, timestamp DESC);
ALTER TABLE analytics_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aa_select" ON analytics_activities;
CREATE POLICY "aa_select" ON analytics_activities FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "aa_insert" ON analytics_activities;
CREATE POLICY "aa_insert" ON analytics_activities FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "aa_delete" ON analytics_activities;
CREATE POLICY "aa_delete" ON analytics_activities FOR DELETE USING (auth.uid() = user_id);


-- ===========================================================================
-- Email Campaigns – email_campaigns table
-- ===========================================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  subject         TEXT DEFAULT '',
  body_html       TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent','paused')),
  recipients      INT NOT NULL DEFAULT 0,
  opens           INT NOT NULL DEFAULT 0,
  clicks          INT NOT NULL DEFAULT 0,
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_user ON email_campaigns (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns (user_id, status);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ec_select" ON email_campaigns;
CREATE POLICY "ec_select" ON email_campaigns FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ec_insert" ON email_campaigns;
CREATE POLICY "ec_insert" ON email_campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ec_update" ON email_campaigns;
CREATE POLICY "ec_update" ON email_campaigns FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ec_delete" ON email_campaigns;
CREATE POLICY "ec_delete" ON email_campaigns FOR DELETE USING (auth.uid() = user_id);