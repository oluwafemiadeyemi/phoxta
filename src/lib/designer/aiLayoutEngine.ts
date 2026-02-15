// ===========================================================================
// AI Design — Layout Engine
//
// Converts an AIDesignPage + style + image URL into positioned element specs.
// Each layout function returns an array of AIElementSpec objects that can be
// directly assembled into Fabric.js objects on the canvas.
// ===========================================================================

import type {
  AIDesignPage,
  AIDesignStyle,
  AIElementSpec,
  AIPageSpec,
  LayoutStyle,
} from '@/types/aiDesign'

// ---------------------------------------------------------------------------
// Layout registry
// ---------------------------------------------------------------------------
type LayoutFn = (
  page: AIDesignPage,
  style: AIDesignStyle,
  imageUrl: string | null,
  dw: number,
  dh: number,
) => AIElementSpec[]

const layouts: Record<LayoutStyle, LayoutFn> = {
  'hero-image': layoutHeroImage,
  'split-left': layoutSplitLeft,
  'split-right': layoutSplitRight,
  'text-overlay': layoutTextOverlay,
  'text-only': layoutTextOnly,
  'minimal': layoutMinimal,
  'full-bleed': layoutFullBleed,
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Convert a design page plan into positioned element specs.
 */
export function generatePageSpec(
  page: AIDesignPage,
  style: AIDesignStyle,
  imageUrl: string | null,
  dw: number,
  dh: number,
): AIPageSpec {
  const layoutFn = layouts[page.layoutStyle] ?? layouts['hero-image']
  const elements = layoutFn(page, style, imageUrl, dw, dh)

  return {
    slideNumber: page.slideNumber,
    backgroundColor: style.palette[3] ?? '#ffffff', // bg color
    elements,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PAD = 0.06 // 6% padding ratio

function pad(dim: number): number {
  return Math.round(dim * PAD)
}

function textSpec(
  text: string,
  opts: Partial<AIElementSpec> & { left: number; top: number; width: number; height: number },
): AIElementSpec {
  return {
    type: 'textbox',
    text,
    fontSize: 24,
    fontFamily: 'Inter',
    fontWeight: 'normal',
    fill: '#1A1A1A',
    textAlign: 'left',
    lineHeight: 1.3,
    ...opts,
  }
}

function imageSpec(
  src: string,
  left: number,
  top: number,
  width: number,
  height: number,
): AIElementSpec {
  return { type: 'image', src, left, top, width, height }
}

function rectSpec(
  left: number,
  top: number,
  width: number,
  height: number,
  fill: string,
  opacity = 1,
  rx = 0,
): AIElementSpec {
  return { type: 'rect', left, top, width, height, rectFill: fill, opacity, rx, ry: rx }
}

// ---------------------------------------------------------------------------
// Layout: Hero Image — big image top, text bottom
// ---------------------------------------------------------------------------
function layoutHeroImage(
  page: AIDesignPage,
  style: AIDesignStyle,
  imageUrl: string | null,
  dw: number,
  dh: number,
): AIElementSpec[] {
  const p = pad(dw)
  const elements: AIElementSpec[] = []
  const imgH = Math.round(dh * 0.55)
  const textTop = imgH + p

  if (imageUrl) {
    elements.push(imageSpec(imageUrl, 0, 0, dw, imgH))
  }

  const textW = dw - p * 2

  if (page.headline) {
    const fontSize = dh > 1200 ? 56 : dh > 800 ? 48 : 36
    elements.push(textSpec(page.headline, {
      left: p, top: textTop, width: textW, height: fontSize * 2,
      fontSize, fontFamily: style.fontHeading, fontWeight: 'bold',
      fill: style.palette[4] ?? '#1A1A1A', textAlign: 'center',
    }))
  }

  if (page.subheadline) {
    const hOff = page.headline ? 90 : 0
    elements.push(textSpec(page.subheadline, {
      left: p, top: textTop + hOff, width: textW, height: 50,
      fontSize: dh > 1200 ? 24 : 20, fontFamily: style.fontBody,
      fill: style.palette[4] ?? '#666666', textAlign: 'center',
    }))
  }

  if (page.body) {
    const hOff = (page.headline ? 90 : 0) + (page.subheadline ? 50 : 0)
    elements.push(textSpec(page.body, {
      left: p, top: textTop + hOff, width: textW, height: 80,
      fontSize: dh > 1200 ? 20 : 16, fontFamily: style.fontBody,
      fill: style.palette[4] ?? '#666666', textAlign: 'center', lineHeight: 1.5,
    }))
  }

  if (page.callToAction) {
    // CTA pill
    const ctaW = Math.min(textW * 0.6, 320)
    const ctaH = 52
    const ctaLeft = (dw - ctaW) / 2
    const ctaTop = dh - p - ctaH - 10
    elements.push(rectSpec(ctaLeft, ctaTop, ctaW, ctaH, style.palette[0] ?? '#000000', 1, 26))
    elements.push(textSpec(page.callToAction, {
      left: ctaLeft, top: ctaTop + 12, width: ctaW, height: ctaH,
      fontSize: 18, fontFamily: style.fontBody, fontWeight: '600',
      fill: '#ffffff', textAlign: 'center',
    }))
  }

  return elements
}

// ---------------------------------------------------------------------------
// Layout: Split Left — image left, text right
// ---------------------------------------------------------------------------
function layoutSplitLeft(
  page: AIDesignPage,
  style: AIDesignStyle,
  imageUrl: string | null,
  dw: number,
  dh: number,
): AIElementSpec[] {
  const p = pad(dw)
  const elements: AIElementSpec[] = []
  const half = Math.round(dw * 0.48)

  if (imageUrl) {
    elements.push(imageSpec(imageUrl, 0, 0, half, dh))
  }

  const textLeft = half + p
  const textW = dw - half - p * 2
  let curY = Math.round(dh * 0.2)

  if (page.headline) {
    const fontSize = dh > 1200 ? 44 : 36
    elements.push(textSpec(page.headline, {
      left: textLeft, top: curY, width: textW, height: fontSize * 2.5,
      fontSize, fontFamily: style.fontHeading, fontWeight: 'bold',
      fill: style.palette[4] ?? '#1A1A1A',
    }))
    curY += fontSize * 2.5 + p
  }

  if (page.subheadline) {
    elements.push(textSpec(page.subheadline, {
      left: textLeft, top: curY, width: textW, height: 50,
      fontSize: 20, fontFamily: style.fontBody,
      fill: style.palette[0] ?? '#666',
    }))
    curY += 60
  }

  if (page.body) {
    elements.push(textSpec(page.body, {
      left: textLeft, top: curY, width: textW, height: 120,
      fontSize: 18, fontFamily: style.fontBody,
      fill: style.palette[4] ?? '#666', lineHeight: 1.6,
    }))
    curY += 130
  }

  if (page.callToAction) {
    elements.push(textSpec(page.callToAction, {
      left: textLeft, top: curY + 10, width: textW, height: 40,
      fontSize: 16, fontFamily: style.fontBody, fontWeight: '600',
      fill: style.palette[0] ?? '#000',
    }))
  }

  return elements
}

// ---------------------------------------------------------------------------
// Layout: Split Right — text left, image right
// ---------------------------------------------------------------------------
function layoutSplitRight(
  page: AIDesignPage,
  style: AIDesignStyle,
  imageUrl: string | null,
  dw: number,
  dh: number,
): AIElementSpec[] {
  const p = pad(dw)
  const elements: AIElementSpec[] = []
  const half = Math.round(dw * 0.48)
  const textW = dw - half - p * 2

  let curY = Math.round(dh * 0.2)

  if (page.headline) {
    const fontSize = dh > 1200 ? 44 : 36
    elements.push(textSpec(page.headline, {
      left: p, top: curY, width: textW, height: fontSize * 2.5,
      fontSize, fontFamily: style.fontHeading, fontWeight: 'bold',
      fill: style.palette[4] ?? '#1A1A1A',
    }))
    curY += fontSize * 2.5 + p
  }

  if (page.subheadline) {
    elements.push(textSpec(page.subheadline, {
      left: p, top: curY, width: textW, height: 50,
      fontSize: 20, fontFamily: style.fontBody,
      fill: style.palette[0] ?? '#666',
    }))
    curY += 60
  }

  if (page.body) {
    elements.push(textSpec(page.body, {
      left: p, top: curY, width: textW, height: 120,
      fontSize: 18, fontFamily: style.fontBody,
      fill: style.palette[4] ?? '#666', lineHeight: 1.6,
    }))
    curY += 130
  }

  if (page.callToAction) {
    elements.push(textSpec(page.callToAction, {
      left: p, top: curY + 10, width: textW, height: 40,
      fontSize: 16, fontFamily: style.fontBody, fontWeight: '600',
      fill: style.palette[0] ?? '#000',
    }))
  }

  if (imageUrl) {
    elements.push(imageSpec(imageUrl, dw - half, 0, half, dh))
  }

  return elements
}

// ---------------------------------------------------------------------------
// Layout: Text Overlay — full-bleed image with semi-transparent overlay + text
// ---------------------------------------------------------------------------
function layoutTextOverlay(
  page: AIDesignPage,
  style: AIDesignStyle,
  imageUrl: string | null,
  dw: number,
  dh: number,
): AIElementSpec[] {
  const p = pad(dw)
  const elements: AIElementSpec[] = []

  if (imageUrl) {
    elements.push(imageSpec(imageUrl, 0, 0, dw, dh))
  }

  // Dark overlay for text legibility
  elements.push(rectSpec(0, 0, dw, dh, '#000000', 0.45))

  const textW = dw - p * 4
  const centerX = (dw - textW) / 2
  let curY = Math.round(dh * 0.3)

  if (page.headline) {
    const fontSize = dh > 1200 ? 60 : dh > 800 ? 48 : 40
    elements.push(textSpec(page.headline, {
      left: centerX, top: curY, width: textW, height: fontSize * 2.5,
      fontSize, fontFamily: style.fontHeading, fontWeight: 'bold',
      fill: '#ffffff', textAlign: 'center',
    }))
    curY += fontSize * 2.5 + 20
  }

  if (page.subheadline) {
    elements.push(textSpec(page.subheadline, {
      left: centerX, top: curY, width: textW, height: 60,
      fontSize: 24, fontFamily: style.fontBody,
      fill: 'rgba(255,255,255,0.9)', textAlign: 'center',
    }))
    curY += 70
  }

  if (page.body) {
    elements.push(textSpec(page.body, {
      left: centerX, top: curY, width: textW, height: 100,
      fontSize: 20, fontFamily: style.fontBody,
      fill: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.6,
    }))
    curY += 110
  }

  if (page.callToAction) {
    const ctaW = Math.min(textW * 0.5, 280)
    const ctaH = 48
    const ctaLeft = (dw - ctaW) / 2
    elements.push(rectSpec(ctaLeft, curY + 20, ctaW, ctaH, style.palette[0] ?? '#ffffff', 1, 24))
    elements.push(textSpec(page.callToAction, {
      left: ctaLeft, top: curY + 30, width: ctaW, height: ctaH,
      fontSize: 17, fontFamily: style.fontBody, fontWeight: '600',
      fill: '#ffffff', textAlign: 'center',
    }))
  }

  return elements
}

// ---------------------------------------------------------------------------
// Layout: Text Only — centered text, no image
// ---------------------------------------------------------------------------
function layoutTextOnly(
  page: AIDesignPage,
  style: AIDesignStyle,
  _imageUrl: string | null,
  dw: number,
  dh: number,
): AIElementSpec[] {
  const p = pad(dw)
  const elements: AIElementSpec[] = []
  const textW = dw - p * 4
  const centerX = (dw - textW) / 2

  // Optional accent bar at top
  elements.push(rectSpec(centerX, Math.round(dh * 0.15), 60, 4, style.palette[0] ?? '#000'))

  let curY = Math.round(dh * 0.22)

  if (page.headline) {
    const fontSize = dh > 1200 ? 56 : dh > 800 ? 44 : 36
    elements.push(textSpec(page.headline, {
      left: centerX, top: curY, width: textW, height: fontSize * 3,
      fontSize, fontFamily: style.fontHeading, fontWeight: 'bold',
      fill: style.palette[4] ?? '#1A1A1A', textAlign: 'center',
    }))
    curY += fontSize * 3 + 20
  }

  if (page.subheadline) {
    elements.push(textSpec(page.subheadline, {
      left: centerX, top: curY, width: textW, height: 60,
      fontSize: 24, fontFamily: style.fontBody,
      fill: style.palette[1] ?? '#666', textAlign: 'center',
    }))
    curY += 70
  }

  if (page.body) {
    elements.push(textSpec(page.body, {
      left: centerX, top: curY, width: textW, height: 140,
      fontSize: 22, fontFamily: style.fontBody,
      fill: style.palette[4] ?? '#444', textAlign: 'center', lineHeight: 1.7,
    }))
    curY += 150
  }

  if (page.callToAction) {
    elements.push(textSpec(page.callToAction, {
      left: centerX, top: curY + 20, width: textW, height: 40,
      fontSize: 18, fontFamily: style.fontBody, fontWeight: '600',
      fill: style.palette[0] ?? '#000', textAlign: 'center',
    }))
  }

  return elements
}

// ---------------------------------------------------------------------------
// Layout: Minimal — small centered image, whitespace
// ---------------------------------------------------------------------------
function layoutMinimal(
  page: AIDesignPage,
  style: AIDesignStyle,
  imageUrl: string | null,
  dw: number,
  dh: number,
): AIElementSpec[] {
  const p = pad(dw)
  const elements: AIElementSpec[] = []
  const imgSize = Math.round(Math.min(dw, dh) * 0.35)

  if (imageUrl) {
    elements.push(imageSpec(
      imageUrl,
      (dw - imgSize) / 2,
      Math.round(dh * 0.12),
      imgSize,
      imgSize,
    ))
  }

  const textW = dw - p * 4
  const centerX = (dw - textW) / 2
  let curY = imageUrl ? Math.round(dh * 0.12) + imgSize + p * 2 : Math.round(dh * 0.25)

  if (page.headline) {
    const fontSize = dh > 1200 ? 40 : 32
    elements.push(textSpec(page.headline, {
      left: centerX, top: curY, width: textW, height: fontSize * 2.5,
      fontSize, fontFamily: style.fontHeading, fontWeight: 'bold',
      fill: style.palette[4] ?? '#1A1A1A', textAlign: 'center',
    }))
    curY += fontSize * 2.5 + 16
  }

  if (page.body) {
    elements.push(textSpec(page.body, {
      left: centerX, top: curY, width: textW, height: 100,
      fontSize: 18, fontFamily: style.fontBody,
      fill: style.palette[4] ?? '#666', textAlign: 'center', lineHeight: 1.6,
    }))
  }

  if (page.callToAction) {
    elements.push(textSpec(page.callToAction, {
      left: centerX, top: dh - p * 2 - 30, width: textW, height: 30,
      fontSize: 15, fontFamily: style.fontBody, fontWeight: '600',
      fill: style.palette[0] ?? '#000', textAlign: 'center',
    }))
  }

  return elements
}

// ---------------------------------------------------------------------------
// Layout: Full Bleed — image fills canvas, text bar at bottom
// ---------------------------------------------------------------------------
function layoutFullBleed(
  page: AIDesignPage,
  style: AIDesignStyle,
  imageUrl: string | null,
  dw: number,
  dh: number,
): AIElementSpec[] {
  const p = pad(dw)
  const elements: AIElementSpec[] = []

  if (imageUrl) {
    elements.push(imageSpec(imageUrl, 0, 0, dw, dh))
  }

  // Bottom gradient bar
  const barH = Math.round(dh * 0.28)
  elements.push(rectSpec(0, dh - barH, dw, barH, '#000000', 0.6))

  const textW = dw - p * 3
  const textLeft = p * 1.5
  let curY = dh - barH + p

  if (page.headline) {
    const fontSize = dh > 1200 ? 40 : 32
    elements.push(textSpec(page.headline, {
      left: textLeft, top: curY, width: textW, height: fontSize * 2,
      fontSize, fontFamily: style.fontHeading, fontWeight: 'bold',
      fill: '#ffffff',
    }))
    curY += fontSize * 2 + 8
  }

  if (page.body || page.subheadline) {
    const txt = page.body || page.subheadline || ''
    elements.push(textSpec(txt, {
      left: textLeft, top: curY, width: textW, height: 60,
      fontSize: 17, fontFamily: style.fontBody,
      fill: 'rgba(255,255,255,0.85)', lineHeight: 1.5,
    }))
  }

  if (page.callToAction) {
    elements.push(textSpec(page.callToAction, {
      left: textLeft, top: dh - p - 30, width: textW, height: 28,
      fontSize: 14, fontFamily: style.fontBody, fontWeight: '600',
      fill: style.palette[0] ?? '#fff',
    }))
  }

  return elements
}
