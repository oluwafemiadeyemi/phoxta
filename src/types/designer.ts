// ===========================================================================
// Graphics Designer – shared TypeScript types
// ===========================================================================

// ---------------------------------------------------------------------------
// Project & document
// ---------------------------------------------------------------------------
export interface DesignProject {
  id: string
  user_id: string
  name: string
  width: number
  height: number
  created_at: string
  updated_at: string
  deleted_at: string | null
  folder_id: string | null
  is_template: boolean
  template_source_id: string | null
  preview_url?: string | null
}

export interface DesignDocument {
  project_id: string
  current_version_id: string | null
  pages_count: number
  meta: Record<string, unknown>
}

export interface DesignPage {
  id: string
  project_id: string
  page_index: number
  width: number
  height: number
  background: PageBackground
  fabric_json_path: string | null
  preview_path: string | null
  // Client-only
  fabricJson?: Record<string, unknown> | null
  previewUrl?: string | null
}

export interface PageBackground {
  type: 'color' | 'image'
  value: string // hex color or image URL
}

// ---------------------------------------------------------------------------
// Layers & objects
// ---------------------------------------------------------------------------
export interface LayerInfo {
  id: string
  name: string
  type: string
  visible: boolean
  locked: boolean
  index: number
  groupId?: string | null
  children?: LayerInfo[]
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------
export interface DesignAsset {
  id: string
  user_id: string
  project_id: string | null
  type: AssetType
  name: string
  path: string
  meta: Record<string, unknown>
  created_at: string
  url?: string
}

export type AssetType = 'image' | 'svg' | 'font' | 'logo' | 'video'

// ---------------------------------------------------------------------------
// Brand kit
// ---------------------------------------------------------------------------
export interface DesignBrandKit {
  id: string
  user_id: string
  name: string
  colors: BrandColor[]
  fonts: BrandFont[]
  logos: BrandLogo[]
  created_at: string
  updated_at: string
}

export interface BrandColor {
  label: string
  hex: string
}

export interface BrandFont {
  family: string
  source: 'system' | 'google' | 'upload'
  url?: string
}

export interface BrandLogo {
  name: string
  path: string
  url?: string
}

// ---------------------------------------------------------------------------
// Collaboration
// ---------------------------------------------------------------------------
export type CollabRole = 'owner' | 'editor' | 'commenter' | 'viewer'

export interface DesignCollaborator {
  project_id: string
  user_id: string
  role: CollabRole
  created_at: string
  email?: string
}

export interface DesignComment {
  id: string
  project_id: string
  page_id: string | null
  object_id: string | null
  author_id: string
  body: string
  created_at: string
  resolved_at: string | null
  author_email?: string
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------
export interface DesignVersion {
  id: string
  project_id: string
  created_at: string
  created_by: string
  label: string | null
  document_json_path: string
  preview_paths: string[]
  previewUrls?: string[]
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
export type AuditAction =
  | 'project.create'
  | 'project.rename'
  | 'project.delete'
  | 'project.restore'
  | 'project.share'
  | 'project.export'
  | 'version.create'
  | 'version.restore'
  | 'comment.add'

export interface DesignAuditLog {
  id: string
  project_id: string
  actor_id: string
  action: AuditAction
  meta: Record<string, unknown>
  created_at: string
}

// ---------------------------------------------------------------------------
// Canvas presets
// ---------------------------------------------------------------------------
export interface CanvasPreset {
  label: string
  category: string
  width: number
  height: number
  icon: string
}

export const CANVAS_PRESETS: CanvasPreset[] = [
  { label: 'Instagram Post', category: 'Social Media', width: 1080, height: 1080, icon: '📷' },
  { label: 'Instagram Story', category: 'Social Media', width: 1080, height: 1920, icon: '📱' },
  { label: 'Facebook Post', category: 'Social Media', width: 1200, height: 630, icon: '👤' },
  { label: 'Twitter/X Post', category: 'Social Media', width: 1600, height: 900, icon: '🐦' },
  { label: 'YouTube Thumbnail', category: 'Video', width: 1280, height: 720, icon: '🎬' },
  { label: 'LinkedIn Banner', category: 'Social Media', width: 1584, height: 396, icon: '💼' },
  { label: 'Logo (Square)', category: 'Marketing', width: 500, height: 500, icon: '🎨' },
  { label: 'Presentation 16:9', category: 'Documents', width: 1920, height: 1080, icon: '📊' },
  { label: 'A4 Document', category: 'Print', width: 2480, height: 3508, icon: '📄' },
  { label: 'Business Card', category: 'Print', width: 1050, height: 600, icon: '💳' },
  { label: 'Poster 18×24', category: 'Print', width: 5400, height: 7200, icon: '🪧' },
  { label: 'Custom', category: 'Custom', width: 1080, height: 1080, icon: '✏️' },
]

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------
export interface FontOption {
  family: string
  label: string
  category: 'sans-serif' | 'serif' | 'display' | 'handwriting' | 'monospace'
  weights: number[]
}

export const FONT_OPTIONS: FontOption[] = [
  { family: 'Inter', label: 'Inter', category: 'sans-serif', weights: [400, 500, 600, 700] },
  { family: 'Arial', label: 'Arial', category: 'sans-serif', weights: [400, 700] },
  { family: 'Helvetica', label: 'Helvetica', category: 'sans-serif', weights: [400, 700] },
  { family: 'Georgia', label: 'Georgia', category: 'serif', weights: [400, 700] },
  { family: 'Times New Roman', label: 'Times New Roman', category: 'serif', weights: [400, 700] },
  { family: 'Courier New', label: 'Courier New', category: 'monospace', weights: [400, 700] },
  { family: 'Impact', label: 'Impact', category: 'display', weights: [400] },
  { family: 'Verdana', label: 'Verdana', category: 'sans-serif', weights: [400, 700] },
  { family: 'Trebuchet MS', label: 'Trebuchet', category: 'sans-serif', weights: [400, 700] },
  { family: 'Palatino Linotype', label: 'Palatino', category: 'serif', weights: [400, 700] },
  { family: 'Garamond', label: 'Garamond', category: 'serif', weights: [400, 700] },
  { family: 'Comic Sans MS', label: 'Comic Sans', category: 'handwriting', weights: [400, 700] },
]

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------
export type ShapeType = 'rect' | 'circle' | 'triangle' | 'line' | 'polygon' | 'star'

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export type ExportFormat = 'png' | 'jpg' | 'svg' | 'pdf'

export interface ExportOptions {
  format: ExportFormat
  quality: number       // 0.1-1.0 for jpg
  dpi: number           // 72, 150, 300
  transparent: boolean
  pages: 'all' | 'current' | number[]
  bleed: number         // mm
  cropMarks: boolean
}

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------
export interface TextStylePreset {
  label: string
  fontSize: number
  fontWeight: string
  fontFamily: string
  letterSpacing: number
  lineHeight: number
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  { label: 'Title', fontSize: 64, fontWeight: 'bold', fontFamily: 'Inter', letterSpacing: -1, lineHeight: 1.1 },
  { label: 'Heading', fontSize: 48, fontWeight: 'bold', fontFamily: 'Inter', letterSpacing: 0, lineHeight: 1.2 },
  { label: 'Subheading', fontSize: 32, fontWeight: '600', fontFamily: 'Inter', letterSpacing: 0, lineHeight: 1.3 },
  { label: 'Body', fontSize: 18, fontWeight: 'normal', fontFamily: 'Inter', letterSpacing: 0, lineHeight: 1.6 },
  { label: 'Caption', fontSize: 14, fontWeight: 'normal', fontFamily: 'Inter', letterSpacing: 0.5, lineHeight: 1.4 },
  { label: 'Quote', fontSize: 24, fontWeight: '500', fontFamily: 'Georgia', letterSpacing: 0, lineHeight: 1.5 },
]

// ---------------------------------------------------------------------------
// Presence
// ---------------------------------------------------------------------------
export interface PresenceUser {
  userId: string
  email: string
  color: string
  cursor: { x: number; y: number } | null
  selectedObjectIds: string[]
  pageId: string | null
}

// ---------------------------------------------------------------------------
// CSV bulk create
// ---------------------------------------------------------------------------
export interface CsvMapping {
  column: string
  objectName: string // matches a named object on the canvas
}
