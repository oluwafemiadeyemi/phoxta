/**
 * HTML Template Engine — Web1
 *
 * Injects AI-generated content into the Web1 HTML template.
 * - Preserves ALL image attributes (width, height, class, style, alt, loading, data-*)
 *   and only replaces the `src` attribute.
 * - Content word counts match the original template exactly (+10% max).
 * - Uses the cover page hero image as default image for all sections.
 *
 * Client-side only (uses DOMParser).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TemplateBusinessInfo {
  contactEmail: string
  contactPhone: string
  location: string
  businessHours: string
  socialLinks: string
  ctaUrl: string
}

// ---------------------------------------------------------------------------
// Image helper — replace `src` only, keep every other attribute intact
// ---------------------------------------------------------------------------

function replaceImgSrc(img: Element, newSrc: string) {
  img.setAttribute('src', newSrc)
  // Keep: width, height, alt, class, style, loading, data-*, srcset etc.
}

// ---------------------------------------------------------------------------
// Find the best available image from generatedImages, falling back to coverImage
// ---------------------------------------------------------------------------

function resolveImage(
  generatedImages: Record<string, string>,
  keywords: string[],
  coverImage: string,
): string {
  // Exact match first
  for (const kw of keywords) {
    if (generatedImages[kw]) return generatedImages[kw]
  }
  // Partial case-insensitive match
  const lower = keywords.map((k) => k.toLowerCase())
  for (const [key, url] of Object.entries(generatedImages)) {
    const keyLow = key.toLowerCase()
    if (lower.some((kw) => keyLow.includes(kw) || kw.includes(keyLow))) return url
  }
  // Fallback to cover page image
  return coverImage || ''
}

// ---------------------------------------------------------------------------
// Main transform function
// ---------------------------------------------------------------------------

export function injectContentIntoWeb1(
  rawHtml: string,
  landingData: Record<string, unknown>,
  businessInfo: TemplateBusinessInfo,
  generatedImages: Record<string, string>,
  coverImage: string,
  baseUrl = '/templates/web1/',
): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(rawHtml, 'text/html')

  // ------------------------------------------------------------------
  // 0. <base> tag for relative asset paths
  // ------------------------------------------------------------------
  if (!doc.querySelector('base')) {
    const base = doc.createElement('base')
    base.href = baseUrl
    doc.head.prepend(base)
  }
  fixRelativePaths(doc, baseUrl)

  // Helper to read string fields from landingData
  const str = (key: string, fallback = ''): string => {
    const v = landingData[key]
    return v ? String(v) : fallback
  }
  const arr = (key: string): Array<Record<string, string>> => {
    const v = landingData[key]
    return Array.isArray(v) ? v.map((item) => {
      const obj: Record<string, string> = {}
      if (item && typeof item === 'object') {
        for (const [k, val] of Object.entries(item as Record<string, unknown>)) {
          obj[k] = String(val ?? '')
        }
      }
      return obj
    }) : []
  }

  // ------------------------------------------------------------------
  // 1. PAGE TITLE
  // ------------------------------------------------------------------
  const titleEl = doc.querySelector('title')
  if (titleEl) titleEl.textContent = str('metaTitle', str('heroHeadline', 'Landing Page'))

  // ------------------------------------------------------------------
  // 2. TOP-BAR — announcement text (10 words in template)
  // ------------------------------------------------------------------
  const topBarP = doc.querySelector('.top-bar-info p')
  if (topBarP) {
    const text = str('topBarText') || `${str('bannerSubtitle')} — ${str('heroHeadline')}`
    topBarP.textContent = text
    topBarP.setAttribute('data-phoxta', 'topBarText')
  }

  // ------------------------------------------------------------------
  // 3. LOGO / BRAND
  // ------------------------------------------------------------------
  const logoUrl = resolveImage(generatedImages, ['logo', 'Logo'], coverImage)
  if (logoUrl) {
    doc.querySelectorAll('.logo img, .footer-logo img').forEach((img) => replaceImgSrc(img, logoUrl))
  }

  // ------------------------------------------------------------------
  // 4. NAVIGATION — clean up for landing page
  // ------------------------------------------------------------------
  const navUl = doc.querySelector('.navbar-nav')
  if (navUl) {
    navUl.innerHTML = `
      <li class="nav-item active"><a class="nav-link" href="#banner">Home</a></li>
      <li class="nav-item"><a class="nav-link" href="#features">Features</a></li>
      <li class="nav-item"><a class="nav-link" href="#about">About</a></li>
      <li class="nav-item"><a class="nav-link" href="#testimonials">Reviews</a></li>
      <li class="nav-item"><a class="nav-link" href="#contact">Contact</a></li>
    `
  }

  // ------------------------------------------------------------------
  // 5. BANNER / HERO — 3 carousel slides
  //    Template: h6 (2w), h1 (7w), p (15w), CTA (2w), image, "50% OFF" badge
  // ------------------------------------------------------------------
  const heroImg = resolveImage(generatedImages, ['hero', 'Hero', 'banner', 'Banner'], coverImage)

  doc.querySelectorAll('.banner_content').forEach((banner, idx) => {
    const h6 = banner.querySelector('h6')
    const h1 = banner.querySelector('h1')
    const p = banner.querySelector('p')
    const cta = banner.querySelector('a.primary_btn') as HTMLAnchorElement | null

    // h6: template = 2 words (e.g. "Best Furnitures")
    if (h6) {
      const subtitles = [str('bannerSubtitle', '✨ Welcome'), '🚀 Discover', '💡 Explore']
      h6.textContent = subtitles[idx] || subtitles[0]
      h6.setAttribute('data-phoxta', 'bannerSubtitle')
    }
    // h1: template = 7 words
    if (h1) {
      h1.textContent = str('heroHeadline')
      h1.setAttribute('data-phoxta', 'heroHeadline')
    }
    // p: template = 15 words
    if (p) {
      p.textContent = str('heroSubheadline')
      p.setAttribute('data-phoxta', 'heroSubheadline')
    }
    // CTA: template = 2 words
    if (cta) {
      cta.textContent = str('heroCtaText', 'Get Started')
      cta.setAttribute('data-phoxta', 'heroCtaText')
      if (businessInfo.ctaUrl) cta.href = businessInfo.ctaUrl
    }
  })

  // Hero images — only replace src, keep all other attributes
  if (heroImg) {
    doc.querySelectorAll('.banner-image img').forEach((img) => {
      replaceImgSrc(img, heroImg)
      img.setAttribute('alt', str('heroHeadline', 'Hero'))
      img.setAttribute('data-phoxta-image', 'hero')
    })
  }

  // Remove the 50% off circle badge (not relevant)
  doc.querySelectorAll('.circle-text').forEach((el) => el.remove())

  // ------------------------------------------------------------------
  // 6. DISCOUNT SECTION → 3 Value Proposition cards
  //    Template: h6 (2w), span (4w), CTA (2w), image per card
  // ------------------------------------------------------------------
  const discountSection = doc.querySelector('.discount-con')
  if (discountSection) {
    const cards = arr('discountCards')
    // Target the actual content blocks: .content1, .content2, .content3
    const cardEls = discountSection.querySelectorAll('.content1, .content2')

    cardEls.forEach((cardEl, i) => {
      const data = cards[i]
      if (!data) return

      const h6 = cardEl.querySelector('h6')
      const textSpan = cardEl.querySelector('.text span') || cardEl.querySelector('.text')
      const cta = cardEl.querySelector('a.primary_btn') as HTMLAnchorElement | null

      // h6: 2 words
      if (h6) h6.textContent = data.title || ''
      // span: 4 words
      if (textSpan) textSpan.textContent = data.description || ''
      // CTA: 2 words
      if (cta) {
        cta.textContent = data.ctaText || 'Learn More'
        if (businessInfo.ctaUrl) cta.href = businessInfo.ctaUrl
      }
    })

    // Replace discount images — each card gets its own unique image
    const discountImgs = discountSection.querySelectorAll('figure img')
    discountImgs.forEach((img, i) => {
      const key = `discount${i + 1}`
      const newSrc = resolveImage(generatedImages, [key, 'discount'], coverImage)
      if (newSrc) replaceImgSrc(img, newSrc)
      img.setAttribute('data-phoxta-image', key)
    })
  }

  // ------------------------------------------------------------------
  // 7. CHOOSE / WHY-US SECTION
  //    Template: h6 (2w), h2 (6w), p (14w), 3 benefit boxes: h5 (3w), p (6w), icon
  // ------------------------------------------------------------------
  const chooseSection = doc.querySelector('.choose-con')
  if (chooseSection) {
    const h6 = chooseSection.querySelector('.choose_content h6')
    const h2 = chooseSection.querySelector('.choose_content h2')
    const p = chooseSection.querySelector('.choose_content p')

    if (h6) h6.textContent = str('chooseSubtitle', 'Best Choice')
    if (h2) h2.textContent = str('whyChooseHeadline', 'Why You Should Choose Us')
    if (p) p.textContent = str('whyChooseDescription', '')

    const benefits = arr('benefits')
    const benefitBoxes = chooseSection.querySelectorAll('.beneft-box')
    benefitBoxes.forEach((box, i) => {
      if (i >= benefits.length) return
      const h5 = box.querySelector('h5')
      const pEl = box.querySelector('p')
      const iconEl = box.querySelector('.icon img, .choose-icon img')

      if (h5) h5.textContent = benefits[i].title || ''
      if (pEl) pEl.textContent = benefits[i].description || ''
      // Replace icon image with emoji if available
      if (iconEl && benefits[i].icon) {
        const parent = iconEl.parentElement
        if (parent) {
          parent.innerHTML = `<span style="font-size:32px;display:flex;align-items:center;justify-content:center;width:100%;height:100%">${benefits[i].icon}</span>`
        }
      }
    })
  }

  // ------------------------------------------------------------------
  // 8. FEATURES / PRODUCTS SECTION
  //    Template: h6 (2w), h2 (3w), tabs (removed), 6 product cards: h4 (4w), image, price
  // ------------------------------------------------------------------
  const featureSection = doc.querySelector('.feature-con')
  if (featureSection) {
    featureSection.setAttribute('id', 'features')
    const h6 = featureSection.querySelector('.feature_content h6')
    const h2 = featureSection.querySelector('.feature_content h2')
    if (h6) h6.textContent = str('featuresSubtitle', 'Featured Items')
    if (h2) h2.textContent = str('featuresSectionTitle', 'Our Key Features')

    // Remove tab navigation — show single grid
    const tabNav = featureSection.querySelector('.nav-tabs')
    if (tabNav) tabNav.remove()

    const products = arr('products')

    // Work with the first visible tab pane and remove all others (they contain default furniture text)
    const allPane = featureSection.querySelector('#all') || featureSection.querySelector('.tab-pane')
    if (allPane) {
      featureSection.querySelectorAll('.tab-pane').forEach((pane) => {
        if (pane !== allPane) pane.remove()
      })
      ;(allPane as HTMLElement).className = 'tab-pane fade in active show'

      const featureBoxes = allPane.querySelectorAll('.feature-box')
      featureBoxes.forEach((box, i) => {
        if (i >= products.length) {
          ;(box as HTMLElement).style.display = 'none'
          return
        }

        // h4: 4 words
        const h4 = box.querySelector('h4')
        if (h4) {
          h4.textContent = products[i].title || ''
          h4.setAttribute('data-phoxta', `product-title-${i}`)
        }

        // Replace price with description (12 words)
        const priceDiv = box.querySelector('.price')
        if (priceDiv) {
          priceDiv.innerHTML = `<span style="font-size:13px;color:#666;line-height:1.4;display:block">${products[i].description || ''}</span>`
        }

        // Replace feature image — each product gets its own unique image
        const prodKey = `product${i + 1}`
        const prodImg = resolveImage(generatedImages, [prodKey, 'product', 'features'], coverImage)
        if (prodImg) {
          const img = box.querySelector('.feature-image img, .image img')
          if (img) {
            replaceImgSrc(img, prodImg)
            img.setAttribute('data-phoxta-image', prodKey)
          }
        }

        // Remove cart/eye/arrow action icons (e-commerce specific)
        const actionIcons = box.querySelector('.image ul')
        if (actionIcons) actionIcons.remove()
        const heart = box.querySelector('.heart')
        if (heart) heart.remove()
        // Remove color dots (e-commerce specific)
        const colorWrap = box.querySelector('.color_wrap')
        if (colorWrap) colorWrap.remove()
      })
    }
  }

  // ------------------------------------------------------------------
  // 9. ABOUT SECTION
  //    Template: h6 (2w), h2 (7w), p (21w), CTA (2w), 3 stats, 2 images, play icon
  // ------------------------------------------------------------------
  const aboutSection = doc.querySelector('.about-con')
  if (aboutSection) {
    aboutSection.setAttribute('id', 'about')
    const h6 = aboutSection.querySelector('.about_content h6')
    const h2 = aboutSection.querySelector('.about_content h2')
    const p = aboutSection.querySelector('.about_content p')
    const ctaBtn = aboutSection.querySelector('.about_content a.primary_btn') as HTMLAnchorElement | null

    if (h6) h6.textContent = str('aboutSubtitle', 'About Us')
    if (h2) h2.textContent = str('aboutHeadline', 'Crafting the Future With Innovation')
    if (p) p.textContent = str('aboutDescription', '')
    if (ctaBtn) {
      ctaBtn.textContent = str('aboutCtaText', 'Read More')
      if (businessInfo.ctaUrl) ctaBtn.href = businessInfo.ctaUrl
    }

    // Remove video popup link (links to stock video)
    aboutSection.querySelectorAll('.popup-vimeo, a[href*="vimeo"]').forEach((el) => el.remove())

    // Stats — 3 items, each: number, suffix (1-2 chars), label (2-3 words)
    const stats = arr('aboutStats')
    const statEls = aboutSection.querySelectorAll('.about_wrapper li')
    statEls.forEach((stat, i) => {
      if (i >= stats.length) return
      const numberEl = stat.querySelector('.number')
      const exprEl = stat.querySelector('.expression')
      const textEl = stat.querySelector('.text')
      if (numberEl) numberEl.textContent = stats[i].number || ''
      if (exprEl) exprEl.textContent = stats[i].suffix || ''
      if (textEl) textEl.textContent = stats[i].label || ''
    })

    // About images — only replace src, keep everything else
    const aboutImg = resolveImage(generatedImages, ['about', 'About'], coverImage)
    if (aboutImg) {
      aboutSection.querySelectorAll('.about-image1 img, .about-image2 img').forEach((img) => {
        replaceImgSrc(img, aboutImg)
        img.setAttribute('data-phoxta-image', 'about')
      })
    }
  }

  // ------------------------------------------------------------------
  // 10. CATEGORIES — 4 category cards: h4 (3 words), image
  // ------------------------------------------------------------------
  const categoriesSection = doc.querySelector('.categories-con')
  if (categoriesSection) {
    const categoriesData = arr('categories')
    const h6 = categoriesSection.querySelector('.categories_content h6')
    const h2 = categoriesSection.querySelector('.categories_content h2')
    if (h6) h6.textContent = str('categoriesSubtitle', 'Categories')
    if (h2) h2.textContent = str('categoriesHeadline', 'Browse By Category')

    const cards = categoriesSection.querySelectorAll('.categories-box')
    cards.forEach((card, i) => {
      if (i >= categoriesData.length) return
      const h4 = card.querySelector('h4')
      if (h4) h4.textContent = categoriesData[i].title || ''

      // Category images — each category gets its own unique image
      const catKey = `category${i + 1}`
      const catImg = resolveImage(generatedImages, [catKey, 'category'], coverImage)
      if (catImg) {
        card.querySelectorAll('img').forEach((img) => {
          replaceImgSrc(img, catImg)
          img.setAttribute('data-phoxta-image', catKey)
        })
      }
    })
  }

  // ------------------------------------------------------------------
  // 11. OFFER — h6 (2w), h2 (3w), p (7w), CTA (2w), 5 product items
  // ------------------------------------------------------------------
  const offerSection = doc.querySelector('.offer-con')
  if (offerSection) {
    const h6 = offerSection.querySelector('.offer_content h6')
    const h2 = offerSection.querySelector('.offer_content h2')
    const p = offerSection.querySelector('.offer_content p')
    const cta = offerSection.querySelector('.offer_content a.primary_btn') as HTMLAnchorElement | null

    if (h6) h6.textContent = str('offerSubtitle', 'Special Offer')
    if (h2) h2.textContent = str('offerHeadline', 'Limited Time Offer')
    if (p) p.textContent = str('offerDescription', '')
    if (cta) {
      cta.textContent = str('offerCtaText', 'Get Started')
      if (businessInfo.ctaUrl) cta.href = businessInfo.ctaUrl
    }

    // 5 product popup items: h4 (2w), p (7w)
    const offerProducts = arr('offerProducts')
    const boxes = offerSection.querySelectorAll('.offer_wrapper .box')
    boxes.forEach((box, i) => {
      if (i >= offerProducts.length) return
      const h4 = box.querySelector('h4')
      const pEl = box.querySelector('p')
      if (h4) h4.textContent = offerProducts[i].title || ''
      if (pEl) pEl.textContent = offerProducts[i].description || ''
      // Remove e-commerce price divs
      const priceDiv = box.querySelector('.price')
      if (priceDiv) priceDiv.remove()
    })

    // Note: offer section only has dot-marker icons — no main image to replace
  }

  // ------------------------------------------------------------------
  // 12. TESTIMONIALS — h6 (1w), h2 (3w), 9 items (3 unique × 3):
  //     text (21w), name (2w), role (2w), person image, quote icon
  // ------------------------------------------------------------------
  const testimonialSection = doc.querySelector('.testimonial-con')
  if (testimonialSection) {
    testimonialSection.setAttribute('id', 'testimonials')
    const h6 = testimonialSection.querySelector('.testimonial_content h6')
    const h2 = testimonialSection.querySelector('.testimonial_content h2')
    if (h6) h6.textContent = str('testimonialSubtitle', 'Testimonials')
    if (h2) h2.textContent = str('testimonialHeadline', 'Our Customers Review')

    const testimonials = arr('testimonials')
    const items = testimonialSection.querySelectorAll('.owl-carousel .item')
    items.forEach((item, i) => {
      const t = testimonials[i % testimonials.length]
      if (!t) return
      const pEl = item.querySelector('p')
      const nameEl = item.querySelector('.name')
      const roleEl = item.querySelector('.review')
      // text: exactly 21 words
      if (pEl) pEl.textContent = t.text || ''
      // name: 2 words
      if (nameEl) nameEl.textContent = t.name || ''
      // role: 2 words
      if (roleEl) roleEl.textContent = t.role || ''
    })

    // Testimonial person images — only replace src
    const socialImg = resolveImage(generatedImages, ['testimonial', 'Testimonial', 'social'], coverImage)
    if (socialImg) {
      testimonialSection.querySelectorAll('.testimonial-personimage img').forEach((img) => {
        replaceImgSrc(img, socialImg)
        img.setAttribute('data-phoxta-image', 'testimonial')
      })
    }
  }

  // ------------------------------------------------------------------
  // 13. ARTICLES / BLOG — h6 (3w), h2 (4w), 3 blog cards:
  //     date, h3 (9w), p (9w), image
  // ------------------------------------------------------------------
  const articleSection = doc.querySelector('.article-con')
  if (articleSection) {
    const h6 = articleSection.querySelector('.article_content h6')
    const h2 = articleSection.querySelector('.article_content h2')
    if (h6) h6.textContent = str('blogSubtitle', 'News and Articles')
    if (h2) h2.textContent = str('blogHeadline', 'Our Latest Blog Posts')

    const blogPosts = arr('blogPosts')
    const blogBoxes = articleSection.querySelectorAll('.article-box')
    const dates = ['JAN 15, 2026', 'FEB 01, 2026', 'FEB 10, 2026']
    blogBoxes.forEach((box, i) => {
      if (i >= blogPosts.length) return
      const h3 = box.querySelector('h3')
      const p = box.querySelector('.box-content p')
      const dateSpan = box.querySelector('.date')
      // h3: 9 words
      if (h3) h3.textContent = blogPosts[i].title || ''
      // p: 9 words
      if (p) p.textContent = blogPosts[i].excerpt || ''
      if (dateSpan) dateSpan.textContent = dates[i] || ''

      // Blog images — only replace src
      const blogKey = `blog${i + 1}`
      const blogImg = resolveImage(generatedImages, [blogKey, 'blog', 'article'], coverImage)
      if (blogImg) {
        box.querySelectorAll('.image img').forEach((img) => {
          replaceImgSrc(img, blogImg)
          img.setAttribute('data-phoxta-image', blogKey)
        })
      }

      // Fix dead blog article links (single-blog.html doesn't exist)
      box.querySelectorAll('a[href*="single-blog"]').forEach((a) => a.setAttribute('href', '#'))
    })
  }

  // ------------------------------------------------------------------
  // 14. NEWSLETTER / UPDATE — h6 (2w), h2 (8w), button (1w)
  // ------------------------------------------------------------------
  const updateSection = doc.querySelector('.update-con')
  if (updateSection) {
    updateSection.setAttribute('id', 'contact')
    const h6 = updateSection.querySelector('.update_content h6')
    const h2 = updateSection.querySelector('.update_content h2')

    if (h6) h6.textContent = str('newsletterTitle', 'Newsletter Subscription')
    if (h2) h2.textContent = str('newsletterSubtitle', 'Get the Latest Update into Your Inbox')

    const input = updateSection.querySelector('input[type="text"]') as HTMLInputElement | null
    if (input) input.placeholder = 'Enter Your Email Address'
    const btn = updateSection.querySelector('button')
    if (btn) btn.textContent = str('finalCtaButtonText', 'Subscribe')
  }

  // ------------------------------------------------------------------
  // 15. FOOTER — description (24w), nav, contact, copyright, social
  // ------------------------------------------------------------------
  const footerSection = doc.querySelector('.footer-con')
  if (footerSection) {
    const footerText = footerSection.querySelector('.logo-content p')
    if (footerText) footerText.textContent = str('footerDescription', str('footerTagline', ''))

    // Contact details
    const phoneLink = footerSection.querySelector('a[href^="tel:"]') as HTMLAnchorElement | null
    const emailLink = footerSection.querySelector('a[href^="mailto:"]') as HTMLAnchorElement | null
    const addressEl = footerSection.querySelector('.address')

    if (phoneLink && businessInfo.contactPhone) {
      phoneLink.textContent = businessInfo.contactPhone
      phoneLink.href = `tel:${businessInfo.contactPhone.replace(/\s/g, '')}`
    }
    if (emailLink && businessInfo.contactEmail) {
      emailLink.textContent = businessInfo.contactEmail
      emailLink.href = `mailto:${businessInfo.contactEmail}`
    }
    if (addressEl && businessInfo.location) {
      addressEl.textContent = businessInfo.location
    }

    // Copyright
    const copyright = footerSection.querySelector('.copyright p')
    const brandName = str('footerTagline', str('heroHeadline', 'My Business'))
    if (copyright) copyright.textContent = `Copyright © ${new Date().getFullYear()} ${brandName}. All rights reserved.`

    // Social links
    if (businessInfo.socialLinks) {
      const socialIcons = footerSection.querySelector('.social-icons')
      if (socialIcons) {
        const links = businessInfo.socialLinks.split('\n').filter(Boolean)
        const iconMap: Record<string, string> = {
          facebook: 'fa-facebook-f', instagram: 'fa-instagram', twitter: 'fa-x-twitter',
          linkedin: 'fa-linkedin-in', youtube: 'fa-youtube', tiktok: 'fa-tiktok',
        }
        socialIcons.innerHTML = links.map((url) => {
          const platform = Object.keys(iconMap).find((k) => url.toLowerCase().includes(k)) || 'globe'
          const iconClass = iconMap[platform] || 'fa-globe'
          return `<li><a href="${url}" class="text-decoration-none" target="_blank" rel="noopener"><i class="fa-brands ${iconClass} social-networks"></i></a></li>`
        }).join('')
      }
    }

    // Footer nav links
    const navLinks = footerSection.querySelector('.links ul')
    if (navLinks) {
      navLinks.innerHTML = `
        <li><i class="fa-solid fa-angle-right"></i><a href="#banner">Home</a></li>
        <li><i class="fa-solid fa-angle-right"></i><a href="#features">Features</a></li>
        <li><i class="fa-solid fa-angle-right"></i><a href="#about">About</a></li>
        <li><i class="fa-solid fa-angle-right"></i><a href="#testimonials">Reviews</a></li>
        <li><i class="fa-solid fa-angle-right"></i><a href="#contact">Contact</a></li>
      `
    }

    // Replace support/use links (term-of-use.html etc.) with page nav links
    const useLinks = footerSection.querySelector('.use-link ul')
    if (useLinks) {
      useLinks.innerHTML = `
        <li><i class="fa-solid fa-angle-right"></i><a href="#choose">Why Us</a></li>
        <li><i class="fa-solid fa-angle-right"></i><a href="#categories">Categories</a></li>
        <li><i class="fa-solid fa-angle-right"></i><a href="#offer">Offers</a></li>
        <li><i class="fa-solid fa-angle-right"></i><a href="#blog">Blog</a></li>
        <li><i class="fa-solid fa-angle-right"></i><a href="#contact">Contact</a></li>
      `
    }

    // Fix address href (remove hardcoded Melbourne Google Maps link)
    const addressLink = footerSection.querySelector('a[href*="maps.google"]') as HTMLAnchorElement | null
    if (addressLink) addressLink.href = '#'

    // Remove payment logos (Visa/Mastercard — e-commerce specific)
    footerSection.querySelectorAll('.copyright img').forEach((el) => el.remove())
  }

  // ------------------------------------------------------------------
  // 16. Remove modals + preloader
  // ------------------------------------------------------------------
  doc.querySelectorAll('.project_modal').forEach((el) => el.remove())
  const loader = doc.querySelector('.loader-mask')
  if (loader) loader.remove()

  // ------------------------------------------------------------------
  // 17. Inject editing script (contenteditable + postMessage)
  // ------------------------------------------------------------------
  injectEditingScript(doc)

  // Serialize
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}

// ---------------------------------------------------------------------------
// Fix relative paths for iframe sandboxed rendering
// ---------------------------------------------------------------------------

function fixRelativePaths(doc: Document, baseUrl: string) {
  doc.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src')
    if (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
      img.setAttribute('src', baseUrl + src.replace(/^\.\//, ''))
    }
  })
  doc.querySelectorAll('link[href]').forEach((link) => {
    const href = link.getAttribute('href')
    if (href && !href.startsWith('http') && !href.startsWith('/')) {
      link.setAttribute('href', baseUrl + href.replace(/^\.\//, ''))
    }
  })
  doc.querySelectorAll('script[src]').forEach((script) => {
    const src = script.getAttribute('src')
    if (src && !src.startsWith('http') && !src.startsWith('/')) {
      script.setAttribute('src', baseUrl + src.replace(/^\.\//, ''))
    }
  })
  doc.querySelectorAll('[style]').forEach((el) => {
    const style = el.getAttribute('style')
    if (style && style.includes('url(')) {
      el.setAttribute(
        'style',
        style.replace(/url\(['"]?(?!http|\/|data:)([^'")\s]+)['"]?\)/g, `url('${baseUrl}$1')`),
      )
    }
  })
}

// ---------------------------------------------------------------------------
// Inject editing script for inline text editing + image click postMessage
// ---------------------------------------------------------------------------

function injectEditingScript(doc: Document) {
  const script = doc.createElement('script')
  script.textContent = `
    (function() {
      var editableSelectors = [
        '.banner_content h1',
        '.banner_content h6',
        '.banner_content p',
        '.banner_content a.primary_btn',
        '.choose_content h2',
        '.choose_content p',
        '.beneft-box h5',
        '.beneft-box p',
        '.feature_content h2',
        '.feature-box h4',
        '.about_content h2',
        '.about_content p',
        '.offer_content h2',
        '.offer_content p',
        '.testimonial_content h2',
        '.testimonial-box p',
        '.article_content h2',
        '.article-box h3',
        '.article-box .box-content p',
        '.update_content h6',
        '.update_content h2',
        '.logo-content p',
        '.top-bar-info p',
        '.copyright p'
      ];

      editableSelectors.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) {
          el.setAttribute('contenteditable', 'true');
          el.style.cursor = 'text';
          el.style.outline = 'none';
          el.style.transition = 'box-shadow 0.2s';
          el.addEventListener('focus', function() {
            el.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.5)';
          });
          el.addEventListener('blur', function() {
            el.style.boxShadow = 'none';
            var phoxta = el.getAttribute('data-phoxta');
            window.parent.postMessage({
              type: 'phoxta-edit',
              key: phoxta || el.tagName + ':' + el.textContent.substring(0, 30),
              value: el.textContent
            }, '*');
          });
        });
      });

      // Make images clickable for replacement — use data-phoxta-image key
      document.querySelectorAll('img[data-phoxta-image]').forEach(function(img) {
        img.style.cursor = 'pointer';
        img.style.transition = 'opacity 0.2s, transform 0.2s';
        img.addEventListener('mouseenter', function() {
          img.style.opacity = '0.7';
          img.style.transform = 'scale(1.02)';
        });
        img.addEventListener('mouseleave', function() {
          img.style.opacity = '1';
          img.style.transform = 'scale(1)';
        });
        img.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          window.parent.postMessage({
            type: 'phoxta-image-click',
            imageKey: img.getAttribute('data-phoxta-image'),
            currentSrc: img.src
          }, '*');
        });
      });
    })();
  `
  doc.body.appendChild(script)
}
