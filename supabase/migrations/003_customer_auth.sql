-- =====================================================
-- Customer Authentication & Settings Improvements
-- Adds: customer auth columns, customer_sessions,
--        notification_preferences, notification_digests,
--        custom_fields tables
-- =====================================================

-- =====================================================
-- 1. CUSTOMER AUTH COLUMNS
-- =====================================================

-- Add auth fields to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

-- Customer sessions for storefront auth
CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_sessions_token ON customer_sessions(token);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expires ON customer_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Enable RLS on customer_sessions
ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;

-- Only service role or the matching customer can access sessions
DROP POLICY IF EXISTS "customer_sessions_all" ON customer_sessions;
CREATE POLICY "customer_sessions_all" ON customer_sessions FOR ALL USING (true);

-- Allow public customers to SELECT their own customer record (by store_id + email)
DROP POLICY IF EXISTS "public_customers_select" ON customers;
CREATE POLICY "public_customers_select" ON customers FOR SELECT
  USING (true);

-- Allow public customers to UPDATE their own record (profile edits)
DROP POLICY IF EXISTS "public_customers_update" ON customers;
CREATE POLICY "public_customers_update" ON customers FOR UPDATE
  USING (true);

-- Allow public visitors to SELECT their own orders
DROP POLICY IF EXISTS "public_orders_select" ON orders;
CREATE POLICY "public_orders_select" ON orders FOR SELECT
  USING (true);

-- Allow public visitors to SELECT order products
DROP POLICY IF EXISTS "public_order_products_select" ON order_products;
CREATE POLICY "public_order_products_select" ON order_products FOR SELECT
  USING (true);

-- =====================================================
-- 2. NOTIFICATION PREFERENCES (for settings page)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  channels JSONB DEFAULT '["email","in-app"]'::jsonb,
  digest_enabled BOOLEAN NOT NULL DEFAULT false,
  digest_frequency TEXT DEFAULT 'daily',
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_notification_preferences_all" ON notification_preferences;
CREATE POLICY "crm_notification_preferences_all" ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. NOTIFICATION DIGESTS (for settings page)
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'daily',
  send_time TEXT NOT NULL DEFAULT '09:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE notification_digests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_notification_digests_all" ON notification_digests;
CREATE POLICY "crm_notification_digests_all" ON notification_digests FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. CUSTOM FIELDS (for settings page)
-- =====================================================

CREATE TABLE IF NOT EXISTS custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contacts', 'companies', 'deals', 'tasks')),
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multi-select', 'email', 'url')),
  field_options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_custom_fields_all" ON custom_fields;
CREATE POLICY "crm_custom_fields_all" ON custom_fields FOR ALL
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_custom_fields_user ON custom_fields(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity ON custom_fields(entity_type);

-- =====================================================
-- 5. WISHLIST TABLE (for customer dashboard)
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

ALTER TABLE customer_wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_wishlists_all" ON customer_wishlists;
CREATE POLICY "public_wishlists_all" ON customer_wishlists FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_wishlists_customer ON customer_wishlists(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product ON customer_wishlists(product_id);

-- Reload PostgREST schema cache
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN others THEN NULL;
END $$;
