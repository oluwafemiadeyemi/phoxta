/**
 * HTML Template Engine — Xeno (Creative Agency)
 *
 * Injects AI-generated content into the Xeno HTML template.
 * Uses `data-phoxta` attributes for text and `data-phoxta-image` for images.
 * Supports nested keys like `products_0_title` → landingData.products[0].title
 *
 * Client-side only (uses DOMParser).
 */

import type { TemplateBusinessInfo } from './htmlTemplateEngine'

// ---------------------------------------------------------------------------
// Resolve a dot/underscore-separated key from landingData
// e.g. "products_0_title" → landingData.products[0].title
// ---------------------------------------------------------------------------
function resolveKey(data: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('_')
  let current: unknown = data

  for (const part of parts) {
    if (current == null) return undefined
    if (typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part]
    } else if (Array.isArray(current)) {
      const idx = parseInt(part, 10)
      if (isNaN(idx)) return undefined
      current = current[idx]
    } else {
      return undefined
    }
  }

  return current != null ? String(current) : undefined
}

// ---------------------------------------------------------------------------
// Resolve best available image
// ---------------------------------------------------------------------------
function resolveImage(
  generatedImages: Record<string, string>,
  keywords: string[],
  coverImage: string,
): string {
  for (const kw of keywords) {
    if (generatedImages[kw]) return generatedImages[kw]
  }
  // Fuzzy match
  const lower = keywords.map((k) => k.toLowerCase())
  for (const [key, url] of Object.entries(generatedImages)) {
    const keyLow = key.toLowerCase()
    if (lower.some((kw) => keyLow.includes(kw) || kw.includes(keyLow))) return url
  }
  return coverImage || ''
}

// ---------------------------------------------------------------------------
// Main injection function
// ---------------------------------------------------------------------------
export function injectContentIntoXeno(
  rawHtml: string,
  landingData: Record<string, unknown>,
  businessInfo: TemplateBusinessInfo | undefined,
  generatedImages: Record<string, string>,
  coverImage: string,
  baseUrl: string,
): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(rawHtml, 'text/html')

  // ---- Inject text content via data-phoxta attributes ----
  const textElements = doc.querySelectorAll('[data-phoxta]')
  textElements.forEach((el) => {
    const key = el.getAttribute('data-phoxta')
    if (!key) return
    const value = resolveKey(landingData, key)
    if (value) {
      // Preserve inner icon elements (e.g. <i class="far fa-angle-double-right">)
      const icon = el.querySelector('i')
      if (icon) {
        el.textContent = value
        el.appendChild(icon)
      } else {
        el.textContent = value
      }
    }
  })

  // ---- Inject images via data-phoxta-image attributes ----
  const imageElements = doc.querySelectorAll('[data-phoxta-image]')
  imageElements.forEach((el) => {
    const imageKey = el.getAttribute('data-phoxta-image')
    if (!imageKey) return
    const imgSrc = resolveImage(generatedImages, [imageKey], coverImage)
    if (imgSrc) {
      el.setAttribute('src', imgSrc)
    }
  })

  // ---- Apply color scheme ----
  const colorScheme = landingData.colorScheme as
    | { primary?: string; secondary?: string; accent?: string; background?: string; text?: string }
    | undefined
  if (colorScheme) {
    const style = doc.createElement('style')
    style.textContent = `
      :root {
        --xeno-primary: ${colorScheme.primary || '#6a4dfa'};
        --xeno-secondary: ${colorScheme.secondary || '#ff6b35'};
        --xeno-accent: ${colorScheme.accent || '#00c9a7'};
      }
      .theme-btn.style-one {
        background-color: ${colorScheme.primary || '#6a4dfa'} !important;
      }
      .theme-btn.style-one:hover {
        background-color: ${colorScheme.secondary || '#ff6b35'} !important;
      }
      .xeno-counter-ca {
        background-color: ${colorScheme.primary || '#1a1a2e'} !important;
      }
      .xeno-testimonial-ca {
        background-color: ${colorScheme.primary || '#1a1a2e'} !important;
      }
      .xeno-newsletter-ca {
        background-color: ${colorScheme.primary || '#1a1a2e'} !important;
      }
    `
    doc.head.appendChild(style)
  }

  // ---- Inject meta title and description ----
  const metaTitle = landingData.metaTitle as string | undefined
  const metaDescription = landingData.metaDescription as string | undefined
  if (metaTitle) {
    const titleEl = doc.querySelector('title')
    if (titleEl) titleEl.textContent = metaTitle
  }
  if (metaDescription) {
    let metaEl = doc.querySelector('meta[name="description"]')
    if (metaEl) {
      metaEl.setAttribute('content', metaDescription)
    }
  }

  // ---- Add inline editing support via contenteditable + postMessage ----
  const editScript = doc.createElement('script')
  editScript.textContent = `
    document.addEventListener('DOMContentLoaded', function() {
      // Make data-phoxta text elements editable
      document.querySelectorAll('[data-phoxta]').forEach(function(el) {
        if (el.tagName === 'IMG' || el.tagName === 'INPUT') return;
        el.setAttribute('contenteditable', 'true');
        el.style.cursor = 'text';
        el.style.outline = 'none';
        el.addEventListener('focus', function() {
          el.style.outline = '2px solid rgba(106, 77, 250, 0.5)';
          el.style.outlineOffset = '2px';
          el.style.borderRadius = '4px';
        });
        el.addEventListener('blur', function() {
          el.style.outline = 'none';
          var key = el.getAttribute('data-phoxta');
          var text = el.textContent || '';
          // Strip icon text
          var icon = el.querySelector('i');
          if (icon) text = text.replace(icon.textContent || '', '').trim();
          window.parent.postMessage({ type: 'phoxta-edit', key: key, value: text }, '*');
        });
      });

      // Make images clickable to open asset library
      document.querySelectorAll('[data-phoxta-image]').forEach(function(el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var imageKey = el.getAttribute('data-phoxta-image');
          window.parent.postMessage({ type: 'phoxta-image-click', imageKey: imageKey }, '*');
        });
      });

      // Disable preloader
      var preloader = document.querySelector('.preloader');
      if (preloader) preloader.style.display = 'none';

      // Init AOS if available
      if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, once: true });
      }
    });
  `
  doc.body.appendChild(editScript)

  return '<!DOCTYPE html>' + doc.documentElement.outerHTML
}
