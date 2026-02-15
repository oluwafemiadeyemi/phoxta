import { z } from 'zod'

export function buildInterviewFormPrompt(
  ideaSeed: string,
  problemStatement: string,
  targetCustomer: string,
  hooks: { type: string; text: string }[],
): string {
  return `You are Phoxta's interview form generator. Create a structured interview form to validate a startup idea with real potential customers.

IDEA: "${ideaSeed}"
PROBLEM: "${problemStatement}"
TARGET CUSTOMER: "${targetCustomer}"
MESSAGING HOOKS: ${JSON.stringify(hooks)}

Generate 7-10 interview questions that:
1. Test whether the target customer actually has the stated problem
2. Uncover how they currently solve it (or cope with it)
3. Gauge willingness to pay for a solution
4. Identify deal-breakers or must-have features
5. Reveal hidden needs the founder might not have considered

Also generate a short title and description for the form.

Each question must have:
- id: unique string identifier
- text: the question text
- type: "text" | "textarea" | "rating" | "select" | "multiselect"
- required: boolean
- options: string[] (only for select/multiselect/rating types)

RULES:
- Return ONLY valid JSON. No prose, no markdown, no code fences.
- Mix question types — don't make them all textarea.
- Include at least one rating question (1-10 scale).
- Questions should be conversational, not formal.
- No leading questions.`
}

export const InterviewGenOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  questions: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      type: z.enum(['text', 'textarea', 'rating', 'select', 'multiselect']),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
    }),
  ),
})
