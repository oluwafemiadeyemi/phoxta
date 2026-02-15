'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

function stripMd(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`(.+?)`/g, '$1')
}

interface Question {
  id: string
  text: string
  type: 'text' | 'textarea' | 'rating' | 'select' | 'multiselect'
  required: boolean
  options?: string[]
}

interface InterviewForm {
  id: string
  title: string
  description: string
  questions: Question[]
}

export default function PublicInterviewPage() {
  const { token } = useParams<{ token: string }>()
  const [form, setForm] = useState<InterviewForm | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({})
  const [respondentName, setRespondentName] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const fetchForm = async () => {
    try {
      const res = await fetch(`/api/interview/${token}`)
      if (!res.ok) throw new Error('Form not found')
      const data = await res.json()
      setForm(data.form)
    } catch (err) {
      console.error(err)
      setError('This interview form could not be found.')
    } finally {
      setLoading(false)
    }
  }

  const updateAnswer = (questionId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleMultiSelect = (questionId: string, option: string) => {
    const current = (answers[questionId] as string[]) || []
    if (current.includes(option)) {
      updateAnswer(
        questionId,
        current.filter((o) => o !== option),
      )
    } else {
      updateAnswer(questionId, [...current, option])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Validate required fields
    const missingRequired = form?.questions.filter(
      (q) => q.required && !answers[q.id],
    )
    if (missingRequired?.length) {
      setError(`Please answer all required questions.`)
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(`/api/interview/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          respondentName: respondentName.trim() || undefined,
          respondentEmail: respondentEmail.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to submit')
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading interview...</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
          <p className="text-gray-500">
            Your responses have been submitted. They&apos;ll help the founder make better
            decisions about their product.
          </p>
        </div>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-500">{error || 'This interview link is invalid or expired.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{form.title}</h1>
          <p className="text-gray-500">{form.description}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Optional respondent info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <p className="text-sm text-gray-400">
              Your name and email are optional — share if you&apos;d like the founder to follow up.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={respondentEmail}
                  onChange={(e) => setRespondentEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          {form.questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                {idx + 1}. {stripMd(q.text)}
                {q.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              {q.type === 'text' && (
                <input
                  type="text"
                  value={(answers[q.id] as string) || ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  required={q.required}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black"
                />
              )}

              {q.type === 'textarea' && (
                <textarea
                  value={(answers[q.id] as string) || ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  required={q.required}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-black resize-none"
                />
              )}

              {q.type === 'rating' && q.options && (
                <div className="flex gap-2 flex-wrap">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateAnswer(q.id, parseInt(opt, 10) || opt)}
                      className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                        String(answers[q.id]) === opt
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'select' && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => updateAnswer(q.id, opt)}
                        className="accent-black"
                      />
                      <span className="text-gray-700 text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'multiselect' && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={((answers[q.id] as string[]) || []).includes(opt)}
                        onChange={() => handleMultiSelect(q.id, opt)}
                        className="accent-black"
                      />
                      <span className="text-gray-700 text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Responses'}
          </button>
        </form>
      </main>
    </div>
  )
}
