import OpenAI from 'openai'
import type { ZodTypeAny } from 'zod'
import { ZodError } from 'zod'

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}

export class PhoxtaQuotaError extends Error {
  constructor(message = 'OpenAI quota exceeded') {
    super(message)
    this.name = 'PhoxtaQuotaError'
  }
}

export function quotaErrorBody() {
  return {
    error: 'AI quota temporarily exceeded. Please try again later.',
    retryAfter: 60,
  }
}

/** Recursively strip all asterisk-based markdown (bold / italic / bold-italic) from every string value */
function stripMarkdownAsterisks(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj
      .replace(/\*{3,}(.+?)\*{3,}/g, '$1')   // ***bold-italic***
      .replace(/\*\*(.+?)\*\*/g, '$1')         // **bold**
      .replace(/(?<![\w*])\*(.+?)\*(?![\w*])/g, '$1') // *italic* (not inside words)
      .replace(/\*{3,}/g, '')                  // stray *** horizontal rules
  }
  if (Array.isArray(obj)) return obj.map(stripMarkdownAsterisks)
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) out[k] = stripMarkdownAsterisks(v)
    return out
  }
  return obj
}

export async function runPhoxtaAI(
  system: string,
  prompt: string,
  options?: { model?: string; temperature?: number; outputSchema?: ZodTypeAny; maxTokens?: number; softValidation?: boolean },
): Promise<Record<string, unknown>> {
  // Dev mode: callers handle their own mocks before calling this
  if (process.env.PHOXTA_DEV_MODE === 'true') {
    throw new Error('DEV_MODE_NO_MOCK')
  }

  const model = options?.model ?? 'gpt-4.1'
  const temperature = options?.temperature ?? 0.7

  try {
    console.log(`[aiClient] Calling ${model}, maxTokens=${options?.maxTokens ?? 'default'}, prompt length=${prompt.length}`)
    const response = await getOpenAI().chat.completions.create({
      model,
      temperature,
      ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    console.log(`[aiClient] Response received, length=${raw.length}, finish_reason=${response.choices[0]?.finish_reason}`)
    const parsed = JSON.parse(raw)
    const cleaned = stripMarkdownAsterisks(parsed) as Record<string, unknown>
    if (options?.outputSchema) {
      try {
        return options.outputSchema.parse(cleaned) as Record<string, unknown>
      } catch (zodErr) {
        if (zodErr instanceof ZodError) {
          console.warn(`[aiClient] Zod validation failed (${zodErr.issues.length} issues):`, zodErr.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '))
          if (options.softValidation) {
            console.warn('[aiClient] Soft validation enabled — returning raw parsed JSON despite schema mismatch')
            return cleaned
          }
        }
        throw zodErr
      }
    }
    return cleaned
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message.includes('429') ||
        err.message.includes('quota') ||
        err.message.includes('rate_limit'))
    ) {
      throw new PhoxtaQuotaError()
    }
    throw err
  }
}
