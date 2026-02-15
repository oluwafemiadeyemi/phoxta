// ---------------------------------------------------------------------------
// Prefill helper — reads ai_profile to provide defaults for each day's form
// ---------------------------------------------------------------------------

interface Hook {
  type: string
  text: string
}

const DAY5_DEFAULTS = {
  timeAvailabilityHours: 10,
  toolPreference: 'nocode',
  skillLevel: 'beginner',
  budgetRange: '0-50',
  platformTarget: 'web',
}

interface AiProfile {
  problemStatement?: string
  targetAudience?: string
  day1SearchPhrases?: string[]
  existingSolutions?: string[]
  day1?: {
    problemStatement?: string
    targetCustomer?: string
    painPoints?: string[]
    existingSolutions?: string
  }
  day2?: {
    marketSize?: string
    competitors?: string[]
    trends?: string
    opportunities?: string
  }
  day2Competitors?: string[]
  competitorCandidates?: string[]
  day3?: {
    coreOutcome?: string
    mvpType?: string
    valueProposition?: string
    differentiation?: string
    keyBenefits?: string[]
    unfairAdvantage?: string
  }
  day3CoreOutcome?: string
  day3MvpType?: string
  day4?: {
    hooks?: Hook[]
    recommendedHookType?: string
    keyFindings?: string
    customerInsights?: string[]
    marketEvidence?: string[]
    willingnessEstimate?: string
    researchSampleSize?: number
    interviewQuestions?: string[]
  }
  day4Hooks?: Hook[]
  day5?: {
    timeAvailabilityHours?: number
    toolPreference?: string
    skillLevel?: string
    budgetRange?: string
    platformTarget?: string
    revenueModel?: string
    pricingStrategy?: string
    costStructure?: string
  }
  day5Preferences?: {
    timeAvailabilityHours?: number
    toolPreference?: string
    skillLevel?: string
    budgetRange?: string
    platformTarget?: string
  }
  day6?: {
    launchChannels?: string[]
    recommendedTouchCount?: number
    outreachScripts?: string[]
  }
  day6LaunchPlan?: {
    launchChannels: string[]
    recommendedTouchCount: number
    outreachScriptDrafts: string[]
    outreachScripts?: string[]
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

/**
 * Extract prefill values for a specific day from the idea's ai_profile.
 */
export function getPrefillForDay(
  dayNumber: number,
  idea: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!idea) return {}

  const profile = (idea.ai_profile ?? {}) as AiProfile

  switch (dayNumber) {
    case 1: {
      const d1 = profile.day1
      return {
        problemStatement:
          d1?.problemStatement ??
          profile.problemStatement ??
          (idea?.problem_statement as string | undefined) ??
          '',
        targetCustomer:
          d1?.targetCustomer ??
          profile.targetAudience ??
          (idea?.target_audience as string | undefined) ??
          '',
        painPoints:
          d1?.painPoints ??
          profile.day1SearchPhrases ??
          [],
        existingSolutions:
          d1?.existingSolutions ??
          (profile.existingSolutions?.length
            ? profile.existingSolutions.join('; ')
            : ''),
      }
    }

    case 2: {
      const d2 = profile.day2
      return {
        competitors: d2?.competitors ?? profile.day2Competitors ?? profile.competitorCandidates ?? [],
        marketSize: d2?.marketSize ?? '',
        trends: d2?.trends ?? '',
        opportunities: d2?.opportunities ?? '',
      }
    }

    case 3: {
      const d3 = profile.day3
      return {
        mvpType: d3?.mvpType ?? profile.day3MvpType ?? idea?.mvp_type ?? 'nocode',
        coreOutcome: d3?.coreOutcome ?? profile.day3CoreOutcome ?? idea?.core_outcome ?? '',
        valueProposition: d3?.valueProposition ?? '',
        differentiation: d3?.differentiation ?? '',
        keyBenefits: d3?.keyBenefits ?? [],
        unfairAdvantage: d3?.unfairAdvantage ?? '',
      }
    }

    case 4:
      return {
        chosenHookType: profile.day4?.recommendedHookType ?? 'pain',
        hooks: profile.day4?.hooks ?? profile.day4Hooks ?? [],
        keyFindings: profile.day4?.keyFindings ?? '',
        customerInsights: profile.day4?.customerInsights ?? [],
        marketEvidence: profile.day4?.marketEvidence ?? [],
        willingnessEstimate: profile.day4?.willingnessEstimate ?? 'somewhat',
        researchSampleSize: profile.day4?.researchSampleSize ?? 0,
        interviewQuestions: profile.day4?.interviewQuestions ?? [],
      }

    case 5: {
      const d5 = profile.day5 ?? profile.day5Preferences
      return {
        timeAvailabilityHours: d5?.timeAvailabilityHours ?? DAY5_DEFAULTS.timeAvailabilityHours,
        toolPreference: d5?.toolPreference ?? DAY5_DEFAULTS.toolPreference,
        skillLevel: d5?.skillLevel ?? DAY5_DEFAULTS.skillLevel,
        budgetRange: d5?.budgetRange ?? DAY5_DEFAULTS.budgetRange,
        platformTarget: d5?.platformTarget ?? DAY5_DEFAULTS.platformTarget,
        revenueModel: profile.day5?.revenueModel ?? '',
        pricingStrategy: profile.day5?.pricingStrategy ?? '',
        costStructure: profile.day5?.costStructure ?? '',
      }
    }

    case 6:
      return {
        outreachCount:
          profile.day6?.recommendedTouchCount ??
          profile.day6LaunchPlan?.recommendedTouchCount ??
          10,
        responses: [],
        objections: [],
      }

    case 8: {
      const d8 = profile.day8 as Record<string, unknown> | undefined
      if (!d8) return {}
      return {
        companyName: d8.companyName ?? '',
        missionStatement: d8.missionStatement ?? '',
        visionStatement: d8.visionStatement ?? '',
        elevatorPitch: d8.elevatorPitch ?? '',
        problemStatement: d8.problemStatement ?? '',
        solutionOverview: d8.solutionOverview ?? '',
        targetMarket: d8.targetMarket ?? '',
        marketSize: d8.marketSize ?? '',
        competitiveLandscape: d8.competitiveLandscape ?? '',
        uniqueValueProp: d8.uniqueValueProp ?? '',
        revenueModel: d8.revenueModel ?? '',
        unitEconomics: d8.unitEconomics ?? '',
        financialProjections: d8.financialProjections ?? '',
        fundingRequirements: d8.fundingRequirements ?? '',
        goToMarket: d8.goToMarket ?? '',
        salesStrategy: d8.salesStrategy ?? '',
        marketingPlan: d8.marketingPlan ?? '',
        operationsPlan: d8.operationsPlan ?? '',
        technologyStack: d8.technologyStack ?? '',
        teamStructure: d8.teamStructure ?? '',
        milestones: d8.milestones ?? '',
        riskAnalysis: d8.riskAnalysis ?? '',
        legalCompliance: d8.legalCompliance ?? '',
        exitStrategy: d8.exitStrategy ?? '',
        kpis: d8.kpis ?? '',
      }
    }

    case 9: {
      const d9 = profile.day9 as Record<string, unknown> | undefined
      if (!d9) return {}
      return {
        brandName: d9.brandName ?? '',
        brandStory: d9.brandStory ?? '',
        colorPalette: d9.colorPalette ?? [],
        typography: d9.typography ?? '',
        brandVoice: d9.brandVoice ?? '',
        visualDirection: d9.visualDirection ?? '',
        logoGuidelines: d9.logoGuidelines ?? '',
        brandPersonalityProfile: d9.brandPersonalityProfile ?? '',
      }
    }

    case 10: {
      const d10 = profile.day10 as Record<string, unknown> | undefined
      if (!d10) return {}

      // Build benefits / testimonials arrays safely
      const benefitsArr = Array.isArray(d10.benefits) ? d10.benefits as Array<{ title: string; description: string }> : []
      const testimonialsArr = Array.isArray(d10.testimonials) ? d10.testimonials as Array<{ text: string; name: string; role: string }> : []

      return {
        // ── New Web1-specific fields ──
        bannerSubtitle: d10.bannerSubtitle ?? '',
        heroHeadline: d10.heroHeadline ?? '',
        heroSubheadline: d10.heroSubheadline ?? '',
        heroCtaText: d10.heroCtaText ?? '',
        heroImagePrompt: d10.heroImagePrompt ?? '',
        discountCards: d10.discountCards ?? [],
        whyChooseHeadline: d10.whyChooseHeadline ?? '',
        whyChooseDescription: d10.whyChooseDescription ?? '',
        benefits: benefitsArr,
        featuresSectionTitle: d10.featuresSectionTitle ?? '',
        products: d10.products ?? [],
        aboutHeadline: d10.aboutHeadline ?? '',
        aboutDescription: d10.aboutDescription ?? '',
        aboutStats: d10.aboutStats ?? [],
        categories: d10.categories ?? [],
        offerHeadline: d10.offerHeadline ?? '',
        offerDescription: d10.offerDescription ?? '',
        offerProducts: d10.offerProducts ?? [],
        testimonials: testimonialsArr,
        blogPosts: d10.blogPosts ?? [],
        newsletterTitle: d10.newsletterTitle ?? '',
        newsletterSubtitle: d10.newsletterSubtitle ?? '',
        finalCtaButtonText: d10.finalCtaButtonText ?? '',
        footerDescription: d10.footerDescription ?? '',
        footerTagline: d10.footerTagline ?? '',
        metaTitle: d10.metaTitle ?? '',
        metaDescription: d10.metaDescription ?? '',
        colorScheme: d10.colorScheme ?? {},
        imageSearchTerms: d10.imageSearchTerms ?? {},

        // ── Backward-compatible aliases for React templates ──
        problemSection: d10.whyChooseDescription ?? '',
        solutionSection: d10.aboutDescription ?? '',
        socialProofSection: testimonialsArr.length > 0
          ? testimonialsArr.map(t => `"${t.text}" — ${t.name}, ${t.role}`).join('\n\n')
          : '',
        pricingSection: d10.offerDescription ?? '',
        finalCtaHeadline: d10.newsletterTitle ?? '',
        finalCtaSubheadline: d10.newsletterSubtitle ?? '',
        featuresSection: benefitsArr.map(b => ({ title: b.title, description: b.description, icon: '✨' })),
        faqSection: [],
      }
    }

    case 11: {
      const d11 = profile.day11 as Record<string, unknown> | undefined
      if (!d11) return {}
      return {
        positioning: d11.positioning ?? '',
        channels: d11.channels ?? [],
        acquisitionFunnel: d11.acquisitionFunnel ?? '',
        growthTargets: d11.growthTargets ?? '',
        partnerships: d11.partnerships ?? '',
      }
    }

    case 12: {
      const d12 = profile.day12 as Record<string, unknown> | undefined
      if (!d12) return {}
      return {
        customerJourney: d12.customerJourney ?? '',
        operationalWorkflow: d12.operationalWorkflow ?? '',
        toolsInfrastructure: d12.toolsInfrastructure ?? '',
        scalingPlan: d12.scalingPlan ?? '',
        kpis: d12.kpis ?? '',
      }
    }

    case 13: {
      const d13 = profile.day13 as Record<string, unknown> | undefined
      if (!d13) return {}
      return {
        logoStyle: d13.logoStyle ?? '',
        logoText: d13.logoText ?? '',
        socialPlatforms: d13.socialPlatforms ?? [],
        graphicsNotes: d13.graphicsNotes ?? '',
      }
    }

    case 14: {
      const d14 = profile.day14 as Record<string, unknown> | undefined
      if (!d14) return {}
      return {
        launchDate: d14.launchDate ?? '',
        checklist: d14.checklist ?? [],
        launchSequence: d14.launchSequence ?? '',
        communications: d14.communications ?? '',
        contingency: d14.contingency ?? '',
      }
    }

    default:
      return {}
  }
}
