'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { TemplateProps } from './LandingTemplates'
import { injectContentIntoWeb1 } from '@/lib/htmlTemplateEngine'

const TEMPLATE_BASE_URL = '/templates/web1/'

/**
 * Renders the Web1 HTML template inside an iframe with AI-generated content
 * injected into all sections. Supports inline text editing via postMessage.
 */
export function HtmlTemplatePreview(props: TemplateProps) {
  const {
    landingData,
    setLandingData,
    generatedImages,
    approvedSections,
    businessInfo,
    saveDay10State,
    coverImage,
  } = props

  const [rawHtml, setRawHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Fetch the raw template HTML once
  useEffect(() => {
    fetch(`${TEMPLATE_BASE_URL}index.html`)
      .then((r) => r.text())
      .then((html) => {
        setRawHtml(html)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Build the injected HTML
  const getInjectedHtml = useCallback(() => {
    if (!rawHtml) return ''
    return injectContentIntoWeb1(
      rawHtml,
      landingData,
      businessInfo,
      generatedImages,
      coverImage || '',
      TEMPLATE_BASE_URL,
    )
  }, [rawHtml, landingData, businessInfo, generatedImages, coverImage])

  // Listen for postMessage from the iframe for inline edits
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return

      if (event.data.type === 'phoxta-edit') {
        const key = event.data.key as string
        const value = event.data.value as string

        // Map data-phoxta attribute keys back to landing data keys
        const keyMap: Record<string, string> = {
          heroHeadline: 'heroHeadline',
          heroSubheadline: 'heroSubheadline',
          heroCtaText: 'heroCtaText',
          bannerSubtitle: 'bannerSubtitle',
          topBarText: 'topBarText',
          newsletterTitle: 'newsletterTitle',
          newsletterSubtitle: 'newsletterSubtitle',
          finalCtaButtonText: 'finalCtaButtonText',
          footerTagline: 'footerTagline',
        }

        const mappedKey = keyMap[key]
        if (mappedKey && value) {
          setLandingData((prev) => {
            const next = { ...prev, [mappedKey]: value }
            saveDay10State(next, generatedImages, approvedSections, businessInfo)
            return next
          })
        }
      }

      // Image click → open asset library with the exact image key
      if (event.data.type === 'phoxta-image-click') {
        const imageKey = event.data.imageKey as string
        if (imageKey) {
          window.dispatchEvent(
            new CustomEvent('phoxta-open-asset-library', { detail: { section: imageKey } }),
          )
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [setLandingData, saveDay10State, generatedImages, approvedSections, businessInfo])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center animate-pulse">
            <span className="text-2xl">🌐</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading template…</p>
        </div>
      </div>
    )
  }

  if (!rawHtml) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50">
        <p className="text-sm text-red-500">Failed to load template.</p>
      </div>
    )
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={getInjectedHtml()}
      className="w-full border-0"
      style={{ minHeight: '100vh', height: '100%' }}
      sandbox="allow-scripts allow-same-origin"
      title="Landing Page Preview"
    />
  )
}
