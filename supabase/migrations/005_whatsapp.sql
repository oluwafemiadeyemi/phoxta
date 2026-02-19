-- ============================================================
-- Messaging Integration – Supabase migration
-- Covers: config, conversations, messages, templates,
--         automations, quick replies + RLS
-- Supports channels: web_chat (storefront), whatsapp, email
-- ============================================================

-- 1) Messaging config per user/store
CREATE TABLE IF NOT EXISTS messaging_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  -- Enabled channels
  channels_enabled TEXT[] DEFAULT ARRAY['web_chat']::TEXT[],
  -- WhatsApp Cloud API credentials (optional – only if whatsapp channel enabled)
  wa_phone_number_id TEXT NOT NULL DEFAULT '',
  wa_business_account_id TEXT NOT NULL DEFAULT '',
  wa_access_token TEXT NOT NULL DEFAULT '',
  wa_verify_token TEXT NOT NULL DEFAULT '',
  wa_webhook_secret TEXT NOT NULL DEFAULT '',
  -- Display
  display_phone TEXT DEFAULT '',
  business_name TEXT DEFAULT '',
  -- Web chat settings
  chat_widget_enabled BOOLEAN NOT NULL DEFAULT true,
  chat_widget_title TEXT DEFAULT 'Chat with us',
  chat_widget_subtitle TEXT DEFAULT 'We usually reply within minutes',
  chat_widget_color TEXT DEFAULT '#16a34a',
  chat_widget_position TEXT DEFAULT 'bottom-right',
  chat_widget_greeting TEXT DEFAULT 'Hi there! 👋 How can we help you today?',
  -- AI automation settings
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  ai_greeting TEXT DEFAULT 'Hi! Thanks for reaching out. How can I help you today?',
  ai_persona TEXT DEFAULT 'You are a helpful customer service agent for an e-commerce store. Be friendly, concise, and professional.',
  ai_auto_reply_delay_ms INT DEFAULT 2000,
  ai_handle_orders BOOLEAN DEFAULT true,
  ai_handle_products BOOLEAN DEFAULT true,
  ai_handle_support BOOLEAN DEFAULT true,
  ai_escalation_keywords TEXT[] DEFAULT ARRAY['speak to human', 'real person', 'manager', 'complaint']::TEXT[],
  -- Notification preferences
  notify_new_message BOOLEAN DEFAULT true,
  notify_new_conversation BOOLEAN DEFAULT true,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_config_user ON messaging_config(user_id);
CREATE INDEX IF NOT EXISTS idx_msg_config_store ON messaging_config(store_id);
ALTER TABLE messaging_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_config_select" ON messaging_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msg_config_insert" ON messaging_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msg_config_update" ON messaging_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "msg_config_delete" ON messaging_config FOR DELETE USING (auth.uid() = user_id);

-- Public read policy for storefront chat widget to look up config by store_id
CREATE POLICY "msg_config_public_read" ON messaging_config
  FOR SELECT USING (
    chat_widget_enabled = true AND is_active = true
  );


-- 2) Conversations (one per customer per channel)
CREATE TABLE IF NOT EXISTS messaging_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES messaging_config(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  -- Channel: web_chat | whatsapp | email
  channel TEXT NOT NULL DEFAULT 'web_chat',
  -- Contact info
  contact_id TEXT NOT NULL DEFAULT '',      -- wa_id for whatsapp, session_id for web_chat
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  profile_pic_url TEXT DEFAULT '',
  -- Conversation state
  status TEXT NOT NULL DEFAULT 'open',     -- open | assigned | resolved | spam
  assigned_to TEXT DEFAULT '',             -- staff member name
  priority TEXT DEFAULT 'normal',          -- low | normal | high | urgent
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- AI state
  ai_handled BOOLEAN DEFAULT false,
  ai_escalated BOOLEAN DEFAULT false,
  ai_context JSONB DEFAULT '{}'::JSONB,
  -- Metadata
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT DEFAULT '',
  unread_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_conv_user ON messaging_conversations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_msg_conv_contact ON messaging_conversations(config_id, contact_id, channel);
CREATE INDEX IF NOT EXISTS idx_msg_conv_last_msg ON messaging_conversations(user_id, last_message_at DESC);
ALTER TABLE messaging_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_conv_select" ON messaging_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msg_conv_insert" ON messaging_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msg_conv_update" ON messaging_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "msg_conv_delete" ON messaging_conversations FOR DELETE USING (auth.uid() = user_id);


-- 3) Messages
CREATE TABLE IF NOT EXISTS messaging_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES messaging_conversations(id) ON DELETE CASCADE,
  -- Channel-specific external ID
  external_message_id TEXT DEFAULT '',     -- WhatsApp message ID, etc.
  channel TEXT NOT NULL DEFAULT 'web_chat',
  direction TEXT NOT NULL DEFAULT 'inbound', -- inbound | outbound
  message_type TEXT NOT NULL DEFAULT 'text', -- text | image | video | audio | document | template | interactive | location | reaction
  -- Content
  body TEXT DEFAULT '',
  media_url TEXT DEFAULT '',
  media_mime_type TEXT DEFAULT '',
  media_caption TEXT DEFAULT '',
  -- Template (for outbound template messages)
  template_name TEXT DEFAULT '',
  template_params JSONB DEFAULT '[]'::JSONB,
  -- Interactive (buttons / lists)
  interactive_data JSONB DEFAULT '{}'::JSONB,
  -- Location
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  location_name TEXT DEFAULT '',
  -- Status tracking (outbound)
  status TEXT DEFAULT 'pending',           -- pending | sent | delivered | read | failed
  error_message TEXT DEFAULT '',
  -- AI
  ai_generated BOOLEAN DEFAULT false,
  ai_confidence NUMERIC(3,2) DEFAULT 0,
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_msg_conv ON messaging_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msg_msg_user ON messaging_messages(user_id, created_at DESC);
ALTER TABLE messaging_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_msg_select" ON messaging_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msg_msg_insert" ON messaging_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msg_msg_update" ON messaging_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "msg_msg_delete" ON messaging_messages FOR DELETE USING (auth.uid() = user_id);


-- 4) Message templates
CREATE TABLE IF NOT EXISTS messaging_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES messaging_config(id) ON DELETE CASCADE,
  -- Template details
  name TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'UTILITY',          -- UTILITY | MARKETING | AUTHENTICATION
  language TEXT DEFAULT 'en',
  -- Content components
  header_type TEXT DEFAULT 'none',          -- none | text | image | video | document
  header_text TEXT DEFAULT '',
  header_media_url TEXT DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  footer_text TEXT DEFAULT '',
  -- Buttons
  buttons JSONB DEFAULT '[]'::JSONB,
  -- Meta approval status (WhatsApp-specific)
  meta_template_id TEXT DEFAULT '',
  approval_status TEXT DEFAULT 'draft',     -- draft | pending | approved | rejected
  rejection_reason TEXT DEFAULT '',
  -- Usage
  times_sent INT DEFAULT 0,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messaging_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_tpl_select" ON messaging_templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msg_tpl_insert" ON messaging_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msg_tpl_update" ON messaging_templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "msg_tpl_delete" ON messaging_templates FOR DELETE USING (auth.uid() = user_id);


-- 5) Quick replies (canned responses)
CREATE TABLE IF NOT EXISTS messaging_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL DEFAULT '',        -- e.g. "/greeting"
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'general',          -- general | sales | support | shipping
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messaging_quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_qr_select" ON messaging_quick_replies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msg_qr_insert" ON messaging_quick_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msg_qr_update" ON messaging_quick_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "msg_qr_delete" ON messaging_quick_replies FOR DELETE USING (auth.uid() = user_id);


-- 6) Automations (trigger-based flows)
CREATE TABLE IF NOT EXISTS messaging_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES messaging_config(id) ON DELETE CASCADE,
  -- Automation details
  name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  trigger_type TEXT NOT NULL DEFAULT 'keyword',
  -- keyword | new_conversation | order_status | abandoned_cart | post_purchase | scheduled
  trigger_value TEXT DEFAULT '',            -- keyword text, cron expression, etc.
  -- Action
  action_type TEXT NOT NULL DEFAULT 'send_template',
  -- send_template | send_text | ai_reply | assign_agent | add_tag | update_status
  action_config JSONB DEFAULT '{}'::JSONB,
  -- Conditions
  conditions JSONB DEFAULT '{}'::JSONB,
  -- Applicable channels (empty = all)
  channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  times_triggered INT DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messaging_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_auto_select" ON messaging_automations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msg_auto_insert" ON messaging_automations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msg_auto_update" ON messaging_automations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "msg_auto_delete" ON messaging_automations FOR DELETE USING (auth.uid() = user_id);


-- 7) Analytics aggregate (daily summaries)
CREATE TABLE IF NOT EXISTS messaging_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES messaging_config(id) ON DELETE CASCADE,
  channel TEXT DEFAULT 'all',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INT DEFAULT 0,
  messages_received INT DEFAULT 0,
  messages_delivered INT DEFAULT 0,
  messages_read INT DEFAULT 0,
  messages_failed INT DEFAULT 0,
  conversations_opened INT DEFAULT 0,
  conversations_resolved INT DEFAULT 0,
  ai_messages_sent INT DEFAULT 0,
  avg_response_time_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(config_id, channel, date)
);

ALTER TABLE messaging_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_analytics_select" ON messaging_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "msg_analytics_insert" ON messaging_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "msg_analytics_update" ON messaging_analytics FOR UPDATE USING (auth.uid() = user_id);
