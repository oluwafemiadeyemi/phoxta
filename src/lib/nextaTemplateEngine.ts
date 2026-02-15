/**
 * HTML Template Engine — Nexta
 *
 * Injects AI-generated content into the Nexta HTML template.
 * - Preserves ALL image attributes (width, height, class, style, alt, loading, data-*)
 *   and only replaces the `src` attribute.
 * - Uses the cover page hero image as default image for all sections.
 *
 * Client-side only (uses DOMParser).
 */

import type { TemplateBusinessInfo } from './htmlTemplateEngine'

// ---------------------------------------------------------------------------
// Image helper — replace `src` only, keep every other attribute intact
// ---------------------------------------------------------------------------

function replaceImgSrc(img: Element, newSrc: string) {
  img.setAttribute('src', newSrc)
}

// ---------------------------------------------------------------------------
// Find the best available image from generatedImages, falling back to coverImage
// ---------------------------------------------------------------------------

function resolveImage(
  generatedImages: Record<string, string>,
  keywords: string[],
  coverImage: string,
): string {
  for (const kw of keywords) {
    if (generatedImages[kw]) return generatedImages[kw]
  }
  const lower = keywords.map((k) => k.toLowerCase())
  for (const [key, url] of Object.entries(generatedImages)) {
    const keyLow = key.toLowerCase()
    if (lower.some((kw) => keyLow.includes(kw) || kw.includes(keyLow))) return url
  }
  return coverImage || ''
}

// ---------------------------------------------------------------------------
// Helper: set text on .sub-title while preserving the asterisk icon prefix
// ---------------------------------------------------------------------------

function setSubtitle(el: Element | null, text: string) {
  if (!el) return
  el.innerHTML = `<span><i class="asterisk"></i></span>${text}`
}

// ---------------------------------------------------------------------------
// Helper: set text on .theme-btn which has TWO spans both needing the same text
// ---------------------------------------------------------------------------

function setThemeBtnText(btn: Element | null, text: string) {
  if (!btn) return
  const spans = btn.querySelectorAll('.effect-1')
  spans.forEach((span) => { span.textContent = text })
}

// ---------------------------------------------------------------------------
// Main transform function
// ---------------------------------------------------------------------------

export function injectContentIntoNexta(
  rawHtml: string,
  landingData: Record<string, unknown>,
  businessInfo: TemplateBusinessInfo,
  generatedImages: Record<string, string>,
  coverImage: string,
  baseUrl = '/templates/nexta/',
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
  // 1. REMOVE unwanted sections
  // ------------------------------------------------------------------
  const removeSelectors = [
    '#loading-screen',
    '.search-popup',
    '.video-section.style-2',
    '.team-section.style-3',
    '.award-section',
    '.brands-section',
    '.marquee-section.style-3',
    '.mobile-menu-wrapper',
    '.sticky-header',
  ]
  removeSelectors.forEach((sel) => {
    doc.querySelectorAll(sel).forEach((el) => el.remove())
  })

  // Remove all sub-menus from navigation (multi-page links)
  doc.querySelectorAll('.sub-menu').forEach((el) => el.remove())

  // ------------------------------------------------------------------
  // 2. PAGE TITLE
  // ------------------------------------------------------------------
  const titleEl = doc.querySelector('title')
  if (titleEl) titleEl.textContent = str('metaTitle', str('heroHeadline', 'Landing Page'))

  // ------------------------------------------------------------------
  // 3. HEADER — top bar, navigation, contact
  // ------------------------------------------------------------------
  // Top bar announcement
  const topBarLi = doc.querySelector('.header-top .list-style-1 li:first-child')
  if (topBarLi) {
    topBarLi.innerHTML = `<i class="icon icon-nexta"></i>${str('topBarText', str('bannerSubtitle', 'Welcome'))}`
    topBarLi.setAttribute('data-phoxta', 'topBarText')
  }

  // Top bar email
  const topBarEmail = doc.querySelector('.header-top a[href^="mailto:"]') as HTMLAnchorElement | null
  if (topBarEmail && businessInfo.contactEmail) {
    topBarEmail.textContent = businessInfo.contactEmail
    topBarEmail.href = `mailto:${businessInfo.contactEmail}`
  }

  // Header phone
  const headerPhone = doc.querySelector('.header-btn') as HTMLAnchorElement | null
  if (headerPhone && businessInfo.contactPhone) {
    headerPhone.innerHTML = `<span class="fa-solid fa-headphones"></span>${businessInfo.contactPhone}`
    headerPhone.href = `tel:${businessInfo.contactPhone.replace(/\s/g, '')}`
  }

  // Social links in header
  if (businessInfo.socialLinks) {
    const socialList = doc.querySelector('.header-top .social-icon-one')
    if (socialList) {
      const links = businessInfo.socialLinks.split('\n').filter(Boolean)
      const iconMap: Record<string, string> = {
        facebook: 'fa-facebook-f', instagram: 'fa-instagram', twitter: 'fa-x-twitter',
        linkedin: 'fa-linkedin-in', youtube: 'fa-youtube', tiktok: 'fa-tiktok',
      }
      const followTitle = socialList.querySelector('.menu-follow_title')
      socialList.innerHTML = followTitle ? `<li>${followTitle.outerHTML}</li>` : ''
      socialList.innerHTML += links.map((url) => {
        const platform = Object.keys(iconMap).find((k) => url.toLowerCase().includes(k)) || 'globe'
        const iconClass = iconMap[platform] || 'fa-globe'
        return `<li><a href="${url}" target="_blank" rel="noopener"><i class="fa-brands ${iconClass}"></i></a></li>`
      }).join('')
    }
  }

  // Navigation — simplify to single-page anchors
  const mainNav = doc.querySelector('.main-menu .navigation')
  if (mainNav) {
    mainNav.innerHTML = `
      <li class="active"><a href="#hero">Home</a></li>
      <li><a href="#features">Features</a></li>
      <li><a href="#about">About</a></li>
      <li><a href="#services">Services</a></li>
      <li><a href="#testimonials">Reviews</a></li>
      <li><a href="#contact">Contact</a></li>
    `
  }

  // Header CTA button
  const headerCta = doc.querySelector('.header-right .theme-btn')
  if (headerCta) {
    setThemeBtnText(headerCta, str('heroCtaText', 'Get Started'))
    const link = headerCta as HTMLAnchorElement
    if (businessInfo.ctaUrl) link.href = businessInfo.ctaUrl
  }

  // Remove search button
  doc.querySelectorAll('.search-btn').forEach((el) => el.remove())

  // ------------------------------------------------------------------
  // 4. HERO SECTION
  // ------------------------------------------------------------------
  const heroSection = doc.querySelector('.hero-section.style-5')
  if (heroSection) {
    heroSection.setAttribute('id', 'hero')

    // Subtitle
    const heroSubtitle = heroSection.querySelector('.hero-content .sub-title')
    if (heroSubtitle) {
      heroSubtitle.innerHTML = `<i class="icon-small-hand"></i> ${str('bannerSubtitle', str('heroSubheadline', 'Welcome'))}`
      heroSubtitle.setAttribute('data-phoxta', 'bannerSubtitle')
    }

    // Headline — preserve the decorative shape img inside
    const heroH1 = heroSection.querySelector('h1.title')
    if (heroH1) {
      const shapeDiv = heroH1.querySelector('.hero-title_shape')
      const shapeHtml = shapeDiv ? shapeDiv.outerHTML : ''
      heroH1.innerHTML = `${str('heroHeadline', 'Your Business Headline')} ${shapeHtml}`
      heroH1.setAttribute('data-phoxta', 'heroHeadline')
    }

    // CTA button
    const heroCta = heroSection.querySelector('.hero-content .theme-btn')
    if (heroCta) {
      setThemeBtnText(heroCta, str('heroCtaText', 'Get Started'))
      const link = heroCta as HTMLAnchorElement
      if (businessInfo.ctaUrl) link.href = businessInfo.ctaUrl
      heroCta.setAttribute('data-phoxta', 'heroCtaText')
    }

    // Hero main image
    const heroImg = resolveImage(generatedImages, ['hero', 'Hero', 'banner'], coverImage)
    if (heroImg) {
      const mainImg = heroSection.querySelector('.hero-right .image-box .image img')
      if (mainImg) {
        replaceImgSrc(mainImg, heroImg)
        mainImg.setAttribute('data-phoxta-image', 'hero')
      }
    }

    // Info box tagline
    const infoBoxTitle = heroSection.querySelector('.info-box h4.title')
    if (infoBoxTitle) {
      infoBoxTitle.textContent = str('footerTagline', str('heroHeadline', ''))
      infoBoxTitle.setAttribute('data-phoxta', 'footerTagline')
    }

    // Happy customers rating text
    const happyText = heroSection.querySelector('.happy-customers .text')
    if (happyText) happyText.textContent = str('testimonialSubtitle', 'Happy Customers')
  }

  // ------------------------------------------------------------------
  // 5. FEATURE SECTION (3 feature cards with images)
  // ------------------------------------------------------------------
  const featureSection = doc.querySelector('.feature-section.style-4')
  if (featureSection) {
    featureSection.setAttribute('id', 'features')

    // Subtitle & title
    setSubtitle(featureSection.querySelector('.title-area .sub-title'), str('featuresSubtitle', 'OUR SOLUTIONS'))
    const featureH2 = featureSection.querySelector('h2.sec-title')
    if (featureH2) {
      featureH2.textContent = str('featuresSectionTitle', 'Our Key Features')
      featureH2.setAttribute('data-phoxta', 'featuresSectionTitle')
    }

    // "View All Service" button → CTA
    const featureViewBtn = featureSection.querySelector('.service-btn .theme-btn')
    if (featureViewBtn) {
      setThemeBtnText(featureViewBtn, str('heroCtaText', 'Learn More'))
      const link = featureViewBtn as HTMLAnchorElement
      if (businessInfo.ctaUrl) link.href = businessInfo.ctaUrl
    }

    // 3 feature cards
    const products = arr('products')
    const featureBoxes = featureSection.querySelectorAll('.feature-box-four')
    featureBoxes.forEach((box, i) => {
      if (i >= products.length) { (box as HTMLElement).style.display = 'none'; return }

      const titleA = box.querySelector('h4.title a')
      if (titleA) {
        titleA.textContent = products[i].title || ''
        titleA.setAttribute('href', '#')
      }

      const textP = box.querySelector('p.text')
      if (textP) textP.textContent = products[i].description || ''

      const learnMore = box.querySelector('a.service-btn') as HTMLAnchorElement | null
      if (learnMore) learnMore.href = '#'

      // Feature image
      const prodKey = `product${i + 1}`
      const prodImg = resolveImage(generatedImages, [prodKey, 'product', 'features'], coverImage)
      if (prodImg) {
        const img = box.querySelector('.thumb img')
        if (img) {
          replaceImgSrc(img, prodImg)
          img.setAttribute('data-phoxta-image', prodKey)
        }
      }
    })
  }

  // ------------------------------------------------------------------
  // 6. ABOUT SECTION
  // ------------------------------------------------------------------
  const aboutSection = doc.querySelector('.about-section.style-5')
  if (aboutSection) {
    aboutSection.setAttribute('id', 'about')

    setSubtitle(aboutSection.querySelector('.about-content-wrapper .sub-title'), str('aboutSubtitle', 'About Us'))

    const aboutH2 = aboutSection.querySelector('h2.sec-title')
    if (aboutH2) {
      aboutH2.textContent = str('aboutHeadline', 'About Our Business')
      aboutH2.setAttribute('data-phoxta', 'aboutHeadline')
    }

    const aboutText = aboutSection.querySelector('p.sec-text')
    if (aboutText) {
      aboutText.textContent = str('aboutDescription', '')
      aboutText.setAttribute('data-phoxta', 'aboutDescription')
    }

    // Features list (2 items from benefits)
    const benefits = arr('benefits')
    const featuresList = aboutSection.querySelector('ul.features-list')
    if (featuresList && benefits.length > 0) {
      featuresList.innerHTML = benefits.slice(0, 2).map((b) =>
        `<li>${b.title || ''}</li>`
      ).join('')
    }

    // About CTA button
    const aboutCta = aboutSection.querySelector('.about-content-wrapper .theme-btn')
    if (aboutCta) {
      setThemeBtnText(aboutCta, str('aboutCtaText', 'More about Us'))
      const link = aboutCta as HTMLAnchorElement
      if (businessInfo.ctaUrl) link.href = businessInfo.ctaUrl
    }

    // Stat box
    const statTitle = aboutSection.querySelector('.stat-box h3.title')
    const statText = aboutSection.querySelector('.stat-box p.text')
    const aboutStats = arr('aboutStats')
    if (statTitle && aboutStats.length > 0) {
      statTitle.textContent = `${aboutStats[0].number || ''}${aboutStats[0].suffix || ''}`
    }
    if (statText && aboutStats.length > 0) {
      statText.textContent = aboutStats[0].label || 'Completed Projects'
    }

    // Skill bars — map to benefits
    const skillItems = aboutSection.querySelectorAll('.skill-item')
    skillItems.forEach((item, i) => {
      if (i >= benefits.length) return
      const skillTitle = item.querySelector('.skill-title')
      if (skillTitle) skillTitle.textContent = benefits[i].title || ''
    })

    // About image
    const aboutImg = resolveImage(generatedImages, ['about', 'About'], coverImage)
    if (aboutImg) {
      const img = aboutSection.querySelector('.about-right-wrapper .image img')
      if (img) {
        replaceImgSrc(img, aboutImg)
        img.setAttribute('data-phoxta-image', 'about')
      }
    }
  }

  // ------------------------------------------------------------------
  // 7. COUNTER SECTION (3 counters)
  // ------------------------------------------------------------------
  const counterSection = doc.querySelector('.counter-section.style-2')
  if (counterSection) {
    const aboutStats = arr('aboutStats')
    const counterBoxes = counterSection.querySelectorAll('.counter-box')
    counterBoxes.forEach((box, i) => {
      if (i >= aboutStats.length) return
      const odometer = box.querySelector('.odometer')
      if (odometer) odometer.setAttribute('data-count', aboutStats[i].number || '0')
      const textP = box.querySelector('p.text')
      if (textP) textP.textContent = aboutStats[i].label || ''
    })
  }

  // ------------------------------------------------------------------
  // 8. SERVICE SECTION (6 icon boxes — text only, no images)
  // ------------------------------------------------------------------
  const serviceSection = doc.querySelector('.service-section.style-5')
  if (serviceSection) {
    serviceSection.setAttribute('id', 'services')

    setSubtitle(serviceSection.querySelector('.title-area .sub-title'), str('offerSubtitle', 'Our Solutions'))

    const serviceH2 = serviceSection.querySelector('h2.sec-title')
    if (serviceH2) {
      serviceH2.textContent = str('featuresSectionTitle', str('offerHeadline', 'Our Services'))
    }

    const products = arr('products')
    const offerProducts = arr('offerProducts')
    // Combine products + offerProducts to fill 6 boxes
    const allItems = [...products, ...offerProducts].slice(0, 6)

    const serviceBoxes = serviceSection.querySelectorAll('.service-box-five')
    serviceBoxes.forEach((box, i) => {
      if (i >= allItems.length) { (box as HTMLElement).style.display = 'none'; return }

      const titleA = box.querySelector('h4.title a')
      if (titleA) {
        titleA.textContent = allItems[i].title || ''
        titleA.setAttribute('href', '#')
      }

      const textP = box.querySelector('p.text')
      if (textP) textP.textContent = allItems[i].description || ''

      const learnMore = box.querySelector('a.service-btn') as HTMLAnchorElement | null
      if (learnMore) learnMore.href = '#'
    })
  }

  // ------------------------------------------------------------------
  // 9. CHOOSE / WHY-US SECTION
  // ------------------------------------------------------------------
  const chooseSection = doc.querySelector('.choose-section.style-5')
  if (chooseSection) {
    chooseSection.setAttribute('id', 'choose')

    setSubtitle(chooseSection.querySelector('.choose-content-wrapper .sub-title'), str('chooseSubtitle', 'Why Us'))

    const chooseH2 = chooseSection.querySelector('h2.sec-title')
    if (chooseH2) {
      chooseH2.textContent = str('whyChooseHeadline', 'Why Choose Us')
      chooseH2.setAttribute('data-phoxta', 'whyChooseHeadline')
    }

    const infoText = chooseSection.querySelector('.info-box p.text')
    if (infoText) {
      infoText.textContent = str('whyChooseDescription', '')
      infoText.setAttribute('data-phoxta', 'whyChooseDescription')
    }

    // Features list (3 items from benefits)
    const benefits = arr('benefits')
    const featuresList = chooseSection.querySelector('ul.features-list')
    if (featuresList && benefits.length > 0) {
      featuresList.innerHTML = benefits.slice(0, 3).map((b) =>
        `<li>${b.title}${b.description ? ' — ' + b.description : ''}</li>`
      ).join('')
    }

    // Choose image
    const chooseImg = resolveImage(generatedImages, ['about', 'category1', 'hero'], coverImage)
    if (chooseImg) {
      const img = chooseSection.querySelector('.choose-thumb img')
      if (img) {
        replaceImgSrc(img, chooseImg)
        img.setAttribute('data-phoxta-image', 'category1')
      }
    }
  }

  // ------------------------------------------------------------------
  // 10. PROJECT SECTION (4 project cards + CTA banner)
  // ------------------------------------------------------------------
  const projectSection = doc.querySelector('.project-section.style-5')
  if (projectSection) {
    projectSection.setAttribute('id', 'projects')

    // CTA banner above projects
    const ctaBannerText = projectSection.querySelector('.social-proof p.text')
    if (ctaBannerText) {
      ctaBannerText.textContent = str('heroSubheadline', str('whyChooseDescription', ''))
    }
    const ctaBannerBtn = projectSection.querySelector('.project-btn .theme-btn')
    if (ctaBannerBtn) {
      setThemeBtnText(ctaBannerBtn, str('finalCtaButtonText', 'Contact Us Now'))
      const link = ctaBannerBtn as HTMLAnchorElement
      if (businessInfo.ctaUrl) link.href = businessInfo.ctaUrl
    }

    // Project section title
    setSubtitle(projectSection.querySelector('.title-area .sub-title'), str('categoriesSubtitle', 'FEATURED WORKS'))

    const projH2 = projectSection.querySelector('.title-area h2.sec-title')
    if (projH2) projH2.textContent = str('categoriesHeadline', 'Our Featured Work')

    const projText = projectSection.querySelector('.title-area p.sec-text')
    if (projText) projText.textContent = str('aboutDescription', '')

    // 4 project boxes
    const categories = arr('categories')
    const projectBoxes = projectSection.querySelectorAll('.project-box-five')
    const thumbDivs = projectSection.querySelectorAll('.thumbs .thumb')

    projectBoxes.forEach((box, i) => {
      const data = categories[i] || {}

      const badge = box.querySelector('.project-badge a')
      if (badge) {
        badge.textContent = data.title || `Category ${i + 1}`
        badge.setAttribute('href', '#')
      }

      const titleA = box.querySelector('h4.title a')
      if (titleA) {
        titleA.textContent = data.title || ''
        titleA.setAttribute('href', '#')
      }

      const descP = box.querySelector('.description p')
      if (descP) descP.textContent = str('whyChooseDescription', '')

      const learnMore = box.querySelector('.theme-btn.project-btn') as HTMLAnchorElement | null
      if (learnMore) learnMore.href = '#'

      // Project thumbnail images
      const catKey = `category${i + 1}`
      const catImg = resolveImage(generatedImages, [catKey, 'category', 'product' + (i + 1)], coverImage)
      if (catImg && thumbDivs[i]) {
        const img = thumbDivs[i].querySelector('img')
        if (img) {
          replaceImgSrc(img, catImg)
          img.setAttribute('data-phoxta-image', catKey)
        }
      }
    })
  }

  // ------------------------------------------------------------------
  // 11. CTA SECTION
  // ------------------------------------------------------------------
  const ctaSection = doc.querySelector('.cta-section.style-3')
  if (ctaSection) {
    ctaSection.setAttribute('id', 'cta')

    const ctaH2 = ctaSection.querySelector('h2.sec-title')
    if (ctaH2) {
      ctaH2.textContent = str('newsletterTitle', str('heroHeadline', 'Get in Touch'))
      ctaH2.setAttribute('data-phoxta', 'newsletterTitle')
    }

    const ctaP = ctaSection.querySelector('.cta-text p')
    if (ctaP) {
      ctaP.innerHTML = `<i class="fa-regular fa-check"></i> ${str('newsletterSubtitle', 'We are always ready to help you.')}`
    }

    const ctaLink = ctaSection.querySelector('.cta-link')
    if (ctaLink) {
      ctaLink.innerHTML = `<i class="icon-arrow-up-right"></i> ${str('finalCtaButtonText', 'Contact Us')}`
      if (businessInfo.ctaUrl) (ctaLink as HTMLAnchorElement).href = businessInfo.ctaUrl
    }

    // CTA image
    const ctaImg = resolveImage(generatedImages, ['about', 'hero'], coverImage)
    if (ctaImg) {
      const img = ctaSection.querySelector('.image-box .thumb img')
      if (img) {
        replaceImgSrc(img, ctaImg)
        img.setAttribute('data-phoxta-image', 'about')
      }
    }
  }

  // ------------------------------------------------------------------
  // 12. TESTIMONIALS (Swiper carousel — 4 slides, 2 unique duplicated)
  // ------------------------------------------------------------------
  const testimonialSection = doc.querySelector('.testimonial-section.style-5')
  if (testimonialSection) {
    testimonialSection.setAttribute('id', 'testimonials')

    setSubtitle(testimonialSection.querySelector('.testi-content-wrap .sub-title'), str('testimonialSubtitle', 'TESTIMONIAL'))

    const testiH2 = testimonialSection.querySelector('.testi-content-wrap h2.sec-title')
    if (testiH2) {
      testiH2.textContent = str('testimonialHeadline', 'Customer Feedback')
      testiH2.setAttribute('data-phoxta', 'testimonialHeadline')
    }

    const testimonials = arr('testimonials')
    const slides = testimonialSection.querySelectorAll('.swiper-slide')
    slides.forEach((slide, i) => {
      const t = testimonials[i % testimonials.length]
      if (!t) return

      const titleH4 = slide.querySelector('.testimonial-card-five h4.title')
      if (titleH4) {
        titleH4.innerHTML = `<i class="fa-solid fa-quote-left"></i> ${t.name || 'Great Service!'}`
      }

      const textP = slide.querySelector('p.text')
      if (textP) textP.textContent = t.text || ''

      const userName = slide.querySelector('h5.user-name')
      if (userName) userName.textContent = t.name || ''

      const userTitle = slide.querySelector('p.user-title')
      if (userTitle) userTitle.textContent = t.role || ''

      // Testimonial user image
      const userImg = slide.querySelector('.user-image') || slide.querySelector('.user-info img')
      if (userImg) {
        const testiImg = resolveImage(generatedImages, ['testimonial', 'social'], coverImage)
        if (testiImg) {
          replaceImgSrc(userImg, testiImg)
          userImg.setAttribute('data-phoxta-image', 'testimonial')
        }
      }
    })
  }

  // ------------------------------------------------------------------
  // 13. BLOG SECTION (3 blog cards)
  // ------------------------------------------------------------------
  const blogSection = doc.querySelector('.blog-section')
  if (blogSection) {
    blogSection.setAttribute('id', 'blog')

    setSubtitle(blogSection.querySelector('.title-area .sub-title'), str('blogSubtitle', 'LATEST BLOG'))

    const blogH2 = blogSection.querySelector('h2.sec-title')
    if (blogH2) {
      blogH2.textContent = str('blogHeadline', 'Latest Blog Posts')
      blogH2.setAttribute('data-phoxta', 'blogHeadline')
    }

    const blogPosts = arr('blogPosts')
    const blogBoxes = blogSection.querySelectorAll('.blog-single-box')
    blogBoxes.forEach((box, i) => {
      if (i >= blogPosts.length) return

      const titleA = box.querySelector('h4.title a')
      if (titleA) {
        titleA.textContent = blogPosts[i].title || ''
        titleA.setAttribute('href', '#')
      }

      const textP = box.querySelector('.blog-content p.text')
      if (textP) textP.textContent = blogPosts[i].excerpt || ''

      const categoryTag = box.querySelector('.category-tag')
      if (categoryTag) categoryTag.textContent = blogPosts[i].category || 'Article'

      const authorName = box.querySelector('.author .name')
      if (authorName) authorName.innerHTML = `<span>By</span> ${blogPosts[i].author || 'Team'}`

      // Fix dead blog links
      box.querySelectorAll('a[href*="blog-details"]').forEach((a) => a.setAttribute('href', '#'))
      const continueReading = box.querySelector('a.continue-reading') as HTMLAnchorElement | null
      if (continueReading) continueReading.href = '#'

      // Blog image
      const blogKey = `blog${i + 1}`
      const blogImg = resolveImage(generatedImages, [blogKey, 'blog'], coverImage)
      if (blogImg) {
        const img = box.querySelector('.blog-image > img')
        if (img) {
          replaceImgSrc(img, blogImg)
          img.setAttribute('data-phoxta-image', blogKey)
        }
      }
    })
  }

  // ------------------------------------------------------------------
  // 14. NEWSLETTER SECTION
  // ------------------------------------------------------------------
  const newsletterSection = doc.querySelector('.newsletter-section')
  if (newsletterSection) {
    newsletterSection.setAttribute('id', 'contact')

    const nlH3 = newsletterSection.querySelector('.newsletter .text h3')
    if (nlH3) {
      nlH3.textContent = str('newsletterTitle', 'Need a Free Consultation?')
      nlH3.setAttribute('data-phoxta', 'newsletterTitle')
    }

    const emailLink = newsletterSection.querySelector('.email-details a') as HTMLAnchorElement | null
    if (emailLink && businessInfo.contactEmail) {
      emailLink.textContent = businessInfo.contactEmail
      emailLink.href = `mailto:${businessInfo.contactEmail}`
    }

    const emailLabel = newsletterSection.querySelector('.email-details p')
    if (emailLabel) emailLabel.textContent = 'Send e-Mail'
  }

  // ------------------------------------------------------------------
  // 15. FOOTER
  // ------------------------------------------------------------------
  const footerSection = doc.querySelector('footer.footer-section')
  if (footerSection) {
    // Footer description
    const footerText = footerSection.querySelector('.footer-brand p.text')
    if (footerText) {
      footerText.textContent = str('footerDescription', str('footerTagline', ''))
      footerText.setAttribute('data-phoxta', 'footerTagline')
    }

    // Footer social links
    if (businessInfo.socialLinks) {
      const footerSocial = footerSection.querySelector('.footer-social')
      if (footerSocial) {
        const links = businessInfo.socialLinks.split('\n').filter(Boolean)
        const shortMap: Record<string, string> = {
          facebook: 'FB.', instagram: 'IG', twitter: 'TW.', linkedin: 'LN.',
          youtube: 'YT.', tiktok: 'TK.',
        }
        footerSocial.innerHTML = links.map((url) => {
          const platform = Object.keys(shortMap).find((k) => url.toLowerCase().includes(k)) || 'Link'
          const label = shortMap[platform] || 'Link'
          return `<a href="${url}" class="social-link" target="_blank" rel="noopener">${label}</a>`
        }).join('')
      }
    }

    // Footer nav links — Company
    const footerWidgets = footerSection.querySelectorAll('.footer-widget')
    if (footerWidgets.length >= 1) {
      const companyList = footerWidgets[0].querySelector('ul')
      if (companyList) {
        companyList.innerHTML = `
          <li><a href="#hero">Home</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#testimonials">Reviews</a></li>
          <li><a href="#contact">Contact</a></li>
        `
      }
    }
    if (footerWidgets.length >= 2) {
      const serviceList = footerWidgets[1].querySelector('ul')
      if (serviceList) {
        const products = arr('products')
        serviceList.innerHTML = products.slice(0, 5).map((p) =>
          `<li><a href="#services">${p.title || 'Service'}</a></li>`
        ).join('')
      }
    }

    // Newsletter form — change action to prevent submission to external service
    const nlForm = footerSection.querySelector('.newsletter-form') as HTMLFormElement | null
    if (nlForm) {
      nlForm.setAttribute('action', '#')
      nlForm.setAttribute('onsubmit', 'return false')
    }

    // Copyright
    const copyright = footerSection.querySelector('.footer-bottom p')
    const brandName = str('footerTagline', str('heroHeadline', 'My Business'))
    if (copyright) copyright.innerHTML = `&copy;${new Date().getFullYear()} ${brandName}. All rights reserved.`

    // Footer policy links
    footerSection.querySelectorAll('.footer-policy a').forEach((a) => a.setAttribute('href', '#'))
  }

  // ------------------------------------------------------------------
  // 16. Inject editing script (contenteditable + postMessage)
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
        '.hero-content .sub-title',
        '.hero-content h1.title',
        '.hero-content .theme-btn',
        '.info-box h4.title',
        '.feature-section h2.sec-title',
        '.feature-box-four h4.title',
        '.feature-box-four p.text',
        '.about-section h2.sec-title',
        '.about-section p.sec-text',
        '.choose-section h2.sec-title',
        '.choose-section .info-box p.text',
        '.service-section h2.sec-title',
        '.service-box-five h4.title',
        '.service-box-five p.text',
        '.project-section h2.sec-title',
        '.project-box-five h4.title',
        '.project-box-five .description p',
        '.cta-section h2.sec-title',
        '.testimonial-section h2.sec-title',
        '.testimonial-card-five h4.title',
        '.testimonial-card-five p.text',
        '.blog-section h2.sec-title',
        '.blog-single-box h4.title',
        '.blog-single-box p.text',
        '.newsletter .text h3',
        '.footer-brand p.text',
        '.footer-bottom p'
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
