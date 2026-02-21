-- ============================================================
-- Website Builder (Webflow-like)
-- Phoxta CRM — Migration 006
-- ============================================================

-- ── Drop old tables (safe re-run) ──
DROP TABLE IF EXISTS website_interactions CASCADE;
DROP TABLE IF EXISTS website_collection_items CASCADE;
DROP TABLE IF EXISTS website_collection_fields CASCADE;
DROP TABLE IF EXISTS website_collections CASCADE;
DROP TABLE IF EXISTS website_elements CASCADE;
DROP TABLE IF EXISTS website_pages CASCADE;
DROP TABLE IF EXISTS website_breakpoints CASCADE;
DROP TABLE IF EXISTS website_global_styles CASCADE;
DROP TABLE IF EXISTS website_assets CASCADE;
DROP TABLE IF EXISTS website_sites CASCADE;

-- ── Sites (top-level project) ──
CREATE TABLE IF NOT EXISTS website_sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Untitled Site',
  slug            TEXT DEFAULT '',
  description     TEXT DEFAULT '',
  favicon_url     TEXT,
  og_image_url    TEXT,
  -- Global site settings
  default_font    TEXT DEFAULT 'Inter',
  color_primary   TEXT DEFAULT '#6366f1',
  color_secondary TEXT DEFAULT '#8b5cf6',
  color_accent    TEXT DEFAULT '#f59e0b',
  color_bg        TEXT DEFAULT '#ffffff',
  color_text      TEXT DEFAULT '#0f172a',
  custom_css      TEXT DEFAULT '',
  custom_head     TEXT DEFAULT '',       -- custom <head> code
  custom_body_end TEXT DEFAULT '',       -- custom code before </body>
  -- Publishing
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at    TIMESTAMPTZ,
  published_url   TEXT,
  custom_domain   TEXT,
  -- Meta
  thumbnail_url   TEXT,
  config          JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Pages ──
CREATE TABLE IF NOT EXISTS website_pages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID NOT NULL REFERENCES website_sites(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'Untitled Page',
  slug          TEXT NOT NULL DEFAULT '',
  path          TEXT NOT NULL DEFAULT '/',     -- full URL path
  title         TEXT DEFAULT '',               -- SEO <title>
  description   TEXT DEFAULT '',               -- meta description
  og_image      TEXT,
  is_homepage   BOOLEAN DEFAULT false,
  is_published  BOOLEAN DEFAULT true,
  sort_order    INT DEFAULT 0,
  -- Page-level overrides
  custom_css    TEXT DEFAULT '',
  custom_js     TEXT DEFAULT '',
  body_class    TEXT DEFAULT '',
  -- Layout
  page_width    TEXT DEFAULT '100%',
  -- Status
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Breakpoints (responsive) ──
CREATE TABLE IF NOT EXISTS website_breakpoints (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID NOT NULL REFERENCES website_sites(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label         TEXT NOT NULL DEFAULT 'Desktop',
  min_width     INT,                            -- media query min-width
  max_width     INT,                            -- media query max-width
  is_base       BOOLEAN DEFAULT false,          -- default breakpoint (no query)
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Elements (the DOM tree) ──
CREATE TABLE IF NOT EXISTS website_elements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES website_elements(id) ON DELETE CASCADE,
  -- Element identity
  tag             TEXT NOT NULL DEFAULT 'div',  -- HTML tag: div, section, h1, p, img, a, form, input, video, nav, footer, etc.
  element_type    TEXT NOT NULL DEFAULT 'container' CHECK (element_type IN (
    'container','section','heading','paragraph','text_block','rich_text',
    'image','video','link','button','icon','list','list_item',
    'form','input','textarea','select','checkbox','radio',
    'nav','navbar','footer','header','hero','grid','columns',
    'embed','html_embed','map','divider','spacer','collection_list',
    'tabs','accordion','slider','lightbox','dropdown','modal',
    'symbol'  -- reusable component
  )),
  -- Content
  text_content    TEXT DEFAULT '',
  inner_html      TEXT DEFAULT '',              -- for html_embed / rich_text
  src             TEXT,                          -- image/video src
  href            TEXT,                          -- link target
  alt_text        TEXT DEFAULT '',
  -- Tree position
  sort_order      INT DEFAULT 0,
  depth           INT DEFAULT 0,
  -- Base styles (JSON — CSS properties as key/value)
  styles          JSONB DEFAULT '{}',
  -- Responsive style overrides per breakpoint: { breakpointId: { ...cssProps } }
  responsive_styles JSONB DEFAULT '{}',
  -- State styles: { hover: {...}, focus: {...}, active: {...}, visited: {...} }
  state_styles    JSONB DEFAULT '{}',
  -- Layout
  display         TEXT DEFAULT 'block',
  position        TEXT DEFAULT 'static',
  flex_direction  TEXT,
  flex_wrap       TEXT,
  justify_content TEXT,
  align_items     TEXT,
  gap             TEXT,
  grid_template   TEXT,
  -- Sizing
  width           TEXT,
  height          TEXT,
  min_width       TEXT,
  max_width       TEXT,
  min_height      TEXT,
  max_height      TEXT,
  -- Spacing
  margin_top      TEXT,
  margin_right    TEXT,
  margin_bottom   TEXT,
  margin_left     TEXT,
  padding_top     TEXT,
  padding_right   TEXT,
  padding_bottom  TEXT,
  padding_left    TEXT,
  -- Typography
  font_family     TEXT,
  font_size       TEXT,
  font_weight     TEXT,
  line_height     TEXT,
  letter_spacing  TEXT,
  text_align      TEXT,
  text_decoration TEXT,
  text_transform  TEXT,
  color           TEXT,
  -- Background
  background_color TEXT,
  background_image TEXT,
  background_size  TEXT,
  background_position TEXT,
  background_repeat TEXT,
  -- Border
  border_width    TEXT,
  border_style    TEXT,
  border_color    TEXT,
  border_radius   TEXT,
  -- Effects
  opacity         TEXT,
  box_shadow      TEXT,
  overflow        TEXT,
  z_index         INT,
  cursor          TEXT,
  transition      TEXT,
  transform       TEXT,
  filter          TEXT,
  backdrop_filter TEXT,
  -- Visibility & classes
  css_classes     TEXT[] DEFAULT '{}',
  custom_attributes JSONB DEFAULT '{}',         -- data-*, aria-*, etc.
  is_visible      BOOLEAN DEFAULT true,
  is_locked       BOOLEAN DEFAULT false,
  label           TEXT,                          -- user-defined name in tree
  -- CMS binding
  collection_id   UUID,                          -- FK set after collections created
  collection_field TEXT,                          -- field key bound to this element
  -- Symbol (reusable component)
  symbol_id       UUID REFERENCES website_elements(id) ON DELETE SET NULL,
  is_symbol_master BOOLEAN DEFAULT false,
  -- Meta
  config          JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Global Styles (reusable CSS classes) ──
CREATE TABLE IF NOT EXISTS website_global_styles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID NOT NULL REFERENCES website_sites(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                   -- class name: e.g. 'heading-xl'
  tag           TEXT,                            -- associated tag: h1, p, a…
  styles        JSONB DEFAULT '{}',              -- CSS properties
  responsive_styles JSONB DEFAULT '{}',
  state_styles  JSONB DEFAULT '{}',
  is_tag_default BOOLEAN DEFAULT false,          -- auto-apply to all matching tags
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Assets (images, fonts, files) ──
CREATE TABLE IF NOT EXISTS website_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID NOT NULL REFERENCES website_sites(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  url           TEXT NOT NULL,
  file_type     TEXT DEFAULT '',                 -- image/png, font/woff2, etc.
  file_size     INT DEFAULT 0,
  width         INT,
  height        INT,
  alt_text      TEXT DEFAULT '',
  folder        TEXT DEFAULT 'general',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── CMS Collections (dynamic content) ──
CREATE TABLE IF NOT EXISTS website_collections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID NOT NULL REFERENCES website_sites(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL DEFAULT '',
  description   TEXT DEFAULT '',
  -- Template page for collection items (detail page)
  template_page_id UUID REFERENCES website_pages(id) ON DELETE SET NULL,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Collection Fields (schema definition) ──
CREATE TABLE IF NOT EXISTS website_collection_fields (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   UUID NOT NULL REFERENCES website_collections(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL DEFAULT '',
  field_type      TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN (
    'text','rich_text','number','boolean','date','datetime',
    'image','file','video','url','email','phone','color',
    'select','multi_select','reference','json'
  )),
  is_required     BOOLEAN DEFAULT false,
  is_primary      BOOLEAN DEFAULT false,         -- display field in lists
  default_value   TEXT,
  options         JSONB DEFAULT '[]',             -- for select/multi_select
  validation      JSONB DEFAULT '{}',             -- min/max/regex etc.
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Collection Items (CMS entries) ──
CREATE TABLE IF NOT EXISTS website_collection_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id   UUID NOT NULL REFERENCES website_collections(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug            TEXT DEFAULT '',
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  data            JSONB DEFAULT '{}',             -- field values { fieldSlug: value }
  published_at    TIMESTAMPTZ,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Interactions (animations) ──
CREATE TABLE IF NOT EXISTS website_interactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id         UUID NOT NULL REFERENCES website_sites(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  element_id      UUID REFERENCES website_elements(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT '',
  -- Trigger
  trigger_type    TEXT NOT NULL DEFAULT 'click' CHECK (trigger_type IN (
    'click','hover','scroll_into_view','scroll_position',
    'page_load','page_scroll','mouse_move','tab_change',
    'navbar_open','dropdown_open','class_change',
    'timed_delay'
  )),
  trigger_config  JSONB DEFAULT '{}',            -- offset, delay, threshold, etc.
  -- Animation timeline
  actions         JSONB DEFAULT '[]',            -- array of animation steps:
  -- [{
  --   target: elementId | 'self' | 'children' | 'siblings',
  --   property: 'opacity' | 'transform' | 'width' | 'height' | 'color' | ...,
  --   from: value,
  --   to: value,
  --   duration: ms,
  --   delay: ms,
  --   easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'cubic-bezier(...)' ,
  --   loop: boolean,
  --   yoyo: boolean,
  -- }]
  is_active       BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Add FK for elements → collections (deferred to avoid circular dependency)
ALTER TABLE website_elements
  ADD CONSTRAINT fk_elements_collection
  FOREIGN KEY (collection_id) REFERENCES website_collections(id) ON DELETE SET NULL;

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_ws_user         ON website_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_ws_status       ON website_sites(user_id, status);
CREATE INDEX IF NOT EXISTS idx_wp_site         ON website_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_wp_user         ON website_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_wp_slug         ON website_pages(site_id, slug);
CREATE INDEX IF NOT EXISTS idx_wb_site         ON website_breakpoints(site_id);
CREATE INDEX IF NOT EXISTS idx_we_page         ON website_elements(page_id);
CREATE INDEX IF NOT EXISTS idx_we_parent       ON website_elements(parent_id);
CREATE INDEX IF NOT EXISTS idx_we_user         ON website_elements(user_id);
CREATE INDEX IF NOT EXISTS idx_we_type         ON website_elements(element_type);
CREATE INDEX IF NOT EXISTS idx_we_symbol       ON website_elements(symbol_id) WHERE symbol_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wgs_site        ON website_global_styles(site_id);
CREATE INDEX IF NOT EXISTS idx_wa_site         ON website_assets(site_id);
CREATE INDEX IF NOT EXISTS idx_wa_user         ON website_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_wc_site         ON website_collections(site_id);
CREATE INDEX IF NOT EXISTS idx_wcf_col         ON website_collection_fields(collection_id);
CREATE INDEX IF NOT EXISTS idx_wci_col         ON website_collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_wci_status      ON website_collection_items(collection_id, status);
CREATE INDEX IF NOT EXISTS idx_wi_site         ON website_interactions(site_id);
CREATE INDEX IF NOT EXISTS idx_wi_element      ON website_interactions(element_id);

-- ── RLS ──
ALTER TABLE website_sites              ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_pages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_breakpoints        ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_elements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_global_styles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_assets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_collections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_collection_fields  ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_collection_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_interactions       ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "user_website_sites"              ON website_sites             FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_website_pages"              ON website_pages             FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_website_breakpoints"        ON website_breakpoints       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_website_elements"           ON website_elements          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_website_global_styles"      ON website_global_styles     FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_website_assets"             ON website_assets            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_website_collections"        ON website_collections       FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_website_collection_fields"  ON website_collection_fields FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_website_collection_items"   ON website_collection_items  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_website_interactions"       ON website_interactions      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Service-role policies
CREATE POLICY "svc_website_sites"              ON website_sites             FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_website_pages"              ON website_pages             FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_website_breakpoints"        ON website_breakpoints       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_website_elements"           ON website_elements          FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_website_global_styles"      ON website_global_styles     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_website_assets"             ON website_assets            FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_website_collections"        ON website_collections       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_website_collection_fields"  ON website_collection_fields FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_website_collection_items"   ON website_collection_items  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "svc_website_interactions"       ON website_interactions      FOR ALL USING (auth.role() = 'service_role');

-- ── Triggers ──
CREATE OR REPLACE FUNCTION trg_website_sites_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER website_sites_updated BEFORE UPDATE ON website_sites FOR EACH ROW EXECUTE FUNCTION trg_website_sites_updated();

CREATE OR REPLACE FUNCTION trg_website_pages_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER website_pages_updated BEFORE UPDATE ON website_pages FOR EACH ROW EXECUTE FUNCTION trg_website_pages_updated();

CREATE OR REPLACE FUNCTION trg_website_elements_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER website_elements_updated BEFORE UPDATE ON website_elements FOR EACH ROW EXECUTE FUNCTION trg_website_elements_updated();

CREATE OR REPLACE FUNCTION trg_website_global_styles_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER website_global_styles_updated BEFORE UPDATE ON website_global_styles FOR EACH ROW EXECUTE FUNCTION trg_website_global_styles_updated();

CREATE OR REPLACE FUNCTION trg_website_collections_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER website_collections_updated BEFORE UPDATE ON website_collections FOR EACH ROW EXECUTE FUNCTION trg_website_collections_updated();

CREATE OR REPLACE FUNCTION trg_website_collection_items_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER website_collection_items_updated BEFORE UPDATE ON website_collection_items FOR EACH ROW EXECUTE FUNCTION trg_website_collection_items_updated();

CREATE OR REPLACE FUNCTION trg_website_interactions_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER website_interactions_updated BEFORE UPDATE ON website_interactions FOR EACH ROW EXECUTE FUNCTION trg_website_interactions_updated();

-- ── Seed default breakpoints (inserted per-site via trigger) ──
CREATE OR REPLACE FUNCTION trg_website_site_default_breakpoints()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO website_breakpoints (site_id, user_id, label, min_width, max_width, is_base, sort_order) VALUES
    (NEW.id, NEW.user_id, 'Desktop',  1280, NULL, true,  0),
    (NEW.id, NEW.user_id, 'Tablet',   768,  1279, false, 1),
    (NEW.id, NEW.user_id, 'Mobile L', 480,  767,  false, 2),
    (NEW.id, NEW.user_id, 'Mobile S', NULL, 479,  false, 3);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER website_site_default_breakpoints
  AFTER INSERT ON website_sites
  FOR EACH ROW EXECUTE FUNCTION trg_website_site_default_breakpoints();
