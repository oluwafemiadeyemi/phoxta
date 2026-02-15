import { z } from 'zod'

// ---------------------------------------------------------------------------
// Interview question (used in both form creation and display)
// ---------------------------------------------------------------------------

export const InterviewQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(['text', 'textarea', 'rating', 'select', 'multiselect']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
})

export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>

// ---------------------------------------------------------------------------
// Create interview form request
// ---------------------------------------------------------------------------

export const CreateInterviewFormSchema = z.object({
  ideaId: z.string().uuid(),
})

export type CreateInterviewForm = z.infer<typeof CreateInterviewFormSchema>

// ---------------------------------------------------------------------------
// Submit interview response
// ---------------------------------------------------------------------------

export const SubmitInterviewResponseSchema = z.object({
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string()), z.number()])),
  respondentName: z.string().max(200).optional(),
  respondentEmail: z.string().email().max(320).optional(),
})

export type SubmitInterviewResponse = z.infer<typeof SubmitInterviewResponseSchema>
