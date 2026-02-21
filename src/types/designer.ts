/* ─────────────────────────────────────────────────────────────────────────────
   Designer – shared type definitions
   ───────────────────────────────────────────────────────────────────────────── */

// ── Canvas presets ──────────────────────────────────────────────────────────
export interface CanvasPreset {
  label: string;
  width: number;
  height: number;
  category: "social" | "video" | "print" | "presentation" | "logo";
  icon: string; // lucide icon name
}

export const CANVAS_PRESETS: Record<string, CanvasPreset> = {
  instagramPost: {
    label: "Instagram Post",
    width: 1080,
    height: 1080,
    category: "social",
    icon: "Instagram",
  },
  instagramStory: {
    label: "Instagram Story",
    width: 1080,
    height: 1920,
    category: "social",
    icon: "Smartphone",
  },
  facebookPost: {
    label: "Facebook Post",
    width: 1200,
    height: 630,
    category: "social",
    icon: "Facebook",
  },
  twitterPost: {
    label: "Twitter / X Post",
    width: 1600,
    height: 900,
    category: "social",
    icon: "Twitter",
  },
  youtubeThumbnail: {
    label: "YouTube Thumbnail",
    width: 1280,
    height: 720,
    category: "video",
    icon: "Youtube",
  },
  linkedinBanner: {
    label: "LinkedIn Banner",
    width: 1584,
    height: 396,
    category: "social",
    icon: "Linkedin",
  },
  logo: {
    label: "Logo",
    width: 500,
    height: 500,
    category: "logo",
    icon: "Hexagon",
  },
  presentation: {
    label: "Presentation",
    width: 1920,
    height: 1080,
    category: "presentation",
    icon: "Presentation",
  },
  a4: {
    label: "A4 Document",
    width: 2480,
    height: 3508,
    category: "print",
    icon: "FileText",
  },
  businessCard: {
    label: "Business Card",
    width: 1050,
    height: 600,
    category: "print",
    icon: "CreditCard",
  },
  poster: {
    label: "Poster",
    width: 5400,
    height: 7200,
    category: "print",
    icon: "Image",
  },
} as const;

// ── Database row types (mirror Supabase tables) ─────────────────────────────
export interface DesignProject {
  id: string;
  user_id: string;
  name: string;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  folder_id: string | null;
  is_template: boolean;
  template_source_id: string | null;
}

export interface DesignDocument {
  project_id: string;
  current_version_id: string | null;
  pages_count: number;
  meta: Record<string, unknown>;
}

export interface PageBackground {
  type: "color" | "gradient" | "image";
  value: string;
}

export interface DesignPage {
  id: string;
  project_id: string;
  page_index: number;
  width: number;
  height: number;
  background: PageBackground;
  fabric_json_path: string | null;
  preview_path: string | null;
}

export interface DesignAsset {
  id: string;
  user_id: string;
  project_id: string | null;
  type: string;
  name: string;
  path: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface DesignVersion {
  id: string;
  project_id: string;
  created_at: string;
  created_by: string;
  label: string | null;
  document_json_path: string;
  preview_paths: string[];
}

// ── Editor-side types ───────────────────────────────────────────────────────

export type ToolMode =
  | "select"
  | "hand"
  | "text"
  | "shape"
  | "draw"
  | "eraser"
  | "crop";

export type ShapeKind =
  | "rectangle"
  | "circle"
  | "triangle"
  | "star"
  | "line"
  | "arrow"
  | "polygon";

export interface LayerInfo {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  groupId?: string;
}

export type PanelTab =
  | "templates"
  | "elements"
  | "text"
  | "uploads"
  | "images"
  | "brand"
  | "layers";

export type ExportFormat = "png" | "jpg" | "svg" | "pdf";

export interface ExportOptions {
  format: ExportFormat;
  quality: number; // 0-1 for jpg
  scale: number; // multiplier
  pages: number[]; // page indices to export
}

// ── Fabric.js custom serialisation keys ─────────────────────────────────────
export const FABRIC_CUSTOM_PROPS = [
  "id",
  "customName",
  "selectable",
  "visible",
  "groupId",
  "locked",
] as const;

// ── Template types ──────────────────────────────────────────────────────────
export interface BuiltinTemplate {
  id: string;
  name: string;
  category: string;
  presetKey: string; // key into CANVAS_PRESETS
  thumbnail?: string; // path or data-url
  fabricJson: object; // fabric canvas JSON
}

export type TemplateCategory =
  | "Social Media"
  | "Marketing"
  | "Video"
  | "Presentation"
  | "Print"
  | "Logo"
  | "Event"
  | "Business";
