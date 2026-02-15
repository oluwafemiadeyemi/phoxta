import { z } from 'zod'

// ---------------------------------------------------------------------------
// Output schemas per day — mirrors the ai_profile.dayN shapes used by prefill.
// ---------------------------------------------------------------------------

export const DayDraftSchemas: Record<number, z.ZodTypeAny> = {
  1: z.object({
    problemStatement: z.string(),
    targetCustomer: z.string(),
    painPoints: z.array(z.string()).min(3).max(8),
    existingSolutions: z.string().optional(),
  }),

  2: z.object({
    marketSize: z.string(),
    competitors: z.array(z.string()).min(1).max(8),
    trends: z.string(),
    opportunities: z.string().optional(),
  }),

  3: z.object({
    coreOutcome: z.string(),
    mvpType: z.enum(['manual', 'nocode', 'lightweight']),
    valueProposition: z.string().optional(),
    differentiation: z.string().optional(),
    keyBenefits: z.array(z.string()).optional(),
    unfairAdvantage: z.string().optional(),
  }),

  4: z.object({
    hooks: z
      .array(
        z.object({
          type: z.enum(['pain', 'outcome', 'fear']),
          text: z.string(),
        }),
      )
      .length(3),
    recommendedHookType: z.enum(['pain', 'outcome', 'fear']),
    keyFindings: z.string(),
    customerInsights: z.array(z.string()).min(3).max(8),
    marketEvidence: z.array(z.string()).min(2).max(6),
    willingnessEstimate: z.enum(['not_willing', 'somewhat', 'very_willing', 'eager']),
    researchSampleSize: z.number(),
    interviewQuestions: z.array(z.string()).min(5).max(10),
  }),

  5: z.object({
    timeAvailabilityHours: z.number(),
    toolPreference: z.enum(['manual', 'nocode', 'code']),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    budgetRange: z.enum(['0-50', '50-200', '200-1000', '1000+']),
    platformTarget: z.enum(['web', 'mobile', 'both']),
    revenueModel: z.string().optional(),
    pricingStrategy: z.string().optional(),
    costStructure: z.string().optional(),
  }),

  6: z.object({
    launchChannels: z
      .array(z.enum(['community', 'cold_outreach', 'ads', 'partners']))
      .min(1)
      .max(4),
    recommendedTouchCount: z.number(),
    outreachScripts: z.array(z.string()).length(3),
  }),

  8: z.object({
    companyName: z.string(),
    missionStatement: z.string(),
    visionStatement: z.string(),
    elevatorPitch: z.string(),
    problemStatement: z.string(),
    solutionOverview: z.string(),
    targetMarket: z.string(),
    marketSize: z.string(),
    competitiveLandscape: z.string(),
    uniqueValueProp: z.string(),
    revenueModel: z.string(),
    unitEconomics: z.string(),
    financialProjections: z.string(),
    fundingRequirements: z.string().optional(),
    goToMarket: z.string(),
    salesStrategy: z.string(),
    marketingPlan: z.string(),
    operationsPlan: z.string(),
    technologyStack: z.string(),
    teamStructure: z.string(),
    milestones: z.string(),
    riskAnalysis: z.string(),
    legalCompliance: z.string().optional(),
    exitStrategy: z.string().optional(),
    kpis: z.string(),
  }),

  9: z.object({
    brandName: z.string(),
    brandStory: z.string(),
    colorPalette: z.array(z.string()).min(3).max(5),
    typography: z.string(),
    brandVoice: z.string(),
    visualDirection: z.string(),
    logoGuidelines: z.string(),
    brandPersonalityProfile: z.string(),
  }),

  10: z.object({
    bannerSubtitle: z.string(),
    heroHeadline: z.string(),
    heroSubheadline: z.string(),
    heroCtaText: z.string(),
    heroImagePrompt: z.string(),
    discountCards: z.array(z.object({
      title: z.string(),
      description: z.string(),
      ctaText: z.string(),
    })).min(1).max(5),
    chooseSubtitle: z.string(),
    whyChooseHeadline: z.string(),
    whyChooseDescription: z.string(),
    benefits: z.array(z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string(),
    })).min(1).max(5),
    featuresSubtitle: z.string(),
    featuresSectionTitle: z.string(),
    products: z.array(z.object({
      title: z.string(),
      description: z.string(),
      icon: z.string(),
    })).min(1).max(8),
    aboutSubtitle: z.string(),
    aboutHeadline: z.string(),
    aboutDescription: z.string(),
    aboutCtaText: z.string(),
    aboutStats: z.array(z.object({
      number: z.string(),
      suffix: z.string(),
      label: z.string(),
    })).min(1).max(5),
    categoriesSubtitle: z.string(),
    categoriesHeadline: z.string(),
    categories: z.array(z.object({
      title: z.string(),
    })).min(1).max(6),
    offerSubtitle: z.string(),
    offerHeadline: z.string(),
    offerDescription: z.string(),
    offerCtaText: z.string(),
    offerProducts: z.array(z.object({
      title: z.string(),
      description: z.string(),
    })).min(1).max(7),
    testimonialSubtitle: z.string(),
    testimonialHeadline: z.string(),
    testimonials: z.array(z.object({
      text: z.string(),
      name: z.string(),
      role: z.string(),
    })).min(1).max(5),
    blogSubtitle: z.string(),
    blogHeadline: z.string(),
    blogPosts: z.array(z.object({
      title: z.string(),
      excerpt: z.string(),
    })).min(1).max(5),
    newsletterTitle: z.string(),
    newsletterSubtitle: z.string(),
    finalCtaButtonText: z.string(),
    footerDescription: z.string(),
    footerTagline: z.string(),
    metaTitle: z.string(),
    metaDescription: z.string(),
    colorScheme: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string(),
      text: z.string(),
    }),
    imageSearchTerms: z.object({
      hero: z.string(),
      discount1: z.string(),
      discount2: z.string(),
      discount3: z.string(),
      product1: z.string(),
      product2: z.string(),
      product3: z.string(),
      product4: z.string(),
      product5: z.string(),
      product6: z.string(),
      about: z.string(),
      category1: z.string(),
      category2: z.string(),
      category3: z.string(),
      category4: z.string(),
      testimonial: z.string(),
      blog1: z.string(),
      blog2: z.string(),
      blog3: z.string(),
    }),
  }),
}

// ---------------------------------------------------------------------------
// Day metadata for prompts
// ---------------------------------------------------------------------------

const DAY_NAMES: Record<number, string> = {
  1: 'Problem Definition',
  2: 'Market Research',
  3: 'Value Proposition',
  4: 'Customer Validation',
  5: 'Business Model',
  6: 'Launch Preparation',
  7: 'Final Verdict',
  8: 'Business Plan',
  9: 'Brand Identity',
  10: 'Landing Page',
}

const DAY_FIELD_SPECS: Record<number, string> = {
  1: `- problemStatement (string): A rigorous, specific problem statement. Must name the exact audience, the frequency and severity of the problem, and why current solutions fail. No vague generalisations — ground it in observable reality. Think "Senior DevOps engineers at Series B+ SaaS companies waste 8-12 hours/week on incident triage because existing monitoring tools generate 70% false-positive alerts" not "Developers have trouble with monitoring."
- targetCustomer (string): A precise customer profile with demographics, psychographics, context, and buying behaviour. Include their role, company stage/size, budget authority, and what makes them the ideal early adopter (not just "who has the problem" but "who is most desperate to solve it right now").
- painPoints (string[3-8]): Distinct, specific pain points grounded in observable behaviour. Each pain point should describe WHAT hurts, HOW OFTEN it happens, and WHAT IT COSTS (time, money, reputation, emotional toll). Avoid generic complaints — cite specific scenarios.
- existingSolutions (string, optional): What solutions, workarounds, or coping mechanisms people currently use, and specifically where each one falls short.`,

  2: `- marketSize (string): Rigorous TAM/SAM/SOM estimate with actual figures in GBP (£). Include your methodology (top-down from industry reports OR bottom-up from customer count × ARPU). Name your sources (e.g. "Statista 2025", "IBISWorld", "company annual reports"). If bottom-up, show the calculation. Never give round numbers without justification.
- competitors (string[1-8]): Names of direct and indirect competitors. Include both established players and emerging startups. For each, mentally consider their annual revenue, funding raised, market share, and core weakness.
- trends (string): 3-5 sentences on current market trends with SPECIFIC data points, named sources, and year references. Include both tailwinds (why now?) and headwinds (what could slow adoption?). Reference technology shifts, regulatory changes, or behavioural trends driving the market.
- opportunities (string, optional): Specific structural market gaps, underserved segments, or strategic whitespace. Not vague "opportunities" — name the exact gap, who is underserved, and why incumbents haven't addressed it.`,

  3: `- coreOutcome (string): The single most important measurable outcome a user gets. Must be specific, quantifiable where possible, and tied to a metric the user cares about (e.g. "reduce incident response time from 45 minutes to under 5 minutes" not "save time").
- mvpType ("manual"|"nocode"|"lightweight"): The fastest credible path to test the core assumption. Justify why this approach over alternatives.
- valueProposition (string, optional): A clear, compelling value proposition following a structured format: For [target], who [need], [product] is a [category] that [key benefit]. Unlike [alternative], we [differentiator].
- differentiation (string, optional): The specific, defensible wedge that makes this 10x better (not marginally different) from existing solutions. Address why this can't be easily replicated.
- keyBenefits (string[], optional): 3-5 key benefits stated as outcomes, not features. Each should answer "so what?" from the customer's perspective.
- unfairAdvantage (string, optional): Any structural, defensible advantage — proprietary data, network effects, regulatory moats, unique expertise, or distribution advantages. Be honest if none exists yet.`,

  4: `- hooks (array of exactly 3): Each with {type: "pain"|"outcome"|"fear", text: string}. One per type. Each hook MUST be a bold, declarative STATEMENT — never a question. Pain hooks highlight a specific frustration with concrete details (name the exact pain, the time/money cost). Outcome hooks describe a vivid, specific transformation (before → after). Fear hooks state a concrete, data-backed consequence of inaction.
- recommendedHookType ("pain"|"outcome"|"fear"): Which hook type to lead with based on the validated data from previous days. Justify your choice based on what the evidence shows resonates most with this specific audience.
- keyFindings (string): 5-8 sentences synthesising publicly available evidence about whether this problem is real and significant. Cite SPECIFIC sources by name — subreddit names, review site names, research paper titles, industry report publishers. Analyse patterns across sources, not just individual data points. Address both confirming and disconfirming evidence.
- customerInsights (string[3-8]): Specific customer pain points, desires, or behaviours inferred from public data. Each insight must reference its source type (e.g. "App store reviews of [competitor] reveal frustration with...", "Reddit r/[sub] users frequently describe..."). These should reveal non-obvious needs, not just restate the problem statement.
- marketEvidence (string[2-6]): Specific, verifiable evidence references with concrete data points — e.g. "G2 reviews of [competitor] show 40% mention [specific complaint]" or "Reddit r/[subreddit] averages 15+ posts/month about [problem]" or "[Research firm] 2025 report found Y% of [audience] cite [problem] as top-3 challenge". Each reference must be plausible and specific enough to verify.
- willingnessEstimate ("not_willing"|"somewhat"|"very_willing"|"eager"): Based on publicly available pricing data, competitor revenue signals, and evidence of current spending on alternatives. Justify your rating.
- researchSampleSize (number): Total number of data points, forum posts, reviews, survey respondents, and research sources you synthesised. Be realistic and honest — typically 50-500+ depending on topic popularity.
- interviewQuestions (string[5-10]): Sharp, open-ended interview questions designed to FALSIFY the riskiest assumptions first. Questions should uncover hidden needs, test willingness to pay (without leading), and reveal switching costs. No leading questions, no yes/no questions, no questions that telegraph the desired answer.`,

  5: `- timeAvailabilityHours (number): Realistic weekly hours needed for this type of project, accounting for the founder's context.
- toolPreference ("manual"|"nocode"|"code"): Best tool approach given the MVP type and required functionality. Consider what's genuinely feasible for a solo founder.
- skillLevel ("beginner"|"intermediate"|"advanced"): Minimum required skill level to execute this MVP credibly.
- budgetRange ("0-50"|"50-200"|"200-1000"|"1000+"): Realistic estimated budget including tools, hosting, marketing spend, and any paid services needed.
- platformTarget ("web"|"mobile"|"both"): Best platform for reaching the target audience where they already spend time. Consider distribution advantages.
- revenueModel (string, optional): Specific revenue model with reasoning — subscription, one-time, freemium, usage-based, marketplace commission, etc. Reference what works in this specific market and why.
- pricingStrategy (string, optional): Concrete pricing recommendation with specific numbers, anchored in competitor pricing analysis and willingness-to-pay signals. Include pricing psychology reasoning (anchoring, decoy, value-metric alignment).
- costStructure (string, optional): Key cost drivers with estimated figures — hosting, tools, customer acquisition cost (CAC), and the path to unit economics profitability.`,

  6: `- launchChannels (array of 1-4): "community"|"cold_outreach"|"ads"|"partners". Choose based on where the target audience is most reachable and receptive. Justify each channel selection based on evidence from previous days.
- recommendedTouchCount (number): How many people to reach in the first launch push. Base this on expected conversion rates for the channel and the minimum sample size needed for statistically meaningful validation.
- outreachScripts (string[3]): Exactly 3 copy-pasteable outreach messages, each tailored to a different channel or audience segment. Messages should be concise, personalised-feeling, lead with the customer's pain (not the product), include a clear CTA, and avoid sounding like spam. Reference specific insights from the validation process.`,

  8: `- companyName (string): A strong, memorable company or product name. If the founder already named it, use that. Otherwise suggest the single best name based on the idea, market, and brand positioning from previous phases.
- missionStatement (string): A clear, concise mission statement (1-2 sentences). State WHO the company serves, WHAT it does, and WHY it matters. Avoid corporate buzzwords. Example format: "We help [audience] [achieve outcome] by [mechanism], so they can [ultimate benefit]."
- visionStatement (string): An ambitious but credible 5-10 year vision. Describe the world the company is building toward. Should be inspiring but grounded in the validated market opportunity. 2-3 sentences.
- elevatorPitch (string): A compelling 30-second pitch covering: the problem (1 sentence), the solution (1 sentence), the market size (1 sentence), and why now / why us (1 sentence). This should be conversational and memorable, not corporate.
- problemStatement (string): A rigorous articulation of the core problem. Quantify the pain: how often it occurs, how much it costs (time/money/reputation), and how many people are affected. Reference specific evidence from the validation phases. 150-250 words.
- solutionOverview (string): How the product/service solves the problem. Cover the core mechanism, key features, user experience, and what makes this approach superior to alternatives. Explain the "aha moment" — when does the customer realise the value? 200-300 words.
- targetMarket (string): Detailed customer segmentation with 2-3 distinct personas. For each: demographics, psychographics, buying behaviour, decision-making process, and estimated segment size. Identify the beachhead segment (which to target first and why). 250-400 words.
- marketSize (string): Rigorous TAM/SAM/SOM calculation with methodology shown. Use bottom-up AND top-down approaches. Include sources, growth rate projections (CAGR), and key drivers. Present in both GBP and USD. Show the math: customer count × ARPU for bottom-up. 200-300 words.
- competitiveLandscape (string): Map direct competitors (same solution, same market), indirect competitors (different solution, same problem), and potential future competitors. For each: strengths, weaknesses, market share estimate, and funding/revenue signals. Identify the strategic gap this venture fills. 300-400 words.
- uniqueValueProp (string): The single most defensible reason customers choose this over alternatives. Must be specific, measurable, and hard to replicate. Address: what makes this 10x better (not marginally), and what structural moats protect it (network effects, data advantages, regulatory, switching costs). 150-250 words.
- revenueModel (string): Detailed revenue architecture. Cover: primary revenue stream, secondary revenue streams, pricing tiers with specific price points, billing frequency, pricing psychology (anchoring, decoy effects), and how pricing evolves from early-stage to scale. Reference competitor pricing as benchmarks. 250-350 words.
- unitEconomics (string): Detailed unit economics analysis. Calculate: Customer Acquisition Cost (CAC) broken down by channel, Lifetime Value (LTV) with churn assumptions, LTV:CAC ratio, payback period, gross margin, contribution margin, and break-even point. Show the math with specific numbers. 200-300 words.
- financialProjections (string): 3-year financial projection. Year 1 monthly, Years 2-3 quarterly. Cover: revenue (by stream), COGS, gross profit, operating expenses (broken down: engineering, sales, marketing, G&A), EBITDA, cash flow, and cumulative cash position. State key assumptions explicitly. Include best/base/worst scenario variants. 400-500 words.
- fundingRequirements (string, optional): Total funding needed with detailed use-of-funds breakdown (percentages and absolutes). Cover: product development, hiring, marketing, operations, and runway buffer. Include expected milestones per funding round and timeline to profitability or next raise. 200-300 words.
- goToMarket (string): Phase-by-phase GTM strategy. Phase 1 (0-3 months): initial traction tactics, first 50 customers. Phase 2 (3-9 months): scaling validated channels. Phase 3 (9-18 months): expansion and new channels. For each phase: specific tactics, budget, expected CAC, conversion rates, and growth targets. 300-400 words.
- salesStrategy (string): Sales process design. Cover: sales cycle length, sales methodology (inbound vs outbound vs product-led), key stages in the funnel with conversion rate benchmarks, sales team structure, commission/incentive model, and CRM/tooling strategy. If B2B: decision-maker mapping and procurement process. 250-350 words.
- marketingPlan (string): Channel-by-channel marketing plan. For each channel (content, SEO, paid ads, social, partnerships, PR, events): specific tactics, budget allocation, expected ROI/ROAS, key metrics, and timeline. Include content strategy pillars and brand awareness vs. demand gen split. 300-400 words.
- operationsPlan (string): Day-to-day operations blueprint. Cover: core processes and workflows, technology infrastructure, vendor/supplier relationships, quality assurance, customer support model (SLA, channels, team), and operational KPIs with targets. Include first-year operational budget breakdown. 250-350 words.
- technologyStack (string): Technology choices and product roadmap. Cover: architecture decisions (monolith vs. microservices, cloud provider), tech stack with justification, build vs. buy decisions, development methodology (agile, sprint cadence), security and compliance measures, and 12-month product roadmap with quarterly milestones. 250-350 words.
- teamStructure (string): Organisation design. Cover: current team (roles, backgrounds, equity split), first 5 key hires with job descriptions and salary ranges, advisory board composition, organisational chart at 6/12/24 months, and culture values. Address skill gaps honestly. 250-350 words.
- milestones (string): 12-month roadmap as a month-by-month action plan. Each month: 2-3 specific deliverables with success metrics, dependencies, and responsible roles. Highlight the 3-5 critical inflection points that determine success or failure. 300-400 words.
- riskAnalysis (string): Comprehensive risk register. For each risk category (market, product, technical, competitive, regulatory, team, financial): identify top 2-3 risks, assign probability (high/medium/low) and impact (high/medium/low), provide specific mitigation strategy, and define trigger points for contingency plans. 300-400 words.
- legalCompliance (string, optional): Legal and regulatory landscape. Cover: required licences/permits, data protection compliance (GDPR, CCPA), intellectual property strategy (patents, trademarks, trade secrets), key contracts needed, employment law considerations, and industry-specific regulations. 200-300 words.
- exitStrategy (string, optional): Potential exit paths. Cover: strategic acquisition (name 3-5 likely acquirers and rationale), IPO timeline and requirements, management buyout, or lifestyle business. Include comparable exit valuations from the industry and realistic timeline. 150-250 words.
- kpis (string): Define 10-15 Key Performance Indicators across categories: Growth (MRR, user growth rate, viral coefficient), Engagement (DAU/MAU, session length, feature adoption), Revenue (ARPU, expansion revenue, churn rate), Efficiency (CAC payback, burn multiple, revenue per employee), and Product (NPS, time-to-value, support ticket volume). For each: definition, target, measurement frequency, and data source. 250-350 words.`,

  9: `- brandName (string): If the founder hasn't specified one, suggest 3-5 brand name candidates with rationale for each. Consider memorability, domain availability likelihood, international pronunciation, trademark risk, and alignment with brand personality. Explain the linguistic and psychological reasoning behind each suggestion.
- brandStory (string): A compelling origin story and brand narrative that humanises the venture. Include the founder's motivation ("why this, why now"), the transformative mission, and the emotional arc from problem to solution. Write in a style that could appear on an "About" page and resonate with the target audience. 200-400 words.
- colorPalette (string[3-5]): Specific hex colour codes with psychological and strategic justification for each. Primary colour should align with brand personality and industry conventions (or deliberately break them, with reasoning). Include accessibility considerations (WCAG contrast ratios) and how the palette performs across digital and print media.
- typography (string): Specific font pairing recommendations (heading + body) with reasoning. Consider readability at scale, brand personality alignment, web performance (loading times), and licensing. Suggest Google Fonts or open-source alternatives. Specify font weights, sizes, and line heights for key use cases.
- brandVoice (string): Define the brand's voice along 4-5 dimensions (e.g. formal↔casual, serious↔playful, technical↔accessible). Provide 3 example sentences showing the correct tone, and 3 "anti-examples" showing what the brand should NOT sound like. Include guidelines for different contexts: social media, customer support, marketing copy, product UI.
- visualDirection (string): Art direction brief covering photography/illustration style, iconography approach, layout principles, whitespace philosophy, and visual hierarchy rules. Reference 2-3 existing brands as visual benchmarks ("the visual sophistication of X meets the approachability of Y"). Include guidance for both digital and physical touchpoints.
- logoGuidelines (string): Logo design brief covering: concept direction (abstract vs. lettermark vs. wordmark vs. emblem), required variations (full colour, monochrome, reversed, favicon), minimum sizes, clear space rules, and usage restrictions. Describe 2-3 concept directions with sketched descriptions and rationale.
- brandPersonalityProfile (string): Brand personality defined using a recognised framework (e.g. Aaker's Brand Personality Dimensions or Jungian archetypes). Map the brand on 5 personality dimensions with scores, identify the primary and secondary archetypes, and explain how these manifest in customer interactions, marketing, and product design.`,
  10: `CRITICAL: All content lengths MUST match the template structure. The website template has precise text slots — your text is injected directly into a live HTML template. Too much text breaks the layout.

- bannerSubtitle (string): EXACTLY 2 words. A short teaser label above the headline, e.g. "Premium Quality" or "Smart Solution". 2 words only.
- heroHeadline (string): EXACTLY 7 words. A bold headline. Must be exactly 7 words — no more, no less. e.g. "Transform Your Workflow With Intelligent Automation Today"
- heroSubheadline (string): EXACTLY 15 words. One sentence expanding on the headline with a specific benefit. Precisely 15 words.
- heroCtaText (string): EXACTLY 2 words. CTA button text, e.g. "Get Started", "Try Free", "Join Now". 2 words only.
- heroImagePrompt (string): A detailed DALL-E image prompt (2-3 sentences) for the hero section. Photorealistic, clean, professional, no text in image.
- discountCards (array of EXACTLY 3 objects): Promo/value proposition cards. Each with:
  {title: string (EXACTLY 2 words), description: string (EXACTLY 4 words), ctaText: string (EXACTLY 2 words)}
  Example: {title: "New Feature", description: "Boost Your Team Productivity", ctaText: "Learn More"}
- chooseSubtitle (string): EXACTLY 2 words. Label above the "why choose us" heading, e.g. "Best Choice" or "Why Us". 2 words only.
- whyChooseHeadline (string): EXACTLY 6 words. Section heading for "why choose us". e.g. "Why Smart Teams Choose Our Platform"
- whyChooseDescription (string): EXACTLY 14 words. One sentence explaining the core reason to choose this product/service.
- benefits (array of EXACTLY 3 objects): Each with:
  {title: string (EXACTLY 3 words), description: string (EXACTLY 6 words), icon: string (single emoji)}
  These map to benefit cards with an icon, a short title, and brief description.
- featuresSubtitle (string): EXACTLY 2 words. Label above the features heading, e.g. "Our Products" or "Key Features". 2 words only.
- featuresSectionTitle (string): EXACTLY 3 words. Section heading for features grid, e.g. "Our Key Features"
- products (array of EXACTLY 6 objects): Feature/product cards. Each with:
  {title: string (EXACTLY 4 words), description: string (EXACTLY 12 words), icon: string (single emoji)}
  These are displayed as feature cards with image, title, and short description.
- aboutSubtitle (string): EXACTLY 2 words. Label above the about heading, e.g. "About Us" or "Our Story". 2 words only.
- aboutHeadline (string): EXACTLY 7 words. About section heading, e.g. "Building the Future of Remote Collaboration"
- aboutDescription (string): EXACTLY 21 words. One paragraph for the about section. Precisely 21 words.
- aboutCtaText (string): EXACTLY 2 words. CTA button text for the about section, e.g. "Read More" or "Learn More". 2 words only.
- aboutStats (array of EXACTLY 3 objects): Counter statistics. Each with:
  {number: string (a number like "23" or "100"), suffix: string (1-2 chars like "+" or "%" or "k+"), label: string (EXACTLY 2-3 words)}
- categoriesSubtitle (string): EXACTLY 2 words. Label above the categories heading, e.g. "Explore More" or "Use Cases". 2 words only.
- categoriesHeadline (string): EXACTLY 3 words. Categories section heading, e.g. "Browse By Category" or "Explore Solutions". 3 words only.
- categories (array of EXACTLY 4 objects): Category/use-case cards. Each with:
  {title: string (EXACTLY 3 words)}
- offerSubtitle (string): EXACTLY 2 words. Label above the offer heading, e.g. "Special Offer" or "Limited Deal". 2 words only.
- offerHeadline (string): EXACTLY 3 words. Special offer/pricing section heading.
- offerDescription (string): EXACTLY 7 words. One sentence about the offer.
- offerCtaText (string): EXACTLY 2 words. CTA button text for the offer section, e.g. "Shop Now" or "Get Deal". 2 words only.
- offerProducts (array of EXACTLY 5 objects): Product/feature highlight items. Each with:
  {title: string (EXACTLY 2 words), description: string (EXACTLY 7 words)}
- testimonialSubtitle (string): EXACTLY 1 word. Label above the testimonials heading, e.g. "Testimonials" or "Reviews". 1 word only.
- testimonialHeadline (string): EXACTLY 3 words. Testimonials section heading, e.g. "What Clients Say" or "Customer Reviews". 3 words only.
- testimonials (array of EXACTLY 3 objects): Social proof testimonials. Each with:
  {text: string (EXACTLY 21 words), name: string (EXACTLY 2 words — first and last name), role: string (EXACTLY 2 words, e.g. "Happy Client")}
  The testimonial text must be EXACTLY 21 words. Write realistic, specific quotes about the product/service experience.
- blogSubtitle (string): EXACTLY 3 words. Label above the blog heading, e.g. "News and Tips" or "Latest Updates". 3 words only.
- blogHeadline (string): EXACTLY 4 words. Blog section heading, e.g. "Our Latest Blog Posts" or "Read Our Articles". 4 words only.
- blogPosts (array of EXACTLY 3 objects): Article/tip cards. Each with:
  {title: string (EXACTLY 9 words), excerpt: string (EXACTLY 9 words)}
- newsletterTitle (string): EXACTLY 2 words. Newsletter section label.
- newsletterSubtitle (string): EXACTLY 8 words. Newsletter section heading.
- finalCtaButtonText (string): EXACTLY 1 word. Subscribe button text, e.g. "Subscribe"
- footerDescription (string): EXACTLY 24 words. Company description for the footer. 24 words.
- footerTagline (string): Company copyright tagline (5-10 words).
- metaTitle (string): SEO page title (50-60 characters).
- metaDescription (string): SEO meta description (150-160 characters).
- colorScheme (object): {primary: hex, secondary: hex, accent: hex, background: hex, text: hex}. Pull from brand identity (Day 9) if available.
- imageSearchTerms (object): Pexels stock photo search queries for EVERY image slot in the website template. Each value is a 2-4 word search query optimised for finding relevant professional stock photos on Pexels.
  Generate queries specific to the user's validated business idea — NOT generic terms.
  {
    hero: "search query for the main hero/banner image",
    discount1: "query for first promo card image",
    discount2: "query for second promo card image",
    discount3: "query for third promo card image",
    product1: "query for product/feature 1 image",
    product2: "query for product/feature 2 image",
    product3: "query for product/feature 3 image",
    product4: "query for product/feature 4 image",
    product5: "query for product/feature 5 image",
    product6: "query for product/feature 6 image",
    about: "query for about section image",
    category1: "query for category 1 image",
    category2: "query for category 2 image",
    category3: "query for category 3 image",
    category4: "query for category 4 image",
    testimonial: "query for testimonials section background/person image",
    blog1: "query for blog article 1 image",
    blog2: "query for blog article 2 image",
    blog3: "query for blog article 3 image"
  }
  Example for a coffee shop: {hero: "modern coffee shop interior", product1: "espresso latte art", about: "barista brewing coffee", ...}
  Example for a SaaS tool: {hero: "team collaboration workspace", product1: "dashboard analytics screen", about: "software development team", ...}`,
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

interface PreviousDayData {
  dayNumber: number
  inputs: Record<string, unknown> | null
  aiOutput: Record<string, unknown> | null
}

export function buildDayDraftPrompt(
  targetDay: number,
  ideaSeed: string,
  previousDays: PreviousDayData[],
): string {
  const parts: string[] = []

  parts.push(
    `You are Phoxta's sequential day drafter. Generate refined form defaults for Day ${targetDay} (${DAY_NAMES[targetDay]}) based on the founder's actual progress so far.`,
  )
  parts.push('')
  parts.push(`IDEA SEED: "${ideaSeed}"`)
  parts.push('')

  const daysWithData = previousDays.filter((d) => d.inputs || d.aiOutput)
  if (daysWithData.length > 0) {
    parts.push(
      `COMPLETED DAYS (use this data to make Day ${targetDay} drafts specific and informed):`,
    )
    parts.push('')
    for (const pd of daysWithData) {
      parts.push(`--- Day ${pd.dayNumber}: ${DAY_NAMES[pd.dayNumber]} ---`)
      if (pd.inputs) {
        parts.push(`User Inputs: ${JSON.stringify(pd.inputs, null, 2)}`)
      }
      if (pd.aiOutput) {
        const summary = JSON.stringify(pd.aiOutput)
        parts.push(
          `AI Analysis: ${summary.length > 2000 ? summary.slice(0, 2000) + '...' : summary}`,
        )
      }
      parts.push('')
    }
  }

  parts.push(`GENERATE DEFAULTS FOR DAY ${targetDay}: ${DAY_NAMES[targetDay]}`)
  parts.push('')
  parts.push('Return a JSON object with these exact fields:')
  parts.push(DAY_FIELD_SPECS[targetDay] ?? '')
  parts.push('')
  parts.push('RULES:')
  parts.push('- Return ONLY valid JSON. No prose outside JSON, no code fences.')
  parts.push(
    '- Base suggestions on the actual data from previous days — be specific, not generic.',
  )
  parts.push(
    '- If previous days reveal pivots, competitor gaps, or customer pain points, reflect them.',
  )
  parts.push('- Array length constraints are strict.')
  parts.push('- Be concrete and actionable. No placeholder text.')
  parts.push('')
  if (targetDay === 10) {
    parts.push('FORMATTING STANDARDS (Day 10 — Landing Page Copy):')
    parts.push('- ABSOLUTELY NO MARKDOWN FORMATTING. No **bold**, no *italic*, no # headings, no - bullet lists, no numbered lists.')
    parts.push('- Write clean, plain text only. The text is rendered directly on a live website — any markdown syntax will appear as literal characters.')
    parts.push('- Use natural prose sentences and paragraphs. Separate paragraphs with a single newline.')
    parts.push('- Write in a punchy, conversion-focused copywriting tone. Every word must earn its place.')
    parts.push('- Write for a real customer visiting the website, not an investor reading a report.')
  } else {
    parts.push('FORMATTING STANDARDS (apply to all string values inside the JSON):')
    parts.push('- Use **bold** for key terms, metrics, company names, and important phrases.')
    parts.push('- Use bullet points (- ) for lists of items, features, or action steps.')
    parts.push('- Use numbered lists (1. 2. 3.) for sequential steps, rankings, or prioritised items.')
    parts.push('- Use clear paragraph breaks (double newlines) between distinct sections or ideas.')
    parts.push('- Use section headers in **bold** followed by a colon for multi-part responses.')
    parts.push('- Structure long-form fields like an executive brief: lead with the key insight, then supporting detail.')
    parts.push('- Write in a polished, professional tone suitable for board-level or investor-facing documents.')
    parts.push('- Every paragraph should start with the most important information first.')
  }
  parts.push('')
  parts.push('QUALITY STANDARDS (non-negotiable):')
  parts.push('- DEPTH: Go beyond surface-level. Analyse root causes, second-order effects, and non-obvious dynamics. Shallow observations are unacceptable.')
  parts.push('- SPECIFICITY: Use concrete numbers, named sources, real competitors, actual market data. Never say "the market is growing" without citing a figure and source.')
  parts.push('- CONTRARIAN LENS: Actively challenge assumptions. What could go wrong? What are the strongest counter-arguments? What blind spots might the founder have?')
  parts.push('- DEFENSIBILITY: For any competitive analysis, address what stops incumbents from replicating this in weeks.')
  parts.push('- INTELLECTUAL HONESTY: If data is insufficient, say so. Distinguish between validated facts and educated inferences.')
  parts.push('- NO GENERIC ADVICE: Every insight must be specific to THIS idea, THIS market, THIS audience. If your output could apply to any random startup, it\'s not good enough.')

  return parts.join('\n')
}
