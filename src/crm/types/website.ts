// ─── Website Builder — Type Definitions ───

// ── Site ──
export type SiteStatus = "draft" | "published" | "archived";

export interface WebsiteSite {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  defaultFont: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBg: string;
  colorText: string;
  customCss: string;
  customHead: string;
  customBodyEnd: string;
  status: SiteStatus;
  publishedAt: string | null;
  publishedUrl: string | null;
  customDomain: string | null;
  thumbnailUrl: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Page ──
export type PageStatus = "draft" | "published" | "archived";

export interface WebsitePage {
  id: string;
  siteId: string;
  userId: string;
  name: string;
  slug: string;
  path: string;
  title: string;
  description: string;
  ogImage: string | null;
  isHomepage: boolean;
  isPublished: boolean;
  sortOrder: number;
  customCss: string;
  customJs: string;
  bodyClass: string;
  pageWidth: string;
  status: PageStatus;
  createdAt: string;
  updatedAt: string;
}

// ── Breakpoint ──
export interface WebsiteBreakpoint {
  id: string;
  siteId: string;
  userId: string;
  label: string;
  minWidth: number | null;
  maxWidth: number | null;
  isBase: boolean;
  sortOrder: number;
  createdAt: string;
}

// ── Element types ──
export type ElementType =
  | "container"
  | "section"
  | "heading"
  | "paragraph"
  | "text_block"
  | "rich_text"
  | "image"
  | "video"
  | "link"
  | "button"
  | "icon"
  | "list"
  | "list_item"
  | "form"
  | "input"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "nav"
  | "navbar"
  | "footer"
  | "header"
  | "hero"
  | "grid"
  | "columns"
  | "embed"
  | "html_embed"
  | "map"
  | "divider"
  | "spacer"
  | "collection_list"
  | "tabs"
  | "accordion"
  | "slider"
  | "lightbox"
  | "dropdown"
  | "modal"
  | "symbol";

export interface CSSProperties {
  [key: string]: string | number | undefined;
}

export interface WebsiteElement {
  id: string;
  pageId: string;
  userId: string;
  parentId: string | null;
  tag: string;
  elementType: ElementType;
  textContent: string;
  innerHTML: string;
  src: string | null;
  href: string | null;
  altText: string;
  sortOrder: number;
  depth: number;
  // Styles
  styles: CSSProperties;
  responsiveStyles: Record<string, CSSProperties>;
  stateStyles: Record<string, CSSProperties>;
  // Layout
  display: string | null;
  position: string | null;
  flexDirection: string | null;
  flexWrap: string | null;
  justifyContent: string | null;
  alignItems: string | null;
  gap: string | null;
  gridTemplate: string | null;
  // Sizing
  width: string | null;
  height: string | null;
  minWidth: string | null;
  maxWidth: string | null;
  minHeight: string | null;
  maxHeight: string | null;
  // Spacing
  marginTop: string | null;
  marginRight: string | null;
  marginBottom: string | null;
  marginLeft: string | null;
  paddingTop: string | null;
  paddingRight: string | null;
  paddingBottom: string | null;
  paddingLeft: string | null;
  // Typography
  fontFamily: string | null;
  fontSize: string | null;
  fontWeight: string | null;
  lineHeight: string | null;
  letterSpacing: string | null;
  textAlign: string | null;
  textDecoration: string | null;
  textTransform: string | null;
  color: string | null;
  // Background
  backgroundColor: string | null;
  backgroundImage: string | null;
  backgroundSize: string | null;
  backgroundPosition: string | null;
  backgroundRepeat: string | null;
  // Border
  borderWidth: string | null;
  borderStyle: string | null;
  borderColor: string | null;
  borderRadius: string | null;
  // Effects
  opacity: string | null;
  boxShadow: string | null;
  overflow: string | null;
  zIndex: number | null;
  cursor: string | null;
  transition: string | null;
  transform: string | null;
  filter: string | null;
  backdropFilter: string | null;
  // Visibility
  cssClasses: string[];
  customAttributes: Record<string, string>;
  isVisible: boolean;
  isLocked: boolean;
  label: string | null;
  // CMS binding
  collectionId: string | null;
  collectionField: string | null;
  // Symbol
  symbolId: string | null;
  isSymbolMaster: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Runtime (not stored in DB)
  children?: WebsiteElement[];
}

// ── Global Styles ──
export interface WebsiteGlobalStyle {
  id: string;
  siteId: string;
  userId: string;
  name: string;
  tag: string | null;
  styles: CSSProperties;
  responsiveStyles: Record<string, CSSProperties>;
  stateStyles: Record<string, CSSProperties>;
  isTagDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ── Assets ──
export interface WebsiteAsset {
  id: string;
  siteId: string;
  userId: string;
  name: string;
  url: string;
  fileType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  altText: string;
  folder: string;
  createdAt: string;
}

// ── CMS Collections ──
export interface WebsiteCollection {
  id: string;
  siteId: string;
  userId: string;
  name: string;
  slug: string;
  description: string;
  templatePageId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  fields?: WebsiteCollectionField[];
}

export type CollectionFieldType =
  | "text"
  | "rich_text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "image"
  | "file"
  | "video"
  | "url"
  | "email"
  | "phone"
  | "color"
  | "select"
  | "multi_select"
  | "reference"
  | "json";

export interface WebsiteCollectionField {
  id: string;
  collectionId: string;
  userId: string;
  name: string;
  slug: string;
  fieldType: CollectionFieldType;
  isRequired: boolean;
  isPrimary: boolean;
  defaultValue: string | null;
  options: unknown[];
  validation: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
}

export type CollectionItemStatus = "draft" | "published" | "archived";

export interface WebsiteCollectionItem {
  id: string;
  collectionId: string;
  userId: string;
  slug: string;
  status: CollectionItemStatus;
  data: Record<string, unknown>;
  publishedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ── Interactions ──
export type InteractionTrigger =
  | "click"
  | "hover"
  | "scroll_into_view"
  | "scroll_position"
  | "page_load"
  | "page_scroll"
  | "mouse_move"
  | "tab_change"
  | "navbar_open"
  | "dropdown_open"
  | "class_change"
  | "timed_delay";

export interface InteractionAction {
  target: string;        // elementId, 'self', 'children', 'siblings'
  property: string;      // CSS property or 'opacity', 'transform', etc.
  from: string | number;
  to: string | number;
  duration: number;      // ms
  delay: number;         // ms
  easing: string;
  loop?: boolean;
  yoyo?: boolean;
}

export interface WebsiteInteraction {
  id: string;
  siteId: string;
  userId: string;
  elementId: string | null;
  name: string;
  triggerType: InteractionTrigger;
  triggerConfig: Record<string, unknown>;
  actions: InteractionAction[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ── Element palette (drag-and-drop toolbox) ──
export interface ElementPaletteItem {
  type: ElementType;
  label: string;
  icon: string; // lucide icon name
  tag: string;
  category: "layout" | "basic" | "typography" | "media" | "forms" | "components" | "advanced";
  defaultStyles?: CSSProperties;
  defaultChildren?: Partial<ElementPaletteItem>[];
}

export const ELEMENT_PALETTE: ElementPaletteItem[] = [
  // Layout
  { type: "container", label: "Container", icon: "Square", tag: "div", category: "layout", defaultStyles: { padding: "20px" } },
  { type: "section", label: "Section", icon: "Rows3", tag: "section", category: "layout", defaultStyles: { padding: "60px 20px", width: "100%" } },
  { type: "columns", label: "Columns", icon: "Columns3", tag: "div", category: "layout", defaultStyles: { display: "flex", gap: "20px" } },
  { type: "grid", label: "Grid", icon: "Grid3x3", tag: "div", category: "layout", defaultStyles: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" } },
  { type: "hero", label: "Hero", icon: "Maximize2", tag: "section", category: "layout", defaultStyles: { padding: "80px 20px", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" } },
  { type: "header", label: "Header", icon: "PanelTop", tag: "header", category: "layout", defaultStyles: { padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" } },
  { type: "navbar", label: "Navbar", icon: "Menu", tag: "nav", category: "layout", defaultStyles: { display: "flex", alignItems: "center", gap: "24px" } },
  { type: "footer", label: "Footer", icon: "PanelBottom", tag: "footer", category: "layout", defaultStyles: { padding: "40px 20px" } },
  { type: "divider", label: "Divider", icon: "Minus", tag: "hr", category: "layout", defaultStyles: { borderTop: "1px solid #e2e8f0", margin: "24px 0" } },
  { type: "spacer", label: "Spacer", icon: "MoveVertical", tag: "div", category: "layout", defaultStyles: { height: "40px" } },

  // Basic
  { type: "heading", label: "Heading", icon: "Heading", tag: "h2", category: "typography", defaultStyles: { fontSize: "32px", fontWeight: "700", lineHeight: "1.2" } },
  { type: "paragraph", label: "Paragraph", icon: "AlignLeft", tag: "p", category: "typography", defaultStyles: { fontSize: "16px", lineHeight: "1.6" } },
  { type: "text_block", label: "Text Block", icon: "Type", tag: "div", category: "typography", defaultStyles: { fontSize: "16px" } },
  { type: "rich_text", label: "Rich Text", icon: "FileText", tag: "div", category: "typography" },
  { type: "link", label: "Link", icon: "Link", tag: "a", category: "basic", defaultStyles: { color: "#6366f1", textDecoration: "underline" } },
  { type: "button", label: "Button", icon: "RectangleHorizontal", tag: "button", category: "basic", defaultStyles: { padding: "12px 24px", backgroundColor: "#6366f1", color: "#ffffff", borderRadius: "8px", fontWeight: "500", cursor: "pointer", border: "none" } },
  { type: "list", label: "List", icon: "List", tag: "ul", category: "basic" },
  { type: "list_item", label: "List Item", icon: "ListOrdered", tag: "li", category: "basic" },

  // Media
  { type: "image", label: "Image", icon: "Image", tag: "img", category: "media", defaultStyles: { maxWidth: "100%", height: "auto" } },
  { type: "video", label: "Video", icon: "Video", tag: "video", category: "media", defaultStyles: { width: "100%", aspectRatio: "16/9" } },
  { type: "icon", label: "Icon", icon: "Smile", tag: "span", category: "media" },
  { type: "map", label: "Map", icon: "MapPin", tag: "iframe", category: "media" },

  // Forms
  { type: "form", label: "Form", icon: "ClipboardList", tag: "form", category: "forms", defaultStyles: { display: "flex", flexDirection: "column", gap: "16px" } },
  { type: "input", label: "Input", icon: "TextCursor", tag: "input", category: "forms", defaultStyles: { padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "6px" } },
  { type: "textarea", label: "Textarea", icon: "AlignJustify", tag: "textarea", category: "forms", defaultStyles: { padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "6px", minHeight: "100px" } },
  { type: "select", label: "Select", icon: "ListFilter", tag: "select", category: "forms", defaultStyles: { padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "6px" } },
  { type: "checkbox", label: "Checkbox", icon: "CheckSquare", tag: "input", category: "forms" },
  { type: "radio", label: "Radio", icon: "Circle", tag: "input", category: "forms" },

  // Components
  { type: "tabs", label: "Tabs", icon: "LayoutList", tag: "div", category: "components" },
  { type: "accordion", label: "Accordion", icon: "ChevronsUpDown", tag: "div", category: "components" },
  { type: "slider", label: "Slider", icon: "GalleryHorizontal", tag: "div", category: "components" },
  { type: "lightbox", label: "Lightbox", icon: "Expand", tag: "div", category: "components" },
  { type: "dropdown", label: "Dropdown", icon: "ChevronDown", tag: "div", category: "components" },
  { type: "modal", label: "Modal", icon: "SquareStack", tag: "div", category: "components" },

  // Advanced
  { type: "embed", label: "Embed", icon: "Code", tag: "div", category: "advanced" },
  { type: "html_embed", label: "HTML Embed", icon: "Code2", tag: "div", category: "advanced" },
  { type: "collection_list", label: "Collection List", icon: "Database", tag: "div", category: "advanced" },
  { type: "symbol", label: "Symbol", icon: "Puzzle", tag: "div", category: "advanced" },
];

// ── CSS property groups for the styling panel ──
export const STYLE_SECTIONS = [
  {
    id: "layout",
    label: "Layout",
    properties: ["display", "position", "flexDirection", "flexWrap", "justifyContent", "alignItems", "gap", "gridTemplate"],
  },
  {
    id: "sizing",
    label: "Size",
    properties: ["width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "overflow"],
  },
  {
    id: "spacing",
    label: "Spacing",
    properties: ["marginTop", "marginRight", "marginBottom", "marginLeft", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"],
  },
  {
    id: "typography",
    label: "Typography",
    properties: ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign", "textDecoration", "textTransform", "color"],
  },
  {
    id: "background",
    label: "Backgrounds",
    properties: ["backgroundColor", "backgroundImage", "backgroundSize", "backgroundPosition", "backgroundRepeat"],
  },
  {
    id: "borders",
    label: "Borders",
    properties: ["borderWidth", "borderStyle", "borderColor", "borderRadius"],
  },
  {
    id: "effects",
    label: "Effects",
    properties: ["opacity", "boxShadow", "cursor", "transition", "transform", "filter", "backdropFilter", "zIndex"],
  },
] as const;

export const FONT_OPTIONS = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway",
  "Oswald", "Merriweather", "Playfair Display", "Source Code Pro", "DM Sans",
  "Nunito", "Work Sans", "Outfit", "Space Grotesk",
];

export const EASING_OPTIONS = [
  { label: "Linear", value: "linear" },
  { label: "Ease", value: "ease" },
  { label: "Ease In", value: "ease-in" },
  { label: "Ease Out", value: "ease-out" },
  { label: "Ease In Out", value: "ease-in-out" },
  { label: "Bounce", value: "cubic-bezier(0.68,-0.55,0.27,1.55)" },
  { label: "Elastic", value: "cubic-bezier(0.175,0.885,0.32,1.275)" },
];

export const DISPLAY_OPTIONS = ["block", "flex", "grid", "inline", "inline-block", "inline-flex", "none"];
export const POSITION_OPTIONS = ["static", "relative", "absolute", "fixed", "sticky"];
export const FLEX_DIRECTION_OPTIONS = ["row", "row-reverse", "column", "column-reverse"];
export const FLEX_WRAP_OPTIONS = ["nowrap", "wrap", "wrap-reverse"];
export const JUSTIFY_OPTIONS = ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"];
export const ALIGN_OPTIONS = ["flex-start", "flex-end", "center", "stretch", "baseline"];
export const TEXT_ALIGN_OPTIONS = ["left", "center", "right", "justify"];
export const FONT_WEIGHT_OPTIONS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];
export const TEXT_DECORATION_OPTIONS = ["none", "underline", "line-through", "overline"];
export const TEXT_TRANSFORM_OPTIONS = ["none", "uppercase", "lowercase", "capitalize"];
export const BORDER_STYLE_OPTIONS = ["none", "solid", "dashed", "dotted", "double", "groove", "ridge"];
export const OVERFLOW_OPTIONS = ["visible", "hidden", "scroll", "auto"];
export const CURSOR_OPTIONS = ["auto", "default", "pointer", "text", "move", "not-allowed", "crosshair", "grab"];
export const BG_SIZE_OPTIONS = ["cover", "contain", "auto", "100% 100%"];
export const BG_POSITION_OPTIONS = ["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"];
export const BG_REPEAT_OPTIONS = ["no-repeat", "repeat", "repeat-x", "repeat-y"];
