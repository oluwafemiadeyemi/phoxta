// ===========================================================================
// AI Design Generation — shared types
// ===========================================================================

// ---------------------------------------------------------------------------
// Layout styles — determines how content is arranged on each slide
// ---------------------------------------------------------------------------
export type LayoutStyle =
  | 'hero-image'       // Large image top/center, text below
  | 'split-left'       // Image left half, text right half
  | 'split-right'      // Text left half, image right half
  | 'text-overlay'     // Full-bleed image with text overlaid
  | 'text-only'        // Text-centered, no image (e.g. title/quote slides)
  | 'minimal'          // Small centered image, lots of whitespace
  | 'full-bleed'       // Image fills entire canvas, small text area

// ---------------------------------------------------------------------------
// What the LLM returns — structured content plan
// ---------------------------------------------------------------------------
export interface AIDesignPage {
  headline?: string
  subheadline?: string
  body?: string
  callToAction?: string
  imageQuery: string         // Search query for Pexels
  layoutStyle: LayoutStyle
  slideNumber: number        // 1-based
  slideLabel?: string        // e.g. "Title Slide", "Tip #1"
}

export interface AIDesignStyle {
  mood: string               // e.g. "fresh, vibrant, health"
  palette: string[]          // 3-5 hex colors [primary, secondary, accent, bg, text]
  fontHeading: string        // font family for headings
  fontBody: string           // font family for body text
}

export interface AIDesignPlan {
  title: string
  pages: AIDesignPage[]
  style: AIDesignStyle
  format: string             // echoed back from input
}

// ---------------------------------------------------------------------------
// API request / response
// ---------------------------------------------------------------------------
export interface AIDesignRequest {
  prompt: string
  format: string             // e.g. "instagram-post", "instagram-carousel"
  pageCount?: number         // for carousels
  designWidth: number
  designHeight: number
}

export interface AIDesignResponse {
  plan: AIDesignPlan
  pageSpecs: AIPageSpec[]    // ready-to-assemble object specs per page
}

// ---------------------------------------------------------------------------
// Layout engine output — positioned element specs
// ---------------------------------------------------------------------------
export type AIElementType = 'image' | 'textbox' | 'rect'

export interface AIElementSpec {
  type: AIElementType
  left: number
  top: number
  width: number
  height: number
  // Image
  src?: string
  // Text
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  fill?: string
  textAlign?: string
  lineHeight?: number
  // Rect (background shapes)
  rectFill?: string
  opacity?: number
  rx?: number  // corner radius
  ry?: number
}

export interface AIPageSpec {
  slideNumber: number
  backgroundColor: string
  elements: AIElementSpec[]
}
