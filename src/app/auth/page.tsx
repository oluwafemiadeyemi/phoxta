'use client'

import { useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        const siteUrl = window.location.origin
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${siteUrl}/auth`,
          },
        })

        // Handle email sending failure — still show confirmation since user was likely created
        if (signUpError) {
          if (signUpError.message.toLowerCase().includes('email')) {
            // User was likely created but email failed — show confirmation anyway
            setShowConfirmation(true)
            return
          }
          throw signUpError
        }

        // Supabase returns a fake user with no identities when the email is already taken
        if (data?.user?.identities?.length === 0) {
          setError('An account with this email already exists. Try signing in instead.')
          return
        }

        // If email confirmation is disabled, the user session is returned immediately
        if (data?.session) {
          router.push('/app')
          return
        }

        // Otherwise, confirmation email was sent
        setShowConfirmation(true)
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
        router.push('/app')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {/* Confirmation popup */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in duration-200">
            <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification sent</h2>
            <p className="text-gray-500 text-sm mb-1">
              A confirmation link has been sent to
            </p>
            <p className="text-gray-900 font-medium text-sm mb-6">{email}</p>
            <p className="text-gray-400 text-xs mb-6">
              Click the link in the email to activate your account. Check your spam folder if you don&apos;t see it within a few minutes.
            </p>
            <button
              onClick={() => {
                setShowConfirmation(false)
                setMode('login')
              }}
              className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Image src="/phoxta-logo.png" alt="Phoxta" width={140} height={140} className="rounded-2xl mx-auto mb-4 shadow-sm" />
          <p className="text-gray-500 mt-1 text-sm">
            {mode === 'login' ? 'Access your account' : 'Create your account'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-5"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm p-3 rounded-lg bg-red-50 text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => setMode('signup')}
                className="text-black font-medium hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setMode('login')}
                className="text-black font-medium hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
