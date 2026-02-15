'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function HubPage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth')
        return
      }
      setLoading(false)
    }
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/app">
            <Image src="/phoxta-logo.png" alt="Phoxta" width={140} height={140} className="rounded-2xl" />
          </Link>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">What would you like to do?</h1>
          <p className="text-gray-500">Pick a workspace to get started</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Idea Validator */}
          <Link href="/app/ideas" className="group">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-full flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-100 transition-colors">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Idea Validator</h2>
              <p className="text-sm text-gray-500">Validate your business ideas with AI-driven 10-phase assessments, market research, and expert feedback.</p>
            </div>
          </Link>

          {/* Designer */}
          <Link href="/app/designer" className="group">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-full flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-purple-100 transition-colors">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Designer</h2>
              <p className="text-sm text-gray-500">Create stunning visuals with a powerful canvas editor — design graphics, mockups, and branded assets.</p>
            </div>
          </Link>

          {/* Web Design */}
          <Link href="/app/sites" className="group">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-full flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-teal-100 transition-colors">
                <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.466.732-3.558" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Web Design</h2>
              <p className="text-sm text-gray-500">Build professional websites from beautiful templates — customize layouts, text, and images with an intuitive editor.</p>
            </div>
          </Link>

          {/* Phoxta CRM */}
          <Link href="/app/crm" className="group">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-full flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-rose-100 transition-colors">
                <svg className="w-8 h-8 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Phoxta CRM</h2>
              <p className="text-sm text-gray-500">Manage leads, track deals, and nurture customer relationships with an AI-assisted pipeline built for startups.</p>
            </div>
          </Link>

          {/* Analytics Hub */}
          <Link href="/app/analytics" className="group">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-full flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-amber-100 transition-colors">
                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Hub</h2>
              <p className="text-sm text-gray-500">Monitor key metrics, track growth KPIs, and generate actionable reports with real-time business dashboards.</p>
            </div>
          </Link>

          {/* Email Campaigns */}
          <Link href="/app/email" className="group">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-full flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
                <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Campaigns</h2>
              <p className="text-sm text-gray-500">Design, automate, and send targeted email sequences to engage your audience and drive conversions.</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
