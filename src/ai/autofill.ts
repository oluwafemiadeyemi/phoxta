import type { AutoFillInput } from '@/schemas/autofill.schema'

export function buildAutofillPrompt(input: AutoFillInput): string {
  const parts: string[] = [
    `Idea seed: "${input.ideaSeed}"`,
  ]
  if (input.whoFor) parts.push(`Who it's for: "${input.whoFor}"`)
  if (input.desiredOutcome) parts.push(`Desired outcome: "${input.desiredOutcome}"`)

  return `You are Phoxta's autofill engine. Given the founder's raw idea seed, generate a structured JSON profile to bootstrap a 7-day validation process.

${parts.join('\n')}

RULES — READ CAREFULLY:
- Return ONLY valid JSON. No prose, no markdown, no code fences, no explanation.
- You MUST include every single field listed below. Omitting any field is a schema violation.
- Array length constraints are STRICT: assumptions=5, day1SearchPhrases=10, competitorCandidates=5, day4Hooks=3, day4.hooks=3, day6.outreachScripts=3, day1.painPoints=3–8.
- Enum fields accept ONLY the listed values. Using any other value is an error.
- day1.painPoints must contain 3–8 specific, distinct pain points.
- day4.hooks must contain exactly 3 items: one "pain", one "outcome", one "fear".
- day6.outreachScripts must contain exactly 3 concise, copy-pasteable outreach messages.
- For day5, infer sensible defaults for a typical early-stage solo founder (10 hrs/week, nocode, beginner, 0-50 budget, web).
- existingSolutions: 1–10 items. day2Competitors: 3–8 items. day6.launchChannels: 1–4 items.

FIELD SPECIFICATIONS (all required):

1. problemStatement (string) — Clear, one-paragraph problem statement. Specific, no fluff.
2. targetAudience (string) — Who exactly has this problem. Demographics, role, context. Never "everyone."
3. killCondition (string) — Single clearest signal to abandon this idea. Be blunt.
4. coreOutcome (string) — Primary measurable outcome a user gets.
5. mvpType ("manual"|"nocode"|"lightweight") — Fastest path to test the core assumption.
6. assumptions (string[5]) — Exactly 5 critical, testable assumptions.
7. day1SearchPhrases (string[10]) — Exactly 10 Google/Reddit search phrases to validate the problem.
8. existingSolutions (string[1–10]) — Existing solutions, workarounds, or tools people currently use.
9. competitorCandidates (string[5]) — Exactly 5 companies, tools, or workarounds addressing this.
10. day3CoreOutcome (string) — One sentence: what a user gets when the MVP works.
11. day3MvpType ("manual"|"nocode"|"lightweight") — Recommended MVP approach.
12. day4Hooks ([{type, text}] × 3) — 3 messaging hooks as bold STATEMENTS (never questions). One per type: pain, outcome, fear.
13. day5Preferences — { timeAvailabilityHours (number), toolPreference (string), skillLevel (string), budgetRange (string), platformTarget (string) }
14. day6LaunchPlan — { launchChannels (string[]), recommendedTouchCount (number), outreachScriptDrafts (string[]) }
15. day2Competitors (string[3–8]) — 3–8 competitor/alternative names to research.
16. day1 — { problemStatement: string, targetCustomer: string, painPoints: string[3–8], existingSolutions?: string }
17. day2 — { marketSize: string (TAM/SAM/SOM estimate with numbers), competitors: string[1–8] (competitor names), trends: string (2–4 sentences on market trends), opportunities?: string (gaps or whitespace) }
18. day3 — { coreOutcome: string, mvpType: "manual"|"nocode"|"lightweight" }
19. day4 — { hooks: exactly 3 [{type:"pain"|"outcome"|"fear", text:string}] — each hook must be a bold, declarative STATEMENT (never a question). Pain hooks highlight a specific frustration. Outcome hooks describe the transformation. Fear hooks state a consequence of inaction. recommendedHookType: "pain"|"outcome"|"fear", keyFindings: string (3-5 sentences summarising what publicly available data says about whether this problem is real — cite forums, Reddit, review sites, research papers, industry reports), customerInsights: string[3-8] (individual customer pain points, desires, or behaviours inferred from public data — forum posts, app reviews, social media complaints, survey results), marketEvidence: string[2-6] (specific evidence references — e.g. "G2 reviews of [competitor] show 40% complain about X"), willingnessEstimate: "not_willing"|"somewhat"|"very_willing"|"eager" (based on public pricing data and competitor revenue), researchSampleSize: number (total number of data points, forum posts, reviews, survey respondents, and sources you analysed — typically 50-500+), interviewQuestions: string[5-10] (smart open-ended questions the founder should ask real potential customers to validate assumptions and willingness to pay) }
20. day5 — { timeAvailabilityHours: number, toolPreference: "manual"|"nocode"|"code", skillLevel: "beginner"|"intermediate"|"advanced", budgetRange: "0-50"|"50-200"|"200-1000"|"1000+", platformTarget: "web"|"mobile"|"both" }
21. day6 — { launchChannels: ["community"|"cold_outreach"|"ads"|"partners"] (1–4), recommendedTouchCount: number, outreachScripts: exactly 3 short messages }
22. confidence — For EACH of the 21 fields above, rate "high"|"medium"|"low". If seed is vague, rate low.

Return this EXACT JSON shape (every field mandatory):

{
  "problemStatement": "...",
  "targetAudience": "...",
  "killCondition": "...",
  "coreOutcome": "...",
  "mvpType": "manual",
  "assumptions": ["...", "...", "...", "...", "..."],
  "day1SearchPhrases": ["...", "...", "...", "...", "...", "...", "...", "...", "...", "..."],
  "existingSolutions": ["...", "...", "..."],
  "competitorCandidates": ["...", "...", "...", "...", "..."],
  "day3CoreOutcome": "...",
  "day3MvpType": "manual",
  "day4Hooks": [
    { "type": "pain", "text": "..." },
    { "type": "outcome", "text": "..." },
    { "type": "fear", "text": "..." }
  ],
  "day5Preferences": {
    "timeAvailabilityHours": 10,
    "toolPreference": "...",
    "skillLevel": "...",
    "budgetRange": "...",
    "platformTarget": "..."
  },
  "day6LaunchPlan": {
    "launchChannels": ["...", "..."],
    "recommendedTouchCount": 50,
    "outreachScriptDrafts": ["...", "...", "..."]
  },
  "day2Competitors": ["...", "...", "..."],
  "day1": {
    "problemStatement": "...",
    "targetCustomer": "...",
    "painPoints": ["...", "...", "..."],
    "existingSolutions": "..."
  },
  "day2": {
    "marketSize": "TAM: $X billion. SAM: $Y million. SOM: $Z million.",
    "competitors": ["...", "...", "..."],
    "trends": "...",
    "opportunities": "..."
  },
  "day3": {
    "coreOutcome": "...",
    "mvpType": "manual"
  },
  "day4": {
    "hooks": [
      { "type": "pain", "text": "..." },
      { "type": "outcome", "text": "..." },
      { "type": "fear", "text": "..." }
    ],
    "recommendedHookType": "outcome",
    "keyFindings": "...",
    "customerInsights": ["...", "...", "..."],
    "marketEvidence": ["...", "...", "..."],
    "willingnessEstimate": "somewhat",
    "researchSampleSize": 150,
    "interviewQuestions": ["...", "...", "...", "...", "..."]
  },
  "day5": {
    "timeAvailabilityHours": 10,
    "toolPreference": "nocode",
    "skillLevel": "beginner",
    "budgetRange": "0-50",
    "platformTarget": "web"
  },
  "day6": {
    "launchChannels": ["community", "cold_outreach"],
    "recommendedTouchCount": 50,
    "outreachScripts": ["...", "...", "..."]
  },
  "confidence": {
    "problemStatement": "medium",
    "targetAudience": "medium",
    "killCondition": "medium",
    "coreOutcome": "medium",
    "mvpType": "medium",
    "day1SearchPhrases": "medium",
    "existingSolutions": "medium",
    "competitorCandidates": "medium",
    "assumptions": "medium",
    "day3CoreOutcome": "medium",
    "day3MvpType": "medium",
    "day4Hooks": "medium",
    "day5Preferences": "low",
    "day6LaunchPlan": "medium",
    "day2Competitors": "medium",
    "day1": "medium",
    "day2": "medium",
    "day3": "medium",
    "day4": "medium",
    "day5": "low",
    "day6": "medium"
  }
}`
}
