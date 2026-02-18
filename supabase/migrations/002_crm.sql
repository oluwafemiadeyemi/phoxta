-- =====================================================
-- CRM Feature – Full Supabase Migration
-- Covers: contacts, companies, deals, projects, tasks,
--         pipeline_stages, project_stages, team_members,
--         quotes, email, e-commerce, audit, soft-deletes
-- =====================================================

-- Enable UUID extension (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. CORE CRM TABLES
-- =====================================================

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT 'My Company',
  company_logo TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
  address TEXT,
  phone TEXT,
  email TEXT,
  terms_conditions TEXT,
  payment_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_value NUMERIC(10,2),
  status TEXT DEFAULT 'Lead',
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(10,2),
  status TEXT DEFAULT 'Lead',
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pipeline Stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'active',
  color TEXT DEFAULT '#3B82F6',
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Stages
CREATE TABLE IF NOT EXISTS project_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'Sales Rep',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  stage TEXT DEFAULT 'Unassigned',
  priority TEXT DEFAULT 'Medium',
  assignee_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  subtask_total INTEGER DEFAULT 0,
  subtask_completed INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  checklist JSONB DEFAULT '[]'::jsonb,
  attachment_count INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  quote_date DATE NOT NULL,
  expiry_date DATE,
  status TEXT DEFAULT 'Draft',
  subtotal NUMERIC(10,2) DEFAULT 0,
  tax NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  grand_total NUMERIC(10,2) DEFAULT 0,
  status_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quote Line Items
CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_service TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  price NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT DEFAULT 'Scheduled',
  duration INTEGER DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  usage_guidelines TEXT,
  is_favorite BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachment Comments
CREATE TABLE IF NOT EXISTS attachment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID REFERENCES attachments(id) ON DELETE CASCADE,
  author_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. JUNCTION TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS collection_assets (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection_id, asset_id)
);

CREATE TABLE IF NOT EXISTS contact_tags (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS deal_tags (
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (deal_id, tag_id)
);

CREATE TABLE IF NOT EXISTS asset_tags (
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (asset_id, tag_id)
);

-- =====================================================
-- 3. EMAIL TABLES
-- =====================================================

-- Email Accounts
CREATE TABLE IF NOT EXISTS email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'smtp',
  label TEXT NOT NULL DEFAULT '',
  email_address TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  smtp_host TEXT DEFAULT '',
  smtp_port INTEGER DEFAULT 587,
  smtp_user TEXT DEFAULT '',
  smtp_pass TEXT DEFAULT '',
  smtp_secure BOOLEAN DEFAULT true,
  imap_host TEXT DEFAULT '',
  imap_port INTEGER DEFAULT 993,
  imap_secure BOOLEAN DEFAULT true,
  access_token TEXT DEFAULT '',
  refresh_token TEXT DEFAULT '',
  token_expires TIMESTAMPTZ,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Emails (full bidirectional message store)
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES email_accounts(id) ON DELETE SET NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  -- RFC 5322 standard headers
  message_id TEXT,                       -- RFC 5322 Message-ID for dedup
  in_reply_to TEXT,                      -- RFC 5322 In-Reply-To header
  thread_id TEXT,                        -- conversation grouping key
  -- Addressing
  from_address TEXT NOT NULL,
  from_name TEXT DEFAULT '',
  to_addresses JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_addresses JSONB DEFAULT '[]'::jsonb,
  bcc_addresses JSONB DEFAULT '[]'::jsonb,
  reply_to TEXT DEFAULT '',
  -- Content
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  snippet TEXT DEFAULT '',               -- plain-text preview (~200 chars)
  -- Classification
  status TEXT NOT NULL DEFAULT 'sent',   -- draft | queued | sent | received | failed
  category TEXT DEFAULT 'general',       -- general | order | support | marketing
  folder TEXT NOT NULL DEFAULT 'sent',   -- inbox | sent | drafts | trash | spam | archive
  -- Flags
  is_read BOOLEAN NOT NULL DEFAULT true,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  has_attachments BOOLEAN NOT NULL DEFAULT false,
  -- Metadata
  error_message TEXT DEFAULT '',
  external_id TEXT,                      -- provider UID (IMAP UID / Gmail ID)
  labels JSONB DEFAULT '[]'::jsonb,      -- arbitrary label strings
  -- Relations
  contact_id UUID,
  customer_id UUID,
  order_id UUID,
  deal_id UUID,
  -- Timestamps
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. E-COMMERCE TABLES
-- =====================================================

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  cover TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name TEXT DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stores
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  email TEXT DEFAULT '',
  gsm TEXT DEFAULT '',
  address TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Storefront hero customisation
  hero_image_url TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_badge_text TEXT,
  hero_cta_text TEXT,
  hero_cta_link TEXT,
  hero_rating_text TEXT,
  hero_typewriter_words JSONB DEFAULT '[]'::jsonb,
  hero_product_ids JSONB DEFAULT '[]'::jsonb,
  hero_banners JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  gender TEXT DEFAULT '',
  gsm TEXT DEFAULT '',
  email TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  address TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Couriers
CREATE TABLE IF NOT EXISTS couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  surname TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  gsm TEXT DEFAULT '',
  address TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  license_plate TEXT DEFAULT '',
  avatar_url TEXT,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  store_name TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Available',
  vehicle JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT DEFAULT '',
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  store_name TEXT DEFAULT '',
  courier_id UUID REFERENCES couriers(id) ON DELETE SET NULL,
  courier_name TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-increment order_number per user
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := COALESCE(
    (SELECT MAX(order_number) FROM orders WHERE user_id = NEW.user_id), 0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_order_number ON orders;
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- Order Products (junction)
CREATE TABLE IF NOT EXISTS order_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  product_name TEXT DEFAULT '',
  product_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  courier_id UUID REFERENCES couriers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT DEFAULT '',
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  star INTEGER NOT NULL DEFAULT 5 CHECK (star >= 1 AND star <= 5),
  text TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  department TEXT NOT NULL DEFAULT 'General',
  job_title TEXT DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT 'Full-time',
  status TEXT NOT NULL DEFAULT 'Active',
  start_date DATE DEFAULT CURRENT_DATE,
  salary NUMERIC(12,2) DEFAULT 0,
  avatar_url TEXT,
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. AUDIT & RBAC TABLES
-- =====================================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view', 'export')),
  old_values JSONB,
  new_values JSONB,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Invitations
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'sales_rep',
  team_id UUID,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record History
CREATE TABLE IF NOT EXISTS record_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update')),
  old_values JSONB,
  new_values JSONB,
  change_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. TRIGGERS (updated_at auto-update)
-- =====================================================

DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attachments_updated_at ON attachments;
CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON attachments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attachment_comments_updated_at ON attachment_comments;
CREATE TRIGGER update_attachment_comments_updated_at BEFORE UPDATE ON attachment_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pipeline_stages_updated_at ON pipeline_stages;
CREATE TRIGGER trg_pipeline_stages_updated_at BEFORE UPDATE ON pipeline_stages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_project_stages_updated_at ON project_stages;
CREATE TRIGGER trg_project_stages_updated_at BEFORE UPDATE ON project_stages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_email_accounts_updated_at ON email_accounts;
CREATE TRIGGER trg_email_accounts_updated_at BEFORE UPDATE ON email_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_email_templates_updated_at ON email_templates;
CREATE TRIGGER trg_email_templates_updated_at BEFORE UPDATE ON email_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_emails_updated_at ON emails;
CREATE TRIGGER trg_emails_updated_at BEFORE UPDATE ON emails
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Core CRM tables (user_id scoped)
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_history ENABLE ROW LEVEL SECURITY;

-- Email tables
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- E-commerce tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Junction tables
ALTER TABLE collection_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_tags ENABLE ROW LEVEL SECURITY;

-- ---- user_id-scoped tables: CRUD policies ----

-- Macro: for each simple user_id table, create SELECT/INSERT/UPDATE/DELETE
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tags','companies','company_settings','contacts','deals',
    'pipeline_stages','projects','project_stages','team_members',
    'tasks','quotes','activities','assets','collections',
    'comments','attachment_comments','audit_logs','record_history',
    'email_accounts','email_templates','emails',
    'categories','products','stores','customers','couriers',
    'orders','order_products','reviews','staff'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "crm_%s_select" ON %I', t, t);
    EXECUTE format('CREATE POLICY "crm_%s_select" ON %I FOR SELECT USING (auth.uid() = user_id)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "crm_%s_insert" ON %I', t, t);
    EXECUTE format('CREATE POLICY "crm_%s_insert" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "crm_%s_update" ON %I', t, t);
    EXECUTE format('CREATE POLICY "crm_%s_update" ON %I FOR UPDATE USING (auth.uid() = user_id)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "crm_%s_delete" ON %I', t, t);
    EXECUTE format('CREATE POLICY "crm_%s_delete" ON %I FOR DELETE USING (auth.uid() = user_id)', t, t);
  END LOOP;
END $$;

-- ---- user_invitations: uses invited_by instead of user_id ----
DROP POLICY IF EXISTS "crm_user_invitations_select" ON user_invitations;
CREATE POLICY "crm_user_invitations_select" ON user_invitations FOR SELECT USING (auth.uid() = invited_by);
DROP POLICY IF EXISTS "crm_user_invitations_insert" ON user_invitations;
CREATE POLICY "crm_user_invitations_insert" ON user_invitations FOR INSERT WITH CHECK (auth.uid() = invited_by);
DROP POLICY IF EXISTS "crm_user_invitations_update" ON user_invitations;
CREATE POLICY "crm_user_invitations_update" ON user_invitations FOR UPDATE USING (auth.uid() = invited_by);
DROP POLICY IF EXISTS "crm_user_invitations_delete" ON user_invitations;
CREATE POLICY "crm_user_invitations_delete" ON user_invitations FOR DELETE USING (auth.uid() = invited_by);

-- ---- Junction tables: access through parent record ----

-- contact_tags
DROP POLICY IF EXISTS "crm_contact_tags_all" ON contact_tags;
CREATE POLICY "crm_contact_tags_all" ON contact_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM contacts WHERE contacts.id = contact_tags.contact_id AND contacts.user_id = auth.uid()));

-- deal_tags
DROP POLICY IF EXISTS "crm_deal_tags_all" ON deal_tags;
CREATE POLICY "crm_deal_tags_all" ON deal_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM deals WHERE deals.id = deal_tags.deal_id AND deals.user_id = auth.uid()));

-- asset_tags
DROP POLICY IF EXISTS "crm_asset_tags_all" ON asset_tags;
CREATE POLICY "crm_asset_tags_all" ON asset_tags FOR ALL
  USING (EXISTS (SELECT 1 FROM assets WHERE assets.id = asset_tags.asset_id AND assets.user_id = auth.uid()));

-- collection_assets
DROP POLICY IF EXISTS "crm_collection_assets_all" ON collection_assets;
CREATE POLICY "crm_collection_assets_all" ON collection_assets FOR ALL
  USING (EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_assets.collection_id AND collections.user_id = auth.uid()));

-- quote_line_items
DROP POLICY IF EXISTS "crm_quote_line_items_select" ON quote_line_items;
CREATE POLICY "crm_quote_line_items_select" ON quote_line_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id AND quotes.user_id = auth.uid()));
DROP POLICY IF EXISTS "crm_quote_line_items_insert" ON quote_line_items;
CREATE POLICY "crm_quote_line_items_insert" ON quote_line_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id AND quotes.user_id = auth.uid()));
DROP POLICY IF EXISTS "crm_quote_line_items_update" ON quote_line_items;
CREATE POLICY "crm_quote_line_items_update" ON quote_line_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id AND quotes.user_id = auth.uid()));
DROP POLICY IF EXISTS "crm_quote_line_items_delete" ON quote_line_items;
CREATE POLICY "crm_quote_line_items_delete" ON quote_line_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id AND quotes.user_id = auth.uid()));

-- attachments (access through parent task)
DROP POLICY IF EXISTS "crm_attachments_select" ON attachments;
CREATE POLICY "crm_attachments_select" ON attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = attachments.task_id AND tasks.user_id = auth.uid()));
DROP POLICY IF EXISTS "crm_attachments_insert" ON attachments;
CREATE POLICY "crm_attachments_insert" ON attachments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = attachments.task_id AND tasks.user_id = auth.uid()));
DROP POLICY IF EXISTS "crm_attachments_update" ON attachments;
CREATE POLICY "crm_attachments_update" ON attachments FOR UPDATE
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = attachments.task_id AND tasks.user_id = auth.uid()));
DROP POLICY IF EXISTS "crm_attachments_delete" ON attachments;
CREATE POLICY "crm_attachments_delete" ON attachments FOR DELETE
  USING (EXISTS (SELECT 1 FROM tasks WHERE tasks.id = attachments.task_id AND tasks.user_id = auth.uid()));

-- ---- Public storefront read access (unauthenticated visitors) ----
-- Active stores are publicly readable so the storefront page can load without login.
DROP POLICY IF EXISTS "public_stores_select" ON stores;
CREATE POLICY "public_stores_select" ON stores FOR SELECT
  USING (is_active = true);

-- Active products are publicly readable for storefront display.
DROP POLICY IF EXISTS "public_products_select" ON products;
CREATE POLICY "public_products_select" ON products FOR SELECT
  USING (is_active = true);

-- Active categories are publicly readable for storefront filtering.
DROP POLICY IF EXISTS "public_categories_select" ON categories;
CREATE POLICY "public_categories_select" ON categories FOR SELECT
  USING (is_active = true);

-- Allow public visitors to insert customers (checkout creates a customer record).
DROP POLICY IF EXISTS "public_customers_insert" ON customers;
CREATE POLICY "public_customers_insert" ON customers FOR INSERT
  WITH CHECK (true);

-- Allow public visitors to insert orders (checkout creates an order).
DROP POLICY IF EXISTS "public_orders_insert" ON orders;
CREATE POLICY "public_orders_insert" ON orders FOR INSERT
  WITH CHECK (true);

-- Allow public visitors to insert order products (checkout creates line items).
DROP POLICY IF EXISTS "public_order_products_insert" ON order_products;
CREATE POLICY "public_order_products_insert" ON order_products FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 8. INDEXES
-- =====================================================

-- Core CRM
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_user ON pipeline_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_order ON pipeline_stages(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_user ON project_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_order ON project_stages(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_contact_id ON quotes(contact_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id ON quote_line_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachment_comments_attachment_id ON attachment_comments(attachment_id);
CREATE INDEX IF NOT EXISTS idx_attachment_comments_user_id ON attachment_comments(user_id);

-- Soft-delete indexes
CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON tags(deleted_at);
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);
CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deals_deleted_at ON deals(deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_activities_deleted_at ON activities(deleted_at);
CREATE INDEX IF NOT EXISTS idx_quotes_deleted_at ON quotes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON assets(deleted_at);

-- Email
CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_user ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(user_id, category);
CREATE INDEX IF NOT EXISTS idx_emails_user ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON emails(user_id, status);
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(user_id, category);
CREATE INDEX IF NOT EXISTS idx_emails_order ON emails(order_id);
CREATE INDEX IF NOT EXISTS idx_emails_contact ON emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_customer ON emails(customer_id);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(user_id, folder);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_emails_starred ON emails(user_id) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON emails(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_external_id ON emails(external_id) WHERE external_id IS NOT NULL;

-- E-commerce
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_couriers_user ON couriers(user_id);
CREATE INDEX IF NOT EXISTS idx_couriers_store ON couriers(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_order_products_order ON order_products(order_id);
CREATE INDEX IF NOT EXISTS idx_order_products_product ON order_products(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_courier ON reviews(courier_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_staff_user ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

-- Audit / RBAC
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_record_history_resource ON record_history(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_record_history_user_id ON record_history(user_id);

-- =====================================================
-- 9. IN-APP NOTIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  action_url TEXT,
  icon TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user ON in_app_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_unread ON in_app_notifications(user_id) WHERE read = false;

ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_in_app_notifications_select" ON in_app_notifications;
CREATE POLICY "crm_in_app_notifications_select" ON in_app_notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "crm_in_app_notifications_insert" ON in_app_notifications;
CREATE POLICY "crm_in_app_notifications_insert" ON in_app_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "crm_in_app_notifications_update" ON in_app_notifications;
CREATE POLICY "crm_in_app_notifications_update" ON in_app_notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "crm_in_app_notifications_delete" ON in_app_notifications;
CREATE POLICY "crm_in_app_notifications_delete" ON in_app_notifications FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- DONE – Reload PostgREST schema cache
-- =====================================================
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN NULL;
END $$;
